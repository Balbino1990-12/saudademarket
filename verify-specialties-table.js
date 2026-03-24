/**
 * Verify Specialties Table Exists
 * Usage: node verify-specialties-table.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function verifyTable() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'portugalstore_db'
        });

        console.log('\n📋 Checking if specialties table exists...\n');

        // Check if table exists
        const [tables] = await connection.query(
            `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'specialties'`,
            [process.env.DB_NAME || 'portugalstore_db']
        );

        if (tables.length > 0) {
            console.log('✅ specialties table EXISTS in MySQL!\n');

            // Get table structure
            const [columns] = await connection.query(`DESCRIBE specialties`);
            console.log('Table Structure:');
            console.log('─'.repeat(80));
            columns.forEach(col => {
                console.log(`  ${col.Field.padEnd(20)} ${col.Type.padEnd(25)} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
            });
            console.log('─'.repeat(80));

            // Count records
            const [rows] = await connection.query(`SELECT COUNT(*) as count FROM specialties`);
            console.log(`\n📊 Records in table: ${rows[0].count}`);

            // Show indexes
            const [indexes] = await connection.query(`SHOW INDEX FROM specialties`);
            if (indexes.length > 0) {
                console.log('\n🔑 Indexes:');
                indexes.forEach(idx => {
                    console.log(`  - ${idx.Key_name} (${idx.Column_name})`);
                });
            }
        } else {
            console.log('❌ specialties table does NOT exist!\n');
            
            // List all tables
            const [allTables] = await connection.query(
                `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
                 WHERE TABLE_SCHEMA = ?`,
                [process.env.DB_NAME || 'portugalstore_db']
            );
            
            console.log('Existing tables:');
            allTables.forEach(t => console.log(`  - ${t.TABLE_NAME}`));
        }

        await connection.end();
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

verifyTable();
