# PortugalStore Prototype

This repository contains a mockup of the PortugalStore website, featuring a simple Express backend and a vanilla HTML/CSS/JS front end. It has been progressively enhanced with product loading, cart functionality and Shopify integration.

## Running the project

```bash
npm install           # install dependencies (express, nodemon, dotenv, etc.)
npm run dev           # start development server
npm run dev:tailwind  # run Tailwind CLI watch for admin CSS while developing
```

Browse `http://localhost:3000` to see the storefront. `produits.html` will display products fetched from either a local `products.json` file or, if configured, from Shopify.

Admin pages are styled from `backend/admin/dist/admin-tailwind.css`, which is compiled from `backend/admin/admin-tailwind.css` using the Tailwind CLI.

## Shopify Integration

The server now includes additional routes that proxy to Shopify's APIs. You must configure credentials using environment variables (create a `.env` file at the project root):

```
SHOP_NAME=portugalstorefr.myshopify.com
SHOPIFY_ADMIN_TOKEN=your_admin_api_access_token   # Admin credentials (private)
SHOPIFY_STOREFRONT_TOKEN=your_storefront_access_token   # Public storefront token
```

- `GET /api/shopify/products` 
  - Fetches catalogue data from Shopify Admin API and returns the raw products array.
  - If the admin token is missing the route will respond with `500`.

- `POST /api/shopify/checkout` 
  - Accepts a JSON body with `{ lineItems: [{ variantId, quantity }, ...] }`.
  - Forwards the mutation to Shopify's Storefront GraphQL API to create a checkout.
  - Returns the GraphQL response; redirects to `checkout.webUrl` on the client.

### Obtaining tokens

1. Log in to your Shopify admin.
2. For the **Admin API access token**:
   - Go to Apps &gt; Develop apps &gt; [your app] &gt; **API credentials**.
   - Create an Admin API key with `read_products` scope and copy the token.
3. For the **Storefront API access token**:
   - In the same app page, go to **Storefront API access tokens** and click "Create token".
   - Ensure the token has `unauthenticated_read_product_listings` and `unauthenticated_write_checkouts` scopes.

Store these tokens in `.env` or your environment before running `npm run dev`.

## Frontend changes

`public/js/script.js` now:

* Attempts to load `/api/shopify/products` (if available) and maps the Shopify response to simple cards.
* Falls back to the local `products.json` if Shopify is not configured.
* Adds `data-price` attributes so carts carry price information.
* Builds a checkout using the `/api/shopify/checkout` endpoint when the user clicks "Passer commande".

## Further enhancements

- Replace the flat JSON file with a database or call the Shopify Storefront API directly from the browser.
- Authenticate customers using Shopify's customer accounts or a third‑party system.
- Add product detail pages, variant selectors, and real pricing/stock info.
- Implement webhooks to sync inventory, orders, etc.
- Add user management and persistent carts in a server‑side session.

This skeleton is meant as a starting point for a full e‑commerce prototype; feel free to extend it.

