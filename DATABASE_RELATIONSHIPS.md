# Database Relationships: Products & Categories

## Overview
Installed a proper one-to-many relationship between categories and products:
- **One Category** → can have **multiple Products**
- **One Product** → belongs to **exactly one Category**

---

## Database Schema

### Categories Table
```sql
CREATE TABLE categories (
  id VARCHAR(255) PRIMARY KEY,
  name_en VARCHAR(255) NOT NULL UNIQUE,
  name_fr VARCHAR(255) NOT NULL,
  name_pt VARCHAR(255) NOT NULL,
  description TEXT DEFAULT NULL,
  icon VARCHAR(10) DEFAULT '📦',
  color VARCHAR(7) DEFAULT '#c41e1e',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name_en (name_en),
  INDEX idx_active (active)
) ENGINE=InnoDB;
```

### Products Table
```sql
CREATE TABLE products (
  id VARCHAR(255) PRIMARY KEY,
  name_en VARCHAR(255) NOT NULL,
  name_fr VARCHAR(255) NOT NULL,
  name_pt VARCHAR(255) NOT NULL,
  category_id VARCHAR(255) NOT NULL,           -- Foreign Key to categories
  price DECIMAL(10,2) NOT NULL,
  image VARCHAR(500) DEFAULT NULL,
  description TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category_id (category_id),        -- Index for faster queries
  INDEX idx_name_en (name_en),
  CONSTRAINT fk_product_category FOREIGN KEY (category_id) 
    REFERENCES categories(id) 
    ON DELETE RESTRICT 
    ON UPDATE CASCADE
) ENGINE=InnoDB;
```

### Foreign Key Constraint Details
- **ON DELETE RESTRICT**: Prevents deletion of a category if it has products
- **ON UPDATE CASCADE**: Updates product references if category ID changes

---

## Model Methods

### Product Model (`src/models/Product.js`)

#### New/Updated Methods
```javascript
// Get all products with category details
Product.getAll()

// Get product by ID with category information
Product.getById(id)

// Get all products in a specific category
Product.getByCategoryId(categoryId)

// Create product with category_id
Product.create(product)

// Update product with category_id
Product.update(id, product)

// Count products in a category
Product.countByCategory(categoryId)

// Delete a product
Product.delete(id)
```

### Category Model (`src/models/Category.js`)

#### New Methods Added
```javascript
// Get category with all associated products
Category.getWithProducts(id)

// Get all categories with product counts
Category.getAllWithProductCounts()

// Get product count for a category
Category.getProductCount(categoryId)

// Check if category can be deleted (has no products)
Category.canDelete(id)
```

#### Existing Methods
```javascript
Category.getAll()
Category.getById(id)
Category.create(categoryData)
Category.update(id, categoryData)
Category.delete(id)
Category.count()
Category.existsByName(name)
```

---

## API Endpoints

### Public Endpoints

#### Get all categories
```
GET /api/categories
Response: [{ id, name_en, name_fr, name_pt, ... }]
```

#### Get categories with product counts
```
GET /api/categories/counts/all
Response: [{ id, name_en, ..., product_count }]
```

#### Get category by ID
```
GET /api/categories/:id
Response: { id, name_en, name_fr, ... }
```

#### Get category with products
```
GET /api/categories/:id/with-products
Response: { id, name_en, ..., products: [...], product_count: 5 }
```

#### Get category count
```
GET /api/categories/count
Response: { count: 4 }
```

### Protected Endpoints (Admin Only)

#### Create category
```
POST /api/categories
Headers: Authorization: Bearer token
Body: { name_en, name_fr, name_pt, description, icon, color }
```

#### Update category
```
PUT /api/categories/:id
Headers: Authorization: Bearer token
Body: { name_en, name_fr, name_pt, description, icon, color }
```

#### Delete category (only if no products)
```
DELETE /api/categories/:id
Headers: Authorization: Bearer token
Response: { success: true, message }
Error: 409 if category has products
```

---

## Product API Endpoints

### Get all products (with category info)
```
GET /api/products
Response: [{ id, name_en, category_id, category_name, category_icon, ... }]
```

