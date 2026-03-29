FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY services/llm-gateway/package.json ./services/llm-gateway/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build --filter=@8gent/llm-gateway...

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/services/llm-gateway/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3002
CMD ["node", "dist/index.js"]
