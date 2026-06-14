const { pool } = require('../config/database');

class SystemSettings {
  static async getAll() {
    try {
      const [rows] = await pool.query('SELECT `key`, `value` FROM system_settings');
      const result = {};
      rows.forEach(r => {
        try {
          result[r.key] = JSON.parse(r.value);
        } catch (e) {
          result[r.key] = r.value;
        }
      });
      return result;
    } catch (err) {
      console.error('[SystemSettings.getAll] Error:', err);
      throw err;
    }
  }

  static async upsert(settingsObj) {
    try {
      const keys = Object.keys(settingsObj);
      if (!keys.length) return {};

      const queries = keys.map(async (k) => {
        const val = typeof settingsObj[k] === 'string' ? settingsObj[k] : JSON.stringify(settingsObj[k]);
        const sql = `INSERT INTO system_settings (`key`, `value`, updated_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()`;
        await pool.query(sql, [k, val]);
      });

      await Promise.all(queries);
      return await this.getAll();
    } catch (err) {
      console.error('[SystemSettings.upsert] Error:', err);
      throw err;
    }
  }
}

module.exports = SystemSettings;
