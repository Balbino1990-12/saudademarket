const express = require('express');
const { body } = require('express-validator');
const ContactController = require('../controllers/ContactController');
const { apiLimiter } = require('../middleware/security');

const router = express.Router();

/**
 * POST /api/contact
 * Submit contact form
 * Rate limited to prevent spam
 */
router.post(
  '/',
  apiLimiter,
  [
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
    body('email')
      .trim()
      .isEmail().withMessage('Valid email is required')
      .normalizeEmail(),
    body('phone')
      .optional({ checkFalsy: true })
      .trim()
      .matches(/^[\d\s\-\+\(\)]*$/).withMessage('Invalid phone format'),
    body('subject')
      .trim()
      .notEmpty().withMessage('Subject is required')
      .isIn([
        'general',
        'product',
        'order',
        'feedback',
        'partnership',
        'other'
      ]).withMessage('Invalid subject selected'),
    body('message')
      .trim()
      .notEmpty().withMessage('Message is required')
      .isLength({ min: 10, max: 5000 }).withMessage('Message must be between 10 and 5000 characters')
  ],
  ContactController.submitContactForm
);

module.exports = router;
