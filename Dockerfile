# ---------- Stage 1: React (Vite) build ----------
FROM node:22-slim AS frontend-build

WORKDIR /app/Client

COPY Client/package*.json ./
RUN npm ci

COPY Client/ ./
RUN npm run build


# ---------- Stage 2: Express backend + built frontend ----------
FROM node:22-slim AS backend

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY server/ ./server/

# server.js serves ../Client/dist
COPY --from=frontend-build /app/Client/dist ./Client/dist

# Render sets PORT itself (default 10000); server.js reads process.env.PORT
EXPOSE 5000

CMD ["node", "server/server.js"]