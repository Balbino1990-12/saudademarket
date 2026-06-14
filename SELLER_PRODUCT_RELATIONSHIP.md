# Seller-Product Relationship Documentation

## Overview

A one-to-many relationship has been established between **sellers** (users) and **products**. Each product is now associated with exactly one seller (user), and a seller can have multiple products.

## Database Schema

### Products Table Update

The `products` table now includes a `seller_id` foreign key that links to the `users` table:

```sql
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name_fr VARCHAR(255) NOT NULL,
  name_pt VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  category_id INT NOT NULL,
  seller_id INT NOT NULL,                    -- NEW: Foreign key to users table
  price DECIMAL(10,2) NOT NULL,
  image VARCHAR(500) DEFAULT NULL,
  description TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_seller_id (seller_id),           -- NEW: Index for fast lookups
  CONSTRAINT fk_product_seller FOREIGN KEY (seller_id) REFERENCES users(id) 
    ON DELETE CASCADE ON UPDATE CASCADE      -- CASCADE: Delete products when seller is deleted
);
```

### Foreign Key Behavior

- **ON DELETE CASCADE**: If a seller (user) is deleted, all their products are automatically deleted
- **ON UPDATE CASCADE**: If a seller's user ID is updated, all their products are automatically updated

### Current Database State

```
✓ Products table structure includes:
  - seller_id: INT (indexed as MUL - Multiple)
  
✓ Foreign Keys established:
  - fk_product_seller: seller_id → users.id (CASCADE on delete/update)
  - fk_product_category: category_id → categories.id (RESTRICT on delete)
```

## Model Methods

### Product Model Enhancements

#### New Methods

1. **`getBySellerId(sellerId)`**
   ```javascript
   const products = await Product.getBySellerId(userId);
   // Returns: Array of products with category and seller info
   ```
   - Retrieves all products from a specific seller
   - Includes category details and seller information
   - Ordered by creation date (newest first)

2. **`countBySellerId(sellerId)`**
   ```javascript
   const count = await Product.countBySellerId(userId);
   // Returns: Integer count
   ```
   - Returns the number of products from a seller
   - Used for validation and statistics

3. **`isSeller(productId, userId)`**
   ```javascript
   const isOwner = await Product.isSeller(productId, userId);
   // Returns: Boolean
   ```
   - Checks if a user owns (is seller of) a product
   - Used for authorization checks before updates/deletes

4. **`getSeller(productId)`**
   ```javascript
   const seller = await Product.getSeller(productId);
   // Returns: { id, username, email, first_name, last_name }
   ```
   - Retrieves seller information for a product
   - Includes contact details for buyer interactions

#### Updated Methods

1. **`getAll()`** - Now includes seller information
   ```javascript
   // Returns products with JOIN to get:
   // - seller_username, seller_email
   ```

2. **`getById(id)`** - Now includes seller information
   ```javascript
   // Returns product with JOIN to get:
   // - seller_username, seller_email, seller_first_name, seller_last_name
   ```

3. **`getByCategoryId(categoryId)`** - Now includes seller information

4. **`create(product)`** - Now requires seller_id
   ```javascript
   const product = {
     name_en: 'Product Name',
     name_fr: 'Nom du produit',
     name_pt: 'Nome do produto',
     category_id: 1,
     seller_id: 5,              // NEW: Required field
     price: 29.99,
     description: 'Description'
   };
   const created = await Product.create(product);
   ```

## API Endpoints

### New Routes

#### Get Products by Seller
```http
GET /api/products/seller/:sellerId
```
- **Parameters**: `sellerId` (integer)
- **Response**: Array of products with category and seller details
- **Example**: `GET /api/products/seller/5`

#### Check Ownership
```http
GET /api/products/check-owner/:productId/:userId
```
- **Parameters**: 
  - `productId` (integer)
  - `userId` (integer)
- **Response**: 
  ```json
  {
    "isOwner": true,
    "productId": 1,
    "userId": 5
  }
  ```
- **Use Case**: Authorization check before allowing product updates/deletion

### Updated Routes

#### Create Product
```http
POST /api/products
```
- **Required Middleware**: `verifyAnySession`, `checkPermission('manage_products')`
- **Required Fields**: 
  - `name_en`
  - `category_id`
  - `seller_id` (NEW)
  - `price`
- **Request Body**:
  ```json
  {
    "name_en": "Product Name",
    "name_fr": "Nom du produit",
    "name_pt": "Nome do produto",
    "category_id": 1,
    "seller_id": 5,
    "price": 29.99,
    "description": "Product description"
  }
  ```

