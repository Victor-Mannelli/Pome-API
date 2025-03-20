FROM amd64/node:23-alpine3.21 AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

RUN apk add --no-cache openssl
RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

FROM amd64/node:20-alpine3.17

ENV PORT=5000
ENV DATABASE_URL=$DATABASE_URL
ENV JWT_SECRET=$JWT_SECRET
ENV ANIME_URL=$ANIME_URL

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 5000

CMD ["npm","run","start:prod" ]