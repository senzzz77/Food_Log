FROM node:22-bookworm-slim AS api

WORKDIR /app
COPY package.json package-lock.json ./
# tsx 是 devDependency,必须显式包含(ENV NODE_ENV=production 会让 npm ci 默认跳过 dev)
RUN npm ci --include=dev
ENV NODE_ENV=production
COPY server ./server

EXPOSE 3000
USER node
CMD ["node", "./node_modules/tsx/dist/cli.mjs", "server/src/index.ts"]

FROM nginx:1.27-alpine AS web

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
# dist 由本地构建后上传（npm run build），不在服务器上跑 vite 以避开 2G 内存瓶颈
COPY dist /usr/share/nginx/html

EXPOSE 80
