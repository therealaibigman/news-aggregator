const path = require("path");

const port = process.env.PORT || "3001";

module.exports = {
  apps: [
    {
      name: process.env.PM2_APP_NAME || "news-aggregator",
      script: path.join(__dirname, "node_modules/next/dist/bin/next"),
      args: `start -p ${port}`,
      cwd: __dirname,
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        PORT: port,
      },
    },
  ],
};
