# Drexel-Ai (backend)

AI app builder backend. Express 5 + MongoDB (Mongoose) + JWT (Bearer token) + 2 AI agents (Planner, Coder).

## Setup

```bash
npm install
cp .env.example .env      # fill MONGO_URI, JWT_SECRET, LLM_API_KEY, CLOUDINARY_*
npm run seed              # creates the admin user (ADMIN_EMAIL / ADMIN_PASSWORD)
npm run dev               # http://localhost:5000
```

Scripts: `npm run server` (start), `npm run dev` (watch), `npm run seed` (admin).
Node 20+ required. Provider change (Groq -> OpenRouter) = only `LLM_BASE_URL`, `LLM_API_KEY` and model names in `.env`.

## Auth

Every protected route needs the header `Authorization: Bearer <token>`.
The token is returned by `/auth/signup` and `/auth/login` (and `/auth/password`).

## API (29 endpoints, base `/api`)

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/health` | Public | Server + DB status |
| POST | `/auth/signup` | Public | Create account (returns token) |
| POST | `/auth/login` | Public | Login user/admin (returns token) |
| GET | `/auth/me` | User | Current user |
| PUT | `/auth/password` | User | Change password (returns new token) |
| POST | `/users/onboarding` | User | name, role, goal, teamSize |
| PATCH | `/users/profile` | User | Update name / onboarding fields |
| GET | `/credits/usage` | User | Balance, daily usage, spending per project |
| GET | `/projects` | User | My projects |
| POST | `/projects` | User | New project |
| GET | `/projects/:id` | User | Project with files |
| PATCH | `/projects/:id` | User | Rename |
| DELETE | `/projects/:id` | User | Delete project + chat |
| PUT | `/projects/:id/files` | User | Save files edited in the editor |
| GET | `/projects/:id/versions` | User | Version history |
| POST | `/projects/:id/versions/:versionId/restore` | User | Roll back |
| GET | `/projects/:id/chat` | User | Chat history (`?limit=`) |
| DELETE | `/projects/:id/chat` | User | Clear chat |
| POST | `/agent/stream` | User | **SSE** Chat / Build / Fix with AI |
| POST | `/uploads` | User | Upload up to 3 files (jpg, jpeg, png, pdf, max 5 MB) |
| DELETE | `/uploads/:publicId` | User | Delete own upload |
| GET | `/admin/stats` | Admin | Totals |
| GET | `/admin/users` | Admin | Users (`?search=&page=&limit=`) |
| GET | `/admin/users/:id` | Admin | One user |
| PATCH | `/admin/users/:id/credits` | Admin | `{ action: add/remove/set, amount }` |
| PATCH | `/admin/users/:id/block` | Admin | `{ isActive: true/false }` |
| DELETE | `/admin/users/:id` | Admin | Delete user + data |

## `POST /agent/stream`

Body: `{ projectId, message, mode: "chat" | "build", type?: "prompt" | "fix", errorLog?, attachments? }`
(`attachments` = items returned by `/uploads`). Response is `text/event-stream`. Read it with `fetch` + `ReadableStream`
(not axios) and send the Bearer header manually. Cancel = `AbortController.abort()` (credits for used tokens are still charged).

| Event | Data |
|---|---|
| `meta` | `{ projectId, mode, type }` |
| `status` | `{ agent, message }` |
| `token` | `{ agent: "planner" \| "coder", phase: "chat" \| "code" \| "review", text }` |
| `plan` | `{ plan: { projectName, summary, complexity, mode, pages, components, steps, files } }` |
| `agent_switch` | `{ from: "planner", to: "coder" }` |
| `file_start` | `{ path, phase }` |
| `file_chunk` | `{ path, text, phase }` (live code) |
| `file_end` | `{ path, content, phase }` (final content of the file, use this to replace the live text) |
| `warning` | `{ message }` |
| `error` | `{ message }` |
| `credits` | `{ credits, used }` |
| `done` | `{ projectId, mode, aborted, failed, changedFiles, tokensUsed, creditsUsed, credits }` |

Flow: Chat mode -> Planner answers (question / code example / build request). A build request ends with a hidden
handoff, then Planner (plan) -> Coder (code -> review -> fix, + security check when `complexity` is `large`).
Build mode skips the chat step. `type: "fix"` sends the preview error straight to the Coder.
Generated files are saved to the project automatically and a version snapshot is created.

Generated projects are Vite + React + Tailwind (CDN). Use Sandpack template `vite-react` for the preview.

## Folder structure

```
Drexel-Ai/
├── package.json, seed.js, .env.example, .gitignore
└── server/
    ├── server.js
    ├── config/        dbConfig, cloudinaryConfig
    ├── models/        userModel, projectModel, chatModel
    ├── routes/        auth, user, credit, project, chat, agent, upload, admin, health
    ├── controllers/   <domain>/<domain>Controller.js
    ├── middleware/    auth, errorHandler, rateLimit, validate, credit,
    │                  fileUpload, fileScan, cloudinary
    └── agents/        plannerAgent, coderAgent, prompts, llmClient, fileParser
```
