# Сборка
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG PUBLIC_YM_ID=""
ARG PUBLIC_SMARTCAPTCHA_KEY=""
ENV PUBLIC_YM_ID=$PUBLIC_YM_ID PUBLIC_SMARTCAPTCHA_KEY=$PUBLIC_SMARTCAPTCHA_KEY
RUN npm run build && npm prune --omit=dev

# Запуск
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=4321 HOST=0.0.0.0 DATA_DIR=/data
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.mjs /app/package.json ./
RUN mkdir -p /data && chown -R node:node /data
USER node
EXPOSE 4321
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1:4321/ >/dev/null || exit 1
CMD ["node", "server.mjs"]
