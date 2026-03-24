const { pool } = require('../config/database');

class Activity {
  static async getAll(limit = 10, lang = 'en') {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM activities ORDER BY created_at DESC LIMIT ?',
        [limit]
      );
      console.log('[Activity.getAll] Retrieved', rows.length, 'activities for language:', lang);
      
      // Translate messages based on language preference
      const translatedRows = rows.map(activity => ({
        ...activity,
        message: this.translateMessage(activity, lang)
      }));
      
      return translatedRows;
    } catch (err) {
      console.error('[Activity.getAll] Error:', err);
      throw err;
    }
  }

  static translateMessage(activity, lang = 'en') {
    const translations = {
      'en': {
        'product_added': 'New product added',
        'product_updated': 'Product updated',
        'product_deleted': 'Product deleted',
        'category_added': 'New category added',
        'category_updated': 'Category updated',
        'category_deleted': 'Category deleted'
      },
      'fr': {
        'product_added': 'Nouveau produit ajouté',
        'product_updated': 'Produit mis à jour',
        'product_deleted': 'Produit supprimé',
        'category_added': 'Nouvelle catégorie ajoutée',
        'category_updated': 'Catégorie mise à jour',
        'category_deleted': 'Catégorie supprimée'
      },
      'pt': {
        'product_added': 'Novo produto adicionado',
        'product_updated': 'Produto atualizado',
        'product_deleted': 'Produto removido',
        'category_added': 'Nova categoria adicionada',
        'category_updated': 'Categoria atualizada',
        'category_deleted': 'Categoria removida'
      }
    };

    const typeTranslation = translations[lang]?.[activity.type] || translations['en'][activity.type];
    
    let details = {};
    if (activity.details) {
      try {
        details = typeof activity.details === 'string' ? JSON.parse(activity.details) : activity.details;
      } catch (e) {
        console.warn('[Activity.translateMessage] Could not parse details:', e);
      }
    }

    // Get name in the requested language, fallback to English
    let name = details.name_en || 'Item';
    if (lang === 'fr') {
      name = details.name_fr || details.name_en || 'Élément';
    } else if (lang === 'pt') {
      name = details.name_pt || details.name_en || 'Item';
    }

    return `${typeTranslation}: ${name}`;
  }

  static async create(type, message, details = null) {
    try {
      console.log('[Activity.create] Creating activity:', { type, message, details });
      const sql = `INSERT INTO activities (type, message, details, created_at) VALUES (?, ?, ?, NOW())`;
      const result = await pool.query(sql, [
        type,
        message,
        details ? JSON.stringify(details) : null
      ]);
      console.log('[Activity.create] ✅ Activity saved to database with timestamp:', new Date().toISOString());
      return result;
    } catch (err) {
      console.error('[Activity.create] ❌ Error saving activity:', err);
      console.error('[Activity.create] Query details - Type:', type, 'Message:', message);
      throw err;
    }
  }

  static async logProductAdded(productNames) {
    try {
      console.log('[Activity.logProductAdded] Logging product added:', productNames);
      await this.create('product_added', `New product added: ${productNames.name_en}`, productNames);
      console.log('[Activity.logProductAdded] ✅ Successfully logged');
    } catch (err) {
      console.error('[Activity.logProductAdded] ❌ Failed:', err);
    }
  }

  static async logProductUpdated(productNames) {
    try {
      console.log('[Activity.logProductUpdated] Logging product updated:', productNames);
      await this.create('product_updated', `Product updated: ${productNames.name_en}`, productNames);
      console.log('[Activity.logProductUpdated] ✅ Successfully logged');
    } catch (err) {
      console.error('[Activity.logProductUpdated] ❌ Failed:', err);
    }
  }

  static async logProductDeleted(productNames) {
    try {
      console.log('[Activity.logProductDeleted] Logging product deleted:', productNames);
      await this.create('product_deleted', `Product deleted: ${productNames.name_en}`, productNames);
      console.log('[Activity.logProductDeleted] ✅ Successfully logged');
    } catch (err) {
      console.error('[Activity.logProductDeleted] ❌ Failed:', err);
    }
  }

  static async logCategoryAdded(categoryNames) {
    try {
      console.log('[Activity.logCategoryAdded] Logging category added:', categoryNames);
      await this.create('category_added', `New category added: ${categoryNames.name_en}`, categoryNames);
      console.log('[Activity.logCategoryAdded] ✅ Successfully logged');
    } catch (err) {
      console.error('[Activity.logCategoryAdded] ❌ Failed:', err);
    }
  }

  static async logCategoryUpdated(categoryNames) {
    try {
      console.log('[Activity.logCategoryUpdated] Logging category updated:', categoryNames);
      await this.create('category_updated', `Category updated: ${categoryNames.name_en}`, categoryNames);
      console.log('[Activity.logCategoryUpdated] ✅ Successfully logged');
    } catch (err) {
      console.error('[Activity.logCategoryUpdated] ❌ Failed:', err);
    }
  }

  static async logCategoryDeleted(categoryNames) {
    try {
      console.log('[Activity.logCategoryDeleted] Logging category deleted:', categoryNames);
      await this.create('category_deleted', `Category deleted: ${categoryNames.name_en}`, categoryNames);
      console.log('[Activity.logCategoryDeleted] ✅ Successfully logged');
    } catch (err) {
      console.error('[Activity.logCategoryDeleted] ❌ Failed:', err);
    }
  }

  static async logUserAdded(userData) {
    try {
      console.log('[Activity.logUserAdded] Logging user added:', userData);
      await this.create('user_added', `New user added: ${userData.username}`, userData);
      console.log('[Activity.logUserAdded] ✅ Successfully logged');
    } catch (err) {
      console.error('[Activity.logUserAdded] ❌ Failed:', err);
    }
  }

  static async logUserUpdated(userData) {
    try {
      console.log('[Activity.logUserUpdated] Logging user updated:', userData);
      await this.create('user_updated', `User updated: ${userData.username}`, userData);
      console.log('[Activity.logUserUpdated] ✅ Successfully logged');
    } catch (err) {
      console.error('[Activity.logUserUpdated] ❌ Failed:', err);
    }
  }

  static async logUserDeleted(userData) {
    try {
      console.log('[Activity.logUserDeleted] Logging user deleted:', userData);
      await this.create('user_deleted', `User deleted: ${userData.username}`, userData);
      console.log('[Activity.logUserDeleted] ✅ Successfully logged');
    } catch (err) {
      console.error('[Activity.logUserDeleted] ❌ Failed:', err);
    }
  }
}

module.exports = Activity;
