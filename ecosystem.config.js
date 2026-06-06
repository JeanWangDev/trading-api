const { resolve } = require("path");

const root = __dirname;
const tsxBin = resolve(root, "node_modules/.bin/tsx");

/** PM2 — mirrors demo-server/ecosystem.config.js */
module.exports = {
  apps: [
    {
      name: "trading-api",
      cwd: root,
      script: resolve(root, "dist/server.js"),
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        PORT: "4000",
        NODE_ENV: "development",
      },
      env_development: {
        PORT: "4000",
        NODE_ENV: "development",
      },
      env_pre: {
        PORT: "4000",
        NODE_ENV: "pre",
      },
      env_production: {
        PORT: "4000",
        NODE_ENV: "production",
      },
    },
    {
      name: "trading-ingest",
      cwd: root,
      script: tsxBin,
      args: "scripts/ingest-loop.ts",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "256M",
      env: {
        NODE_ENV: "development",
        INGEST_INTERVAL_MS: "900000",
      },
      env_development: {
        NODE_ENV: "development",
        INGEST_INTERVAL_MS: "900000",
      },
      env_pre: {
        NODE_ENV: "pre",
        INGEST_INTERVAL_MS: "900000",
      },
      env_production: {
        NODE_ENV: "production",
        INGEST_INTERVAL_MS: "900000",
      },
    },
  ],
};
