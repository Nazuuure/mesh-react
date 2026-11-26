FROM node:24-alpine AS frontend
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY frontend ./frontend
COPY model.mjs model.d.mts inventory.mjs economics.mjs economics.d.mts ./
RUN npm run build

FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --chown=node:node server.mjs model.mjs inventory.mjs economics.mjs ./
COPY --from=frontend --chown=node:node /app/dist ./dist
USER node
ENV HOST=0.0.0.0
EXPOSE 8000
CMD ["node","server.mjs"]
