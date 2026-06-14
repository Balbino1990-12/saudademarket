const { pool } = require('../config/database');
const crypto = require('crypto');

class Referral {
  static async create({ referrerUserId, productId = null, discountType = 'percent', discountValue = 10.00, maxUses = null, expiresAt = null }) {
    try {
      // Generate unique referral code
      const code = this.generateReferralCode();

      const sql = `
        INSERT INTO referrals (code, referrer_user_id, product_id, discount_type, discount_value, max_uses, expires_at, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, true)
      `;

      const [result] = await pool.query(sql, [code, referrerUserId, productId, discountType, discountValue, maxUses, expiresAt]);
      const referralId = result.insertId;

      return {
        id: referralId,
        code,
        referrerUserId,
        productId,
        discountType,
        discountValue,
        maxUses,
        usesCount: 0,
        expiresAt,
        active: true
      };
    } catch (err) {
      console.error('[Referral.create] Error:', err);
      throw err;
    }
  }

  static generateReferralCode() {
    // Generate a 8-character alphanumeric code
    return crypto.randomBytes(4).toString('hex').toUpperCase();
  }

  static async getByCode(code) {
    try {
      const sql = `
        SELECT r.*, u.username as referrer_username, u.first_name as referrer_first_name, u.last_name as referrer_last_name
        FROM referrals r
        LEFT JOIN users u ON r.referrer_user_id = u.id
        WHERE r.code = ? AND r.active = true
        LIMIT 1
      `;

      const [rows] = await pool.query(sql, [code]);
      return rows.length > 0 ? rows[0] : null;
    } catch (err) {
      console.error('[Referral.getByCode] Error:', err);
      throw err;
    }
  }

  static async getByReferrerUserId(referrerUserId) {
    try {
      const sql = `
        SELECT r.*, p.name_en as product_name, p.name_fr as product_name_fr, p.name_pt as product_name_pt
        FROM referrals r
        LEFT JOIN products p ON r.product_id = p.id
        WHERE r.referrer_user_id = ?
        ORDER BY r.created_at DESC
      `;

      const [rows] = await pool.query(sql, [referrerUserId]);
      return rows;
    } catch (err) {
      console.error('[Referral.getByReferrerUserId] Error:', err);
      throw err;
    }
  }

  static async incrementUses(code) {
    try {
      const sql = `UPDATE referrals SET uses_count = uses_count + 1 WHERE code = ?`;
      await pool.query(sql, [code]);
    } catch (err) {
      console.error('[Referral.incrementUses] Error:', err);
      throw err;
    }
  }

  static async isValidForUse(code, productId = null) {
    try {
      const referral = await this.getByCode(code);
      if (!referral) return { valid: false, reason: 'Referral code not found' };

      // Check if expired
      if (referral.expires_at && new Date(referral.expires_at) < new Date()) {
        return { valid: false, reason: 'Referral code has expired' };
      }

      // Check max uses
      if (referral.max_uses && referral.uses_count >= referral.max_uses) {
        return { valid: false, reason: 'Referral code has reached maximum uses' };
      }

      // Check if product-specific and matches
      if (referral.product_id && productId && referral.product_id != productId) {
        return { valid: false, reason: 'Referral code is not valid for this product' };
      }

      return { valid: true, referral };
    } catch (err) {
      console.error('[Referral.isValidForUse] Error:', err);
      throw err;
    }
  }

  static async applyDiscount(code, orderTotal, productId = null) {
    try {
      const validation = await this.isValidForUse(code, productId);
      if (!validation.valid) {
        throw new Error(validation.reason);
      }

      const referral = validation.referral;
      let discountAmount = 0;

      if (referral.discount_type === 'percent') {
        discountAmount = (orderTotal * referral.discount_value) / 100;
      } else if (referral.discount_type === 'fixed') {
        discountAmount = Math.min(referral.discount_value, orderTotal);
      }

      // Increment uses count
      await this.incrementUses(code);

      return {
        discountAmount,
        referral
      };
    } catch (err) {
      console.error('[Referral.applyDiscount] Error:', err);
      throw err;
    }
  }
}

module.exports = Referral;