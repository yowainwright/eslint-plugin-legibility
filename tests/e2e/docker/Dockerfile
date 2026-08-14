# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=26.7.0

FROM node:${NODE_VERSION}-bookworm-slim AS toolchain
ARG NUB_VERSION=0.7.4
RUN apt-get update && \
  apt-get install --no-install-recommends --yes libatomic1 && \
  rm -rf /var/lib/apt/lists/*
RUN npm install --global "@nubjs/nub@${NUB_VERSION}" && npm cache clean --force
ENV CI=true

FROM toolchain AS package
WORKDIR /source
COPY . .
RUN nub install --frozen-lockfile
RUN nub pack --pack-destination /artifacts && \
  mv /artifacts/*.tgz /artifacts/eslint-plugin-legibility.tgz

FROM toolchain AS consumer
ARG ESLINT_VERSION=9.39.5
ARG JITI_VERSION=2.7.0
ARG OXLINT_VERSION=1.78.0
ARG TYPESCRIPT_ESLINT_VERSION=8.66.0
ARG TYPESCRIPT_VERSION=6.0.3
WORKDIR /workspace
RUN chown node:node /workspace
COPY --from=package /artifacts /artifacts
COPY --chown=node:node tests/e2e/docker/consumer/package.json ./package.json
USER node
RUN nub add --save-dev --save-exact \
  "eslint-plugin-legibility@file:/artifacts/eslint-plugin-legibility.tgz" \
  "eslint@${ESLINT_VERSION}" \
  "jiti@${JITI_VERSION}" \
  "oxlint@${OXLINT_VERSION}" \
  "typescript@${TYPESCRIPT_VERSION}" \
  "typescript-eslint@${TYPESCRIPT_ESLINT_VERSION}"
COPY --chown=node:node tests/fixtures ./tests/fixtures
COPY --chown=node:node tests/e2e/docker/consumer ./tests/e2e
RUN node tests/e2e/generate-workload.ts
ENTRYPOINT ["node"]
CMD ["tests/e2e/correctness.ts"]
