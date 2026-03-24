/**
 * Remove Specialist Table and Dependencies
 * Safely drops the specialists table and handles any foreign key constraints
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function removeSpecialistTable() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'portugalstore_db'
        });

        console.log('\n📋 Checking for specialist table and dependencies...\n');

        // Check if specialists table exists
        const [tables] = await connection.query(
            `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'specialists'`,
            [process.env.DB_NAME || 'portugalstore_db']
        );

        if (tables.length === 0) {
            console.log('✅ No "specialists" table found - nothing to remove.\n');
            await connection.end();
            return;
        }

        console.log('Found "specialists" table. Checking for foreign key dependencies...\n');

        // Check for foreign key constraints referencing this table
        const [foreignKeys] = await connection.query(
            `SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
             FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
             WHERE REFERENCED_TABLE_NAME = 'specialists' AND TABLE_SCHEMA = ?`,
            [process.env.DB_NAME || 'portugalstore_db']
        );

        if (foreignKeys.length > 0) {
            console.log('⚠️  Found foreign key constraints:');
            foreignKeys.forEach(fk => {
                console.log(`  - ${fk.TABLE_NAME}.${fk.COLUMN_NAME} -> specialists.${fk.REFERENCED_COLUMN_NAME}`);
                console.log(`    Constraint: ${fk.CONSTRAINT_NAME}`);
            });
            console.log();

            // Drop foreign keys first
            for (const fk of foreignKeys) {
                try {
                    await connection.query(
                        `ALTER TABLE ${fk.TABLE_NAME} DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`
                    );
                    console.log(`✓ Dropped foreign key: ${fk.CONSTRAINT_NAME} from ${fk.TABLE_NAME}`);
                } catch (err) {
                    console.log(`⚠️  Could not drop FK ${fk.CONSTRAINT_NAME}: ${err.message}`);
                }
            }
            console.log();
        } else {
            console.log('✅ No foreign key constraints found referencing specialists table.\n');
        }

        // Show table structure before deletion
        const [columns] = await connection.query(`DESCRIBE specialists`);
        console.log('Specialist table structure (will be removed):');
        columns.forEach(col => {
            console.log(`  - ${col.Field} (${col.Type})`);
        });
        console.log();

        // Drop the table
        await connection.query(`DROP TABLE specialists`);
        console.log('✅ Successfully dropped "specialists" table\n');

        // Verify it's gone
        const [verifyTables] = await connection.query(
            `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'specialists'`,
            [process.env.DB_NAME || 'portugalstore_db']
        );

        if (verifyTables.length === 0) {
            console.log('✅ Confirmation: "specialists" table has been permanently removed.\n');
            console.log('📊 Current database tables:');
            const [allTables] = await connection.query(
                `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
                 WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME`,
                [process.env.DB_NAME || 'portugalstore_db']
            );
            allTables.forEach(t => {
                console.log(`  - ${t.TABLE_NAME}`);
            });
        }

        await connection.end();
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (connection) await connection.end();
        process.exit(1);
    }
}

removeSpecialistTable();
