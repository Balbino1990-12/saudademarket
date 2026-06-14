const express = require('express');
const router = express.Router();
const Referral = require('../models/Referral');
const { verifyBuyerSession } = require('../middleware/authentication');

// Create a referral code for a product
router.post('/generate', verifyBuyerSession, async (req, res) => {
  try {
    const userId = req.session.buyerId;
    const { productId, discountType = 'percent', discountValue = 10.00, maxUses = null, expiresAt = null } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    // Validate discount parameters
    if (discountType === 'percent' && (discountValue < 0 || discountValue > 100)) {
      return res.status(400).json({ error: 'Percentage discount must be between 0 and 100' });
    }

    if (discountType === 'fixed' && discountValue < 0) {
      return res.status(400).json({ error: 'Fixed discount cannot be negative' });
    }

    const referral = await Referral.create({
      referrerUserId: userId,
      productId,
      discountType,
      discountValue,
      maxUses,
      expiresAt
    });

    res.json({
      success: true,
      referral: {
        code: referral.code,
        discountType: referral.discountType,
        discountValue: referral.discountValue,
        maxUses: referral.maxUses,
        expiresAt: referral.expiresAt
      }
    });
  } catch (err) {
    console.error('[Referrals.generate] Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's referral codes
router.get('/my-codes', verifyBuyerSession, async (req, res) => {
  try {
    const userId = req.session.buyerId;
    const referrals = await Referral.getByReferrerUserId(userId);

    res.json({
      success: true,
      referrals: referrals.map(ref => ({
        id: ref.id,
        code: ref.code,
        productId: ref.product_id,
        productName: ref.product_name || ref.product_name_fr || ref.product_name_pt,
        discountType: ref.discount_type,
        discountValue: ref.discount_value,
        maxUses: ref.max_uses,
        usesCount: ref.uses_count,
        expiresAt: ref.expires_at,
        active: ref.active,
        createdAt: ref.created_at
      }))
    });
  } catch (err) {
    console.error('[Referrals.my-codes] Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Validate a referral code
router.post('/validate', async (req, res) => {
  try {
    const { code, productId } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Referral code is required' });
    }

    const validation = await Referral.isValidForUse(code, productId);

    if (!validation.valid) {
      return res.json({
        valid: false,
        reason: validation.reason
      });
    }

    const referral = validation.referral;
    res.json({
      valid: true,
      referral: {
        code: referral.code,
        discountType: referral.discount_type,
        discountValue: referral.discount_value,
        productId: referral.product_id,
        referrerUsername: referral.referrer_username,
        expiresAt: referral.expires_at
      }
    });
  } catch (err) {
    console.error('[Referrals.validate] Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Apply discount from referral code
router.post('/apply', async (req, res) => {
  try {
    const { code, orderTotal, productId } = req.body;

    if (!code || !orderTotal) {
      return res.status(400).json({ error: 'Code and order total are required' });
    }

    const result = await Referral.applyDiscount(code, orderTotal, productId);

    res.json({
      success: true,
      discountAmount: result.discountAmount,
      finalTotal: orderTotal - result.discountAmount
    });
  } catch (err) {
    console.error('[Referrals.apply] Error:', err);
    res.status(400).json({ error: err.message || 'Failed to apply referral code' });
  }
});

module.exports = router;