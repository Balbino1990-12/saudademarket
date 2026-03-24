const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'user@example.com',
    pass: process.env.SMTP_PASS || 'password',
  },
});

async function sendConfirmationEmail(to, token) {
  const confirmUrl = `${process.env.APP_URL || 'http://localhost:3000'}/confirm-email?token=${token}`;
  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@example.com',
    to,
    subject: 'Confirm your email',
    html: `<p>Please confirm your email by clicking <a href="${confirmUrl}">here</a>.</p>`
  };
  return transporter.sendMail(mailOptions);
}

async function sendOrderConfirmationEmail(to, order) {
  const itemLines = (order.items || []).map(item => {
    const name = item.name_en || item.name_fr || item.name_pt || item.product_id;
    return `<li>${item.quantity} x ${name} - EUR ${Number(item.price).toFixed(2)}</li>`;
  }).join('');

  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@example.com',
    to,
    subject: `Order #${order.id} Confirmed`,
    html: `
      <h2>Thank you for your order!</h2>
      <p>Your order <strong>#${order.id}</strong> has been confirmed.</p>
      <p>Delivery address: ${order.address || 'N/A'}</p>
      <p>Order notes: ${order.notes || 'None'}</p>
      <ul>${itemLines}</ul>
      <p><strong>Total: EUR ${Number(order.total || 0).toFixed(2)}</strong></p>
      <p>If you have any questions, reply to this email.</p>
    `
  };
  return transporter.sendMail(mailOptions);
}

module.exports = { sendConfirmationEmail, sendOrderConfirmationEmail };