## Controller Methods

### ProductController Enhancements

1. **`getBySeller(req, res, next)`**
   - Route: `GET /api/products/seller/:sellerId`
   - Validates `sellerId` parameter
   - Returns products for that seller

2. **`checkOwnership(req, res, next)`**
   - Route: `GET /api/products/check-owner/:productId/:userId`
   - Validates both parameters
   - Returns ownership status

3. **`create(req, res, next)` - Updated**
   - Now validates `seller_id` as required field
   - Ensures seller_id is integer before saving
   - Returns created product with seller information

## Data Migration

### Automatic Migration Process

When the server starts:
1. Checks if `seller_id` column exists in products table
2. If missing:
   - Adds `seller_id INT` column
   - Creates foreign key constraint
   - Adds index on `seller_id`
   - Logs all migration steps

### Migration Code Location
- File: `src/config/database.js`
- Section: "Migrate products table: add seller_id column if it doesn't exist"

## Authorization & Security

### Ownership Verification

Products should be protected with ownership checks:

```javascript
// Example: Verify user owns product before update/delete
const isOwner = await Product.isSeller(productId, userId);
if (!isOwner && !isAdmin) {
  return res.status(403).json({ error: 'Unauthorized: Not product owner' });
}
```

### Recommended Implementation

Update form validation in dashboard:
```javascript
// Check if logged-in user matches product seller_id
const seller = await Product.getSeller(productId);
if (seller.id !== currentUserId) {
  disableEditButton();
}
```

## Query Examples

### SQL Queries

Get all products from a seller with category info:
```sql
SELECT p.*, c.name_en as category_name, u.username as seller_username
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN users u ON p.seller_id = u.id
WHERE p.seller_id = 5
ORDER BY p.created_at DESC;
```

Count products per seller:
```sql
SELECT u.username, COUNT(p.id) as product_count
FROM users u
LEFT JOIN products p ON u.id = p.seller_id
GROUP BY u.id, u.username;
```

### JavaScript Queries

```javascript
// Get all products from a seller
const sellerProducts = await Product.getBySellerId(5);

// Count seller's products
const count = await Product.countBySellerId(5);

// Check if user owns product
const owns = await Product.isSeller(1, 5);

// Get seller info
const seller = await Product.getSeller(1);

// Get product with seller details
const product = await Product.getById(1);
console.log(product.seller_username);
console.log(product.seller_email);
```

## Frontend Integration

### Update Product Creation Form

The product creation form needs to capture or have `seller_id`:

```javascript
// In dashboard.html form
const seller_id = getCurrentUserId(); // From session
const formData = new FormData();
formData.append('name_en', productName);
formData.append('category_id', categoryId);
formData.append('seller_id', seller_id);  // NEW
formData.append('price', price);
formData.append('image', imageFile);

// Submit to /api/products
const response = await fetch('/api/products', {
  method: 'POST',
  headers: { 'x-user-token': userToken },
  body: formData
});
```

### Display Seller Information

Show seller details on product pages:

```html
<div class="product-seller">
  <h4>Sold by: <span id="seller-name"></span></h4>
  <p>Email: <span id="seller-email"></span></p>
  <p>Contact: <span id="seller-phone"></span></p>
</div>

<script>
// When loading product detail
const product = await fetch(`/api/products/${productId}`);
const data = await product.json();

document.getElementById('seller-name').textContent = data.seller_username;
document.getElementById('seller-email').textContent = data.seller_email;
</script>
```

## Testing Checklist

- [ ] New product creation includes `seller_id`
- [ ] Products list shows seller information
- [ ] `GET /api/products/seller/:sellerId` returns correct products
- [ ] `GET /api/products/check-owner/:productId/:userId` works correctly
- [ ] Sellers can only edit their own products
- [ ] Deleting a user deletes their products (CASCADE)
- [ ] Product detail page shows seller contact information
- [ ] Seller profile shows count of their products
- [ ] Database migration runs on server startup
- [ ] Foreign key constraints enforced in database

## Related Documentation

- [DATABASE_RELATIONSHIPS.md](DATABASE_RELATIONSHIPS.md) - Category-Product relationship
- [AUTO_INCREMENT_IDS.md](AUTO_INCREMENT_IDS.md) - Integer ID implementation
- [src/models/Product.js](src/models/Product.js) - Product model implementation
- [src/controllers/ProductController.js](src/controllers/ProductController.js) - Product controller methods
- [src/routes/products.js](src/routes/products.js) - Product API routes

