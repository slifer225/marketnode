ARG VITE_API_BASE_URL=http://localhost:3000/
ARG VITE_API_TOKEN=replace-me

FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_API_BASE_URL
ARG VITE_API_TOKEN

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_API_TOKEN=${VITE_API_TOKEN}

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

COPY . .
# Remove test-only files before building
RUN find src -type f \( -name "*.spec.*" -o -name "*.test.*" \) -delete

RUN pnpm build

FROM nginx:1.27-alpine AS production

ARG VITE_API_BASE_URL
ARG VITE_API_TOKEN

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_API_TOKEN=${VITE_API_TOKEN}

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"]
