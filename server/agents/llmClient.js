import OpenAI from "openai";

let client = null;

// reasoning models (gpt-oss): "low" keeps the hidden thinking short
// the special value "off" sends no reasoning option at all
const reasoningOption = (effort) => {
  if (effort === "off") return {};
  const value = effort || process.env.LLM_REASONING_EFFORT;
  return value ? { reasoning_effort: value } : {};
};

// random provider-side hiccups of reasoning models, a second try usually works
const isFlaky = (error) =>
  error?.status === 400 &&
  /called a tool|Parsing failed/i.test(error?.message || "");

// some providers do not know stream_options: remembered and dropped forever
let streamOptionsSupported = true;

// Google style quota errors: RPD = requests per day, they never retry
const dailyQuota = (error) =>
  /per ?day|daily|RPD|PerDay/i.test(error?.message || "");

// wait time on a per-minute limit: retry-after header, body hint or 8 s (max 20 s)
const retryAfterSeconds = (error) => {
  const header = error?.headers?.get?.("retry-after") ?? error?.headers?.["retry-after"];
  const fromHeader = Number(header);
  let seconds = Number.isFinite(fromHeader) && fromHeader > 0 ? fromHeader : 0;
  if (!seconds) {
    const body = `${error?.message || ""} ${JSON.stringify(error?.error || {})}`;
    seconds = Number(/\b(\d+(?:\.\d+)?)s\b/.exec(body)?.[1]) || 0;
  }
  return Math.min(seconds > 0 ? seconds : 8, 20);
};

