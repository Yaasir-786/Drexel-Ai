import Project, {
  DEFAULT_PROJECT_NAME,
  PROJECT_LIMITS,
} from "../../models/projectModel.js";
import Chat, { MAX_CHAT_MESSAGES } from "../../models/chatModel.js";
import credit from "../../middleware/creditMiddleware.js";
import { friendlyLlmError } from "../../agents/llmClient.js";
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
} from "../../agents/plannerAgent.js";
import { runCoderAgent } from "../../agents/coderAgent.js";

const HISTORY_LIMIT = 10;

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
  const { projectId, mode, type, attachments } = req.body;
  const userId = req.user._id;

  // everything that can fail normally is checked BEFORE the stream opens
  const project = await Project.findOne({
    _id: projectId,
    user: userId,
  }).lean();

  if (!project) {
    res.status(404);
    throw new Error("Project Not Found...");
  }

  let chat = await Chat.findOne({ project: project._id, user: userId }).lean();

  if (!chat) {
    chat = (
      await Chat.create({ project: project._id, user: userId })
    ).toObject();
  }

  const history = chat.messages
    .slice(-HISTORY_LIMIT)
    .filter((message) => message.content)
    .map((message) => ({
      role: message.role,
      content: message.content.slice(0, 1500),
    }));

  // users can never forge <handoff>, <file> or <untrusted_document> tags
  const message =
    type === "fix"
      ? "The live preview shows an error. Find the cause and fix it."
      : stripReservedTags(req.body.message);
  const errorLog = stripReservedTags(req.body.errorLog || "");

  const allowImages = Boolean(process.env.VISION_MODEL);
  const hasImages = attachments.some((file) => file.type === "image");
  const userContent = buildUserContent(message, attachments, allowImages);

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
      tokensUsed: tokens,
      creditsUsed,
    });
  };

  try {
    send("meta", { projectId, mode, type });

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
      goBuild = intent.build;

      if (!goBuild) {
        const chatResult = await runChatAgent({
          history,
          content: userContent,
          filesContext: buildFilesContext(project.files, { budget: 6000 }),
          useVision: hasImages && allowImages,
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
      const hasFiles = project.files.length > 0;
      let plan;

      if (type === "fix") {
        plan = {
          projectName: "",
          summary: "Fix the error shown in the live preview.",
          complexity: "small",
          mode: "edit",
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
          filesContext: buildFilesContext(project.files, { budget: 6000 }),
          hasFiles,
          useVision: hasImages && allowImages,
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

      send("agent_switch", { from: "planner", to: "coder" });
      send("status", {
        agent: "coder",
        message: "Coder is writing the code...",
      });

      const coded = await runCoderAgent({
        plan,
        request: message,
        errorLog,
        files: project.files,
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
            project.files.map((file) => [file.path, file.content]),
          );
          for (const file of coded.files) merged.set(file.path, file.content);
          const files = [...merged].map(([path, fileContent]) => ({
            path,
            content: fileContent,
          }));
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
        })),
      };

      await Chat.updateOne(
        { project: project._id, user: userId },
        {
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
        },
      );

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
      projectId,
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

const agentController = { streamAgent };

export default agentController;
