Shopify theme scaffold created from local static site.

What I added:
- `layout/theme.liquid` — theme layout
- `templates/index.liquid` — homepage template
- `sections/*` — header, hero, features, categories, specialties, cta, footer
- `assets/*` — `style.css`, `script.js`, `data.json` (placeholders)
- `locales/*` — `fr.json`, `pt.json`, `en.json`
- `config/settings_schema.json`

Next steps to publish:
1. Install Shopify CLI and authenticate with your store.
2. From project root run:

```bash
cd shopify-theme
shopify theme serve
```

3. When ready, publish or upload via `shopify theme push`.

Notes:
- Replace images in `shopify-theme/assets/` (logo.jpg, hero.jpg, charcutaria.jpg, etc.).
- The theme is minimal and uses static sections. For a production store you should map categories and products to Shopify Collections and Products.