// wait out the rate limit, resolved early when the user presses stop
const waitOut = async (seconds, signal) => {
  await new Promise((resolve) => {
    const timer = setTimeout(resolve, seconds * 1000);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
};

// thinking models can burn the whole budget with hidden reasoning (empty text,
// finish "length"): one retry with low effort and a doubled budget
const thinkingRetryTokens = (maxTokens) => Math.min(maxTokens * 2, 32000);

// a user stop is not an error: aborted requests must log nothing
export const isAbortError = (error, signal) =>
  error?.name === "AbortError" ||
  error?.name === "APIUserAbortError" ||
  error?.cause?.name === "AbortError" ||
  Boolean(signal?.aborted);

// OpenAI-compatible client: works with Google Gemini, Groq etc. Only .env changes between providers
const getClient = () => {
  if (!process.env.LLM_API_KEY) {
    throw new Error("LLM_API_KEY Is Not Configured...");
  }

  if (!client) {
    client = new OpenAI({
      apiKey: process.env.LLM_API_KEY,
      baseURL:
        process.env.LLM_BASE_URL ||
        "https://generativelanguage.googleapis.com/v1beta/openai/",
      maxRetries: 1,
      timeout: 240000,
    });
  }

  return client;
};

export const limits = () => ({
  chat: Number(process.env.CHAT_MAX_TOKENS) || 4000,
  planner: Number(process.env.PLANNER_MAX_TOKENS) || 2000,
  coder: Number(process.env.CODER_MAX_TOKENS) || 12000,
  review: Number(process.env.REVIEW_MAX_TOKENS) || 8000,
});

// the vision model describes images only (visionAgent); agents stay on text models
export const pickModel = (agent) => {
  if (agent === "coder") {
    return process.env.CODER_MODEL || "gemini-3.6-flash";
  }
  return process.env.PLANNER_MODEL || "gemini-3.5-flash-lite";
};

// used only when the provider does not send usage data
const estimateTokens = (messages, output) =>
  Math.ceil((JSON.stringify(messages).length + output.length) / 4);

export const streamChat = async ({
  model,
  messages,
  maxTokens,
  temperature = 0.4,
  reasoningEffort,
  signal,
  onDelta,
  tools,
}) => {
  // one streamed call; recoverable problems come back as { ok: false }
  const oneCall = async ({ budget, effort, retryRateLimit }) => {
    let text = "";
    let tokens = 0;
    let finishReason = null;
    let aborted = false;
    const toolCalls = [];

    for (let tryIndex = 0; ; tryIndex++) {
      try {
        const stream = await getClient().chat.completions.create(
          {
            model,
            messages,
            max_tokens: budget,
            temperature,
            stream: true,
            // usage in the stream, dropped when the provider rejects the option
            ...(streamOptionsSupported && {
              stream_options: { include_usage: true },
            }),
            ...(tools && { tools, tool_choice: "auto" }),
            ...reasoningOption(effort),
          },
          { signal },
        );

        for await (const chunk of stream) {
          const choice = chunk.choices?.[0];

          const delta = choice?.delta?.content;
          if (delta) {
            text += delta;
            if (onDelta) onDelta(delta);
          }

          for (const call of choice?.delta?.tool_calls || []) {
            if (call.function?.name) toolCalls.push(call.function.name);
          }

          if (choice?.finish_reason) finishReason = choice.finish_reason;

          const usage = chunk.usage || chunk.x_groq?.usage;
          if (usage?.total_tokens) tokens = usage.total_tokens;
        }
        return { ok: true, text, tokens, finishReason, aborted, toolCalls };
      } catch (error) {
        if (isAbortError(error, signal)) {
          return { ok: true, text, tokens: 0, finishReason, aborted: true, toolCalls };
        }
        // provider rejects stream_options: drop it for good and retry once
        if (
          tryIndex === 0 &&
          !text &&
          streamOptionsSupported &&
          /stream_options|Unknown name/i.test(error?.message || "")
        ) {
          streamOptionsSupported = false;
          console.log("LLM RETRY (stream_options not supported)...");
          continue;
        }
        // random provider-side hiccup: one retry of the same call
        if (tryIndex === 0 && !text && isFlaky(error)) {
          console.log(`LLM RETRY... ${error.message}`);
          continue;
        }
        // per-minute quota: the caller waits and retries once
        if (error?.status === 429 && retryRateLimit && !dailyQuota(error)) {
          return { ok: false, reason: "rateLimit", seconds: retryAfterSeconds(error) };
        }
        throw error;
      }
    }
  };

  let call = await oneCall({
    budget: maxTokens,
    effort: reasoningEffort,
    retryRateLimit: true,
  });

  // per-minute quota: wait for the retry-after and try once more
  if (!call.ok) {
    await waitOut(call.seconds, signal);
    call = await oneCall({
      budget: maxTokens,
      effort: reasoningEffort,
      retryRateLimit: false,
    });
  }

  // thinking burned the whole budget (empty text, finish "length"): one smarter retry
  if (call.ok && !call.aborted && !call.text.trim() && call.finishReason === "length") {
    console.log("LLM RETRY (thinking used the budget)");
    call = await oneCall({
      budget: thinkingRetryTokens(maxTokens),
      effort: "low",
      retryRateLimit: false,
    });
  }

  let text = call.text || "";
  let tokens = call.tokens;
  if (!tokens) tokens = estimateTokens(messages, text);

  // empty replies are hard to debug: log the budget and the reasoning effort
  if (!text && !call.aborted) {
    console.log(
      `EMPTY LLM REPLY model=${model} finish=${call.finishReason} tokens=${tokens} maxTokens=${maxTokens} effort=${reasoningEffort || process.env.LLM_REASONING_EFFORT || "none"}`,
    );
  }

  return { text, tokens, finishReason: call.finishReason, aborted: call.aborted, toolCalls: call.toolCalls };
};

export const completeChat = async ({
  model,
  messages,
  maxTokens,
  temperature = 0.2,
  reasoningEffort,
  signal,
}) => {
  // one plain call; recoverable problems come back as { ok: false }
  const oneCall = async ({ budget, effort, retryRateLimit }) => {
    for (let tryIndex = 0; ; tryIndex++) {
      try {
        const completion = await getClient().chat.completions.create(
          {
            model,
            messages,
            max_tokens: budget,
            temperature,
            ...reasoningOption(effort),
          },
          { signal },
        );

        return {
          ok: true,
          text: completion.choices?.[0]?.message?.content || "",
          finishReason: completion.choices?.[0]?.finish_reason || null,
          tokens: completion.usage?.total_tokens || 0,
        };
      } catch (error) {
        // random provider-side hiccup: one retry of the same call
        if (tryIndex === 0 && isFlaky(error)) {
          console.log(`LLM RETRY... ${error.message}`);
          continue;
        }
        // per-minute quota: the caller waits and retries once
        if (error?.status === 429 && retryRateLimit && !dailyQuota(error)) {
          return { ok: false, reason: "rateLimit", seconds: retryAfterSeconds(error) };
        }
        throw error;
      }
    }
  };

  let call = await oneCall({
    budget: maxTokens,
    effort: reasoningEffort,
    retryRateLimit: true,
  });

  // per-minute quota: wait for the retry-after and try once more
  if (!call.ok) {
    await waitOut(call.seconds, signal);
    call = await oneCall({
      budget: maxTokens,
      effort: reasoningEffort,
      retryRateLimit: false,
    });
  }

  // thinking burned the whole budget (empty text, finish "length"): one smarter retry
  if (!call.text.trim() && call.finishReason === "length") {
    console.log("LLM RETRY (thinking used the budget)");
    call = await oneCall({
      budget: thinkingRetryTokens(maxTokens),
      effort: "low",
      retryRateLimit: false,
    });
  }

  const text = call.text || "";
  const tokens = call.tokens || estimateTokens(messages, text);
  return { text, tokens };
};

// provider errors never reach the client with organization ids or keys
export const safeErrorText = (message) =>
  String(message || "")
    .replace(/org_[A-Za-z0-9_-]+/g, "org_(hidden)")
    .replace(/sk-[A-Za-z0-9_-]{10,}/g, "sk_(hidden)");

export const friendlyLlmError = (error) => {
  const status = error?.status;

  if (error?.message === "LLM_API_KEY Is Not Configured...")
    return error.message;
  if (status === 401 || status === 403) {
    return "AI provider rejected the API key. Please contact the admin.";
  }
  if (status === 429) {
    // RPD / daily quota: nothing is coming back today
    if (dailyQuota(error)) {
      return "The daily AI limit is reached. Please try again tomorrow.";
    }
    return "AI provider rate limit reached. Please wait a minute and try again.";
  }
  if (status === 413) {
    return "Request is too large for the AI model. Try a smaller prompt.";
  }
  if (status === 400 || status === 404) {
    const generic =
      "AI provider rejected the request. Check the model names in .env or try a shorter prompt.";
    // in development the real provider message is shown, to make debugging easy
    return safeErrorText(
      process.env.NODE_ENV === "development"
        ? `${generic} (${error.message})`
        : generic,
    );
  }
  if (status >= 500) {
    return "AI provider is not available right now. Please try again.";
  }
  if (
    error?.name === "APIConnectionError" ||
    error?.name === "APIConnectionTimeoutError"
  ) {
    return "Could not reach the AI provider. Please try again.";
  }

  return safeErrorText(
    process.env.NODE_ENV === "development"
      ? error?.message || "Unknown error"
      : "Something went wrong while generating. Please try again.",
  );
};
