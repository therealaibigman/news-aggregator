/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("path");

const port = process.env.PORT || "3001";
const appName = process.env.PM2_APP_NAME || "news-aggregator";
const nodeEnv = {
  NODE_ENV: "production",
};

module.exports = {
  apps: [
    {
      name: appName,
      script: path.join(__dirname, "node_modules/next/dist/bin/next"),
      args: `start -p ${port}`,
      cwd: __dirname,
      interpreter: "node",
      env: {
        ...nodeEnv,
        PORT: port,
      },
    },
    {
      name: `${appName}-scheduler`,
      script: path.join(__dirname, "node_modules/.bin/tsx"),
      args: "src/server/scripts/scheduler.ts",
      cwd: __dirname,
      interpreter: "node",
      autorestart: true,
      env: nodeEnv,
    },
    {
      name: `${appName}-worker`,
      script: path.join(__dirname, "node_modules/.bin/tsx"),
      args: "src/server/scripts/worker.ts",
      cwd: __dirname,
      interpreter: "node",
      autorestart: true,
      env: nodeEnv,
    },
  ],
};
