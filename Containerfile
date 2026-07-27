# syntax=docker/dockerfile:1.25
ARG BUN_VERSION=1.3-alpine

FROM oven/bun:${BUN_VERSION} AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM oven/bun:${BUN_VERSION} AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json bun.lock ./
COPY tsconfig.app.json tsconfig.json tsconfig.node.json ./
COPY vite.config.ts svelte.config.js ./
COPY src ./src
COPY index.html server.ts ./
RUN bun run build

FROM oven/bun:${BUN_VERSION} AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.ts ./
COPY --from=build /app/package.json ./
EXPOSE 8080
# Numeric, not the `bun` name: a runtime that has to verify the user is
# non-root before starting (kubelet with runAsNonRoot) cannot resolve a
# name out of the image and refuses to start the container.
USER 1000:1000
CMD ["bun", "server.ts"]
