FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps

COPY . .

EXPOSE 3000

ENV PORT=3000

CMD ["node", "server.js"]