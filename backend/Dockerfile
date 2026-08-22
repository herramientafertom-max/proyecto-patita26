FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci --workspace backend --include-workspace-root

FROM dependencies AS build
COPY backend backend
RUN npm run build --workspace backend

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S retail && adduser -S retail -G retail
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/backend/dist ./backend/dist
COPY backend/package.json ./backend/package.json
USER retail
EXPOSE 3000
CMD ["node", "backend/dist/main.js"]
