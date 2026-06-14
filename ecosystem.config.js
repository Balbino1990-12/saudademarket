module.exports = {
  apps: [{
    name: 'portugalstore',
    script: 'server.js',
    instances: process.env.NODE_ENV === 'production' ? 'max' : 1,
    exec_mode: process.env.NODE_ENV === 'production' ? 'cluster' : 'fork',
    env: {
      NODE_ENV: 'development',
      PORT: 3000,
      SESSION_SECRET: 'your-super-secret-session-key-change-in-production',
      // Database configuration
      DB_HOST: 'localhost',
      DB_USER: 'root',
      DB_PASSWORD: '',
      DB_NAME: 'portugalstore',
      DB_PORT: 3306,
      // Redis configuration
      REDIS_HOST: 'localhost',
      REDIS_PORT: 6379,
      REDIS_PASSWORD: '',
      // Email configuration (for development)
      EMAIL_HOST: 'smtp.gmail.com',
      EMAIL_PORT: 587,
      EMAIL_USER: '',
      EMAIL_PASS: '',
      // Stripe configuration (test keys)
      STRIPE_PUBLISHABLE_KEY: '',
      STRIPE_SECRET_KEY: '',
      // Other settings
      COOKIE_DOMAIN: '',
      TRUST_PROXY: 'false'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      SESSION_SECRET: process.env.SESSION_SECRET || 'CHANGE_THIS_IN_PRODUCTION',
      // Database configuration
      DB_HOST: process.env.DB_HOST || 'localhost',
      DB_USER: process.env.DB_USER || 'root',
      DB_PASSWORD: process.env.DB_PASSWORD || '',
      DB_NAME: process.env.DB_NAME || 'portugalstore',
      DB_PORT: parseInt(process.env.DB_PORT) || 3306,
      // Redis configuration
      REDIS_HOST: process.env.REDIS_HOST || 'localhost',
      REDIS_PORT: parseInt(process.env.REDIS_PORT) || 6379,
      REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',
      // Email configuration
      EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
      EMAIL_PORT: parseInt(process.env.EMAIL_PORT) || 587,
      EMAIL_USER: process.env.EMAIL_USER || '',
      EMAIL_PASS: process.env.EMAIL_PASS || '',
      // Stripe configuration
      STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || '',
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
      // Production settings
      COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || '',
      TRUST_PROXY: process.env.TRUST_PROXY || 'true',
      // Performance settings
      COMPRESSION_LEVEL: parseInt(process.env.COMPRESSION_LEVEL) || 6,
      SESSION_TTL: parseInt(process.env.SESSION_TTL) || 86400, // 24 hours
      CACHE_TTL_PRODUCTS: parseInt(process.env.CACHE_TTL_PRODUCTS) || 3600, // 1 hour
      CACHE_TTL_CATEGORIES: parseInt(process.env.CACHE_TTL_CATEGORIES) || 3600 // 1 hour
    },
    // Logging configuration
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    // Restart configuration
    max_memory_restart: '1G',
    restart_delay: 4000,
    // Environment variables for PM2
    env_production_staging: {
      NODE_ENV: 'staging',
      PORT: 3001
    }
  }],

  // Deployment configuration
  deploy: {
    production: {
      user: 'node',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/portugalstore.git',
      path: '/var/www/portugalstore',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};