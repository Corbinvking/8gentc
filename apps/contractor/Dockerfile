FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/contractor/package.json ./apps/contractor/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
COPY packages/db/package.json ./packages/db/
COPY packages/api-client/package.json ./packages/api-client/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build --filter=@8gent/contractor...

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/contractor/.next/standalone ./
COPY --from=builder /app/apps/contractor/.next/static ./apps/contractor/.next/static
COPY --from=builder /app/apps/contractor/public ./apps/contractor/public
EXPOSE 3010
CMD ["node", "apps/contractor/server.js"]
