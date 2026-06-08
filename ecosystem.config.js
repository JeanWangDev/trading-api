const { resolve } = require("path");

const root = __dirname;
const tsxBin = resolve(root, "node_modules/.bin/tsx");

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
      },
      env_development: {
        NODE_ENV: "development",
      },
      env_pre: {
        NODE_ENV: "pre",
      },
      env_production: {
        NODE_ENV: "production",
      },
    },
    {
      name: "trading-payment-watch",
      cwd: root,
      script: tsxBin,
      args: "scripts/payment-watch.ts",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "256M",
      env: {
        NODE_ENV: "development",
      },
      env_development: {
        NODE_ENV: "development",
      },
      env_pre: {
        NODE_ENV: "pre",
      },
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};