### Get product by ID
```
GET /api/products/:id
Response: { id, name_en, category_id, category_name, category_icon, ... }
```

### Create product
```
POST /api/products
Headers: Authorization: Bearer token
Body: { name_en, name_fr, name_pt, category_id, price, image, description }
Required: name_en, category_id, price
```

### Update product
```
PUT /api/products/:id
Headers: Authorization: Bearer token
Body: { name_en, name_fr, name_pt, category_id, price, image, description }
```

### Delete product
```
DELETE /api/products/:id
Headers: Authorization: Bearer token
```

---

## Migration from Old Schema

### Automatic Migration
The `initDatabase()` function in `src/config/database.js` automatically:

1. **Checks** for old `category` column in products table
2. **Renames** `category` to `category_id` if needed
3. **Adds** timestamps (created_at, updated_at)
4. **Creates** indexes for category_id
5. **Adds** foreign key constraint

### Manual Data Migration (if needed)
If you need to manually update existing products to use category IDs:

```sql
-- For each old category name, find or create its ID in categories table
-- Then update products to use category_id instead of category name

-- Example: Associate all products with "Wines" category to wines category ID
UPDATE products 
SET category_id = 'wines' 
WHERE category = 'Wines';
```

---

## Data Integrity Features

### Referential Integrity
- ✅ Products **must** reference a valid category
- ✅ Categories **cannot** be deleted if they have products
- ✅ Cascading updates for category ID changes

### Validation
- ✅ Product creation requires valid `category_id`
- ✅ Category deletion checks for associated products
- ✅ Foreign key constraints prevent orphaned records

### Query Optimization
- ✅ Index on `products.category_id` for fast lookups
- ✅ Index on `categories.name_en` for name searches
- ✅ Efficient JOIN queries with category information

---

## Example Usage

### Backend JavaScript
```javascript
const Product = require('./src/models/Product');
const Category = require('./src/models/Category');

// Get all products with category info
const products = await Product.getAll();
// Result: [{ id, name_en, category_id, category_name, ... }]

// Get products in a specific category
const wines = await Product.getByCategoryId('wines');

// Get category with all its products
const categoryWithProducts = await Category.getWithProducts('wines');
// Result: { id, name_en, products: [...], product_count: 12 }

// Get all categories with product counts
const categoriesWithCounts = await Category.getAllWithProductCounts();
// Result: [{ id, name_en, product_count: 12 }, ...]
```

### Frontend (API Calls)
```javascript
// Get products for a category
const response = await fetch('/api/categories/wines/with-products');
const categoryData = await response.json();
console.log(`Category: ${categoryData.name_en}`);
console.log(`Products: ${categoryData.product_count}`);

// Create product with category
const productData = {
  name_en: 'Douro Red Wine',
  name_fr: 'Vin Rouge Douro',
  name_pt: 'Vinho Tinto Douro',
  category_id: 'wines',
  price: 25.99,
  description: 'Premium Portuguese wine'
};
const response = await fetch('/api/products', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer token' },
  body: JSON.stringify(productData)
});
```

---

## Benefits of This Relationship

| Benefit | Description |
|---------|-------------|
| **Data Integrity** | Prevents orphaned products or invalid category references |
| **Query Efficiency** | Indexes and JOINs make category-product queries fast |
| **Referential Integrity** | Database enforces relationship constraints |
| **Easy Maintenance** | Category updates automatically reflect in products |
| **Scalability** | Supports large catalogs with efficient queries |
| **API Clarity** | Clear relationship shown in API responses |

---

## Troubleshooting

### "Foreign key constraint fails"
- Check that category_id exists in categories table
- Ensure you're using correct category IDs

### "Cannot delete category with X products"
- Delete or reassign products to another category first
- Use `Category.getProductCount(categoryId)` to check

### "category column not migrated"
- Server should auto-migrate on startup
- Check server logs for migration status
- Manually run migration SQL if needed

---

## Next Steps

1. ✅ Update product creation forms to use category_id dropdown
2. ✅ Add category filters to product listings
3. ✅ Cascade deletion logic for advanced scenarios
4. ✅ Category-based product pagination
5. ✅ Full-text search by category + product name
