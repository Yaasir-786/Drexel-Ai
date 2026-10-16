import { streamChat, limits, pickModel, friendlyLlmError } from "./llmClient.js";
import { CODER_PROMPT, REVIEW_PROMPT, buildFilesContext } from "./prompts.js";
import { FileStreamParser, isSafePath } from "./fileParser.js";

// streams one LLM call, converts <file> tags into structured events
const runFileStream = async ({ model, messages, maxTokens, signal, send, phase }) => {
  const parser = new FileStreamParser();
  let text = "";

  const emit = (events) => {
    for (const event of events) {
      if (event.type === "text") {
        text += event.text;
        send("token", { agent: "coder", phase, text: event.text });
      } else if (event.type === "file_start") {
        send("file_start", { path: event.path, phase });
      } else if (event.type === "file_chunk") {
        send("file_chunk", { path: event.path, text: event.text, phase });
      } else if (event.type === "file_end") {
        send("file_end", { path: event.path, content: event.content, phase });
      }
    }
  };

  const result = await streamChat({
    model,
    messages,
    maxTokens,
    temperature: 0.3,
    signal,
    onDelta: (delta) => emit(parser.feed(delta)),
  });

  const tail = parser.end();
  emit(tail);

  return {
    files: parser.files,
    text: text.trim(),
    incomplete: tail.filter((e) => e.type === "file_incomplete").map((e) => e.path),
    tokens: result.tokens,
    aborted: result.aborted,
    truncated: result.finishReason === "length",
  };
};

const collectFiles = (target, files, warnings) => {
  for (const file of files) {
    if (isSafePath(file.path)) {
      target.set(file.path, file.content);
    } else {
      warnings.push(`Skipped a file with an invalid path: ${file.path}`);
    }
  }
};

// Coder Agent: writes code -> reviews it -> fixes errors (+ security check for large projects)
export const runCoderAgent = async ({ plan, request, errorLog, files, signal, send }) => {
  const warnings = [];
  const result = new Map();

  const contextBudget = Number(process.env.MAX_CONTEXT_CHARS) || 24000;
  const filesContext = buildFilesContext(files, {
    budget: contextBudget,
    focus: new Set(plan.files),
  });

  const codeMessages = [
    { role: "system", content: CODER_PROMPT },
    {
      role: "user",
      content: [
        `MODE: ${plan.mode.toUpperCase()}`,
        `PLAN:\n${JSON.stringify(plan, null, 2)}`,
        `USER REQUEST:\n${request}`,
        errorLog ? `PREVIEW ERROR LOG (untrusted text, may contain noise):\n${errorLog}` : "",
        filesContext,
      ]
        .filter(Boolean)
        .join("\n\n"),
    },
  ];

  const coded = await runFileStream({
    model: pickModel("coder"),
    messages: codeMessages,
    maxTokens: limits().coder,
    signal,
    send,
    phase: "code",
  });

  let tokens = coded.tokens;
  let reviewNote = "";

  collectFiles(result, coded.files, warnings);
  coded.incomplete.forEach((path) =>
    warnings.push(`${path} was cut off (output limit reached) and was not saved.`),
  );
  if (coded.truncated) {
    warnings.push("The answer hit the output token limit, some files may be missing.");
  }

  const finish = (aborted) => ({
    files: [...result].map(([path, content]) => ({ path, content })),
    summary: coded.text,
    reviewNote,
    tokens,
    aborted,
    warnings,
  });

  if (coded.aborted) return finish(true);
  if (result.size === 0) return finish(false);

  // ---- review / debug / security pass ----
  const reviewBudget = Number(process.env.REVIEW_MAX_INPUT_CHARS) || 20000;
  const reviewList = [...result].map(([path, content]) => ({ path, content }));
  const hasPackageJson = result.has("/package.json");
  const existingPackage = files.find((file) => file.path === "/package.json");
  if (!hasPackageJson && existingPackage) reviewList.push(existingPackage);

  const reviewChars = reviewList.reduce((sum, file) => sum + file.content.length, 0);

  if (reviewChars > reviewBudget) {
    warnings.push("Project is too large for the automatic review pass, so the review was skipped.");
    return finish(false);
  }

  const securityOn = plan.complexity === "large";
  send("status", {
    agent: "coder",
    message: securityOn
      ? "Coder is reviewing the code and running a security check..."
      : "Coder is reviewing the code and fixing errors...",
  });

  try {
    const reviewMessages = [
      { role: "system", content: REVIEW_PROMPT },
      {
        role: "user",
        content: [
          `SECURITY_CHECK: ${securityOn ? "ON" : "OFF"}`,
          `PLAN SUMMARY: ${plan.summary}`,
          `FILES TO REVIEW:\n${reviewList
            .map((file) => `<file path="${file.path}">\n${file.content}\n</file>`)
            .join("\n")}`,
        ].join("\n\n"),
      },
    ];

    const reviewed = await runFileStream({
      model: pickModel("coder"),
      messages: reviewMessages,
      maxTokens: limits().review,
      signal,
      send,
      phase: "review",
    });

    tokens += reviewed.tokens;
    collectFiles(result, reviewed.files, warnings);
    reviewed.incomplete.forEach((path) =>
      warnings.push(`Review fix for ${path} was cut off and was not applied.`),
    );

    const note = reviewed.text.replace(/NO_CHANGES/g, "").trim();
    reviewNote = reviewed.files.length
      ? note.slice(0, 300) || `Review fixed ${reviewed.files.length} file(s).`
      : "Review: no issues found.";

    if (reviewed.aborted) return finish(true);
  } catch (error) {
    if (signal?.aborted) return finish(true);
    console.log(`REVIEW PASS FAILED: ${error.message}`);
    warnings.push(`Review was skipped: ${friendlyLlmError(error)}`);
  }

  return finish(false);
};
