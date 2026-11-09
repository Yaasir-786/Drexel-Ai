import { streamChat, completeChat, limits, pickModel } from "./llmClient.js";
import {
  PLANNER_CHAT_PROMPT,
  PLANNER_PLAN_PROMPT,
  INTENT_PROMPT,
} from "./prompts.js";
import { isSafePath } from "./fileParser.js";

// cheap keyword check: image words + a make verb and no code words -> IMAGE
const IMAGE_WORDS = /\b(image|pic|picture|photo|poster|logo|illustration|infographic|chart image|tasveer)\b/i;
const IMAGE_VERBS = /\b(generate|create|make|bana|banao|bana de|draw)\b/i;
const CODE_WORDS = /\b(website|web page|webpage|app|ui|html|code|component|script|page|site|login|signup|dashboard|form|navbar|button|screen|css|react)\b/i;

// a function/snippet request with no build words is chat, no LLM call needed
const FUNCTION_WORDS = /\b(function|method|snippet|regex|query|algorithm)\b/i;
const BUILD_WORDS = /\b(website|app|page|project|ui|build|component)\b/i;

// cheap keyword check: the user wants to GET a zip of the chat files
const ZIP_WORD = /\bzip\b/i;
const ZIP_GET = /\b(give|send|download|export|bana|banao|bana de|bhej|chahiye|nikal|make)\b|\bzip(?:\s+file)?\s+(?:de|do|dedo)\b/i;
const ZIP_ABOUT = /\bzip(?:\s+file)?\s+(?:ka|ke|ki|me|mein|se)\b|\b(me se|se la|from the zip|inside|andar|extract|read|explain|kya|what|kitna|kaun|function|method|class|code|readme|bug|error|fix|size|naam|names?)\b|\b\w+\.(js|jsx|ts|tsx|json|py|html|css|md|txt)\b/i;
const ZIP_OF = /\bzip\s+of\b|\b(ka|ki|ke)\s+zip\b/i;

// true when the message only asks to receive the files as a zip (shared by chat and build mode)
export const isZipRequest = (text = "") => {
  const t = text || "";
  return (
    ZIP_WORD.test(t) &&
    ZIP_GET.test(t) &&
    !ZIP_ABOUT.test(t) &&
    !(
      /\b(build|create|make|bana|banao)\b/i.test(t) &&
      /\b(app|website|page|game|component)\b/i.test(t) &&
      !ZIP_OF.test(t)
    )
  );
};

// retry follow-ups like "try again" refer to the previous user message
const RETRY_PATTERN = /^\s*(?:try again|retry|again|dobara|phir se|once more)\s*[.!]?$/i;

// text of the last user message in the history (plain text only)
export const lastUserText = (history = []) => {
  for (let i = history.length - 1; i >= 0; i--) {
    const message = history[i];
    if (message.role !== "user") continue;
    return typeof message.content === "string"
      ? message.content
      : message.content.find((part) => part.type === "text")?.text || "";
  }
  return "";
};

// the request text for image work: retries use the previous user message
export const imageRequestText = (message, history) =>
  RETRY_PATTERN.test(message || "") ? lastUserText(history) || message : message;

// filler words that carry no real request, used to spot "empty" zip requests
const ZIP_FILLER_WORDS = new Set([
  "i", "want", "need", "one", "a", "an", "the", "zip", "file", "files",
  "give", "me", "send", "please", "make", "chahiye", "de", "do", "dedo",
  "bana", "banao", "ke", "ka", "ki", "ko", "mujhe", "ek", "bhej",
  "download", "is", "this", "chat", "project", "all", "sab", "my",
  "of", "in", "them", "it", "which",
]);

// Decides if the user wants something built/changed (BUILD), a picture (IMAGE) or just to talk (CHAT).
// A tiny separate call: simple one word answer, no tools, no special tags.
// If it fails for any reason we fall back to CHAT (the user can still use the Build toggle).
export const classifyIntent = async ({ history, content, hasFiles, hasZip, hasImages, signal }) => {
  // an uploaded zip in the chat also counts as something that can be packaged
  hasFiles = hasFiles || hasZip;
  const raw =
    typeof content === "string"
      ? content
      : content.find((part) => part.type === "text")?.text || "";

  // retry follow-ups are classified using the previous user message
  const text = imageRequestText(raw, history);

  // cheap keyword check: a function/snippet request with no build words -> CHAT
  if (FUNCTION_WORDS.test(text) && !BUILD_WORDS.test(text)) {
    return { intent: "CHAT", tokens: 0 };
  }

  // cheap keyword check: zip + a get verb, but not reading the zip and not building something new
  if (isZipRequest(text)) {
    return { intent: "ZIP", tokens: 0 };
  }

  // cheap keyword check before the LLM call: image words + a make verb, no code words
  // skipped when an image is attached so the LLM decides
  if (
    !hasImages &&
    IMAGE_WORDS.test(text) &&
    IMAGE_VERBS.test(text) &&
    !CODE_WORDS.test(text)
  ) {
    return { intent: "IMAGE", tokens: 0 };
  }

  const messages = [
    {
      role: "system",
      // the project state helps the model decide between chat and build
      content: `${INTENT_PROMPT}\n\nPROJECT STATE: ${hasFiles ? "has files (or an uploaded zip)" : "no files"}`,
    },
    ...history.slice(-2).map((message) => ({
      role: message.role,
      // rebuilt attachment history can be a content array -> keep it plain text
      content:
        typeof message.content === "string"
          ? message.content.slice(0, 300)
          : message.content.find((part) => part.type === "text")?.text?.slice(0, 300) || "",
    })),
    { role: "user", content: text.slice(0, 1500) },
  ];

  try {
    const result = await completeChat({
      model: pickModel("planner"),
      messages,
      maxTokens: Number(process.env.INTENT_MAX_TOKENS) || 300,
      temperature: 0,
      signal,
    });

    const answer = (result.text || "").trim().toUpperCase();
    let intent = "CHAT";
    if (/\bBUILD\b/.test(answer)) intent = "BUILD";
    else if (/\bIMAGE\b/.test(answer)) intent = "IMAGE";
    else if (/\bZIP\b/.test(answer)) intent = "ZIP";

    // ZIP needs something to package: an "app described as a zip" means BUILD it first
    if (intent === "ZIP" && !hasFiles) {
      const words = (content || "")
        .toLowerCase()
        .split(/[^a-z]+/)
        .filter((word) => word && !ZIP_FILLER_WORDS.has(word))
        .filter((word) => word.length >= 3);
      if (words.length >= 3) intent = "BUILD";
    }

    return { intent, tokens: result.tokens };
  } catch (error) {
    if (signal?.aborted) throw error;
    console.log(`INTENT CHECK FAILED, using chat... ${error.message}`);
    return { intent: "CHAT", tokens: 0 };
  }
};

