import crypto from "node:crypto";
import Project, {
  DEFAULT_PROJECT_NAME,
  PROJECT_LIMITS,
} from "../../models/projectModel.js";
import Chat, { MAX_CHAT_MESSAGES } from "../../models/chatModel.js";
import credit from "../../middleware/creditMiddleware.js";
import cloudinaryService from "../../middleware/cloudinaryMiddleware.js";
import {
  completeChat,
  friendlyLlmError,
  pickModel,
} from "../../agents/llmClient.js";
import {
  stripReservedTags,
  buildUserContent,
  buildFilesContext,
} from "../../agents/prompts.js";
import {
  classifyIntent,
  runChatAgent,
  runPlannerAgent,
  formatPlan,
  imageRequestText,
} from "../../agents/plannerAgent.js";
import { runCoderAgent } from "../../agents/coderAgent.js";
import {
  writeImagePrompt,
  generateArt,
  renderSvg,
  rewriteImageSource,
} from "../../agents/imageAgent.js";

const HISTORY_LIMIT = 10;

// fixed credit cost of one generated image
const IMAGE_CREDITS = Number(process.env.IMAGE_CREDITS) || 5;

// timeout errors of the image flow (AbortSignal.timeout / LLM client)
const isTimeout = (error) =>
  error?.name === "TimeoutError" || /timed? ?out/i.test(error?.message || "");

// SSE text for image failures: real error + stage in development, friendly text in production
const imageErrorMessage = (error) => {
  // timeouts get one clear message in every environment
  if (isTimeout(error)) return "Image generation took too long, please try again";
  if (process.env.NODE_ENV === "development") {
    return `[${error.stage || "image"}] ${error.message}`;
  }
  // deliberate user-facing messages stay, everything else stays generic
  if (error.friendly) return error.message;
  return friendlyLlmError(error);
};

