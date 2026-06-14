const EmailService = require('../services/EmailService');
const { validationResult } = require('express-validator');

class ContactController {
  /**
   * Handle contact form submission
   * POST /api/contact
   */
  static async submitContactForm(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array().map(err => ({
            field: err.param,
            message: err.msg
          }))
        });
      }

      const { name, email, phone, subject, message } = req.body;

      // Sanitize inputs
      const sanitizedData = {
        name: String(name || '').trim().substring(0, 100),
        email: String(email || '').trim().toLowerCase(),
        phone: String(phone || '').trim().substring(0, 20),
        subject: String(subject || '').trim().substring(0, 100),
        message: String(message || '').trim().substring(0, 5000)
      };

      try {
        // Send confirmation email to customer
        await EmailService.sendContactConfirmationEmail(
          sanitizedData.email,
          sanitizedData.name
        );
      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError);
      }

      try {
        // Send notification email to admin
        await EmailService.sendContactNotificationEmail(
          sanitizedData
        );
      } catch (emailError) {
        console.error('Error sending admin notification email:', emailError);
      }

      return res.status(200).json({
        success: true,
        message: 'Votre message a été envoyé avec succès. Nous vous répondrons dans les 24 heures.',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error in submitContactForm:', error);
      console.error('Error stack:', error.stack);
      
      return res.status(500).json({
        success: false,
        message: 'Une erreur est survenue lors du traitement de votre message. Veuillez réessayer plus tard.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = ContactController;
