FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
# TEMPORARY: full install (not --omit=dev) + scripts/src/tsconfig, so
# `npm run seed` can be run via Coolify's Terminal against production.
# Revert to --omit=dev + dist-only once the seed has been run.
RUN npm ci
COPY --from=build /app/dist ./dist
COPY --from=build /app/src ./src
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/tsconfig.json ./tsconfig.json
EXPOSE 4000
CMD ["node", "dist/server.js"]
