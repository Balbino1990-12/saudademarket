# Auto-Increment Integer IDs Migration

## Overview
All table IDs have been changed from `VARCHAR(255)` to `INT AUTO_INCREMENT` for better performance and referential integrity.

## Tables Affected

### 1. **categories** table
- **Before**: `id VARCHAR(255) PRIMARY KEY`
- **After**: `id INT AUTO_INCREMENT PRIMARY KEY`
- **Auto-Increment Start**: 1
- **Seeding**: Categories are seeded without explicit IDs, database generates them

### 2. **products** table
- **Before**: `id VARCHAR(255) PRIMARY KEY`, `category_id VARCHAR(255)`
- **After**: `id INT AUTO_INCREMENT PRIMARY KEY`, `category_id INT`
- **Auto-Increment Start**: 1
- **Foreign Key**: `CONSTRAINT fk_product_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT ON UPDATE CASCADE`

### 3. **users** table
- **Before**: `id VARCHAR(255) PRIMARY KEY`
- **After**: `id INT AUTO_INCREMENT PRIMARY KEY`
- **Auto-Increment Start**: 1
- **Note**: Lookup by `username` instead of `id`

### 4. **roles** table
- **Before**: `id VARCHAR(255) PRIMARY KEY`
- **After**: `id INT AUTO_INCREMENT PRIMARY KEY`
- **Auto-Increment Start**: 1
- **Seeding**: Roles are seeded without explicit IDs, database generates them

### 5. **activities** table
- **Before**: Already using `INT AUTO_INCREMENT`
- **After**: No changes

### 6. **admins** table
- **Before**: Uses `username` as PRIMARY KEY (no changes)
- **After**: No changes

## Code Changes

### Database Configuration (`src/config/database.js`)
✅ **Table Creation Rules**:
- All `INT AUTO_INCREMENT PRIMARY KEY` columns now include `AUTO_INCREMENT=1` flag
- Removed string-based ID values from seeding logic
- Updated INSERT statements to exclude ID columns (database auto-generates them)

✅ **Auto-Migration Logic**:
- Added automatic migration for existing databases with VARCHAR IDs
- Migration creates backup tables (named with timestamp)
- Converts VARCHAR ID columns to INT AUTO_INCREMENT
- Preserves all data during migration
- Handles foreign key constraints properly

### Model Updates

#### `src/models/Category.js`
- **Removed**: `categoryData.id` generation logic
- **Changed**: `INSERT INTO categories (id, name_en, ...)` → `INSERT INTO categories (name_en, ...)`
- **Updated**: Returns category using `insertId` from query result

#### `src/models/Product.js`
- **Removed**: Requirement for `product.id` to be provided
- **Changed**: `INSERT INTO products (id, name_en, ...)` → `INSERT INTO products (name_en, ...)`
- **Updated**: Returns product using `insertId` from query result

#### `src/models/Role.js`
- **Removed**: `role.id` generation (was: `'role-' + name + '-' + timestamp`)
- **Changed**: `INSERT INTO roles (id, name, ...)` → `INSERT INTO roles (name, ...)`
- **Updated**: Returns role using `insertId` from query result

#### `src/models/User.js`
- **Removed**: `user.id` generation (was: `'user-' + timestamp + '-' + random`)
- **Changed**: `INSERT INTO users (id, username, ...)` → `INSERT INTO users (username, ...)`
- **Updated**: Returns user with `getByUsername()` instead of `getById()`

### Controller Updates

#### `src/controllers/ProductController.js`
- **Line 43**: Removed `product.id = product.name_en?.toLowerCase()...` ID generation
- **Line 118**: Removed `product.id = id` assignment in fallback create logic

## Query Examples

### Creating a New Category
```javascript
// Before
await pool.query(
  `INSERT INTO categories (id, name_en) VALUES (?, ?)`,
  ['wines', 'Wines']
);

// After
const result = await pool.query(
  `INSERT INTO categories (name_en) VALUES (?)`,
  ['Wines']
);
const categoryId = result[0].insertId; // Auto-generated
```

### Creating a New Product
```javascript
// Before
await pool.query(
  `INSERT INTO products (id, name_en, category_id) VALUES (?, ?, ?)`,
  [product.id, 'Wine Name', 'wines']
);

// After
const result = await pool.query(
  `INSERT INTO products (name_en, category_id) VALUES (?, ?)`,
  ['Wine Name', 1] // category_id is now INT
);
const productId = result[0].insertId; // Auto-generated
```

## Migration Process

When the application starts with an existing database:

1. **Detection Phase**: Check if tables have VARCHAR IDs
2. **Backup Phase**: Create timestamped backup tables
3. **Schema Conversion**: Drop and recreate tables with INT AUTO_INCREMENT
4. **Data Recovery**: Copy data back from backups
5. **Verification**: Ensure all data migrated successfully

### Backup Tables Created (if needed):
- `categories_backup_<timestamp>`
- `products_backup_<timestamp>`
- `users_backup_<timestamp>`
- `roles_backup_<timestamp>`

## Benefits

✅ **Performance**: Integer indexing is faster than string indexing
✅ **Storage**: INT (4 bytes) uses less space than VARCHAR(255)
✅ **Referential Integrity**: Foreign key relationships are more efficient
✅ **Standardization**: AUTO_INCREMENT is SQL standard
✅ **Scalability**: Better performance with large datasets

## Testing Checklist

- [ ] Database initializes without errors
- [ ] New categories are created with auto-generated IDs
- [ ] New products are created with auto-generated IDs
- [ ] New users are created with auto-generated IDs
- [ ] New roles are created with auto-generated IDs
- [ ] Products correctly reference categories (foreign key works)
- [ ] Deleting category with products returns 409 error
- [ ] Existing database migrates successfully without data loss
- [ ] API endpoints return correct integer IDs

## API Response Example

```json
{
  "id": 1,
  "name_en": "Wines",
  "name_fr": "Vins",
  "name_pt": "Vinhos",
  "icon": "🍷",
  "active": true,
  "created_at": "2026-03-11T10:30:00Z"
}
```

## Backward Compatibility Notes

⚠️ **Breaking Changes**:
- Any code expecting string IDs needs to be updated to use integer IDs
- API clients should no longer expect UUID or slug-based IDs
- Role references like `'role-admin'` no longer work; use numeric IDs instead

## Related Files
- [DATABASE_RELATIONSHIPS.md](DATABASE_RELATIONSHIPS.md) - Category-Product relationship documentation
- [src/config/database.js](src/config/database.js) - Database initialization and migration
- [src/models/](src/models/) - All model files with updated create methods