// CHAT mode: plain streamed text (questions and code examples)
export const runChatAgent = async ({
  history,
  content,
  filesContext,
  signal,
  onText,
}) => {
  const messages = [
    {
      role: "system",
      content: filesContext
        ? `${PLANNER_CHAT_PROMPT}\n\n${filesContext}`
        : PLANNER_CHAT_PROMPT,
    },
    ...history,
    { role: "user", content },
  ];

  // chat replies answer fast: a lower reasoning effort keeps the hidden thinking short
  // (builds keep the global LLM_REASONING_EFFORT)
  const reasoningEffort = process.env.CHAT_REASONING_EFFORT || "low";

  const result = await streamChat({
    model: pickModel("planner"),
    messages,
    maxTokens: limits().chat,
    temperature: 0.5,
    reasoningEffort,
    signal,
    onDelta: onText,
  });

  // other empty replies (finish "stop"): retry once with a bigger budget
  // (finish "length" is already retried inside streamChat: thinking used the budget)
  if (
    !result.text.trim() &&
    !result.aborted &&
    result.finishReason !== "length"
  ) {
    const retryMax = Math.min(limits().chat * 2, 8000);
    console.log(`EMPTY CHAT REPLY, retrying once with maxTokens=${retryMax}...`);
    const retry = await streamChat({
      model: pickModel("planner"),
      messages,
      maxTokens: retryMax,
      temperature: 0.5,
      reasoningEffort,
      signal,
      onDelta: onText,
    });
    return {
      text: retry.text,
      tokens: result.tokens + retry.tokens,
      aborted: retry.aborted,
    };
  }

  return { text: result.text, tokens: result.tokens, aborted: result.aborted };
};

const extractJson = (text) => {
  const cleaned = text.replace(/```json|```/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) return null;

  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
};

const asList = (value, max, length = 200) =>
  Array.isArray(value)
    ? value
        .filter((item) => typeof item === "string")
        .map((item) => item.trim().slice(0, length))
        .filter(Boolean)
        .slice(0, max)
    : [];

const normalizePlan = (raw, { hasFiles, fallback }) => {
  const plan = raw && typeof raw === "object" ? raw : {};
  const steps = asList(plan.steps, 12);
  const summary =
    typeof plan.summary === "string" && plan.summary.trim()
      ? plan.summary.trim().slice(0, 500)
      : fallback.slice(0, 500);

  const projectName =
    typeof plan.projectName === "string" ? plan.projectName.trim().slice(0, 60) : "";

  return {
    projectName: projectName
      ? projectName.charAt(0).toUpperCase() + projectName.slice(1)
      : "",
    summary,
    complexity: plan.complexity === "large" ? "large" : "small",
    mode: hasFiles && plan.mode !== "new" ? "edit" : "new",
    preview: plan.preview !== false,
    stack:
      typeof plan.stack === "string" ? plan.stack.trim().slice(0, 120) : "",
    designLevel:
      ["simple", "polished", "premium"].includes(plan.designLevel)
        ? plan.designLevel
        : "polished",
    designNotes:
      typeof plan.designNotes === "string"
        ? plan.designNotes.trim().slice(0, 1500)
        : "",
    pages: asList(plan.pages, 15, 80),
    components: asList(plan.components, 25, 80),
    steps: steps.length ? steps : [summary || "Build what the user asked for"],
    files: asList(plan.files, 40).filter(isSafePath),
  };
};

export const formatPlan = (plan) => {
  const lines = [`Plan: ${plan.summary}`];
  if (plan.steps.length) {
    lines.push(
      "",
      "Steps:",
      ...plan.steps.map((step, i) => `${i + 1}. ${step}`),
    );
  }
  if (plan.files.length) lines.push("", `Files: ${plan.files.join(", ")}`);
  return lines.join("\n");
};

// BUILD mode: one non streaming call that returns a JSON plan (never code)
export const runPlannerAgent = async ({
  request,
  history,
  filesContext,
  hasFiles,
  signal,
}) => {
  const messages = [
    {
      role: "system",
      content: `${PLANNER_PLAN_PROMPT}\n\n${filesContext || "The project has no files yet, so the mode is new."}`,
    },
    ...history.slice(-6),
    { role: "user", content: request },
  ];

  const { text, tokens } = await completeChat({
    model: pickModel("planner"),
    messages,
    maxTokens: limits().planner,
    temperature: 0.2,
    signal,
  });

  const fallback =
    typeof request === "string"
      ? request
      : request.find((part) => part.type === "text")?.text || "";

  return {
    plan: normalizePlan(extractJson(text), { hasFiles, fallback }),
    tokens,
  };
};
