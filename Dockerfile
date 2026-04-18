FROM node:22-alpine AS base
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY README.md ./README.md

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "src/server.js"]
