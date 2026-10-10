# syntax=docker/dockerfile:1
#
# Two images come out of this file; docker-compose.yml selects them by target:
#   web   unprivileged nginx serving the static site behind the sign-in wall
#   auth  the sign-in service (Node, no npm dependencies, no build step)
#
# Base images are pinned by digest so a rebuilt image cannot silently change.

# ---- build: compile the static site -----------------------------------------
FROM node:24.21.0-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS build
WORKDIR /app

# Install from the lockfile only; never run dependency install scripts.
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund

# Bundles only: type-checking and linting are CI steps (`npm run verify`),
# and need test files that are deliberately kept out of the image.
COPY . .
RUN npm run build:bundles

# ---- web: nginx serving dist/ ------------------------------------------------
FROM nginxinc/nginx-unprivileged:1.30.5-alpine-slim@sha256:3af0c10d960cc2502427fe1219c52989d309e7d65596869c60a34fd2fa2406f0 AS web

COPY docker/nginx/security-headers.conf docker/nginx/auth-proxy.conf /etc/nginx/snippets/
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

USER 101:101
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/healthz || exit 1

# ---- auth: the sign-in service -----------------------------------------------
# Node runs the TypeScript sources directly (built-in type stripping), so the
# image holds nothing but the runtime and a dozen small files.
FROM node:24.21.0-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS auth
ENV NODE_ENV=production
WORKDIR /app

COPY auth/ ./auth/
# Account state lives on a volume mounted here; the service user must own it.
RUN mkdir /data && chown node:node /data

USER node
VOLUME /data
EXPOSE 8081

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8081/auth/healthz || exit 1

CMD ["node", "auth/server.ts"]
