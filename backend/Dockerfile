FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci -w backend
COPY backend backend
RUN npm run build -w backend

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci -w backend --omit=dev
COPY --from=build /app/backend/dist backend/dist
COPY backend/migrations backend/migrations
WORKDIR /app/backend
CMD ["node", "dist/index.js"]
