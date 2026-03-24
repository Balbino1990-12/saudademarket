# Quick i18n Markup Guide

The i18n.js script has been added to all 25 HTML pages. Now you need to mark translatable text with `data-i18n` attributes.

## How to Mark Elements for Translation

### 1. Simple Text Elements
```html
<!-- Before -->
<h1>Welcome</h1>
<p>Click here to continue</p>

<!-- After -->
<h1 data-i18n="welcome_title">Welcome</h1>
<p data-i18n="click_continue">Click here to continue</p>
```

### 2. Input Placeholders
```html
<!-- Before -->
<input type="text" placeholder="Enter your name">

<!-- After -->
<input type="text" placeholder="Enter your name" data-i18n-attr='{"placeholder":"input.name_placeholder"}'>
```

### 3. Buttons & Links
```html
<!-- Before -->
<button>Save</button>
<a href="/contact">Contact Us</a>

<!-- After -->
<button data-i18n="button.save">Save</button>
<a href="/contact" data-i18n="nav.contact">Contact Us</a>
```

### 4. Complex Elements with HTML
```html
<!-- Before -->
<p>Click <strong>here</strong> to learn more</p>

<!-- After -->
<p data-i18n="learn_more_link"><strong></strong></p>
<!-- Must add translations.json entry with HTML -->
```

## Step-by-Step Process

### Step 1: Identify Translatable Text
Review each HTML page and identify:
- Page titles and headings
- Button labels
- Link text
- Form labels and placeholders
- Error messages
- Status messages
- Navigation items

### Step 2: Create Translation Keys
Use a consistent naming pattern:
```
section.element_description
Examples:
- nav.home (navigation home link)
- button.save (save button)
- form.email_placeholder (email input)
- error.required_field (validation error)
```

### Step 3: Add to translations.json
```json
{
  "en": {
    "nav.home": "Home",
    "button.save": "Save",
    "form.email_placeholder": "Enter your email"
  },
  "fr": {
    "nav.home": "Accueil",
    "button.save": "Enregistrer",
    "form.email_placeholder": "Entrez votre email"
  },
  "pt": {
    "nav.home": "Início",
    "button.save": "Salvar",
    "form.email_placeholder": "Digite seu email"
  }
}
```

### Step 4: Add data-i18n Attribute to HTML
```html
<a href="/" data-i18n="nav.home">Home</a>
<button data-i18n="button.save">Save</button>
<input 
  type="email" 
  placeholder="Enter your email" 
  data-i18n-attr='{"placeholder":"form.email_placeholder"}'
>
```

## Pages Needing Markup (Priority Order)

### 🔴 High Priority (Most Visited)
1. **public/index.html** - DONE ✅
2. **public/contact.html** - Form labels, messages
3. **public/produtos.html** - Product filters, sort options
4. **backend/user/dashboard.html** - DONE ✅
5. **public/cabazes.html** - Product category page

### 🟡 Medium Priority
6. public/coffrets.html
7. public/epicerie.html
8. public/mercaria.html
9. public/especialidades.html
10. public/vin-porto.html

### 🟢 Lower Priority (Backend Admin)
11. backend/admin/categories.html
12. backend/admin/products.html
13. backend/admin/users.html
14. backend/admin/roles.html

## Translation Key Categories

### Navigation
```
nav.home
nav.products
nav.specialties
nav.wine
nav.grocery
nav.gifts
nav.about
nav.contact
```

### Forms & Inputs
```
form.name_placeholder
form.email_placeholder
form.message_placeholder
form.submit
form.cancel
form.required_field
```

### Buttons
```
button.save
button.delete
button.edit
button.add
button.cancel
button.logout
```

### Messages
```
status.success
status.error
status.loading
message.confirm_delete
message.unsaved_changes
```

### Dashboard (Already Done)
```
seller_dashboard
my_products
categories
activities
account_settings
```

## Quick Testing

After adding markup, test:

1. **Open browser DevTools** (F12)
2. **Go to index.html**
3. **Open Console** and run:
```javascript
// Check current language
console.log(i18n.getLanguage());

// Translate a key
console.log(i18n.t('nav.home'));

// Switch language
i18n.setLanguage('fr');

// Refresh page to see translations apply
```

4. **Click language selector** at top-right or bottom of page
5. **Verify text updates** when switching languages
6. **Check browser localStorage** in DevTools:
   - Application > Local Storage > your domain
   - Should have `language` key with current language code

## Common Mistakes to Avoid

❌ **Wrong**: Nested data-i18n on child elements
```html
<p data-i18n="text">
  Click <strong data-i18n="strong_text">here</strong>
</p>
```

✅ **Right**: One data-i18n on parent, preserve children
```html
<p data-i18n="text">
  Click <strong></strong>
</p>
```

---

❌ **Wrong**: data-i18n="My Text" (using literal text)
```html
<h1 data-i18n="Welcome to our store">Welcome</h1>
```

✅ **Right**: data-i18n with translation key
```html
<h1 data-i18n="home.welcome_title">Welcome</h1>
```

---

❌ **Wrong**: Forgetting to add key to translations.json
```html
<p data-i18n="some.key">Text</p>
<!-- Key must exist in translations.json -->
```

## Batch Editing Tips

For pages with many similar elements, use Find & Replace:

**Find**: 
```
<h1>(.*?)</h1>
```

**Replace with**:
```
<h1 data-i18n="heading.replace_with_key">$1</h1>
```

Then create the keys in translations.json.

## Automated Translation

Once keys are marked with `data-i18n`, you can auto-translate:

```javascript
// In browser console
const texts = {
  'en': 'Save Changes',
  'fr': 'Enregistrer les modifications', 
  'pt': 'Salvar Alterações'
};

// Use AI to translate:
i18n.translate('Save Changes', 'fr').then(result => {
  console.log(result); // AI translation
});
```

## Deployment Checklist

- [ ] All visible text marked with `data-i18n` attributes
- [ ] All translation keys exist in JSON for all 3 languages
- [ ] No missing keys (check browser console for warnings)
- [ ] Language switching works on all pages
- [ ] localStorage persistence working
- [ ] Mobile layout supports language selector
- [ ] No broken links after adding attributes

## Support

For complex scenarios, see [I18N_GUIDE.md](I18N_GUIDE.md) for:
- Dynamic content translation
- Batch operations
- Performance optimization
- Troubleshooting
- API reference
