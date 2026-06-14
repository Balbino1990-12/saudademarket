# Contact Form Backend Integration Guide

## Overview
Your contact form is now fully integrated with your Express backend. Here's everything you need to know to get it working.

## ✅ What's Been Set Up

### 1. **Frontend** (`public/contact.html`)
- Modern contact form with validation
- Connects to `/api/contact` endpoint
- Shows success/error messages
- Loading state on submit button

### 2. **Backend Files Created**

#### `src/controllers/ContactController.js`
- Handles contact form submissions
- Validates form data
- Sends confirmation email to customer
- Sends notification email to admin

#### `src/routes/contact.js`
- Defines `/api/contact` POST endpoint
- Input validation using express-validator
- Rate limiting to prevent spam
- Subject field validation (only allows specific values)

#### Updated `src/services/EmailService.js`
- `sendContactConfirmationEmail()` - Sends to customer
- `sendContactNotificationEmail()` - Sends to admin

## 🔧 Environment Variables Setup

Add these to your `.env` file:

```env
# SMTP Configuration (Required)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@saudade-market.fr

# Contact Emails
CONTACT_ADMIN_EMAIL=admin@saudade-market.fr

# App URL (for email links)
APP_URL=http://localhost:3000
# Or for production:
APP_URL=https://www.saudade-market.fr
```

### Gmail Setup (Recommended)
If using Gmail:
1. Enable 2-Factor Authentication on your Gmail account
2. Create an [App Password](https://myaccount.google.com/apppasswords)
3. Use the 16-character password as `SMTP_PASS`

### Other Email Providers
- **SendGrid**: Use `smtp.sendgrid.net` on port 587, username `apikey`
- **Mailgun**: Use `smtp.mailgun.org` on port 587
- **AWS SES**: Use `email-smtp.[region].amazonaws.com` on port 587

## 📧 Email Behavior

### Customer Receives:
- Professional confirmation email
- Assures them a response within 24 hours
- Includes company contact info

### Admin Receives:
- Email with all contact details
- `replyTo` field set to customer email (can reply directly)
- Message content in formatted box
- Received timestamp

## 📝 Form Fields & Validation

| Field | Type | Required | Validation |
|-------|------|----------|-----------|
| name | text | Yes | 2-100 characters |
| email | email | Yes | Valid email format |
| phone | tel | No | Optional, numbers/symbols only |
| subject | select | Yes | One of: general, product, order, feedback, partnership, other |
| message | textarea | Yes | 10-5000 characters |

## 🌐 API Endpoint

### POST `/api/contact`

**Request Example:**
```javascript
fetch('/api/contact', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+33 1 23 45 67 89',
    subject: 'product',
    message: 'I have a question about your wine collection...'
  })
})
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Votre message a été envoyé avec succès. Nous vous répondrons dans les 24 heures.",
  "timestamp": "2026-05-05T14:30:00.000Z"
}
```

**Error Response (400/500):**
```json
{
  "success": false,
  "message": "Error message in French",
  "errors": [
    {
      "field": "name",
      "message": "Name must be between 2 and 100 characters"
    }
  ]
}
```

## 🛡️ Security Features

✓ **Rate Limiting** - API limiter prevents abuse (default: 100 requests per 15 minutes)
✓ **Input Validation** - Express-validator checks all fields
✓ **Sanitization** - All inputs are sanitized to prevent injection
✓ **CSRF Protection** - Built into security middleware (if enabled)
✓ **Email Validation** - Real email format validation

## 🚀 How It Works (Flow)

```
User fills form → Submit → Frontend validation 
  → POST to /api/contact 
    → Backend validates all fields
    → Backend sends confirmation email to user
    → Backend sends notification email to admin
    → Returns success response
  → Frontend shows success message
  → Form resets
```

## 📊 Testing

### Test in Development
```bash
# 1. Make sure your .env has SMTP credentials
# 2. Ensure backend is running
npm run dev

# 3. Navigate to http://localhost:3000/contact.html
# 4. Fill and submit the form
# 5. Check your admin email for the notification
```

### Test with cURL
```bash
curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "",
    "subject": "general",
    "message": "This is a test message to verify the contact form is working correctly."
  }'
```

## 🔍 Troubleshooting

### "Email not sending?"
1. Check SMTP credentials in `.env` are correct
2. If using Gmail, verify App Password was generated correctly
3. Check firewall - port 587 must be open
4. Look at server console for error messages

### "Form not submitting?"
1. Open browser DevTools (F12) → Network tab
2. Submit form and check the `/api/contact` request
3. Look for validation errors in the response

### "Rate limited?"
The API allows 100 requests per 15 minutes. If exceeded, returns `429 Too Many Requests`

### "No contact route found?"
Make sure you restarted your server after editing `app.js`

## 📧 Email Not Configured?

If you don't have email set up yet, the form will still work but emails won't send. The response will indicate if email failed silently. To fix:

1. Set up SMTP credentials in `.env`
2. Test with `npm test` (if you have email tests)
3. Check error logs in `./logs/` or terminal

## 🎨 Customization

### Change Email Templates
Edit `src/services/EmailService.js`:
- `sendContactConfirmationEmail()` - Customer email HTML
- `sendContactNotificationEmail()` - Admin email HTML

### Change Admin Email
Update in `.env`:
```env
CONTACT_ADMIN_EMAIL=your-email@example.com
```

### Add More Subject Options
1. Edit `src/routes/contact.js` - update the `.isIn()` array
2. Edit `public/contact.html` - add new `<option>` to the select

### Change Rate Limit
Edit `src/middleware/security.js` and look for `apiLimiter` configuration

## 📝 Next Steps

1. **Set up SMTP credentials** in `.env` file
2. **Test the form** on http://localhost:3000/contact.html
3. **Deploy to production** (update `APP_URL` in `.env`)
4. **Monitor admin email** for incoming messages
5. **Consider adding a contact message database** (optional)

## 🎁 Optional Enhancement: Store Messages in Database

If you want to store contact messages in a database:

```javascript
// Add to ContactController.js before sending emails
const ContactMessage = require('../models/ContactMessage');

const message = new ContactMessage({
  name: sanitizedData.name,
  email: sanitizedData.email,
  phone: sanitizedData.phone,
  subject: sanitizedData.subject,
  message: sanitizedData.message,
  createdAt: new Date(),
  responded: false
});

await message.save();
```

## ✨ Features Included

✅ Modern, responsive contact form  
✅ Real-time validation feedback  
✅ Professional email templates  
✅ Admin notifications  
✅ Customer confirmations  
✅ Rate limiting  
✅ Input sanitization  
✅ Error handling  
✅ Loading states  
✅ Accessibility (ARIA labels)  

---

**Questions?** Check the browser console (F12) for detailed error messages.
