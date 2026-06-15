module.exports = {
  apps: [
    {
      name: process.env.PM2_APP_NAME || "news-aggregator",
      script: "npm",
      args: "run start",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || "3001",
      },
    },
  ],
};
