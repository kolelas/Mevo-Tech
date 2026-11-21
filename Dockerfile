# Multi-stage production container for Mevo Tech (React 19 + Express + TypeScript).
# This repository uses Bun's lockfile, not package-lock.json, so npm ci cannot run here.
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund \
    && npm install --no-save --no-audit --no-fund tsx

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./tsconfig.json

EXPOSE 3000

CMD ["npx", "tsx", "server.ts"]
