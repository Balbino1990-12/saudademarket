# Backend Database Instructions

This project now uses a **MySQL** database to store products and admin credentials. The existing JSON files are used only for seeding on first run, and all CRUD operations are performed via the database.

## Environment Variables
Create a `.env` file (or set environment variables) with the following values:

```dotenv
# MySQL connection info
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=portugalstore
```

You can keep the existing Shopify variables in `.env` as well (`SHOP_NAME`, `SHOPIFY_ADMIN_TOKEN`, etc.).

## Initialization
When the server starts, it will automatically:

1. Create `products` and `admins` tables if they don't exist.
2. Seed an admin user from `admin-credentials.json` if the table is empty.
3. Load existing products from `public/products.json` into the database when the products table is empty.

## Schema
```sql
CREATE TABLE products (
    id VARCHAR(255) PRIMARY KEY,
    name_fr VARCHAR(255) NOT NULL,
    name_pt VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    image VARCHAR(500) DEFAULT NULL,
    description TEXT DEFAULT NULL
) ENGINE=InnoDB;

CREATE TABLE admins (
    username VARCHAR(100) PRIMARY KEY,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255)
) ENGINE=InnoDB;
```

## Running
Install dependencies:

```
npm install
```

Start the server (development):

```
npm run dev
```

The application will connect to MySQL using your credentials and be fully functional.

## Notes
- For production, consider using a migrations framework (e.g. knex, sequelize) and store passwords securely (hashing).
- The `admin-credentials.json` file remains for convenience but is only used to seed the database once.
