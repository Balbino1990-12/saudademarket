# AI Translator Implementation Guide - PortugalStore

## Overview
A complete internationalization (i18n) system has been implemented across the entire PortugalStore project. It supports 3 languages:
- **English (EN)** - Default
- **French (FR)** - Français  
- **Portuguese (PT)** - Português

## System Architecture

### 1. **Global i18n Module** (`/public/js/i18n.js`)
- Centralized translation system
- Automatic language detection and persistence
- AI-powered real-time translation via MyMemory API
- Auto-initialization on DOM load

### 2. **Static Translations** (`/public/translations.json`)
- Pre-translated strings for all UI elements
- Organized by language code
- Includes navigation, dashboard, and product management strings
- Supports fall back to AI translation for missing keys

### 3. **Language Selector**
- Floating language selector button
- Shows current language flag and code
- Dropdown menu with all supported languages
- Auto-positions from top-right

## Quick Start

### Step 1: Include i18n Script
Add to any HTML file's `<head>`:
```html
<script src="/js/i18n.js"></script>
```

The script auto-initializes and applies translations on page load.

### Step 2: Mark Translatable Elements
Add `data-i18n` attribute to any element:
```html
<!-- Simple text elements -->
<h1 data-i18n="nav.home">Home</h1>
<a data-i18n="nav.about">About</a>

<!-- With child elements (preserves them) -->
<button data-i18n="add_product">
  <span class="icon">+</span>
  Add Product
</button>

<!-- Form placeholders (requires JavaScript) -->
<input type="text" id="search" placeholder="Search..." />
<script>
  document.getElementById('search').placeholder = i18n.t('search.placeholder');
</script>
```

### Step 3: Add Language Selector (Optional)
Auto-added by i18n.js. To add to specific container:
```html
<div id="language-container"></div>
<script>
  i18n.addLanguageSelector('language-container');
</script>
```

## API Reference

### Core Functions

#### `i18n.init()`
Initialize the translation system
```javascript
i18n.init(); // Called automatically
```

#### `i18n.t(key, defaultValue)`
Get translation for a key
```javascript
i18n.t('nav.home'); // Returns translated text
i18n.t('missing.key', 'Default Text'); // Use default if missing
```

#### `i18n.setLanguage(lang)`
Switch to a different language
```javascript
i18n.setLanguage('fr'); // Switch to French
i18n.setLanguage('pt'); // Switch to Portuguese
```

#### `i18n.getLanguage()`
Get current language
```javascript
const lang = i18n.getLanguage(); // Returns 'en', 'fr', or 'pt'
```

#### `i18n.translate(text, targetLang)`
Translate text using AI (async)
```javascript
const translated = await i18n.translate('Hello World', 'fr');
// Returns: "Bonjour le monde"
```

#### `i18n.addLanguageSelector(containerId)`
Add language selector to page
```javascript
i18n.addLanguageSelector('my-container-id');
```

#### `i18n.getLanguages()`
Get all supported languages
```javascript
const langs = i18n.getLanguages();
// Returns: { en: {...}, fr: {...}, pt: {...} }
```

## Translation Keys Reference

### Navigation
- `nav.home` - Home
- `nav.products` - Products
- `nav.specialties` - Specialties
- `nav.wine` - Wine & Port
- `nav.grocery` - Grocery
- `nav.gifts` - Gift Sets
- `nav.about` - About
- `nav.contact` - Contact

### Dashboard (Seller)
- `seller_dashboard` - Seller Dashboard
- `my_products` - My Products
- `categories` - Categories
- `activities` - Activities
- `account_settings` - Account Settings
- `dashboard` - Dashboard
- `settings` - Settings
- `logout` - Logout

### Products
- `add_product` - Add Product
- `edit` - Edit
- `delete` - Delete
- `product_name` - Product Name
- `category` - Category
- `price` - Price
- `description` - Description
- `product_saved` - Product saved successfully!
- `product_created` - Product created successfully!
- `product_updated` - Product updated successfully!
- `product_deleted` - Product deleted successfully!

### Common UI
- `cancel` - Cancel
- `save_product` - Save Product
- `coming_soon` - Coming soon...
- `no_products` - No Products Found
- `loading_products` - Loading products...

## Implementation Examples

