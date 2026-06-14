const { validationResult } = require('express-validator');
const ChatService = require('../services/ChatService');

class ChatController {
  /**
   * Send a chat message and return AI response
   * POST /api/chat
   */
  static async sendMessage(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false,
          errors: errors.array() 
        });
      }

      const { message, language = 'pt' } = req.body;

      // Get AI response (no persistence)
      const response = await ChatService.getResponse(message, language);

      return res.json({ success: true, response: response.reply, timestamp: new Date() });
    } catch (error) {
      console.error('Chat error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to process chat message'
      });
    }
  }


}

module.exports = ChatController;
