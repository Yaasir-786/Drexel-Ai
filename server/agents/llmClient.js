import OpenAI from "openai";

let client = null;

// reasoning models (gpt-oss): "low" keeps the hidden thinking short
const reasoningOption = () =>
  process.env.LLM_REASONING_EFFORT
    ? { reasoning_effort: process.env.LLM_REASONING_EFFORT }
    : {};

// random provider-side hiccups of reasoning models, a second try usually works
const isFlaky = (error) =>
  error?.status === 400 &&
  /called a tool|Parsing failed/i.test(error?.message || "");

// OpenAI-compatible client: works with Groq, OpenRouter, etc. Only .env changes between providers
const getClient = () => {
  if (!process.env.LLM_API_KEY) {
    throw new Error("LLM_API_KEY Is Not Configured...");
  }

  if (!client) {
    client = new OpenAI({
      apiKey: process.env.LLM_API_KEY,
      baseURL: process.env.LLM_BASE_URL || "https://api.groq.com/openai/v1",
      maxRetries: 1,
      timeout: 120000,
    });
  }

  return client;
};

export const limits = () => ({
  chat: Number(process.env.CHAT_MAX_TOKENS) || 1500,
  planner: Number(process.env.PLANNER_MAX_TOKENS) || 1500,
  coder: Number(process.env.CODER_MAX_TOKENS) || 6000,
  review: Number(process.env.REVIEW_MAX_TOKENS) || 4000,
});

export const pickModel = (agent, useVision = false) => {
  if (agent === "coder") {
    return process.env.CODER_MODEL || "llama-3.3-70b-versatile";
  }
  if (useVision && process.env.VISION_MODEL) return process.env.VISION_MODEL;
  return process.env.PLANNER_MODEL || "llama-3.1-8b-instant";
};

// used only when the provider does not send usage data
const estimateTokens = (messages, output) =>
  Math.ceil((JSON.stringify(messages).length + output.length) / 4);

export const streamChat = async ({
  model,
  messages,
  maxTokens,
  temperature = 0.4,
  signal,
  onDelta,
  tools,
}) => {
  for (let attempt = 1; attempt <= 2; attempt++) {
    let text = "";
    let tokens = 0;
    let finishReason = null;
    let aborted = false;
    const toolCalls = [];

    try {
      const stream = await getClient().chat.completions.create(
        {
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
          stream: true,
          stream_options: { include_usage: true },
          ...(tools && { tools, tool_choice: "auto" }),
          ...reasoningOption(),
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
    } catch (error) {
      if (signal?.aborted) {
        aborted = true;
      } else if (attempt === 1 && !text && isFlaky(error)) {
        console.log(`LLM RETRY... ${error.message}`);
        continue;
      } else {
        throw error;
      }
    }

    if (!tokens) tokens = estimateTokens(messages, text);

    return { text, tokens, finishReason, aborted, toolCalls };
  }
};

export const completeChat = async ({
  model,
  messages,
  maxTokens,
  temperature = 0.2,
  signal,
}) => {
  for (let attempt = 1; ; attempt++) {
    try {
      const completion = await getClient().chat.completions.create(
        {
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
          ...reasoningOption(),
        },
        { signal },
      );

      const text = completion.choices?.[0]?.message?.content || "";
      const tokens =
        completion.usage?.total_tokens || estimateTokens(messages, text);

      return { text, tokens };
    } catch (error) {
      if (attempt === 1 && !signal?.aborted && isFlaky(error)) {
        console.log(`LLM RETRY... ${error.message}`);
        continue;
      }
      throw error;
    }
  }
};

export const friendlyLlmError = (error) => {
  const status = error?.status;

  if (error?.message === "LLM_API_KEY Is Not Configured...")
    return error.message;
  if (status === 401 || status === 403) {
    return "AI provider rejected the API key. Please contact the admin.";
  }
  if (status === 429) {
    return "AI provider rate limit reached. Please wait a minute and try again.";
  }
  if (status === 413) {
    return "Request is too large for the AI model. Try a smaller prompt.";
  }
  if (status === 400 || status === 404) {
    const generic =
      "AI provider rejected the request. Check the model names in .env or try a shorter prompt.";
    // in development the real provider message is shown, to make debugging easy
    return process.env.NODE_ENV === "development"
      ? `${generic} (${error.message})`
      : generic;
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

  return process.env.NODE_ENV === "development"
    ? error?.message || "Unknown error"
    : "Something went wrong while generating. Please try again.";
};
