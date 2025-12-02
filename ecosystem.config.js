module.exports = {
  apps: [
    {
      name: 'email-service',
      script: './email-service.js',
      instances: 1,
      exec_mode: 'fork',
      cron_restart: '*/5 * * * *', // Run every 5 minutes
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/email-service-error.log',
      out_file: './logs/email-service-out.log',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
