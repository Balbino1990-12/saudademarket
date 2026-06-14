require('dotenv').config();
const EmailService = require('./src/services/EmailService');

// Test discount notification email
async function testDiscountEmail() {
  try {
    console.log('Testing discount notification email...');

    // Test data for discount notification
    const testDiscount = {
      title: 'Spring Sale - 20% Off All Wines!',
      description: 'Enjoy 20% off on our entire wine collection this weekend only.',
      discountCode: 'SPRING20',
      discountPercent: 20,
      validUntil: '2024-04-15',
      categories: ['Wine', 'Port Wine']
    };

    // Test recipient
    const testEmail = 'test@example.com';

    // Send test email
    const result = await EmailService.sendDiscountNotificationEmail(testEmail, testDiscount);

    console.log('✅ Discount notification email sent successfully!');
    console.log('Message ID:', result.messageId);
    console.log('Check your Mailtrap inbox to view the email.');

  } catch (error) {
    console.error('❌ Error sending test email:', error.message);
  }
}

// Run the test
testDiscountEmail();