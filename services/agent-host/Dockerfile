FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY services/agent-host/package.json ./services/agent-host/
COPY services/engine/package.json ./services/engine/
COPY services/llm-gateway/package.json ./services/llm-gateway/
COPY packages/shared/package.json ./packages/shared/
COPY packages/8gentc/package.json ./packages/8gentc/
COPY packages/db/package.json ./packages/db/
COPY packages/api-client/package.json ./packages/api-client/
COPY packages/swarm/package.json ./packages/swarm/
COPY packages/ui/package.json ./packages/ui/
COPY apps/admin/package.json ./apps/admin/
COPY apps/consumer/package.json ./apps/consumer/
COPY apps/contractor/package.json ./apps/contractor/
RUN echo "shamefully-hoist=true" >> .npmrc && pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build --filter=@8gent/agent-host...

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/agent-host/package.json ./package.json
COPY --from=builder /app/services/agent-host/dist ./dist
EXPOSE 3003
CMD ["node", "--import", "tsx/esm", "dist/index.js"]
