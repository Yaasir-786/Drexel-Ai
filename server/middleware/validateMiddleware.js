import { z } from "zod";
import { isSafePath } from "../agents/fileParser.js";

const OBJECT_ID = /^[a-f\d]{24}$/i;

const text = (label) =>
  z.string({
    required_error: `${label} is required`,
    invalid_type_error: `${label} must be text`,
  });

const nameField = text("Name")
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(50, "Name must be at most 50 characters");

const phoneField = text("Phone")
  .trim()
  .regex(/^[0-9]{10}$/, "Phone must be 10 digits");

const emailField = text("Email")
  .trim()
  .toLowerCase()
  .email("Please enter a valid email")
  .max(100, "Email is too long");

const passwordField = text("Password")
  .min(8, "Password must be at least 8 characters")
  .max(64, "Password must be at most 64 characters")
  .regex(
    /^(?=.*[A-Za-z])(?=.*\d).+$/,
    "Password must contain a letter and a number",
  );

const objectId = text("ID").regex(OBJECT_ID, "Invalid ID");

const fileField = z.object({
  path: text("Path").max(200).refine(isSafePath, "Invalid file path"),
  content: z
    .string({ invalid_type_error: "Content must be text" })
    .max(200000, "File is too large"),
});

const attachmentField = z.object({
  url: text("Url")
    .url("Invalid attachment url")
    .max(500)
    .refine((url) => {
      const cloud = process.env.CLOUDINARY_CLOUD_NAME;
      return url.startsWith(
        cloud
          ? `https://res.cloudinary.com/${cloud}/`
          : "https://res.cloudinary.com/",
      );
    }, "Attachment must be uploaded through delux.ai"),
  publicId: z.string().max(200).optional(),
  name: text("Attachment name").trim().min(1).max(100),
  type: z.enum(["image", "pdf"]),
  text: z.string().max(15000).optional(),
});

const numberFromForm = (value) =>
  typeof value === "string" && value.trim() !== "" ? Number(value) : value;

const booleanFromForm = (value) =>
  value === "true" ? true : value === "false" ? false : value;

const schemas = {
  signup: z.object({
    name: nameField,
    email: emailField,
    phone: phoneField,
    password: passwordField,
  }),

  login: z.object({
    email: emailField,
    password: text("Password").min(1, "Password is required").max(64),
  }),

  changePassword: z.object({
    currentPassword: text("Current password").min(1).max(64),
    newPassword: passwordField,
  }),

  onboarding: z.object({
    name: nameField,
    role: text("Role").trim().min(1, "Role is required").max(50),
    goal: text("Goal")
      .trim()
      .min(1, "Please tell what you want to build")
      .max(300),
    teamSize: text("Team size").trim().min(1, "Team size is required").max(30),
  }),

  updateProfile: z.object({
    name: nameField.optional(),
    phone: phoneField.optional(),
    role: z.string().trim().min(1).max(50).optional(),
    goal: z.string().trim().min(1).max(300).optional(),
    teamSize: z.string().trim().min(1).max(30).optional(),
  }),

  createProject: z.object({
    name: z.string().trim().min(1).max(60).optional(),
  }),

  createChat: z.object({
    title: z.string().trim().max(60).optional(),
  }),

  renameProject: z.object({
    name: text("Name").trim().min(1, "Project name is required").max(60),
  }),

  saveFiles: z.object({
    files: z
      .array(fileField, { required_error: "Files are required" })
      .max(100),
  }),

  agent: z
    .object({
      projectId: objectId.optional(),
      chatId: objectId.optional(),
      message: z
        .string()
        .trim()
        .max(4000, "Message is too long (max 4000 characters)")
        .default(""),
      mode: z.enum(["chat", "build"]).default("chat"),
      type: z.enum(["prompt", "fix"]).default("prompt"),
      attachments: z.array(attachmentField).max(3).default([]),
      errorLog: z.string().max(4000).optional(),
    })
    .refine((data) => Boolean(data.projectId || data.chatId), {
      message: "projectId or chatId is required",
    })
    .refine(
      (data) =>
        data.type === "fix"
          ? Boolean(data.errorLog && data.errorLog.trim())
          : data.message.length > 0 || data.attachments.length > 0,
      { message: "Message is required (or errorLog for type fix)" },
    ),

  adminCredits: z.object({
    action: z.enum(["add", "remove", "set"]),
    amount: z.preprocess(
      numberFromForm,
      z
        .number({
          required_error: "Amount is required",
          invalid_type_error: "Amount must be a number",
        })
        .min(0)
        .max(1000000),
    ),
  }),

  adminBlock: z.object({
    isActive: z.preprocess(
      booleanFromForm,
      z.boolean({
        required_error: "isActive is required",
        invalid_type_error: "isActive must be true or false",
      }),
    ),
  }),
};

// validates req.body and replaces it with the clean parsed data (unknown fields are dropped)
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body ?? {});

  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue.path.join(".");
    res.status(400);
    throw new Error(field ? `${field}: ${issue.message}` : issue.message);
  }

  req.body = result.data;
  next();
};

// validates Mongo ids in route params, e.g. validateId("id", "versionId")
const validateId =
  (...names) =>
  (req, res, next) => {
    for (const name of names) {
      if (!OBJECT_ID.test(String(req.params[name]))) {
        res.status(400);
        throw new Error("Invalid ID...");
      }
    }
    next();
  };

const validation = { validate, validateId, schemas };

export default validation;
