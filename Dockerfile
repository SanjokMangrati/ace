FROM node:24-slim AS base
RUN npm install --global pnpm@11.4.0
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS schema
COPY drizzle.config.ts tsconfig.json ./
COPY server/db/schema ./server/db/schema
CMD ["pnpm", "db:push"]

FROM deps AS build
COPY . .
RUN DATABASE_URL=postgres://build@localhost/build \
    BETTER_AUTH_SECRET=build-only-placeholder-never-used-at-runtime \
    BETTER_AUTH_URL=http://localhost:3000 \
    ENCRYPTION_KEY=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA= \
    TRIGGER_SECRET_KEY=build \
    DAYTONA_API_KEY=build \
    pnpm build

FROM node:24-slim AS app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
