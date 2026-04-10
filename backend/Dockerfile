FROM node:20-alpine AS builder

# Install build dependencies for native modules (like bcrypt) and openssl for Prisma
RUN apk add --no-cache python3 make g++ openssl

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
# Runner also needs openssl for Prisma runtime
RUN apk add --no-cache openssl

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

EXPOSE 3002
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
