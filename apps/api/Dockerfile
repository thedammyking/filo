# Dockerfile for NestJS API (apps/api)

# ---- Base Stage (for PNPM setup) ----
# Switch to a Debian-based image for better native module compatibility
FROM node:20-bookworm-slim AS base 
# Install build tools needed for native Node modules on Debian
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    cmake \
    # Optional: libssl-dev (if any crypto libraries need it, node-datachannel might)
    libssl-dev \
    git \
    ca-certificates \
 && update-ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Install pnpm globally
RUN npm install -g pnpm

# ---- Dependencies Stage ----
FROM base AS dependencies
WORKDIR /usr/src/app

# Copy Turborepo root files
COPY package.json ./package.json
COPY pnpm-lock.yaml ./pnpm-lock.yaml
COPY pnpm-workspace.yaml ./pnpm-workspace.yaml

# Copy application-specific package.json
COPY apps/api/package.json ./apps/api/package.json

# Copy workspace packages this app depends on (their package.json files)
COPY packages/libs/package.json ./packages/libs/package.json
COPY packages/interfaces/package.json ./packages/interfaces/package.json
COPY packages/eslint-config/package.json ./packages/eslint-config/package.json
COPY packages/prettier-config/package.json ./packages/prettier-config/package.json

# Install dependencies using pnpm, filtering for the specific app (--filter api) and its dependencies
# This also prunes devDependencies for the production build of 'api' if possible, 
# but for a monorepo, managing this precisely at this stage can be complex.
# The `pnpm deploy` command in the build stage is better for this.
RUN pnpm install --frozen-lockfile --filter api...

# ---- Build Stage ----
FROM base AS builder
WORKDIR /usr/src/app

# Copy root files
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./

# Copy the specific application code
COPY apps/api ./apps/api

# Copy source code of dependent local packages
COPY packages/libs ./packages/libs
COPY packages/interfaces ./packages/interfaces
COPY packages/eslint-config ./packages/eslint-config
COPY packages/prettier-config ./packages/prettier-config

# Copy installed dependencies from the dependencies stage
COPY --from=dependencies /usr/src/app/node_modules ./node_modules
# Also copy the app-specific node_modules if any were created directly there (less common with pnpm workspaces)
# COPY --from=dependencies /usr/src/app/apps/api/node_modules ./apps/api/node_modules

# Diagnostic step for node-datachannel
RUN echo '#!/bin/sh' > /tmp/diag_datachannel.sh && \
    echo 'echo "==== DIAGNOSTIC FOR node-datachannel ===="' >> /tmp/diag_datachannel.sh && \
    echo 'TARGET_DIR="/usr/src/app/node_modules/.pnpm/node-datachannel@0.12.0/node_modules/node-datachannel"' >> /tmp/diag_datachannel.sh && \
    echo 'EXPECTED_FILE="$TARGET_DIR/build/Release/node_datachannel.node"' >> /tmp/diag_datachannel.sh && \
    echo 'echo "Checking for: $EXPECTED_FILE"' >> /tmp/diag_datachannel.sh && \
    echo 'if [ -f "$EXPECTED_FILE" ]; then' >> /tmp/diag_datachannel.sh && \
    echo '    echo "FOUND: $EXPECTED_FILE"' >> /tmp/diag_datachannel.sh && \
    echo '    echo "--- ldd output ---"' >> /tmp/diag_datachannel.sh && \
    echo '    ldd "$EXPECTED_FILE" || echo "[INFO] ldd command failed or file not executable"' >> /tmp/diag_datachannel.sh && \
    echo 'else' >> /tmp/diag_datachannel.sh && \
    echo '    echo "NOT FOUND: $EXPECTED_FILE"' >> /tmp/diag_datachannel.sh && \
    echo '    echo "--- Contents of $TARGET_DIR/build (if exists): ---"' >> /tmp/diag_datachannel.sh && \
    echo '    ls -la "$TARGET_DIR/build" 2>/dev/null || echo "[INFO] $TARGET_DIR/build directory not found."' >> /tmp/diag_datachannel.sh && \
    echo '    echo "--- Attempting to rebuild node-datachannel in $TARGET_DIR ---"' >> /tmp/diag_datachannel.sh && \
    echo '    cd "$TARGET_DIR" && npm_config_build_from_source=true npm rebuild node-datachannel --verbose || echo "[ERROR] npm rebuild failed"' >> /tmp/diag_datachannel.sh && \
    echo '    echo "--- Checking again for: $EXPECTED_FILE after rebuild attempt ---"' >> /tmp/diag_datachannel.sh && \
    echo '    if [ -f "$EXPECTED_FILE" ]; then' >> /tmp/diag_datachannel.sh && \
    echo '        echo "FOUND AFTER REBUILD: $EXPECTED_FILE"' >> /tmp/diag_datachannel.sh && \
    echo '        echo "--- ldd output after rebuild ---"' >> /tmp/diag_datachannel.sh && \
    echo '        ldd "$EXPECTED_FILE" || echo "[INFO] ldd command failed or file not executable"' >> /tmp/diag_datachannel.sh && \
    echo '    else' >> /tmp/diag_datachannel.sh && \
    echo '        echo "STILL NOT FOUND AFTER REBUILD: $EXPECTED_FILE"' >> /tmp/diag_datachannel.sh && \
    echo '        echo "--- Contents of $TARGET_DIR/build (if exists) after rebuild: ---"' >> /tmp/diag_datachannel.sh && \
    echo '        ls -la "$TARGET_DIR/build" 2>/dev/null || echo "[INFO] $TARGET_DIR/build directory not found after rebuild."' >> /tmp/diag_datachannel.sh && \
    echo '    fi' >> /tmp/diag_datachannel.sh && \
    echo 'fi' >> /tmp/diag_datachannel.sh && \
    echo 'echo "==== END DIAGNOSTIC ===="' >> /tmp/diag_datachannel.sh && \
    chmod +x /tmp/diag_datachannel.sh && \
    /tmp/diag_datachannel.sh > /usr/src/app/datachannel_debug_output.txt 2>&1 || echo "[ERROR] Diagnostic script failed to run" 

