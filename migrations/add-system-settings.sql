-- Migration: Create system_settings table
-- Run this on your MySQL database as the application DB user.

CREATE TABLE IF NOT EXISTS system_settings (
  `key` varchar(191) NOT NULL,
  `value` TEXT,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verify with:
-- SELECT * FROM system_settings LIMIT 10;
