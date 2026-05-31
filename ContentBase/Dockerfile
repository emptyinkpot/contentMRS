FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY product/novel/package.json product/novel/
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/product/novel/node_modules ./product/novel/node_modules
COPY . .
RUN pnpm --filter novel-product run build 2>/dev/null || true

FROM base AS runtime
COPY --from=build /app .
EXPOSE 5111
CMD ["node", "server.mjs", "--port", "5111"]
