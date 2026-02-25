module.exports = {
  apps: [
    {
      name: "crm-pro-v4",
      script: "npm",
      args: "start", // Asegúrate de que package.json tenga un script "start" que corra el build (ej: node dist/server.js)
      env: {
        NODE_ENV: "production",
        PORT: 3000
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      exp_backoff_restart_delay: 100
    }
  ]
};