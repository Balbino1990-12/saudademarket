const mysql = require('mysql2/promise');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const DB_NAME = process.env.DB_NAME || 'portugalstore_db';

// Export object that will hold the pool
const db = {
  pool: null
};

/**
 * Initialize database connection and create tables
 */
async function initDatabase() {
  try {
    // First, create a connection without database to create the database if it doesn't exist
    const adminConn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });

    // Create database if it doesn't exist
    await adminConn.query(`CREATE DATABASE IF NOT EXISTS ${DB_NAME}`);
    console.log(`✓ Database '${DB_NAME}' ready`);
    await adminConn.end();

    // Now create the pool with the database
    db.pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  } catch (err) {
    console.error('✗ Database initialization failed:', err.message);
    throw err;
  }
  const createCategories = `
    CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
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
    ) ENGINE=InnoDB AUTO_INCREMENT=1;
  `;

  const createProducts = `
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name_fr VARCHAR(255) NOT NULL,
      name_pt VARCHAR(255) NOT NULL,
      name_en VARCHAR(255) NOT NULL,
      category_id INT NOT NULL,
      user_id INT NOT NULL,
      quantity INT NOT NULL DEFAULT 0,
      price DECIMAL(10,2) NOT NULL,
      image VARCHAR(500) DEFAULT NULL,
      description TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_category_id (category_id),
      INDEX idx_user_id (user_id),
      INDEX idx_name_en (name_en),
      CONSTRAINT fk_product_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT fk_product_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB AUTO_INCREMENT=1;
  `;

  const createAdmins = `
    CREATE TABLE IF NOT EXISTS admins (
      username VARCHAR(100) PRIMARY KEY,
      password VARCHAR(255) NOT NULL,
      email VARCHAR(255)
    ) ENGINE=InnoDB;
  `;

  const createRoles = `
    CREATE TABLE IF NOT EXISTS roles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      description TEXT DEFAULT NULL,
      permissions JSON DEFAULT NULL,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_name (name),
      INDEX idx_active (active)
    ) ENGINE=InnoDB AUTO_INCREMENT=1;
  `;

  const createUsers = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      email VARCHAR(255) UNIQUE DEFAULT NULL,
      password VARCHAR(255) NOT NULL,
      first_name VARCHAR(100) DEFAULT '',
      last_name VARCHAR(100) DEFAULT '',
      phone_number VARCHAR(20) DEFAULT NULL,
      city VARCHAR(100) DEFAULT NULL,
      role_id INT DEFAULT NULL,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_username (username),
      INDEX idx_email (email),
      INDEX idx_role_id (role_id),
      INDEX idx_active (active),
      CONSTRAINT fk_user_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB AUTO_INCREMENT=1;
  `;

  const createActivities = `
    CREATE TABLE IF NOT EXISTS activities (
      id INT AUTO_INCREMENT PRIMARY KEY,
      type VARCHAR(100) NOT NULL,
      message TEXT NOT NULL,
      details JSON DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_created_at (created_at DESC)
    ) ENGINE=InnoDB;
  `;

  const createSpecialties = `
    CREATE TABLE IF NOT EXISTS specialties (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name_en VARCHAR(255) NOT NULL,
      name_fr VARCHAR(255) NOT NULL,
      name_pt VARCHAR(255) NOT NULL,
      category VARCHAR(255) NOT NULL,
      description TEXT DEFAULT NULL,
      image VARCHAR(500) DEFAULT NULL,
      icon VARCHAR(100) DEFAULT NULL,
      color VARCHAR(50) DEFAULT NULL,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_name_en (name_en),
      INDEX idx_category (category),
      INDEX idx_active (active)
    ) ENGINE=InnoDB AUTO_INCREMENT=1;
  `;

  const createCart = `
    CREATE TABLE IF NOT EXISTS cart (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      product_id INT NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      INDEX idx_product_id (product_id),
      UNIQUE KEY unique_user_product (user_id, product_id),
      CONSTRAINT fk_cart_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_cart_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB AUTO_INCREMENT=1;
  `;

  const createRecommendationProducts = `
    CREATE TABLE IF NOT EXISTS recommendation_products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      priority INT NOT NULL DEFAULT 0,
      active BOOLEAN DEFAULT true,
      created_by INT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_recommendation_product (product_id),
      INDEX idx_recommendation_active (active),
      INDEX idx_recommendation_priority (priority DESC),
      INDEX idx_recommendation_created_by (created_by),
      CONSTRAINT fk_recommendation_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_recommendation_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB AUTO_INCREMENT=1;
  `;



  await db.pool.query(createRoles);
  await db.pool.query(createUsers);
  await db.pool.query(createCategories);
  await db.pool.query(createProducts);
  await db.pool.query(createAdmins);
  await db.pool.query(createActivities);
  await db.pool.query(createSpecialties);
  await db.pool.query(createCart);
  await db.pool.query(createRecommendationProducts);

  // Add missing columns to users table if they don't exist
  try {
    const checkPhoneNumber = `ALTER TABLE users ADD COLUMN phone_number VARCHAR(20) DEFAULT NULL`;
    const checkCity = `ALTER TABLE users ADD COLUMN city VARCHAR(100) DEFAULT NULL`;
    
    try {
      await db.pool.query(checkPhoneNumber);
      console.log('✓ Added phone_number column to users table');
    } catch (err) {
      if (!err.message.includes('Duplicate column')) {
        console.warn('⚠ Could not add phone_number column:', err.message);
      }
    }

    try {
      await db.pool.query(checkCity);
      console.log('✓ Added city column to users table');
    } catch (err) {
      if (!err.message.includes('Duplicate column')) {
        console.warn('⚠ Could not add city column:', err.message);
      }
    }
  } catch (err) {
    console.warn('Could not update users table schema:', err.message);
  }

  // Migrate products table: rename 'category' column to 'category_id' if it exists
  try {
    // First check if products table has old 'category' column but not 'category_id'
    const [columns] = await db.pool.query(`SHOW COLUMNS FROM products`);
    const hasOldCategory = columns.some(col => col.Field === 'category');
    const hasNewCategoryId = columns.some(col => col.Field === 'category_id');
    const hasCreatedAt = columns.some(col => col.Field === 'created_at');
    const hasQuantity = columns.some(col => col.Field === 'quantity');

    if (hasOldCategory && !hasNewCategoryId) {
      // Rename 'category' to 'category_id'
      await db.pool.query(`ALTER TABLE products CHANGE COLUMN category category_id VARCHAR(255) NOT NULL`);
      console.log('✓ Renamed category column to category_id in products table');
    }

    // Add timestamps if missing
    if (!hasCreatedAt) {
      await db.pool.query(`ALTER TABLE products ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
      await db.pool.query(`ALTER TABLE products ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
      console.log('✓ Added timestamps to products table');
    }

    if (!hasQuantity) {
      await db.pool.query(`ALTER TABLE products ADD COLUMN quantity INT NOT NULL DEFAULT 0 AFTER user_id`);
      console.log('âœ“ Added quantity column to products table');
    }

    // Add index on category_id if it doesn't exist
    const [indexes] = await db.pool.query(`SHOW INDEX FROM products WHERE Column_name = 'category_id'`);
    if (indexes.length === 0) {
      await db.pool.query(`ALTER TABLE products ADD INDEX idx_category_id (category_id)`);
      console.log('✓ Added index on category_id');
    }

    // Drop old foreign key if it exists and recreate it
    try {
      await db.pool.query(`ALTER TABLE products DROP FOREIGN KEY fk_product_category`);
      console.log('✓ Dropped existing foreign key');
    } catch (err) {
      // Foreign key doesn't exist, which is fine
    }

    // Add foreign key constraint
    try {
      await db.pool.query(`ALTER TABLE products ADD CONSTRAINT fk_product_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT ON UPDATE CASCADE`);
      console.log('✓ Added foreign key constraint: products.category_id -> categories.id');
    } catch (err) {
      if (!err.message.includes('already exists')) {
        console.warn('⚠ Could not add foreign key constraint:', err.message);
      }
    }
  } catch (err) {
    console.warn('⚠ Could not migrate products table schema:', err.message);
  }

  // Migrate products table: add user_id column if it doesn't exist
  try {
    const [columns] = await db.pool.query(`SHOW COLUMNS FROM products`);
    const hasUserId = columns.some(col => col.Field === 'user_id');
    const hasSellerId = columns.some(col => col.Field === 'seller_id');

    console.log(`❖ Product table columns check: hasUserId=${hasUserId}, hasSellerId=${hasSellerId}`);

    // Migrate from seller_id to user_id if seller_id exists and user_id doesn't
    if (hasSellerId && !hasUserId) {
      console.log('↻ Migrating seller_id to user_id in products table...');
      try {
        await db.pool.query(`ALTER TABLE products DROP FOREIGN KEY fk_product_seller`);
      } catch (err) {
        // Foreign key might not exist
      }
      await db.pool.query(`ALTER TABLE products CHANGE COLUMN seller_id user_id INT`);
      console.log('✓ Renamed seller_id to user_id');
    }
    // Only add user_id column if neither seller_id nor user_id exist
    else if (!hasUserId && !hasSellerId) {
      console.log('↻ Adding user_id column to products table...');
      
      // Add user_id column (nullable initially)
      await db.pool.query(`ALTER TABLE products ADD COLUMN user_id INT DEFAULT NULL`);
      console.log('✓ Added user_id column to products table');
    }

    // Ensure all products have a user_id (set to 1 if NULL)
    try {
      const [result] = await db.pool.query(`SELECT COUNT(*) as count FROM products WHERE user_id IS NULL`);
      if (result[0].count > 0) {
        console.log(`↻ Setting user_id for ${result[0].count} products without user...`);
        await db.pool.query(`UPDATE products SET user_id = 1 WHERE user_id IS NULL`);
        console.log('✓ Defaulted user_id to 1 for orphaned products');
      }
    } catch (err) {
      console.warn('⚠ Could not update orphaned products:', err.message);
    }

    // Make user_id NOT NULL
    try {
      await db.pool.query(`ALTER TABLE products MODIFY user_id INT NOT NULL`);
      console.log('✓ Set user_id as NOT NULL');
    } catch (err) {
      // Might already be NOT NULL
      if (!err.message.includes('Syntax error')) {
        console.warn('⚠ Could not make user_id NOT NULL:', err.message);
      }
    }

    // Add foreign key constraint for user_id
    try {
      await db.pool.query(`ALTER TABLE products DROP FOREIGN KEY fk_product_user`);
    } catch (err) {
      // Foreign key doesn't exist, which is fine
    }

    try {
      await db.pool.query(`ALTER TABLE products ADD CONSTRAINT fk_product_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE`);
      console.log('✓ Added foreign key constraint: products.user_id -> users.id');
    } catch (err) {
      if (!err.message.includes('already exists')) {
        console.warn('⚠ Could not add user foreign key constraint:', err.message);
      }
    }

    // Add index on user_id if it doesn't exist
    try {
      await db.pool.query(`ALTER TABLE products ADD INDEX idx_user_id (user_id)`);
      console.log('✓ Added index on user_id');
    } catch (err) {
      if (!err.message.includes('already exists') && !err.message.includes('Duplicate key')) {
        console.warn('⚠ Could not add index on user_id:', err.message);
      }
    }
  } catch (err) {
    console.warn('⚠ Could not migrate user_id column:', err.message);
  }

  // Migrate users table: add role_id column and migrate from role varchar
  try {
    const [columns] = await db.pool.query(`SHOW COLUMNS FROM users`);
    const hasRoleId = columns.some(col => col.Field === 'role_id');
    const hasRoleVarchar = columns.some(col => col.Field === 'role');

    console.log(`❖ Users table columns check: hasRoleId=${hasRoleId}, hasRoleVarchar=${hasRoleVarchar}`);

    // If role_id doesn't exist, add it
    if (!hasRoleId) {
      console.log('↻ Adding role_id column to users table...');
      await db.pool.query(`ALTER TABLE users ADD COLUMN role_id INT DEFAULT NULL`);
      console.log('✓ Added role_id column to users table');
    }

    // If both exist, migrate data from role varchar to role_id
    if (hasRoleVarchar && hasRoleId) {
      console.log('↻ Migrating role names to role_id mapping...');
      
      // Get all unique role names from users table
      const [userRoles] = await db.pool.query(`SELECT DISTINCT role FROM users WHERE role IS NOT NULL AND role != ''`);
      
      for (const userRole of userRoles) {
        const roleName = userRole.role;
        // Check if this role exists in roles table
        const [existingRole] = await db.pool.query(`SELECT id FROM roles WHERE name = ?`, [roleName]);
        
        if (existingRole.length > 0) {
          const roleId = existingRole[0].id;
          // Update users with this role name to have the correct role_id
          await db.pool.query(`UPDATE users SET role_id = ? WHERE role = ?`, [roleId, roleName]);
          console.log(`✓ Migrated role '${roleName}' to role_id ${roleId}`);
        }
      }
    }

    // Add foreign key constraint if it doesn't exist
    try {
      await db.pool.query(`ALTER TABLE users DROP FOREIGN KEY fk_user_role`);
    } catch (err) {
      // Foreign key doesn't exist, which is fine
    }

    try {
      await db.pool.query(`ALTER TABLE users ADD CONSTRAINT fk_user_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL ON UPDATE CASCADE`);
      console.log('✓ Added foreign key constraint: users.role_id -> roles.id');
    } catch (err) {
      if (!err.message.includes('already exists')) {
        console.warn('⚠ Could not add role foreign key constraint:', err.message);
      }
    }

    // Drop old role column if it exists (after migration)
    if (hasRoleVarchar && hasRoleId) {
      try {
        // Check if there are any remaining NULL values in role_id
        const [nullCount] = await db.pool.query(`SELECT COUNT(*) as count FROM users WHERE role_id IS NULL`);
        if (nullCount[0].count > 0) {
          console.log(`↻ Setting default role_id for ${nullCount[0].count} users...`);
          // Set default role_id to 1 (admin or first role)
          const [firstRole] = await db.pool.query(`SELECT id FROM roles ORDER BY id LIMIT 1`);
          if (firstRole.length > 0) {
            await db.pool.query(`UPDATE users SET role_id = ? WHERE role_id IS NULL`, [firstRole[0].id]);
            console.log('✓ Defaulted role_id to first available role');
          }
        }
        
        // Now drop the old role column
        await db.pool.query(`ALTER TABLE users DROP COLUMN role`);
        console.log('✓ Dropped old role varchar column');
      } catch (err) {
        console.warn('⚠ Could not drop old role column:', err.message);
      }
    }
  } catch (err) {
    console.warn('⚠ Could not migrate role_id column:', err.message);
  }

  // Seed default categories if table is empty
  try {
    const [categories] = await db.pool.query('SELECT COUNT(*) as count FROM categories');
    if (categories[0].count === 0) {
      const defaultCategories = [
        { name_en: 'Wines', name_fr: 'Vins', name_pt: 'Vinhos', icon: '🍷', description: 'Portuguese wines' },
        { name_en: 'Specialties', name_fr: 'Spécialités', name_pt: 'Especialidades', icon: '✨', description: 'Specialty products' },
        { name_en: 'Groceries', name_fr: 'Épicerie', name_pt: 'Mercearia', icon: '🛒', description: 'Grocery items' },
        { name_en: 'Coffee', name_fr: 'Café', name_pt: 'Café', icon: '☕', description: 'Coffee products' }
      ];

      for (const cat of defaultCategories) {
        const sql = `INSERT INTO categories (name_en, name_fr, name_pt, icon, description) VALUES (?, ?, ?, ?, ?)`;
        await db.pool.query(sql, [cat.name_en, cat.name_fr, cat.name_pt, cat.icon, cat.description]);
      }
      console.log(`✓ Seeded ${defaultCategories.length} default categories`);
    }
  } catch (err) {
    console.warn('Could not seed categories:', err.message);
  }

  // Seed default roles if table is empty
  try {
    const [roles] = await db.pool.query('SELECT COUNT(*) as count FROM roles');
    if (roles[0].count === 0) {
      const defaultRoles = [
        {
          name: 'User',
          description: 'Standard user with limited access',
          permissions: {
            view_products: true,
            view_categories: true,
            view_profile: true
          }
        },
        {
          name: 'Buyer',
          description: 'Buyer with browse and purchase access',
          permissions: {
            view_products: true,
            view_categories: true,
            view_users: true,
            view_activities: true
          }
        },
        {
          name: 'Seller',
          description: 'Seller with product management access',
          permissions: {
            view_products: true,
            manage_products: true,
            view_categories: true,
            manage_categories: true,
            view_users: true,
            view_activities: true
          }
        },
        {
          name: 'Admin',
          description: 'Administrator with full access',
          permissions: {
            view_products: true,
            manage_products: true,
            view_categories: true,
            manage_categories: true,
            view_users: true,
            manage_users: true,
            manage_roles: true,
            view_activities: true,
            delete_activities: true,
            system_settings: true
          }
        }
      ];

      for (const role of defaultRoles) {
        const sql = `INSERT INTO roles (name, description, permissions, active) VALUES (?, ?, ?, ?)`;
        await db.pool.query(sql, [
          role.name,
          role.description,
          JSON.stringify(role.permissions),
          true
        ]);
      }
      console.log(`✓ Seeded ${defaultRoles.length} default roles`);
    }
  } catch (err) {
    console.warn('Could not seed roles:', err.message);
  }

  // Seed products from public/products.json if table is empty (minimum 1000 entries)
  try {
    const [products] = await db.pool.query('SELECT COUNT(*) as count FROM products');
    if (products[0].count === 0) {
      const productsFile = path.join(__dirname, '../../public/products.json');
      let data = JSON.parse(fs.readFileSync(productsFile, 'utf8'));

      const MIN_PRODUCTS = 1000;

      if (!Array.isArray(data)) {
        data = [];
      }

      // Get default category ID (first category)
      const [categories] = await db.pool.query('SELECT id FROM categories LIMIT 1');
      const defaultCategoryId = categories.length > 0 ? categories[0].id : 1;

      // If there are fewer than MIN_PRODUCTS, generate extras
      if (data.length < MIN_PRODUCTS) {
        const baseItems = data.length > 0 ? data : [{
          id: 'default-product',
          name_fr: 'Produit par défaut',
          name_pt: 'Produto padrão',
          name_en: 'Default product',
          image: '/images/default.jpg',
          price: 9.99,
          category: 'default',
          description: 'Auto-generated sample product',
          quantity: 100
        }];

        for (let i = data.length; i < MIN_PRODUCTS; i++) {
          const template = baseItems[i % baseItems.length];
          const suffix = i + 1;
          data.push({
            id: `gen-product-${suffix}`,
            name_fr: `${template.name_fr || template.name || 'Produit'} ${suffix}`,
            name_pt: `${template.name_pt || template.name || 'Produto'} ${suffix}`,
            name_en: `${template.name_en || template.name || 'Product'} ${suffix}`,
            image: template.image || '/images/default.jpg',
            price: Number(((template.price || 5) + (suffix % 20) * 0.5).toFixed(2)),
            category: template.category || 'other',
            description: (template.description ? `${template.description} #${suffix}` : `Auto-generated product #${suffix}`),
            quantity: 20 + (suffix % 80)
          });
        }
      }

      for (const product of data) {
        const sql = `INSERT INTO products (name_fr, name_pt, name_en, category_id, user_id, quantity, price, image, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await db.pool.query(sql, [
          product.name_fr || product.name || '',
          product.name_pt || product.name || '',
          product.name_en || product.name || '',
          product.category_id || defaultCategoryId,
          1,
          Number.isFinite(Number(product.quantity)) ? Number(product.quantity) : 0,
          Number.isFinite(Number(product.price)) ? Number(product.price) : 0,
          product.image || null,
          product.description || null
        ]);
      }

      console.log(`✓ Seeded ${data.length} products into products table (minimum ${MIN_PRODUCTS})`);
    }
  } catch (err) {
    console.warn('Could not seed products:', err.message);
  }

  // Migrate existing tables from VARCHAR IDs to INT AUTO_INCREMENT
  try {
    // Check if we need to migrate categories table
    const [categoriesColumns] = await db.pool.query(`SHOW COLUMNS FROM categories`);
    const categoryIdColumn = categoriesColumns.find(col => col.Field === 'id');
    
    if (categoryIdColumn && categoryIdColumn.Type === 'varchar(255)') {
      console.log('↻ Migrating categories table to INT AUTO_INCREMENT...');
      
      // Create new table with INT IDs
      const backupTable = `categories_backup_${Date.now()}`;
      await db.pool.query(`CREATE TABLE ${backupTable} LIKE categories`);
      console.log(`✓ Created backup table: ${backupTable}`);
      
      // Copy data
      await db.pool.query(`INSERT INTO ${backupTable} SELECT * FROM categories`);
      
      // Drop foreign keys that reference categories
      try {
        await db.pool.query(`ALTER TABLE products DROP FOREIGN KEY fk_product_category`);
      } catch (err) {
        // ForeignKey might not exist
      }
      
      // Drop and recreate categories table with INT ID
      await db.pool.query(`DROP TABLE categories`);
      const createCategoriesNewSchema = `
        CREATE TABLE categories (
          id INT AUTO_INCREMENT PRIMARY KEY,
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
        ) ENGINE=InnoDB AUTO_INCREMENT=1;
      `;
      await db.pool.query(createCategoriesNewSchema);
      
      // Copy data back with new IDs
      await db.pool.query(`
        INSERT INTO categories (name_en, name_fr, name_pt, description, icon, color, active, created_at, updated_at)
        SELECT name_en, name_fr, name_pt, description, icon, color, active, created_at, updated_at
        FROM ${backupTable}
      `);
      
      console.log('✓ Categories table migrated to INT AUTO_INCREMENT');
    }
    
    // Check if we need to migrate users table
    const [usersColumns] = await db.pool.query(`SHOW COLUMNS FROM users`);
    const userIdColumn = usersColumns.find(col => col.Field === 'id');
    
    if (userIdColumn && userIdColumn.Type === 'varchar(255)') {
      console.log('↻ Migrating users table to INT AUTO_INCREMENT...');
      
      // Create backup
      const backupTable = `users_backup_${Date.now()}`;
      await db.pool.query(`CREATE TABLE ${backupTable} LIKE users`);
      
      // Copy data
      await db.pool.query(`INSERT INTO ${backupTable} SELECT * FROM users`);
      
      // Drop and recreate users table with INT ID
      await db.pool.query(`DROP TABLE users`);
      const createUsersNewSchema = `
        CREATE TABLE users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(100) NOT NULL UNIQUE,
          email VARCHAR(255) UNIQUE DEFAULT NULL,
          password VARCHAR(255) NOT NULL,
          first_name VARCHAR(100) DEFAULT '',
          last_name VARCHAR(100) DEFAULT '',
          phone_number VARCHAR(20) DEFAULT NULL,
          city VARCHAR(100) DEFAULT NULL,
          role VARCHAR(50) DEFAULT 'user',
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_username (username),
          INDEX idx_email (email),
          INDEX idx_role (role),
          INDEX idx_active (active)
        ) ENGINE=InnoDB AUTO_INCREMENT=1;
      `;
      await db.pool.query(createUsersNewSchema);
      
      // Copy data back with new IDs
      await db.pool.query(`
        INSERT INTO users (username, email, password, first_name, last_name, phone_number, city, role, active, created_at, updated_at)
        SELECT username, email, password, first_name, last_name, phone_number, city, role, active, created_at, updated_at
        FROM ${backupTable}
      `);
      
      console.log('✓ Users table migrated to INT AUTO_INCREMENT');
    }
    
    // Check if we need to migrate products table
    const [productsColumns] = await db.pool.query(`SHOW COLUMNS FROM products`);
    const productIdColumn = productsColumns.find(col => col.Field === 'id');
    const productCategoryColumn = productsColumns.find(col => col.Field === 'category_id');
    
    if (productIdColumn && productIdColumn.Type === 'varchar(255)') {
      console.log('↻ Migrating products table to INT AUTO_INCREMENT...');
      
      // Create backup
      const backupTable = `products_backup_${Date.now()}`;
      await db.pool.query(`CREATE TABLE ${backupTable} LIKE products`);
      
      // Copy data
      try {
        await db.pool.query(`INSERT INTO ${backupTable} SELECT * FROM products`);
      } catch (err) {
        console.warn('⚠ Could not backup products:', err.message);
      }
      
      // Drop and recreate products table with INT ID
      try {
        await db.pool.query(`DROP TABLE products`);
      } catch (err) {
        console.warn('⚠ Could not drop products table:', err.message);
      }
      
      const createProductsNewSchema = `
        CREATE TABLE products (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name_fr VARCHAR(255) NOT NULL,
          name_pt VARCHAR(255) NOT NULL,
          name_en VARCHAR(255) NOT NULL,
          category_id INT NOT NULL,
          user_id INT NOT NULL,
          quantity INT NOT NULL DEFAULT 0,
          price DECIMAL(10,2) NOT NULL,
          image VARCHAR(500) DEFAULT NULL,
          description TEXT DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_category_id (category_id),
          INDEX idx_user_id (user_id),
          INDEX idx_name_en (name_en),
          CONSTRAINT fk_product_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT fk_product_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB AUTO_INCREMENT=1;
      `;
      await db.pool.query(createProductsNewSchema);
      
      // Copy data back
      try {
        await db.pool.query(`
          INSERT INTO products (name_fr, name_pt, name_en, category_id, user_id, quantity, price, image, description, created_at, updated_at)
          SELECT name_fr, name_pt, name_en, category_id, COALESCE(user_id, 1), COALESCE(quantity, 0), price, image, description, created_at, updated_at
          FROM ${backupTable}
        `);
        console.log('✓ Products table migrated to INT AUTO_INCREMENT');
      } catch (err) {
        console.warn('⚠ Could not restore products data:', err.message);
      }
    }
    
    // Check if we need to migrate roles table
    const [rolesColumns] = await db.pool.query(`SHOW COLUMNS FROM roles`);
    const roleIdColumn = rolesColumns.find(col => col.Field === 'id');
    
    if (roleIdColumn && roleIdColumn.Type === 'varchar(255)') {
      console.log('↻ Migrating roles table to INT AUTO_INCREMENT...');
      
      // Create backup
      const backupTable = `roles_backup_${Date.now()}`;
      await db.pool.query(`CREATE TABLE ${backupTable} LIKE roles`);
      
      // Copy data
      await db.pool.query(`INSERT INTO ${backupTable} SELECT * FROM roles`);
      
      // Drop and recreate roles table with INT ID
      await db.pool.query(`DROP TABLE roles`);
      const createRolesNewSchema = `
        CREATE TABLE roles (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL UNIQUE,
          description TEXT DEFAULT NULL,
          permissions JSON DEFAULT NULL,
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_name (name),
          INDEX idx_active (active)
        ) ENGINE=InnoDB AUTO_INCREMENT=1;
      `;
      await db.pool.query(createRolesNewSchema);
      
      // Copy data back with new IDs
      await db.pool.query(`
        INSERT INTO roles (name, description, permissions, active, created_at, updated_at)
        SELECT name, description, permissions, active, created_at, updated_at
        FROM ${backupTable}
      `);
      
      console.log('✓ Roles table migrated to INT AUTO_INCREMENT');
    }
  } catch (err) {
    console.warn('⚠ Migration process had issues:', err.message);
  }
}

// Create a proxy object that always returns the current pool
const poolProxy = new Proxy(db, {
  get(target, prop) {
    if (prop === 'query') {
      return target.pool?.query.bind(target.pool);
    }
    return target.pool?.[prop];
  }
});

module.exports = { pool: poolProxy, initDatabase };
