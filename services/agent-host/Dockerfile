FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY services/agent-host/package.json ./services/agent-host/
COPY packages/shared/package.json ./packages/shared/
COPY packages/8gentc/package.json ./packages/8gentc/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build --filter=@8gent/agent-host...

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/services/agent-host/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3003
CMD ["node", "dist/index.js"]
