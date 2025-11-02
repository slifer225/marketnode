ARG API_TOKEN=replace-me
ARG DATABASE_PATH=data/tasks.sqlite
ARG PORT=3000
ARG TYPEORM_SYNCHRONIZE=true
ARG CORS_ORIGINS=http://localhost,http://localhost:5173

FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

# Build application
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
# Strip test sources to keep the build context lean
RUN find src -type f \( -name "*.spec.ts" -o -name "*.test.ts" -o -name "*.spec.tsx" -o -name "*.test.tsx" \) -delete
RUN pnpm build

FROM node:20-alpine AS production

WORKDIR /app

ARG API_TOKEN
ARG DATABASE_PATH
ARG PORT
ARG TYPEORM_SYNCHRONIZE
ARG CORS_ORIGINS

ENV NODE_ENV=production
ENV PORT=${PORT}
ENV API_TOKEN=${API_TOKEN}
ENV DATABASE_PATH=${DATABASE_PATH}
ENV TYPEORM_SYNCHRONIZE=${TYPEORM_SYNCHRONIZE}
ENV CORS_ORIGINS=${CORS_ORIGINS}

# Install production dependencies only
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile --prod

# Copy built assets
COPY --from=base /app/dist ./dist

# Ensure writable data directory for SQLite database
RUN mkdir -p data

EXPOSE 3000

CMD ["node", "dist/main"]