### Example 1: Simple Page Translation
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <script src="/js/i18n.js"></script>
</head>
<body>
    <nav>
        <a data-i18n="nav.home" href="/">Home</a>
        <a data-i18n="nav.products" href="/products">Products</a>
        <a data-i18n="nav.about" href="/about">About</a>
    </nav>
</body>
</html>
```

### Example 2: Dynamic Content Translation
```javascript
// Translate user input or dynamic content
async function translateUserMessage(message) {
    const translated = await i18n.translate(message, i18n.getLanguage());
    console.log(translated);
}

// Listen for language changes
window.addEventListener('languageChanged', (e) => {
    console.log('Language changed to:', e.detail.language);
});
```

### Example 3: Form Labels and Placeholders
```html
<form>
    <label data-i18n="product_name">Product Name</label>
    <input type="text" placeholder="..." />
    
    <label data-i18n="price_label">Price (€)</label>
    <input type="number" step="0.01" />
    
    <button type="submit" data-i18n="save_product">Save Product</button>
</form>
```

### Example 4: Conditional Translation in JavaScript
```javascript
function displayMessage(key) {
    const message = i18n.t(key, 'Default message');
    alert(message);
}

// Get translations for a list of products
const products = await fetch('/api/products').then(r => r.json());
products.forEach(product => {
    console.log(product.name); // Show in current language
});
```

## Adding Pages

### To add translation support to a new page:

1. **Add script tag** in `<head>`:
   ```html
   <script src="/js/i18n.js"></script>
   ```

2. **Mark elements** with `data-i18n`:
   ```html
   <h1 data-i18n="my.page.title">My Page Title</h1>
   ```

3. **Add keys** to `/public/translations.json`:
   ```json
   {
     "en": { "my.page.title": "My Page Title" },
     "fr": { "my.page.title": "Ma Page Titre" },
     "pt": { "my.page.title": "Meu Título da Página" }
   }
   ```

4. **Test**: 
   - Open page in browser
   - Click language selector → test switching languages
   - Text should update instantly

## Features

✅ **Automatic Initialization** - Works on page load  
✅ **Persistent Language Selection** - Saves to localStorage  
✅ **AI Translation API** - Real-time translation for missing keys  
✅ **Language Selector UI** - Built-in floating selector  
✅ **Event System** - Listen for language changes  
✅ **Fallback Support** - Uses English if translation missing  
✅ **Child Element Preservation** - Doesn't break nested HTML  
✅ **Case-Insensitive Keys** - Flexible key naming  

## Supported Languages

| Language | Code | Flag |
|----------|------|------|
| English | en | 🇬🇧 |
| French | fr | 🇫🇷 |
| Portuguese | pt | 🇵🇹 |

## Translation API

Currently uses **MyMemory Translated** for real-time AI translation:
- Free API (no key required)
- Supports 100+ language pairs
- ~500 requests/hour limit
- Fallback to original text if translation fails

Request: `https://api.mymemory.translated.net/get?q=TEXT&langpair=en|fr`

## Performance Considerations

- **Static translations** load from `/public/translations.json` (~30KB)
- **AI translations** cached for session
- **Language selector** minimal footprint
- **No external dependencies** (pure JavaScript)

## Troubleshooting

### Translations not appearing
1. Clear browser cache (Ctrl+Shift+Del)
2. Check browser console for errors
3. Verify `data-i18n` attributes are correct
4. Confirm translations.json is accessible at `/translations.json`

### Language selector not showing
1. Ensure `/js/i18n.js` is loaded
2. Check console for JavaScript errors
3. Verify page has a body element

### AI translation failing
1. Check internet connection
2. Verify MyMemory API is available
3. Check console for translation error details
4. Falls back to original text if API down

## Pages Currently Updated

✅ `/public/index.html` - Main homepage  
✅ `/backend/user/dashboard.html` - Seller dashboard  
⏳ Other public pages need script tag added  

## Next Steps

1. **Update all public pages** - Add `<script src="/js/i18n.js"></script>` to:
   - /public/contact.html
   - /public/produtos.html
   - /public/vin-porto.html
   - And all other .html files

2. **Add data-i18n attributes** to all translatable text

3. **Expand translations.json** as needed for new content

4. **Test language switching** on all pages

## Support

For issues or questions about the i18n system, check:
- Browser console (F12) for error messages
- `/public/js/i18n.js` for implementation details
- `/public/translations.json` for available translation keys
