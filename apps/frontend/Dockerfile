FROM node:20-alpine AS base

# 1. Builder
FROM base AS builder
RUN apk add --no-cache libc6-compat
RUN apk update
WORKDIR /app

RUN npm install -g turbo
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY . .

RUN turbo prune frontend --docker


# 2. Install
FROM base AS installer

RUN apk add --no-cache libc6-compat
RUN apk update
WORKDIR /app

COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile


# 3. Build
FROM base AS build

RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

RUN npm install -g turbo

# 1. 소스코드(out/full)를 먼저 복사
COPY --from=builder /app/out/full/ .

# 2. 그 위에 설치된 의존성(node_modules)을 덮어씌우기
COPY --from=installer /app/node_modules ./node_modules

RUN turbo run build --filter=frontend


# 4. Nginx
FROM nginx:alpine AS runner

COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
