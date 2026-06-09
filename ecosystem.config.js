const { resolve } = require("path");

const root = __dirname;
const tsxBin = resolve(root, "node_modules/.bin/tsx");

/**
 * 同机双环境：
 *   production → PORT 4000 → api.aipassly.com
 *   pre        → PORT 4001 → api-test.aipassly.com
 *
 * 部署:
 *   yarn deploy:prod  # 只启/重载 trading-api 等生产进程
 *   yarn deploy:pre   # 只启/重载 trading-api-pre 等测试进程
 */
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
      env: { PORT: "4000", NODE_ENV: "production" },
    },
    {
      name: "trading-api-pre",
      cwd: root,
      script: resolve(root, "dist/server.js"),
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: { PORT: "4001", NODE_ENV: "pre" },
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
      env: { NODE_ENV: "production" },
    },
    {
      name: "trading-ingest-pre",
      cwd: root,
      script: tsxBin,
      args: "scripts/ingest-loop.ts",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "256M",
      env: { NODE_ENV: "pre" },
    },
    {
      name: "trading-strategy-watch",
      cwd: root,
      script: tsxBin,
      args: "scripts/strategy-watch.ts",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "256M",
      env: { NODE_ENV: "production" },
    },
    {
      name: "trading-strategy-watch-pre",
      cwd: root,
      script: tsxBin,
      args: "scripts/strategy-watch.ts",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "256M",
      env: { NODE_ENV: "pre" },
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
      env: { NODE_ENV: "production" },
    },
    {
      name: "trading-payment-watch-pre",
      cwd: root,
      script: tsxBin,
      args: "scripts/payment-watch.ts",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "256M",
      env: { NODE_ENV: "pre" },
    },
  ],
};
