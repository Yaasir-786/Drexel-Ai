# Drexel-Ai

**AI-Powered App Builder**

Drexel-Ai is a full-stack AI app builder (in the spirit of Lovable) where a user can chat with an AI, describe what they want, and get a working website, app, script or project back — with a live preview, an editable code view, a one-click ZIP download and a full chat history. Two AI agents (a Planner and a Coder) work behind the scenes, so the user only sees a clean chat.

Built and maintained by **Yaasir Sheikh**.

## Table of Contents

- [Overview](#overview)
- [Core Features](#core-features)
- [User Roles](#user-roles)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [AI / Agent Flow](#ai--agent-flow)
- [Streaming Events (SSE)](#streaming-events-sse)
- [Credits & Usage](#credits--usage)
- [API Endpoints](#api-endpoints)
- [Database Design](#database-design)
- [Folder Structure](#folder-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Roadmap](#roadmap)
- [Disclaimer](#disclaimer)
- [About](#about)

## Overview

Building even a small website needs design, code, setup and debugging. Drexel-Ai brings all of that into one conversation: you describe the idea, the AI decides the right technology, writes the code, reviews it, and shows it running in the browser.

**In one sentence:** Describe it → the AI plans and codes it → preview it → edit, fix or download it.

## Core Features

### 1. Chat That Can Also Build

- A Claude-style chat page: normal questions get normal answers, build requests produce real projects
- A small classifier decides per message whether it is a question (chat) or a build request
- Switching between chatting and building inside the same chat works: the Planner decides whether a request edits the current files or starts a brand new project
- **Image generation and image editing** right inside the chat (Cloudflare Workers AI), with a per-user daily image limit
- **Download the files as a zip**: the chat hands over the built files as a zip card whenever you ask for it
- **Website links are read**: paste a link and the planner reads the page text before answering
- Chat history is saved and listed in the sidebar; code blocks have a Copy button
- Chat builds are stored with the chat — they never create an entry in the Projects page

### 2. Project Builder

- A dedicated Builder page for projects the user creates on purpose (Projects → New project)
- Chat panel + live **Preview** + **Code** panel (editable, with Copy) in one screen
- **Fix with AI**: a preview error can be sent straight to the Coder with one click
- **Download ZIP** of the whole project

### 3. Smart Technology Selection

The Planner picks the technology from the request instead of always generating React:

| Request | Output |
| --- | --- |
| User names a technology (Vue, Python, Java, Node, ...) | Exactly that stack, as a complete production-style project (folders, dependency file, README, `.env.example`) |
| Simple pages (login page, form, landing, portfolio, small widget) | Plain HTML + CSS + JavaScript, no build step |
| Bigger frontend (routing, dashboards, many components) | React + Vite + Tailwind CSS |
| Scripts, algorithms, automation, single files | Only the requested file(s) in the best-fitting language |

- **Design level** is chosen from the wording of the request: `simple`, `polished` or `premium`
- Plain HTML/CSS/JS and React projects get a **live preview**; other stacks are delivered as files with a download button (no browser preview)
- File-only results appear as a file list with a direct download button per file

### 4. Two-Agent Pipeline

- **Planner Agent** — understands the request, answers questions and produces a structured JSON plan (stack, design level, steps, files)
- **Coder Agent** — writes the files, then a **review** pass and an automatic **fix** pass; a **security check** runs for large projects
- Output is streamed live; the user only sees friendly status lines, never agent names

### 5. Credits, Limits & Usage

- 1 credit = 1000 tokens
- A daily spending limit and a daily credit top-up that resets at **12:00 AM IST**
- A Usage page with the balance, today's usage, spend per project and recent activity

### 6. Auth, Onboarding & Admin

- Signup / login with JWT (Bearer token), 4-step onboarding, protected routes, blocked-user check
- Admin panel for stats, user management, credits adjustment, block and delete
- File uploads (jpg, jpeg, png, pdf, max 5 MB) with magic-byte scanning, stored on Cloudinary

### 7. UI / UX

- Dark theme by default with a light-theme toggle, fully responsive
- Claude-style sidebar (New chat, Projects, account menu with credits, Settings, Usage and Log out)
- Serif chat typography, live typewriter streaming and a "Running a command" status with a seconds counter

## User Roles

| Role  | Capabilities                                                                                       |
| ----- | -------------------------------------------------------------------------------------------------- |
| User  | Chat, build projects, preview/edit/download code, view usage, manage own profile                   |
| Admin | Everything a user can do, plus platform stats, user list, credit adjustment, block and delete users |

## Tech Stack

**Frontend**

- React 18 (Vite)
- Tailwind CSS 4
- Redux Toolkit — auth state
- TanStack Query — server state & caching
- Axios — REST calls (the AI stream uses `fetch` + `ReadableStream`)
- React Router v6
- Sandpack — in-browser live preview
- JSZip — project download
- react-hot-toast, lucide-react

**Backend**

- Node.js 20+ and Express 5
- MongoDB + Mongoose 9
- JWT (Bearer, 1 day) + bcryptjs
- Zod — request validation
- Helmet, CORS, express-rate-limit
- Multer + Cloudinary — uploads with magic-byte file scan

**AI / External Services**

- Groq through the OpenAI SDK (Planner: `openai/gpt-oss-20b`, Coder: `openai/gpt-oss-120b`)
- Switching to another OpenAI-compatible provider only needs `LLM_BASE_URL`, `LLM_API_KEY` and the model names in `.env`
- Cloudinary for uploads

## System Architecture

```
┌─────────────┐      ┌──────────────┐      ┌───────────────┐
│   React     │◄────►│  Express API │◄────►│    MongoDB    │
│  (Client)   │      │   (Server)   │      │  (Mongoose)   │
└──────┬──────┘      └──────┬───────┘      └───────────────┘
       │                    │
       │ SSE stream         ├──────────────► LLM provider (Groq, OpenAI SDK)
       │ (fetch)            │
       │                    └──────────────► Cloudinary (uploads)
       ▼
┌──────────────┐
│  Sandpack    │   live preview runs in the browser
│  (preview)   │
└──────────────┘
```

## AI / Agent Flow

```
1. User sends a message in Chat or Builder
        │
        ▼
2. Chat mode: a tiny classifier call decides  BUILD  or  CHAT
        │
        ├── CHAT  → Planner answers directly (streamed)
        └── BUILD → Planner creates a JSON plan
                    { stack, preview, designLevel, mode: new | edit, steps, files }
        │
        ▼
3. Coder writes the files (streamed, file by file)
        │
        ▼
4. Review pass → Fix pass → (Security check when the project is large)
        │
        ▼
5. Files are saved (chat or project)
        │
        ▼
6. The client shows the Preview / Code panel, or a file list with downloads
```

- **Build mode** (Builder page) skips the classifier and goes straight to the plan
- **Fix with AI** (`type: "fix"`) sends the preview error straight to the Coder
- If a request is a different project or a different technology, the plan sets `mode: "new"` and the old files are replaced

## Streaming Events (SSE)

`POST /api/agent/stream` returns `text/event-stream`. Read it with `fetch` + `ReadableStream` (not axios) and send the Bearer header manually. Cancel with `AbortController.abort()` — the tokens already used are still charged.

| Event | Data |
| --- | --- |
| `meta` | `{ projectId, chatId, mode, type }` |
| `status` | `{ agent, message }` |
| `token` | `{ agent, phase, text }` |
| `plan` | `{ plan }` |
| `agent_switch` | `{ from, to }` |
| `file_start` | `{ path, phase }` |
| `file_chunk` | `{ path, text, phase }` (live code) |
| `file_end` | `{ path, content, phase }` (final file content) |
| `warning` | `{ message }` |
| `error` | `{ message }` |
| `credits` | `{ credits, used }` |
| `done` | `{ projectId, chatId, mode, aborted, failed, changedFiles, tokensUsed, creditsUsed, credits }` |

Request body: `{ projectId | chatId, message, mode: "chat" | "build", type?: "prompt" | "fix", errorLog?, attachments? }` — send either a `projectId` (Builder) or a `chatId` (normal chat).

## Credits & Usage

- New users start with `DEFAULT_CREDITS` (200)
- Every AI request costs tokens → credits (1 credit = 1000 tokens)
- `DAILY_CREDIT_LIMIT` caps how much a user can spend per day
- At the start of each new day (IST) the daily counter resets and credits are topped up to `DAILY_CREDITS` (credits are never lowered)
- A build needs at least `BUILD_MIN_CREDITS` credits
- The free tier of an LLM provider has its own limits too; keep the daily limits low if you share one API key between many users


## Database Design (Key Collections)

```
User     { name, email, phone, password, userType (USER | ADMIN), isActive,
           credits, dailyUsed, dailyDate, onboardingDone, onboarding{} }

Project  { user, name, files[{ path, content }], messages[],
           creditsUsed, tokensUsed }           ← only projects created by the user

Chat     { user, title, messages[], files[{ path, content }], preview,
           creditsUsed, tokensUsed }           ← normal chats (can also hold chat builds)
```

Messages store `role`, `agent`, `mode`, `content`, files and token/credit usage, so the Usage page can be built from them. Projects and chats are kept in separate collections on purpose.

## Folder Structure

```
Drexel-Ai/
├── package.json, seed.js, .gitignore
├── server/
│   ├── server.js
│   ├── config/         dbConfig, cloudinaryConfig
│   ├── models/         userModel, projectModel, chatModel
│   ├── routes/         auth, user, credit, project, chat, chatList, agent, upload, admin, health
│   ├── controllers/    <domain>/<domain>Controller.js
│   ├── middleware/     auth, credit, errorHandler, rateLimit, validate,
│   │                   fileUpload, fileScan, cloudinary
│   └── agents/         plannerAgent, coderAgent, prompts, llmClient, fileParser
└── Client/
    ├── public/         logo + favicon
    └── src/
        ├── components/ layout, chat, builder, admin + shared UI
        ├── pages/      Landing, Login, Signup, Onboarding, Chat, Projects,
        │               Builder, Usage, Settings, Admin
        ├── features/   Redux store + authSlice
        ├── services/   auth, user, project, chat, credit, agent (SSE)
        ├── hooks/      useAuthStatus, useUsage
        ├── context/    ThemeContext
        └── utils/      downloadFiles, typewriter
```

## Getting Started

```bash
# Clone the repo
git clone https://github.com/Yaasir-786/Drexel-Ai.git
cd Drexel-Ai

# Install dependencies (backend lives in the root, frontend in Client/)
npm install
cd Client && npm install && cd ..

# Set up environment variables: copy .env.example to .env and fill in your values

# Create the admin user
npm run seed

# Run backend (http://localhost:5000)
npm run dev

# Run frontend in a second terminal (http://localhost:5173)
cd Client && npm run dev
```

The Vite dev server proxies `/api` to `http://localhost:5000`, so the frontend needs no `.env` file. Node 20+ is required.

> The live preview loads its bundler from CodeSandbox, so the browser needs internet access.

## Environment Variables

**.env (project root)**

```
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=1d

# LLM provider
LLM_BASE_URL=your_llm_url
LLM_API_KEY=your_llm_api_key
PLANNER_MODEL=your_llm_model
CODER_MODEL=your_llm_model
LLM_REASONING_EFFORT=medium

# Optional limits
CHAT_MAX_TOKENS=4000
CODER_MAX_TOKENS=12000
REVIEW_MAX_TOKENS=8000
PLANNER_MAX_TOKENS=2000

# Credits
DEFAULT_CREDITS=200
DAILY_CREDITS=100
DAILY_CREDIT_LIMIT=100
BUILD_MIN_CREDITS=10

# Admin (used by npm run seed)
ADMIN_EMAIL=your_admin_email
ADMIN_PASSWORD=your_admin_password

# Cloudinary (uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Images (Cloudflare Workers AI) + zip upload limit
CF_ACCOUNT_ID=your_cloudflare_account_id
CF_API_TOKEN=your_cloudflare_api_token
IMAGE_MODEL=@cf/black-forest-labs/flux-1-schnell
MAX_ZIP_MB=50
```

### Most-used variables explained

| Variable | Default | What it does |
| --- | --- | --- |
| `CF_ACCOUNT_ID` | – | Cloudflare account id for image generation |
| `CF_API_TOKEN` | – | Cloudflare API token for image generation |
| `IMAGE_MODEL` | `@cf/black-forest-labs/flux-1-schnell` | Cloudflare Workers AI model that generates the images |
| `IMAGE_CREDITS` | `5` | Credits charged per generated image |
| `IMAGE_DAILY_LIMIT` | `10` | Images one user can generate per day (admins are unlimited) |
| `VISION_MODEL` | – | Vision model for reading attached images; empty = image understanding off |
| `MAX_ZIP_MB` | `50` | Maximum upload size of a zip project file |
| `CHAT_MAX_TOKENS` | `4000` | Token budget for one chat reply |
| `CHAT_REASONING_EFFORT` | `low` | Reasoning effort for chat replies (low = fast answers, fewer empty replies) |
| `DAILY_CREDITS` | `100` | Credits refilled every day at IST midnight |
| `DAILY_CREDIT_LIMIT` | `100` | Maximum credits a user can accumulate |
| `DEFAULT_CREDITS` | `200` | Credits a new user starts with |

## Roadmap

- [ ] Auth, onboarding and role-based access (User / Admin)
- [ ] Planner + Coder agents with review, fix and security check
- [ ] Live streaming (SSE) with stop button
- [ ] Normal chats with saved history (separate from projects)
- [ ] Project Builder with preview, code editor, Fix with AI and ZIP download
- [ ] Technology selection by the Planner (HTML/CSS/JS, React, other stacks)
- [ ] Credits, daily limit and daily refill
- [ ] Usage page connected to live data
- [ ] Settings page (profile and password) connected to the API
- [ ] Admin panel connected to the API
- [ ] Version history UI (list and restore)
- [ ] File attachments in chat (Cloudinary uploads)
- [ ] Live code streaming inside the preview panel
- [ ] More preview types (Vue, Svelte)
- [ ] Deploy / publish a project to a public link (future)

## Disclaimer

Drexel-Ai is built for **educational and demonstration purposes**. AI-generated code can contain mistakes or security issues — always review and test it before using it anywhere important. Never commit your API keys or `.env` file to GitHub.

## About

Drexel-Ai is built and maintained by **Yaasir Sheikh**

📸 Instagram: @beingyaasir
💻 GitHub: Yaasir-786
