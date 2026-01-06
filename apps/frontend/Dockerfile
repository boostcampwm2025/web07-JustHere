# 1. Builder
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.20.0 --activate
RUN pnpm add -g turbo

COPY . .

RUN turbo prune frontend --docker


# 2. Install
FROM node:20-alpine AS installer

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

RUN pnpm install --frozen-lockfile


# 3. Build
FROM node:20-alpine AS build

WORKDIR /app

COPY --from=installer /app/node_modules ./node_modules
COPY --from=builder /app/out/full/ .

RUN pnpm turbo run build --filter=frontend


# 4. Nginx
FROM nginx:1.25-alpine AS runner

COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
