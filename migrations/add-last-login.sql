-- Migration: Add last_login column to users table
-- Run this on your MySQL database as the application DB user.

-- Safe ALTER: add the column if it does not exist
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_login DATETIME NULL DEFAULT NULL;

-- If your MySQL version doesn't support IF NOT EXISTS for ADD COLUMN,
-- run the following instead (uncomment and execute):
--
-- SET @exists = (
--   SELECT COUNT(*)
--   FROM INFORMATION_SCHEMA.COLUMNS
--   WHERE table_schema = DATABASE()
--     AND table_name = 'users'
--     AND column_name = 'last_login'
-- );
--
-- SET @sql = IF(@exists = 0, 'ALTER TABLE users ADD COLUMN last_login DATETIME NULL DEFAULT NULL;', 'SELECT "column exists"');
-- PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Verify:
-- SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
-- FROM INFORMATION_SCHEMA.COLUMNS
-- WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'last_login';
