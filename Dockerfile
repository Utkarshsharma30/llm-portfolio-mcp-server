# Multi-stage Dockerfile for Node.js MCP Server & Indexer

FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run index

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/src ./src
COPY --from=builder /app/db ./db
COPY --from=builder /app/wiki ./wiki
COPY --from=builder /app/wiki-index.json ./wiki-index.json

EXPOSE 3000

CMD ["node", "src/server.js"]
