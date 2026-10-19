import { streamChat, completeChat, limits, pickModel } from "./llmClient.js";
import {
  PLANNER_CHAT_PROMPT,
  PLANNER_PLAN_PROMPT,
  INTENT_PROMPT,
} from "./prompts.js";
import { isSafePath } from "./fileParser.js";

// Decides if the user wants something built/changed (BUILD) or just wants to talk (CHAT).
// A tiny separate call: simple one word answer, no tools, no special tags.
// If it fails for any reason we fall back to CHAT (the user can still use the Build toggle).
export const classifyIntent = async ({ history, content, signal }) => {
  const text =
    typeof content === "string"
      ? content
      : content.find((part) => part.type === "text")?.text || "";

  const messages = [
    { role: "system", content: INTENT_PROMPT },
    ...history.slice(-2).map((message) => ({
      role: message.role,
      content: message.content.slice(0, 300),
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

    return { build: /\bBUILD\b/i.test(result.text), tokens: result.tokens };
  } catch (error) {
    if (signal?.aborted) throw error;
    console.log(`INTENT CHECK FAILED, using chat... ${error.message}`);
    return { build: false, tokens: 0 };
  }
};

// CHAT mode: plain streamed text (questions and code examples)
export const runChatAgent = async ({
  history,
  content,
  filesContext,
  useVision,
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

  const result = await streamChat({
    model: pickModel("planner", useVision),
    messages,
    maxTokens: limits().chat,
    temperature: 0.5,
    signal,
    onDelta: onText,
  });

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

export const normalizePlan = (raw, { hasFiles, fallback }) => {
  const plan = raw && typeof raw === "object" ? raw : {};
  const steps = asList(plan.steps, 12);
  const summary =
    typeof plan.summary === "string" && plan.summary.trim()
      ? plan.summary.trim().slice(0, 500)
      : fallback.slice(0, 500);

  return {
    projectName:
      typeof plan.projectName === "string"
        ? plan.projectName.trim().slice(0, 60)
        : "",
    summary,
    complexity: plan.complexity === "large" ? "large" : "small",
    mode: hasFiles ? "edit" : "new",
    preview: plan.preview !== false,
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
  useVision,
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
    model: pickModel("planner", useVision),
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
