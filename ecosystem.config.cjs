module.exports = {
  apps: [
    {
      name: 'api',
      script: 'npx',
      args: 'tsx watch server/index.ts',
      env: { NODE_ENV: 'development', BACKEND_PORT: '5001' },
      // dotenv loaded inside server/index.ts (reads .env + .env.local)
      watch: false,
      log_date_format: 'HH:mm:ss',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
    },
    {
      name: 'next',
      script: 'npx',
      args: 'next dev --turbopack',
      env: { NODE_ENV: 'development' },
      watch: false,
      log_date_format: 'HH:mm:ss',
      merge_logs: true,
      autorestart: true,
      max_restarts: 5,
    },
    {
      name: 'claw',
      script: 'npx',
      args: 'openclaw',
      cwd: './',
      env: { NODE_ENV: 'development' },
      watch: false,
      log_date_format: 'HH:mm:ss',
      merge_logs: true,
      autorestart: true,
      max_restarts: 3,
    },
  ],
};