# Build the NestJS application (api)
# Ensure your build script in apps/api/package.json handles everything needed.
RUN set -e && cd /usr/src/app/apps/api && \
    # Run the build script with increased memory limit
    cd /usr/src/app && NODE_OPTIONS="--max-old-space-size=4096" pnpm --filter api run build && \
    # Show what's in the build output
    echo "Build completed - checking output location:" && \
    find /usr/src/app -name "dist" -type d | xargs ls -la

# Debug: Check where the build output is created
RUN echo "==== DEBUG: DIRECTORY STRUCTURE ====" && \
    echo "Root directory:" && ls -la /usr/src/app && \
    echo "\nApps directory:" && ls -la /usr/src/app/apps && \
    echo "\nApi directory:" && ls -la /usr/src/app/apps/api && \
    echo "\nNestJS build output should be in one of these locations:" && \
    echo "1. /usr/src/app/dist" && ls -la /usr/src/app/dist 2>/dev/null || echo "NOT FOUND" && \
    echo "2. /usr/src/app/apps/api/dist" && ls -la /usr/src/app/apps/api/dist 2>/dev/null || echo "NOT FOUND" && \
    echo "==================================="

# Prune dev dependencies using pnpm deploy for a clean production node_modules
# This creates a pruned version of node_modules in apps/api/deploy/node_modules
WORKDIR /usr/src/app/apps/api
RUN pnpm deploy --filter api --legacy deploy # Output directory is 'deploy' relative to apps/api

# ---- Production Stage ----
# Use a slim Debian-based image for production as well
FROM node:20-bookworm-slim AS production

WORKDIR /usr/src/app

# Copy globally installed pnpm from base stage
COPY --from=base /usr/local/bin/pnpm /usr/local/bin/

# Set NODE_ENV to production
# ENV NODE_ENV=production
# Optionally set other default environment variables here, or via docker-compose/kubernetes
# ENV PORT=4000
# ENV SERVICE_NAME=filo-api

# Copy built application (dist) and pruned production dependencies from the builder stage
COPY --from=builder /usr/src/app/apps/api/deploy/node_modules ./node_modules
COPY --from=builder /usr/src/app/apps/api/dist ./dist
COPY --from=builder /usr/src/app/apps/api/deploy/package.json ./
COPY --from=builder /usr/src/app/datachannel_debug_output.txt /usr/src/app/datachannel_debug_output.txt

# Expose the port the app runs on (NestJS default or as configured)
EXPOSE ${PORT:-4000}

# Health check endpoint (customize path as needed)
# This assumes you have a /health endpoint in your AppController or similar
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 CMD curl -f http://localhost:${PORT:-4000}/api/v1/health || exit 1

# Command to run the application
CMD ["sh", "-c", "node dist/main.js"] 