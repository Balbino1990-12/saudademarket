# OVHcloud deployment guide for PortugalStore

This guide is tailored for an OVHcloud Ubuntu VPS and uses the existing PM2 + Nginx flow already used by this project.

## 1) Prepare your OVH server

Connect to your VPS with SSH:

```bash
ssh root@YOUR_SERVER_IP
```

Update the system and install the base packages:

```bash
apt update && apt upgrade -y
apt install -y nginx curl git build-essential
```

Install Node.js 20 LTS:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v
npm -v
```

Install PM2 globally:

```bash
npm install -g pm2
pm2 --version
```

Install Certbot for HTTPS:

```bash
apt install -y certbot python3-certbot-nginx
```

---

## 2) Create the app directory

```bash
mkdir -p /var/www/portugalstore
cd /var/www/portugalstore
```

Clone the project into that folder:

```bash
git clone https://github.com/YOUR_USERNAME/portugalstore.git .
```

If you already have the repo locally, upload it with SCP/rsync instead.

---

## 3) Create the production environment file

Copy the safe template:

```bash
cp .env.production.example .env.production
```

Edit it with your real values:

```bash
nano .env.production
```

Minimum values to set:

```env
NODE_ENV=production
PORT=3000
APP_URL=https://your-domain.com
TRUST_PROXY=true
COOKIE_DOMAIN=.your-domain.com
SESSION_SECRET=replace-with-a-long-random-string
JWT_SECRET=replace-with-a-long-random-string
DB_HOST=your-db-host
DB_PORT=3306
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=portugalstore
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=notifications@your-domain.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@your-domain.com
CONTACT_ADMIN_EMAIL=admin@your-domain.com
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
```

Important:
- Do not use the default secret values.
- Do not commit `.env.production` to Git.

---

## 4) Install dependencies and build assets

```bash
npm install
npm run tailwind:build
```

This uses the project’s existing production asset build path.

---

## 5) Start the app with PM2

```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

If PM2 prints a startup command, run that exact command too.

Verify the app:

```bash
pm2 status
pm2 logs portugalstore
```

---

## 6) Configure Nginx as reverse proxy

Create a new Nginx config file:

```bash
nano /etc/nginx/sites-available/portugalstore
```

Use this example:

```nginx
server {
  listen 80;
  server_name your-domain.com www.your-domain.com;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl http2;
  server_name your-domain.com www.your-domain.com;

  ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

  client_max_body_size 20M;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 300s;
    proxy_send_timeout 300s;
  }
}
```

Enable it:

```bash
ln -s /etc/nginx/sites-available/portugalstore /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

---

## 7) Enable HTTPS with Let’s Encrypt

Make sure DNS for `your-domain.com` points to your OVH VPS IP.

Then run:

```bash
certbot --nginx -d your-domain.com -d www.your-domain.com
```

This will automatically create the certificates and update the Nginx config.

---

## 8) Verify the deployment

Open the live URL in your browser:

```text
https://your-domain.com
```

Smoke-test:
- homepage loads
- login works
- registration works
- cart flow works
- admin page loads

---

## 9) Useful OVH-specific maintenance commands

Restart the app:

```bash
pm2 restart portugalstore
```

View logs:

```bash
pm2 logs portugalstore
```

Check Nginx:

```bash
nginx -t
systemctl status nginx
```

Check the process:

```bash
pm2 status
```

---

## 10) Recommended production hardening on OVH

- use a strong `SESSION_SECRET` and `JWT_SECRET`
- keep HTTPS only
- set `TRUST_PROXY=true`
- use a real MySQL database, not local test data
- use a firewall (OVH firewall or UFW)
- keep `pm2` running on boot
- monitor logs regularly
