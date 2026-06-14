# Production deployment checklist

This file adds a safe, non-invasive deployment path for the current project.

## 1) Prepare the environment file

Copy the production template:

```bash
cp .env.production.example .env.production
```

Edit `.env.production` with real values for:
- `SESSION_SECRET`
- `JWT_SECRET`
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `SMTP_*`
- `STRIPE_*`
- `APP_URL`

## 2) Install dependencies

```bash
npm install
npm run tailwind:build
```

## 3) Start the app with PM2

```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

If PM2 asks for startup, run the printed command exactly as shown.

## 4) Verify the process

```bash
pm2 status
pm2 logs portugalstore
```

## 5) Nginx reverse proxy (example)

Use the file `nginx-portugalstore.example.conf` as a template for your server.

```bash
sudo ln -s /path/to/this/repo/nginx-portugalstore.example.conf /etc/nginx/sites-enabled/portugalstore
sudo nginx -t
sudo systemctl reload nginx
```

## 6) Smoke test after deploy

- open `https://your-domain.com`
- test login and registration
- test cart and admin page
