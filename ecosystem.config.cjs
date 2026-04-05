const path = require('path');

module.exports = {
  apps: [
    {
      name: 'niftea-ingestion',
      interpreter: 'node',
      script: path.resolve(__dirname, 'node_modules/tsx/dist/cli.mjs'),
      args: 'src/index.ts',
      cwd: path.resolve(__dirname, 'ingestion'),
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      log_file: path.resolve(__dirname, 'logs/ingestion.log'),
      error_file: path.resolve(__dirname, 'logs/ingestion-error.log'),
      out_file: path.resolve(__dirname, 'logs/ingestion-out.log'),
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    {
      name: 'niftea-web',
      interpreter: 'node',
      script: path.resolve(__dirname, 'node_modules/next/dist/bin/next'),
      args: 'dev',
      cwd: path.resolve(__dirname, 'web'),
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      log_file: path.resolve(__dirname, 'logs/web.log'),
      error_file: path.resolve(__dirname, 'logs/web-error.log'),
      out_file: path.resolve(__dirname, 'logs/web-out.log'),
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    }
  ]
};
