const express = require('express');
const { body } = require('express-validator');
const ChatController = require('../controllers/ChatController');
const { apiLimiter } = require('../middleware/security');

const router = express.Router();

/**
 * POST /api/chat
 * Send a chat message and get AI response
 * Rate limited to prevent spam
 */
router.post(
  '/',
  apiLimiter,
  [
    body('message')
      .trim()
      .notEmpty().withMessage('Message is required')
      .isLength({ min: 1, max: 2000 }).withMessage('Message must be between 1 and 2000 characters'),
    body('language')
      .optional()
      .isIn(['en', 'fr', 'pt']).withMessage('Invalid language')
  ],
  ChatController.sendMessage
);

module.exports = router;


