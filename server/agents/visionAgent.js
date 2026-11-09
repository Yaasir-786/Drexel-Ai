// visionAgent.js: the only place VISION_MODEL runs, one image description per request
import { completeChat, safeErrorText } from "./llmClient.js";
import { toDataUrl } from "../utils/imageDataUrl.js";

const VISION_PROMPT = `Describe these images for a developer who cannot see them, but ONLY what plain text and code cannot capture. Do NOT transcribe exact text (an OCR scan already provides every text and number) and do NOT list hex colors (a color analysis already provides them). Describe:
- the theme (light or dark) and the page layout grid: which side the sidebar is on and how wide, where the header is, how many columns the content uses
- every section and card from top to bottom, saying its type (stat card, bar chart, donut or gauge, list with avatars, table, calendar, form, button row...)
- chart shapes and rough proportions, icon meanings using lucide style names
- border radius, shadows, filled vs outlined buttons, which cards are highlighted, spacing density.
Be precise, no opinions.`;

// short plain reason for the failure note (never provider internals)
const shortReason = (error) => {
  if (error?.status === 429) return "the vision model is rate limited, try again soon";
  return safeErrorText(error?.message || "unknown error").slice(0, 120);
};

const emptyNote =
  "[The image could not be read: empty reply from the vision model. Please tell the user plainly.]";

// one call with all images (max 3); never throws, always returns { text }
export const describeImages = async ({ images = [], message = "", signal }) => {
  const maxTokens = Number(process.env.VISION_MAX_TOKENS) || 900;

  // Google style: the images travel as downloaded base64 data urls
  const imageParts = [];
  for (const img of images.slice(0, 3)) {
    const dataUrl = await toDataUrl(img.url);
    if (dataUrl) {
      imageParts.push({ type: "image_url", image_url: { url: dataUrl } });
    } else {
      imageParts.push({
        type: "text",
        text: `[Image ${img.name || ""} could not be read (download failed)]`,
      });
    }
  }

  const request = [
    {
      role: "user",
      content: [
        {
          // the user message is context only: what matters in these images
          type: "text",
          text: `${VISION_PROMPT}${
            message ? `\n\nWhat the user asked about: ${message.slice(0, 500)}` : ""
          }`,
        },
        ...imageParts,
      ],
    },
  ];

  try {
    const result = await completeChat({
      model: process.env.VISION_MODEL,
      messages: request,
      maxTokens,
      temperature: 0.2,
      // Gemini 3 rejects "none": thinking stays low so the budget is for the description
      reasoningEffort: process.env.VISION_REASONING_EFFORT || "low",
      signal,
    });
    if (!result.text.trim()) return { text: emptyNote };
    return { text: result.text };
  } catch (error) {
    // some models do not accept reasoning_effort at all: retry once without
    if (error?.status === 400 && /reasoning/i.test(error?.message || "")) {
      try {
        const retry = await completeChat({
          model: process.env.VISION_MODEL,
          messages: request,
          maxTokens,
          temperature: 0.2,
          reasoningEffort: "off",
          signal,
        });
        if (retry.text.trim()) return { text: retry.text };
        return { text: emptyNote };
      } catch (retryError) {
        return {
          text: `[The image could not be read: ${shortReason(retryError)}. Please tell the user plainly.]`,
        };
      }
    }
    return {
      text: `[The image could not be read: ${shortReason(error)}. Please tell the user plainly.]`,
    };
  }
};