// ---- Server Sent Events helpers ----
const openStream = (res) => {
  res.status(200);
  res.set({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
};

const makeSender = (res) => (event, data) => {
  if (!res.writableEnded && !res.destroyed) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }
};

// Events sent to the client:
// meta, status, token, plan, agent_switch, file_start, file_chunk, file_end,
// warning, error, credits, done
const streamAgent = async (req, res) => {
  const { projectId, chatId, mode, type, attachments } = req.body;
  const userId = req.user._id;

  let project = null;
  let chat = null;
  const chatOnly = Boolean(chatId);

  // everything that can fail normally is checked BEFORE the stream opens
  if (chatOnly) {
    chat = await Chat.findOne({ _id: chatId, user: userId }).lean();
    if (!chat) {
      res.status(404);
      throw new Error("Chat Not Found...");
    }
  } else {
    project = await Project.findOne({
      _id: projectId,
      user: userId,
    }).lean();

    if (!project) {
      res.status(404);
      throw new Error("Project Not Found...");
    }
  }

  const convo = chatOnly ? chat : project;
  const currentFiles = convo.files || [];

  // users can never forge <handoff>, <file> or <untrusted_document> tags
  const message =
    type === "fix"
      ? "The live preview shows an error. Find the cause and fix it."
      : stripReservedTags(req.body.message);
  const errorLog = stripReservedTags(req.body.errorLog || "");

  const allowImages = Boolean(process.env.VISION_MODEL);
  const hasImages = attachments.some((file) => file.type === "image");
  const userContent = buildUserContent(message, attachments, allowImages);

  // rebuild the content of the last 2 user messages that have attachments, so
  // follow-up questions can still see the PDF text and the images
  let rebuildsLeft = 2;
  const rebuildIndexes = new Set();
  const recentMessages = (convo.messages || [])
    .slice(-HISTORY_LIMIT)
    .filter((item) => item.content);

  for (let i = recentMessages.length - 1; i >= 0; i--) {
    const item = recentMessages[i];
    if (item.role === "user" && item.attachments?.length && rebuildsLeft > 0) {
      rebuildIndexes.add(i);
      rebuildsLeft -= 1;
    }
  }

  const history = recentMessages.map((item, index) => {
    if (rebuildIndexes.has(index)) {
      return {
        role: "user",
        content: buildUserContent(
          item.content.slice(0, 1500),
          item.attachments,
          allowImages,
        ),
      };
    }
    return {
      role: item.role,
      content: item.content.slice(0, 1500),
    };
  });

  // the chat/planner models need vision when the recent history contains images
  const historyHasImages = history.some((entry) =>
    Array.isArray(entry.content),
  );
  const useVision = (hasImages || historyHasImages) && allowImages;

  openStream(res);
  const send = makeSender(res);

  // "Stop generation" = client closes the connection -> LLM calls are cancelled
  const controller = new AbortController();
  const signal = controller.signal;
  res.on("close", () => {
    if (!res.writableEnded) controller.abort();
  });

  const heartbeat = setInterval(() => {
    if (!res.writableEnded && !res.destroyed) res.write(": ping\n\n");
  }, 15000);

  const records = [];
  let totalCredits = 0;
  let totalTokens = 0;
  let changedFiles = [];
  let errored = false;
  let effectiveMode = mode;

  // tokens of the intent check are added to the first saved record
  let pendingTokens = 0;

  const addRecord = ({
    agent,
    recordMode,
    content,
    tokens: ownTokens,
    files = [],
    images = [],
  }) => {
    const tokens = ownTokens + pendingTokens;
    pendingTokens = 0;
    const creditsUsed = credit.tokensToCredits(tokens);
    totalCredits += creditsUsed;
    totalTokens += tokens;
    records.push({
      role: "assistant",
      mode: recordMode,
      agent,
      content,
      files,
      images,
      tokensUsed: tokens,
      creditsUsed,
    });
  };

  try {
    send("meta", { projectId: project?._id, chatId: chat?._id || null, mode, type });

    let goBuild = mode === "build" || type === "fix";

    // ---------- CHAT: Planner Agent answers (or detects that the user wants a build) ----------
    if (!goBuild) {
      send("status", { agent: "planner", message: "Planner is thinking..." });

      const intent = await classifyIntent({
        history,
        content: userContent,
        signal,
      });
      pendingTokens = intent.tokens;
      goBuild = intent.intent === "BUILD";

      if (intent.intent === "IMAGE") {
        // ---------- IMAGE: generate a picture (no files, no build flow) ----------
        if (req.user.credits < IMAGE_CREDITS) {
          errored = true;
          send("error", {
            message: `Not Enough Credits... You Need At Least ${IMAGE_CREDITS} Credits...`,
          });
        } else {
          send("status", { agent: "planner", message: "Creating your image..." });

          try {
            // retry follow-ups use the previous user message as the image request
            const planned = await writeImagePrompt({
              history,
              content: imageRequestText(message, history),
              signal,
            });
            pendingTokens = planned.tokens;

            // art goes to the image model, text layouts are rendered from SVG
            const image =
              planned.kind === "layout"
                ? renderSvg(planned.content)
                : await generateArt(planned.content);

            // the upload can fail on its own -> tag the stage
            let uploaded;
            try {
              uploaded = await cloudinaryService.uploadToCloudinary(image.buffer, {
                public_id: `delux_${userId}_${crypto.randomUUID()}`,
              });
            } catch (error) {
              console.log("IMAGE ERROR [cloudinary-upload]...", error);
              error.stage = "cloudinary-upload";
              throw error;
            }

            send("image", { url: uploaded.secure_url, publicId: uploaded.public_id });

            addRecord({
              agent: "planner",
              recordMode: "chat",
              content: "Here is your image.",
              tokens: 0,
              images: [
                {
                  url: uploaded.secure_url,
                  publicId: uploaded.public_id,
                  kind: planned.kind,
                  source: planned.content,
                },
              ],
            });

            // the image itself costs fixed credits on top of the prompt tokens
            totalCredits = credit.round2(totalCredits + IMAGE_CREDITS);
          } catch (error) {
            if (!signal.aborted) {
              errored = true;
              // every stage logs its own failure; this catches anything untagged
              if (!error.stage) console.log("IMAGE ERROR...", error);
              send("error", { message: imageErrorMessage(error) });
            }
          }
        }
      } else if (!goBuild) {
        const chatResult = await runChatAgent({
          history,
          content: userContent,
          filesContext: buildFilesContext(currentFiles, { budget: 6000 }),
          useVision,
          signal,
          onText: (text) =>
            send("token", { agent: "planner", phase: "chat", text }),
        });

        addRecord({
          agent: "planner",
          recordMode: "chat",
          content: chatResult.text.trim(),
          tokens: chatResult.tokens,
        });
      }
    }

    // ---------- BUILD: Planner (plan) -> Coder (code -> review -> fix) ----------
    if (goBuild && !signal.aborted) {
      effectiveMode = "build";
      const hasFiles = currentFiles.length > 0;
      let plan;

      if (type === "fix") {
        plan = {
          projectName: "",
          summary: "Fix the error shown in the live preview.",
          complexity: "small",
          mode: "edit",
          stack: "",
          designLevel: "polished",
          designNotes: "",
          preview: chatOnly ? (chat.preview !== false) : true,
          pages: [],
          components: [],
          steps: ["Find the cause of the error", "Fix only the affected files"],
          files: [],
        };
      } else {
        send("status", {
          agent: "planner",
          message: "Planner is planning your project...",
        });

        const planned = await runPlannerAgent({
          request: userContent,
          history,
          filesContext: buildFilesContext(currentFiles, { budget: 6000 }),
          hasFiles,
          useVision,
          signal,
        });
        plan = planned.plan;

        addRecord({
          agent: "planner",
          recordMode: "build",
          content: formatPlan(plan),
          tokens: planned.tokens,
        });

        send("plan", { plan });
      }

      const baseFiles = plan.mode === "new" ? [] : currentFiles;

      send("agent_switch", { from: "planner", to: "coder" });
      send("status", {
        agent: "coder",
        message: "Coder is writing the code...",
      });

      const coded = await runCoderAgent({
        plan,
        request: message,
        attachments,
        errorLog,
        files: baseFiles,
        signal,
        send,
      });

      coded.warnings.forEach((warning) =>
        send("warning", { message: warning }),
      );

      const paths = coded.files.map((file) => file.path);
      const content = [
        coded.summary,
        coded.reviewNote,
        paths.length && !coded.aborted ? `Files: ${paths.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");

      addRecord({
        agent: "coder",
        recordMode: "build",
        content,
        tokens: coded.tokens,
        files: coded.aborted ? [] : paths,
      });

      if (!coded.aborted) {
        if (coded.files.length === 0) {
          errored = true;
          send("error", {
            message: "Coder did not return any files. Please try again.",
          });
        } else {
          // merge new / changed files into the project
          const merged = new Map(
            baseFiles.map((file) => [file.path, file.content]),
          );
          for (const file of coded.files) merged.set(file.path, file.content);
          const chatFiles = [...merged].map(([path, fileContent]) => ({
            path,
            content: fileContent,
          }));
          const files = chatFiles;
          const totalChars = files.reduce(
            (sum, file) => sum + file.content.length,
            0,
          );

          if (
            files.length > PROJECT_LIMITS.maxFiles ||
            totalChars > PROJECT_LIMITS.maxTotalChars
          ) {
            errored = true;
            send("error", {
              message: "Project is too large to save. Try a smaller change.",
            });
          } else {
            if (chatOnly) {
              const rename =
                (!chat.title || chat.title === "New chat") && plan.projectName;
              if (rename) chat.title = plan.projectName;
              await Chat.updateOne(
                { _id: chat._id },
                {
                  $set: {
                    files: chatFiles,
                    preview:
                      baseFiles.length > 0
                        ? chat.preview !== false
                        : plan.preview !== false,
                    ...(rename && { title: plan.projectName }),
                  },
                },
              );
            } else {
              const rename =
                project.name === DEFAULT_PROJECT_NAME && plan.projectName;

              await Project.updateOne(
                { _id: project._id },
                {
                  $set: { files, ...(rename && { name: plan.projectName }) },
                  $push: {
                    versions: {
                      $each: [
                        { label: (message || plan.summary).slice(0, 100), files },
                      ],
                      $slice: -PROJECT_LIMITS.maxVersions,
                    },
                  },
                },
              );
            }

            changedFiles = paths;
          }
        }
      }
    }
  } catch (error) {
    if (!signal.aborted) {
      errored = true;
      console.log(`AGENT ERROR... ${error.message}`);
      send("error", { message: friendlyLlmError(error) });
    }
  }

  clearInterval(heartbeat);

  // ---------- save chat + deduct credits (also when the user pressed stop) ----------
  let remainingCredits = null;
  const aborted = signal.aborted;

  try {
    if (records.length > 0) {
      if (aborted) {
        records[records.length - 1].content += "\n\n(Generation stopped)";
      }

      const userMessage = {
        role: "user",
        mode: effectiveMode,
        content: message || "(attachment)",
        attachments: attachments.map((file) => ({
          url: file.url,
          publicId: file.publicId,
          name: file.name,
          type: file.type,
          text: file.text,
        })),
      };

      // Claude-style title: after the first reply of a new chat, ask the model for a short title
      if (chatOnly && (!chat.title || chat.title === "New chat")) {
        const words = (typeof message === "string" ? message : "")
          .trim()
          .split(/\s+/)
          .slice(0, 5)
          .join(" ");
        const fallbackTitle = words
          ? words.charAt(0).toUpperCase() + words.slice(1)
          : "New chat";
        let title = fallbackTitle;
        try {
          const result = await completeChat({
            model: pickModel("planner"),
            messages: [
              {
                role: "user",
                content: `Write a 2-5 word title for this conversation. Same language as the user. No quotes, no ending punctuation.\n\nUser message: ${String(message || "").slice(0, 500)}`,
              },
            ],
            maxTokens: 40,
            temperature: 0.3,
            signal,
          });
          totalTokens += result.tokens || 0;
          const generated = (result.text || "")
            .trim()
            .replace(/^["']+|["']+$/g, "")
            .slice(0, 40);
          if (generated) {
            title = generated.charAt(0).toUpperCase() + generated.slice(1);
          }
        } catch (error) {
          console.log(`TITLE GENERATION FAILED... ${error.message}`);
        }
        await Chat.updateOne({ _id: chat._id }, { $set: { title } });
        send("title", { chatId: chat._id, title });
      }

      const Model = chatOnly ? Chat : Project;
  await Model.updateOne({ _id: convo._id }, {
    $inc: {
      creditsUsed: credit.round2(totalCredits),
      tokensUsed: totalTokens,
    },
    $push: {
      messages: {
        $each: [userMessage, ...records],
        $slice: -MAX_CHAT_MESSAGES,
      },
    },
  });

      const updatedUser = await credit.deductCredits(
        userId,
        credit.round2(totalCredits),
        totalTokens,
      );
      remainingCredits = updatedUser
        ? credit.round2(updatedUser.credits)
        : null;
    }
  } catch (error) {
    console.log(`AGENT SAVE FAILED... ${error.message}`);
  }

  if (!res.writableEnded && !res.destroyed) {
    send("credits", {
      credits: remainingCredits,
      used: credit.round2(totalCredits),
    });
    send("done", {
      projectId: project?._id || null,
      chatId: chat?._id || null,
      mode: effectiveMode,
      aborted,
      failed: errored,
      changedFiles,
      tokensUsed: totalTokens,
      creditsUsed: credit.round2(totalCredits),
      credits: remainingCredits,
    });
    res.end();
  }
};

// ---------- POST /api/agent/image-edit: edit an existing generated image ----------
const imageEdit = async (req, res) => {
  const { chatId, projectId, imageUrl, instruction } = req.body;
  const userId = req.user._id;

  // ownership check
  const chatOnly = Boolean(chatId);
  const Model = chatOnly ? Chat : Project;
  const convo = await Model.findOne({ _id: chatOnly ? chatId : projectId, user: userId });
  if (!convo) {
    res.status(404);
    throw new Error(chatOnly ? "Chat Not Found..." : "Project Not Found...");
  }

  // find the image entry inside the saved messages (never trust the client)
  let sourceImage = null;
  for (const msg of convo.messages || []) {
    const found = (msg.images || []).find((img) => img.url === imageUrl);
    if (found) {
      sourceImage = found;
      break;
    }
  }
  if (!sourceImage) {
    res.status(404);
    throw new Error("Image Not Found...");
  }

  // credits check
  if (req.user.credits < IMAGE_CREDITS) {
    res.status(402);
    throw new Error(`Not Enough Credits... You Need At Least ${IMAGE_CREDITS} Credits...`);
  }

  // the planner model applies the instruction to the stored source
  const source = await rewriteImageSource({
    kind: sourceImage.kind,
    source: sourceImage.source,
    instruction,
  });

  // generate again the same way as the original image
  const image =
    sourceImage.kind === "layout"
      ? renderSvg(source)
      : await generateArt(source);

  // the upload can fail on its own -> tag the stage
  let uploaded;
  try {
    uploaded = await cloudinaryService.uploadToCloudinary(image.buffer, {
      public_id: `delux_${userId}_${crypto.randomUUID()}`,
    });
  } catch (error) {
    console.log("IMAGE ERROR [cloudinary-upload]...", error);
    error.stage = "cloudinary-upload";
    throw error;
  }

  // save the edit request and the new image as two messages
  await Model.updateOne(
    { _id: convo._id },
    {
      $push: {
        messages: {
          $each: [
            { role: "user", mode: "chat", content: `Edit: ${instruction}` },
            {
              role: "assistant",
              mode: "chat",
              agent: "planner",
              content: "Here is your image.",
              images: [
                {
                  url: uploaded.secure_url,
                  publicId: uploaded.public_id,
                  kind: sourceImage.kind,
                  source,
                },
              ],
            },
          ],
          $slice: -MAX_CHAT_MESSAGES,
        },
      },
    },
  );

  // charged only after the image was generated and uploaded successfully
  const updatedUser = await credit.deductCredits(userId, IMAGE_CREDITS);

  res.status(200).json({
    message: "Image Updated SuccessFully...",
    credits: updatedUser ? credit.round2(updatedUser.credits) : null,
    image: { url: uploaded.secure_url, publicId: uploaded.public_id },
  });
};

const agentController = { streamAgent, imageEdit };

export default agentController;
