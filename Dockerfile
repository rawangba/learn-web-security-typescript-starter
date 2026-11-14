FROM node:24-alpine AS dependency
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:24-alpine AS runtime
WORKDIR /app
COPY --from=dependency /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY public ./public
RUN mkdir -p data/uploads data/bulk-tax-documents \
  && chown -R node:node data
COPY --chown=node:node data/uploads/mystery-shack-tax-exemption.pdf ./data/uploads/
USER node
EXPOSE 3000
CMD ["node", "src/main.ts"]
