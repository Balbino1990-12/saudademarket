# Production Deployment Guide

This guide covers deploying the PortugalStore application to production with PM2 process management.

## Prerequisites

1. **Node.js** (v16 or higher)
2. **PM2** (installed globally or as dev dependency)
3. **MySQL** database server
4. **Redis** server (recommended for production)
5. **SSL certificate** (for HTTPS)

## Environment Setup

1. **Copy environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Configure environment variables in `.env`:**
   - Set `NODE_ENV=production`
   - Configure database credentials
   - Set a secure `SESSION_SECRET`
   - Configure Redis (if available)
   - Set up email and payment credentials

## Database Setup

1. **Create production database:**
   ```sql
   CREATE DATABASE portugalstore CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. **Run database migrations:**
   ```bash
   # Import your schema and initial data
   mysql -u username -p portugalstore < database_schema.sql
   ```

## Redis Setup (Recommended)

1. **Install Redis:**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install redis-server

   # CentOS/RHEL
   sudo yum install redis

   # macOS
   brew install redis
   ```

2. **Start Redis:**
   ```bash
   sudo systemctl start redis  # Linux
   brew services start redis   # macOS
   ```

## SSL/HTTPS Setup

For production, you should use HTTPS. Configure SSL certificates:

1. **Using Let's Encrypt (recommended):**
   ```bash
   sudo apt-get install certbot
   sudo certbot certonly --webroot -w /var/www/portugalstore/public -d yourdomain.com
   ```

2. **Update nginx configuration** (if using reverse proxy)

## Deployment Steps

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Install PM2 globally (optional):**
   ```bash
   npm install -g pm2
   ```

3. **Start application with PM2:**
   ```bash
   # Using npm script
   npm run prod

   # Or directly
   pm2 start ecosystem.config.js --env production
   ```

4. **Verify deployment:**
   ```bash
   pm2 status
   pm2 logs portugalstore
   ```

5. **Set up PM2 to start on boot:**
   ```bash
   pm2 startup
   pm2 save
   ```

## Production Configuration

### Process Management
- **Cluster mode:** Automatically scales to available CPU cores
- **Memory limits:** Restarts if memory usage exceeds 1GB
- **Auto-restart:** Automatic restart on crashes with 4-second delay

### Security Features
- **Trust proxy:** Configured for reverse proxy setups
- **Secure cookies:** HTTPS-only in production
- **Helmet security headers:** XSS protection, CSP, etc.
- **Rate limiting:** 100 requests per 15 minutes per IP
- **CSRF protection:** Enabled for forms

### Performance Optimizations
- **Compression:** Gzip compression for responses
- **Caching:** Redis for sessions and data caching
- **Static assets:** Long-term caching with proper headers
- **Database pooling:** Connection pooling for MySQL

## Monitoring

1. **PM2 Monitoring:**
   ```bash
   pm2 monit
   ```

2. **Logs:**
   ```bash
   pm2 logs portugalstore
   tail -f logs/error.log
   ```

3. **Process status:**
   ```bash
   pm2 status
   pm2 show portugalstore
   ```

## Maintenance

### Updates
```bash
# Pull latest changes
git pull origin main

# Install new dependencies
npm install

# Restart application
npm run prod:restart
```

### Backups
```bash
# Database backup
mysqldump -u username -p portugalstore > backup_$(date +%Y%m%d_%H%M%S).sql

# PM2 process dump
pm2 save
```

### Scaling
```bash
# Scale to specific number of instances
pm2 scale portugalstore 4

# Scale to max CPU cores
pm2 scale portugalstore max
```

## Troubleshooting

### Common Issues

1. **Redis connection fails:**
   - Check Redis is running: `redis-cli ping`
   - Verify Redis configuration in `.env`
   - Application falls back to memory store (not recommended for production)

2. **Database connection fails:**
   - Verify database credentials in `.env`
   - Check MySQL server is running
   - Ensure database exists

3. **Port already in use:**
   - Check what process is using the port: `lsof -i :3000`
   - Change PORT in `.env` or stop conflicting service

4. **Memory issues:**
   - Monitor with `pm2 monit`
   - Check logs for memory-related errors
   - Consider increasing server memory or optimizing code

### Logs Location
- Combined logs: `./logs/combined.log`
- Output logs: `./logs/out.log`
- Error logs: `./logs/error.log`

## Security Checklist

- [ ] `SESSION_SECRET` changed from default
- [ ] Database password set
- [ ] Redis password configured (if needed)
- [ ] SSL/HTTPS enabled
- [ ] Firewall configured
- [ ] File permissions set correctly
- [ ] Environment variables not committed to git
- [ ] Regular security updates applied

## Performance Tuning

### Environment Variables
```env
# Compression level (1-9, higher = better compression but slower)
COMPRESSION_LEVEL=6

# Session TTL in seconds
SESSION_TTL=86400

# Cache TTL for products in seconds
CACHE_TTL_PRODUCTS=3600

# Cache TTL for categories in seconds
CACHE_TTL_CATEGORIES=3600
```

### Database Optimization
- Ensure proper indexing on frequently queried columns
- Monitor slow queries with MySQL slow query log
- Consider read replicas for high-traffic sites

### CDN Integration
For static assets, consider using a CDN like Cloudflare:
1. Upload static files to CDN
2. Update `staticOptions` in `src/app.js` to use CDN URLs
3. Set longer cache headers for CDN-served assets