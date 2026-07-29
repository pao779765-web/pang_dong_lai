FROM node:22-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV BIND_HOST=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 site

COPY --from=builder --chown=site:nodejs /app/package.json ./package.json
COPY --from=builder --chown=site:nodejs /app/dist ./dist
COPY --from=builder --chown=site:nodejs /app/scripts/cloudbase-server.mjs ./scripts/cloudbase-server.mjs

USER site
EXPOSE 3000

CMD ["node", "scripts/cloudbase-server.mjs"]
