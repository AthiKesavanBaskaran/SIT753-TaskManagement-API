FROM node:20-alpine
# Patch OpenSSL HIGH vulnerabilities found by Trivy
RUN apk upgrade --no-cache libssl3 libcrypto3
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
# npm is not needed at runtime; removing it removes its vulnerable bundled packages (tar, glob, cross-spawn...)
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
COPY ./src ./src
EXPOSE 5000
CMD ["node", "src/server.js"]