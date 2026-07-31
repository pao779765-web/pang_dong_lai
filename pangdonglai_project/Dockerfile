FROM node:22-alpine AS builder

WORKDIR /app/site
COPY site/package.json site/package-lock.json ./
RUN npm ci

COPY site ./
COPY knowledge /app/knowledge
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app/site
ENV NODE_ENV=production
ENV PORT=3000
ENV BIND_HOST=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 site

COPY --from=builder --chown=site:nodejs /app/site/package.json ./package.json
COPY --from=builder --chown=site:nodejs /app/site/dist ./dist
COPY --from=builder --chown=site:nodejs /app/site/scripts/cloudbase-server.mjs ./scripts/cloudbase-server.mjs

USER site
EXPOSE 3000

CMD ["node", "scripts/cloudbase-server.mjs"]
