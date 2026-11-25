FROM node:24-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY --chown=node:node . .
USER node
ENV HOST=0.0.0.0
EXPOSE 8000 8001 8002 8003
CMD ["node","server.mjs"]
