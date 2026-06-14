# Security Middleware Implementation Guide

## Summary of Missing Security Middleware

This project was missing three critical security features:

### ✅ Now Implemented:

1. **helmet.js** - HTTP security headers
   - XSS protection
   - Clickjacking prevention (X-Frame-Options)
   - MIME type sniffing prevention
   - DNS prefetch control
   - Strict Transport Security (HSTS)
   - Referrer Policy
   - Content Security Policy (CSP)

2. **Rate Limiting** - Prevents brute force & DoS attacks
   - **Global limiter**: 100 requests per 15 minutes per IP
   - **Auth limiter**: 5 login attempts per 15 minutes (per username)
   - **Registration limiter**: 10 registrations per hour per IP
   - **API limiter**: 200 requests per 15 minutes per IP

3. **Input Sanitization** - NoSQL injection & XSS prevention
   - Data sanitization against NoSQL injection
   - XSS cleaning

## Installation Steps

### Step 1: Install Required Security Packages

Run the following command to install all required security packages:

```bash
npm install helmet express-rate-limit express-mongo-sanitize xss-clean
```

Or install them individually:

```bash
npm install helmet                  # HTTP security headers
npm install express-rate-limit      # Rate limiting
npm install express-mongo-sanitize  # NoSQL injection prevention
npm install xss-clean              # XSS attack prevention
```

### Step 2: Verify Installation

After installation, check that the packages are added to `package.json`:

```bash
npm list helmet express-rate-limit express-mongo-sanitize xss-clean
```

### Step 3: Test the Implementation

Start the server:

```bash
npm run dev
```

Check the security headers by making a request:

```bash
curl -I http://localhost:3000
```

You should see headers like:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security: max-age=31536000`
- `X-XSS-Protection: 1; mode=block`

### Step 4: Test Rate Limiting

Test the rate limiter by making multiple rapid requests:

```bash
# Test global rate limiter
for i in {1..101}; do curl http://localhost:3000; done

# Test auth rate limiter (5 failed logins)
for i in {1..6}; do curl -X POST http://localhost:3000/api/user/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"wrong"}'; done
```

You should see a 429 (Too Many Requests) status code after exceeding the limit.

## Files Modified

### New Files Created:
- `src/middleware/security.js` - Security middleware configuration

### Files Updated:
- `src/app.js` - Integrated helmet, rate limiting, and sanitization
- `src/routes/users.js` - Added registration rate limiter

## Configuration Details

### Rate Limiting Thresholds

You can adjust these in `src/middleware/security.js`:

```javascript
// Global limiter - 15 minutes window, 100 requests max
globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // Change this to adjust time window
  max: 100                    // Change this to adjust max requests
});

// Auth limiter - 15 minutes window, 5 attempts max
authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5
});

// Registration limiter - 1 hour window, 10 registrations max
registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10
});

// API limiter - 15 minutes window, 200 requests max
apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200
});
```

### Helmet Configuration

Helmet is configured with:
- Content Security Policy (CSP) - Controlled resource loading
- HSTS - Force HTTPS in production
- Frame Guard - Prevent clickjacking
- XSS Filter - Prevent XSS attacks
- Referrer Policy - Control referrer information
- No Sniff - Prevent MIME type sniffing

## Still Missing (For Production)

### 1. CSRF Protection
CSRF tokens are not yet implemented. To add CSRF protection:

```bash
npm install csurf
```

Then add to app.js:
```javascript
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: false });
app.use(csrfProtection);
```

### 2. Environment Configuration
Add to `.env`:
```
NODE_ENV=production
HELMET_ENABLED=true
RATE_LIMIT_ENABLED=true
```

### 3. Logging & Monitoring
- Implement request logging (morgan, winston)
- Add error tracking (Sentry)
- Monitor rate limit triggers

### 4. Input Validation
- Add express-validator for schema validation
- Validate all user inputs on both client and server

## Testing in Production

### Security Headers Check
Use online tools:
- https://securityheaders.com
- https://observatory.mozilla.org

### Load Testing
Test rate limiting under load:
```bash
npm install -g autocannon
autocannon -d 60 -c 100 http://localhost:3000
```

## Troubleshooting

### 1. Rate limiter not working?
- Check if `standardHeaders: true` is set (returns X-RateLimit headers)
- Verify IP detection (may need proxy configuration)
- Check logs for any errors

### 2. Security headers missing?
- Clear browser cache
- Disable browser extensions that modify headers
- Check CSP violations in browser console

### 3. Performance issues?
- Increase rate limit thresholds
- Add store configuration for distributed systems:
  ```javascript
  const RedisStore = require('rate-limit-redis');
  const redis = require('redis');
  const client = redis.createClient();
  ```

## Next Steps

1. ✅ Install the security packages
2. ✅ Test all endpoints
3. ⏳ Implement CSRF protection
4. ⏳ Add request logging
5. ⏳ Set up error tracking
6. ⏳ Configure environment variables for production
7. ⏳ Run security headers audit
