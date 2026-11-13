# syntax=docker/dockerfile:1.4

# ---- Build -----------------------------------------------------------------
# Bun version matches local development so the lockfile resolves identically.
FROM oven/bun:1.3.13-alpine@sha256:4de475389889577f346c636f956b42a5c31501b654664e9ae5726f94d7bb5349 AS build
WORKDIR /app

# Manifest and lockfile first: the dependency layer is reused until they change.
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# ---- Runtime ---------------------------------------------------------------
# static-web-server on scratch: one static binary, no shell, no toolchain.
# It serves /public and reads /sws.toml by default.
FROM joseluisq/static-web-server:2.44.2@sha256:23be6c04d474979d6e738081918f5874f88502a150d1123fd000719101a0f05c

COPY sws.toml /sws.toml
COPY --from=build /app/dist /public

# Unprivileged port so the server can run as a non-root user.
ENV SERVER_PORT=8080
USER 65534:65534
EXPOSE 8080
