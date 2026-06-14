# PortugalStore

This repository is the working codebase for the PortugalStore storefront and admin platform. It combines a Node.js/Express backend, MySQL-backed data models, Redis/session support, Socket.IO real-time hooks, and a set of static storefront/admin HTML pages.

## What is in this project

- Storefront pages under `public/` and the main product detail page at the repository root.
- Admin interfaces under `backend/admin/` and `backend/user/`.
- Express API routes under `src/routes/` for products, categories, users, orders, cart, checkout, recommendations, analytics, specialties, coupons, returns, referrals, contact, chat, and Shopify integration.
- Server bootstrap in `server.js` -> `src/server.js` -> `src/app.js`.
- Database setup and table creation in `src/config/database.js`.

## Current runtime stack

- Node.js + Express
- MySQL (primary application database)
- Redis (optional session/cache support)
- Socket.IO (cart and real-time hooks)
- Tailwind-based admin styling
- Shopify and Stripe integrations
- OpenAI-powered chat support

## Prerequisites

Before starting the app, make sure you have:

- Node.js 18+ (the project is currently run with the standard Node toolchain)
- MySQL running locally or reachable via `DB_HOST`
- Optional: Redis if you want session caching enabled

## Installation

```bash
npm install
```

## Environment variables

Create a `.env` file at the project root before starting the app. At minimum, the application expects database and session settings such as:

```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=portugalstore_db

SESSION_SECRET=change-this-secret
APP_URL=http://localhost:3000

# Optional integrations
SHOP_NAME=portugalstorefr.myshopify.com
SHOPIFY_ADMIN_TOKEN=your_admin_token
SHOPIFY_STOREFRONT_TOKEN=your_storefront_token
STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
OPENAI_API_KEY=your_openai_key
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=password
SMTP_FROM=noreply@example.com
```

The server initializes its database automatically on startup, so the MySQL schema is created as needed.

## Running the project

Start the development server:

```bash
npm run dev
```

This launches the main application on `http://localhost:3000`.

Build the admin Tailwind CSS bundle:

```bash
npm run tailwind:build
```

For production-style PM2 deployment:

```bash
npm run prod
```

## Key entry points

- Storefront home: `/`
- Product listing: `/produits` or `/products`
- Cart: `/cart`
- Checkout: `/checkout`
- Admin login: `/admin/login`
- Admin dashboard: `/admin/dashboard`
- Health check: `/health`

## API areas

The main backend routes are organized under `src/routes/` and include:

- `/api/products` — products and catalog data
- `/api/categories` — category management
- `/api/users`, `/api/auth`, `/api/roles` — authentication and access control
- `/api/orders`, `/api/cart`, `/api/checkouts` — checkout and purchasing flows
- `/api/shopify` — Shopify product and checkout integration
- `/api/analytics`, `/api/recommendations`, `/api/comments`, `/api/coupons`, `/api/returns`, `/api/referrals`, `/api/expenses` — business features and reporting

## Notes for contributors

- The frontend is mostly static HTML/CSS/JS, with API-driven behavior added through the Express backend.
- The admin UI assets are generated from `backend/admin/admin-tailwind.css` into `backend/admin/dist/admin-tailwind.css`.
- The app is designed to run both as a local development project and as a deployed Node service.

This README reflects the current repository layout and runtime setup rather than an older prototype description.

