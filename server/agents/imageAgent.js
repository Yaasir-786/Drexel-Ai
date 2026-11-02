import { Resvg } from "@resvg/resvg-js";
import { completeChat, pickModel } from "./llmClient.js";
import { IMAGE_PROMPT_PROMPT, IMAGE_EDIT_PROMPT } from "./prompts.js";

// user-facing error: safe to show in production
const userError = (message) => {
  const error = new Error(message);
  error.friendly = true;
  return error;
};

// runs one stage, logs the full error and tags it with the stage name
const runStage = async (stage, run) => {
  try {
    return await run();
  } catch (error) {
    console.log(`IMAGE ERROR [${stage}]...`, error);
    error.stage = stage;
    throw error;
  }
};

// Decides art vs layout and writes the art prompt or the layout SVG
export const writeImagePrompt = async ({ history = [], content, signal }) =>
  runStage("prompt-writer", async () => {
    const text =
      typeof content === "string"
        ? content
        : content.find((part) => part.type === "text")?.text || "";

    const result = await completeChat({
      model: pickModel("planner"),
      messages: [
        { role: "system", content: IMAGE_PROMPT_PROMPT },
        ...history.slice(-4).map((message) => ({
          role: message.role,
          // rebuilt attachment history can be a content array -> keep it plain text
          content:
            typeof message.content === "string"
              ? message.content.slice(0, 500)
              : message.content.find((part) => part.type === "text")?.text?.slice(0, 500) || "",
        })),
        { role: "user", content: text.slice(0, 2000) },
      ],
      maxTokens: Number(process.env.IMAGE_PROMPT_MAX_TOKENS) || 3500,
      temperature: 0.4,
      // ~30s timeout, still cancellable by the user's stop signal
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000),
    });

    // reply format: "KIND: art" or "KIND: layout", followed by the prompt or the SVG
    const raw = (result.text || "").trim();
    const match = raw.match(/^KIND:\s*(art|layout)\s*/i);
    const kind = match ? match[1].toLowerCase() : "art";
    const body = (match ? raw.slice(match[0].length) : raw).trim();

    return { kind, content: body, tokens: result.tokens };
  });

// Generates an image with Cloudflare Workers AI (free daily tier). Returns { buffer, mimeType }
export const generateArt = async (prompt) =>
  runStage("cloudflare", async () => {
    const accountId = process.env.CF_ACCOUNT_ID;
    const token = process.env.CF_API_TOKEN;
    if (!accountId || !token) {
      throw userError(
        "Cloudflare image credentials (CF_ACCOUNT_ID, CF_API_TOKEN) are not configured...",
      );
    }

    const model = process.env.IMAGE_MODEL || "@cf/black-forest-labs/flux-1-schnell";
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ prompt, steps: 4 }),
        // hard timeout for the image request
        signal: AbortSignal.timeout(60000),
      },
    );

    // the free tier has a daily image limit
    if (response.status === 429) {
      throw userError("Daily free image limit reached, please try again tomorrow.");
    }
    if (!response.ok) {
      // log the real details before the friendly error
      const body = await response.text();
      console.log(
        `CLOUDFLARE FAIL status=${response.status} promptLength=${prompt.length} body=${body.slice(0, 500)}`,
      );
      throw userError("The image service failed. Please try again...");
    }

    const data = await response.json();

    // the base64 image is expected in result.image — log the shape when it differs
    const base64 = data?.result?.image;
    if (!base64 || typeof base64 !== "string") {
      console.log(
        `CLOUDFLARE FAIL status=${response.status} promptLength=${prompt.length} body=${JSON.stringify(data).slice(0, 500)}`,
      );
      throw userError("The image service returned no image. Please try again...");
    }

    return { buffer: Buffer.from(base64, "base64"), mimeType: "image/jpeg" };
  });

// Converts a generated layout SVG into a PNG (1080px wide, system fonts)
export const renderSvg = (svg) => {
  try {
    // models sometimes wrap the SVG in markdown fences
    const clean = String(svg || "")
      .replace(/```[a-z]*\s*/gi, "")
      .trim();
    if (!/^<svg[\s>]/i.test(clean)) {
      throw userError("The layout model did not return a valid SVG. Please try again...");
    }

    const resvg = new Resvg(clean, {
      fitTo: { mode: "width", value: 1080 },
      font: { loadSystemFonts: true },
    });

    return { buffer: Buffer.from(resvg.render().asPng()), mimeType: "image/png" };
  } catch (error) {
    console.log("IMAGE ERROR [svg-convert]...", error);
    error.stage = "svg-convert";
    throw error;
  }
};

// Applies the user's instruction to a stored art prompt or layout SVG
export const rewriteImageSource = async ({ kind, source, instruction, signal }) =>
  runStage("prompt-writer", async () => {
    const result = await completeChat({
      model: pickModel("planner"),
      messages: [
        { role: "system", content: IMAGE_EDIT_PROMPT },
        {
          role: "user",
          content: `Instruction: ${instruction}\n\nCurrent ${
            kind === "layout" ? "SVG" : "image prompt"
          }:\n${String(source || "(empty)")}`,
        },
      ],
      maxTokens: Number(process.env.IMAGE_EDIT_MAX_TOKENS) || 4000,
      temperature: 0.4,
      signal,
    });

    return (result.text || "").trim();
  });

const imageAgent = { writeImagePrompt, generateArt, renderSvg, rewriteImageSource };

export default imageAgent;
