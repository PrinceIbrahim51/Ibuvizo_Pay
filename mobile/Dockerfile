# Web build of the IBUVIO app, served by an unprivileged nginx.
# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ENV NODE_ENV=production EXPO_NO_TELEMETRY=1
RUN npx expo export --platform web --output-dir dist

# ---- serve ----
FROM nginxinc/nginx-unprivileged:alpine
ENV PORT=8080
COPY web/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
