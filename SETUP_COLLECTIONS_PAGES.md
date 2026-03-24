# PortugalStore Setup Guide - Creating Collections & Pages

Since the navigation now points to collections and pages, you need to create these in your Shopify admin.

## Quick Setup Instructions

### 1. Create Collections (via Shopify Admin)

Go to: **Admin > Products > Collections**

Create these collections with the following handles (use exactly these):

- **Collection Name**: All Products  
  **Handle**: `all`

- **Collection Name**: Specialties  
  **Handle**: `specialities`

- **Collection Name**: Wines  
  **Handle**: `wines`

- **Collection Name**: Grocery  
  **Handle**: `grocery`

- **Collection Name**: Gifts  
  **Handle**: `gifts`

Once created, add your products to each collection.

---

### 2. Create Pages (via Shopify Admin)

Go to: **Admin > Content > Pages**

Create these pages with the following handles:

- **Page Title**: About  
  **Handle**: `about`  
  **Content**: Add your company info here

- **Page Title**: Contact  
  **Handle**: `contact`  
  **Content**: Add your contact information here

---

### 3. Automatic Creation (Optional - requires API access)

If you have API credentials set up, you can use the automated script:

```bash
# Get your API access token from:
# Admin > Settings > Apps and integrations > Develop apps > [Your App] > Admin API access tokens

# Set environment variables (Windows PowerShell):
$env:SHOPIFY_SHOP_NAME = "portugalstorefr.myshopify.com"
$env:SHOPIFY_ACCESS_TOKEN = "your_access_token_here"

# Run the creation script
node create_pages.js
```

---

## Navigation Mapping (Updated)

| Nav Item | Link | Type | Handle |
|----------|------|------|--------|
| HOME | / | Home | - |
| PRODUCTS | /collections/all | Collection | `all` |
| SPECIALTIES | /collections/specialities | Collection | `specialities` |
| WINE & PORT | /collections/wines | Collection | `wines` |
| GROCERY | /collections/grocery | Collection | `grocery` |
| GIFT BOXES | /collections/gifts | Collection | `gifts` |
| ABOUT US | /pages/about | Page | `about` |
| CONTACT | /pages/contact | Page | `contact` |

---

## Testing

After creating collections and pages:
1. Click each navigation link to verify they work
2. Language switching (?locale=fr, ?locale=pt, ?locale=en) should work on all pages
3. Collections will display products you add to them

---

## Support

If you get 404 errors on any link:
1. Check that the collection/page exists in your admin
2. Verify the handle matches exactly (case-sensitive)
3. Ensure the collection/page is published (not archived)
