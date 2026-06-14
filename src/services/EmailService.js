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

function formatCurrency(amount) {
  return `€${Number(amount || 0).toFixed(2)}`;
}

async function sendOrderConfirmationEmail(to, order) {
  const itemLines = (order.items || []).map(item => {
    const name = item.name || item.name_en || item.name_fr || item.name_pt || item.product_name || `Product #${item.product_id}`;
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.price || 0);
    const lineTotal = quantity * unitPrice;
    return `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e0e0e0;">${name}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e0e0e0; text-align: center;">${quantity}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">${formatCurrency(unitPrice)}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">${formatCurrency(lineTotal)}</td>
      </tr>
    `;
  }).join('');

  const discountAmount = Number(order.discount_amount || order.discountAmount || 0);
  const shippingCost = Number(order.shipping_cost || order.shippingCost || 0);
  const subtotal = Number(order.total || 0) + discountAmount - shippingCost;
  const subjectLine = order.order_serial ? `Order Receipt ${order.order_serial}` : `Order Receipt #${order.id}`;
  const logoUrl = `${process.env.APP_URL || 'http://localhost:3000'}/images/Saudade_market.png`;

  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@example.com',
    to,
    replyTo: process.env.SMTP_FROM || 'noreply@example.com',
    subject: subjectLine,
    html: `
      <div style="font-family: Arial, sans-serif; color: #1f2937;">
        <div style="max-width: 680px; margin: 0 auto; padding: 24px; background: #f8fafc;">
          <div style="background: #ffffff; border-radius: 14px; padding: 28px; box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);">
            <div style="text-align: center; margin-bottom: 24px;">
              <img src="${logoUrl}" alt="Saudade Market" style="display: inline-block; max-width: 180px; width: 100%; height: auto;" />
            </div>
            <h1 style="font-size: 24px; margin-bottom: 0.75rem; color: #111827;">Votre reçu de commande</h1>
            <p style="margin: 0 0 16px; color: #4b5563;">Merci pour votre commande. Nous avons bien reçu votre paiement et nous préparons votre livraison.</p>
            <table style="width: 100%; margin-bottom: 20px; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Commande</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 700;">${order.order_serial || `#${order.id}`}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Méthode de livraison</td>
                <td style="padding: 8px 0; text-align: right;">${order.shipping_method || order.shippingMethod || 'Standard'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Adresse de livraison</td>
                <td style="padding: 8px 0; text-align: right;">${order.address || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Note de commande</td>
                <td style="padding: 8px 0; text-align: right;">${order.notes || 'Aucune'}</td>
              </tr>
            </table>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; background: #f9fafb; border-radius: 10px; overflow: hidden;">
              <thead style="background: #f3f4f6; color: #111827; text-align: left;">
                <tr>
                  <th style="padding: 12px;">Produit</th>
                  <th style="padding: 12px; text-align: center;">Quantité</th>
                  <th style="padding: 12px; text-align: right;">Prix unitaire</th>
                  <th style="padding: 12px; text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemLines || '<tr><td colspan="4" style="padding: 16px; text-align: center; color: #6b7280;">Aucun article trouvé</td></tr>'}
              </tbody>
            </table>
            <div style="display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 32px;">
              <div style="flex: 1; min-width: 240px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px;">
                <h2 style="font-size: 16px; margin-bottom: 12px; color: #111827;">Résumé de la commande</h2>
                <p style="margin: 0 0 8px; color: #4b5563;">Sous-total: <strong>${formatCurrency(subtotal)}</strong></p>
                <p style="margin: 0 0 8px; color: #4b5563;">Frais de livraison: <strong>${formatCurrency(shippingCost)}</strong></p>
                <p style="margin: 0 0 8px; color: #4b5563;">Remise: <strong>-${formatCurrency(discountAmount)}</strong></p>
                <p style="margin: 16px 0 0; font-size: 18px; color: #111827;">Total payé: <strong>${formatCurrency(order.total)}</strong></p>
              </div>
              <div style="flex: 1; min-width: 240px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px;">
                <h2 style="font-size: 16px; margin-bottom: 12px; color: #111827;">Informations client</h2>
                <p style="margin: 0 0 8px; color: #4b5563;">Nom: <strong>${order.customer_name || order.name || ''}</strong></p>
                <p style="margin: 0 0 8px; color: #4b5563;">Email: <strong>${to}</strong></p>
                <p style="margin: 0; color: #4b5563;">Merci pour votre achat.</p>
              </div>
            </div>
            <p style="margin: 0; color: #6b7280;">Si vous avez des questions à propos de votre commande, répondez simplement à cet e-mail.</p>
          </div>
        </div>
      </div>
    `
  };
  return transporter.sendMail(mailOptions);
}

async function sendReturnConfirmationEmail(to, returnData) {
  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@example.com',
    to,
    subject: `Return Request #${returnData.rma_number} Submitted`,
    html: `
      <h2>Return Request Submitted</h2>
      <p>Your return request has been submitted successfully.</p>
      <p><strong>RMA Number:</strong> ${returnData.rma_number}</p>
      <p><strong>Order:</strong> ${returnData.order_serial}</p>
      <p><strong>Product:</strong> ${returnData.name_en || returnData.name_fr || returnData.name_pt || returnData.product_id}</p>
      <p><strong>Quantity:</strong> ${returnData.quantity}</p>
      <p><strong>Reason:</strong> ${returnData.reason}</p>
      <p><strong>Status:</strong> ${returnData.status}</p>
      ${returnData.condition_description ? `<p><strong>Condition Description:</strong> ${returnData.condition_description}</p>` : ''}
      <p>Please ship the item to our return address within 7 days. Include the RMA number on the package.</p>
      <p>Return Address: [Your Return Address Here]</p>
      <p>We will process your return within 3-5 business days after receiving the item.</p>
      <p>If you have any questions, reply to this email.</p>
    `
  };
  return transporter.sendMail(mailOptions);
}

async function sendDiscountNotificationEmail(to, discount) {
  const categoriesText = discount.categories ? discount.categories.join(', ') : 'All Products';

  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@example.com',
    to,
    subject: `🎉 Special Discount: ${discount.title}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #8B0000; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .discount-code { background-color: #fff; border: 2px dashed #8B0000; padding: 15px; text-align: center; margin: 20px 0; border-radius: 5px; }
          .code { font-size: 24px; font-weight: bold; color: #8B0000; letter-spacing: 2px; }
          .cta-button { display: inline-block; background-color: #8B0000; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🍷 Special Offer Just for You!</h1>
          </div>
          <div class="content">
            <h2>${discount.title}</h2>
            <p>${discount.description}</p>

            <div class="discount-code">
              <p><strong>Use Code:</strong></p>
              <div class="code">${discount.discountCode}</div>
              <p><strong>${discount.discountPercent}% OFF</strong></p>
            </div>

            <p><strong>Valid on:</strong> ${categoriesText}</p>
            <p><strong>Expires:</strong> ${new Date(discount.validUntil).toLocaleDateString()}</p>

            <div style="text-align: center;">
              <a href="${process.env.APP_URL || 'http://localhost:3000'}/products" class="cta-button">
                Shop Now & Save!
              </a>
            </div>

            <p>Don't miss out on this limited-time offer. Visit our store today and use the code at checkout!</p>

            <p>Happy shopping,<br>The Portugal Store Team</p>
          </div>
          <div class="footer">
            <p>This email was sent to you because you're a valued customer of Portugal Store.</p>
            <p>If you no longer wish to receive promotional emails, please contact us.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };
  return transporter.sendMail(mailOptions);
}

/**
 * Send confirmation email to customer after contact form submission
 */
async function sendContactConfirmationEmail(to, name) {
  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@example.com',
    to,
    subject: 'Merci pour votre message - Saudade Market',
    html: `
      <div style="font-family: Arial, sans-serif; color: #1f2937;">
        <div style="max-width: 600px; margin: 0 auto; padding: 24px; background: #f8fafc;">
          <div style="background: #ffffff; border-radius: 14px; padding: 28px; box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);">
            <div style="text-align: center; margin-bottom: 24px;">
              <img src="${process.env.APP_URL || 'http://localhost:3000'}/images/Saudade_market.png" alt="Saudade Market" style="display: inline-block; max-width: 180px; width: 100%; height: auto;" />
            </div>
            <h1 style="font-size: 24px; margin-bottom: 16px; color: #111827;">Merci pour votre message</h1>
            <p style="margin: 0 0 16px; color: #4b5563; line-height: 1.6;">Bonjour ${name},</p>
            <p style="margin: 0 0 16px; color: #4b5563; line-height: 1.6;">
              Nous avons bien reçu votre message et nous vous remercions de nous avoir contactés. 
              Notre équipe du service client français lira votre message avec attention et vous répondra dans les 24 heures.
            </p>
            <div style="background: #f3f4f6; border-left: 4px solid #c41e1e; padding: 16px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0; color: #1f2937; font-weight: 600;">Nous vous répondrons rapidement</p>
              <p style="margin: 8px 0 0; color: #4b5563; font-size: 14px;">Si vous avez d'autres questions, n'hésitez pas à nous recontacter.</p>
            </div>
            <p style="margin: 24px 0 8px; color: #4b5563; line-height: 1.6;">
              Cordialement,<br>
              <strong>L'équipe Saudade Market</strong>
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
            <p style="margin: 0; color: #6b7280; font-size: 12px; line-height: 1.5;">
              Saudade Market | Épicerie Portugaise en Ligne<br>
              123 Rue de la Portugaise, 75001 Paris, France<br>
              +33 1 23 45 67 89 | contact@saudade-market.fr
            </p>
          </div>
        </div>
      </div>
    `
  };
  return transporter.sendMail(mailOptions);
}

/**
 * Send notification email to admin about contact form submission
 */
async function sendContactNotificationEmail(contactData) {
  const adminEmail = process.env.CONTACT_ADMIN_EMAIL || process.env.SMTP_FROM || 'admin@example.com';
  
  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@example.com',
    to: adminEmail,
    replyTo: contactData.email,
    subject: `[CONTACT] ${contactData.subject} - De: ${contactData.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #1f2937;">
        <div style="max-width: 600px; margin: 0 auto; padding: 24px; background: #f8fafc;">
          <div style="background: #ffffff; border-radius: 14px; padding: 28px; box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);">
            <h1 style="font-size: 20px; margin-bottom: 16px; color: #c41e1e; border-bottom: 2px solid #c41e1e; padding-bottom: 12px;">
              Nouveau message de contact
            </h1>
            
            <div style="margin-bottom: 20px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="background: #f9fafb;">
                  <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: 600; color: #1f2937;">Nom</td>
                  <td style="padding: 12px; border: 1px solid #e5e7eb; color: #4b5563;">${contactData.name}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: 600; color: #1f2937;">Email</td>
                  <td style="padding: 12px; border: 1px solid #e5e7eb; color: #4b5563;">
                    <a href="mailto:${contactData.email}" style="color: #c41e1e; text-decoration: none;">${contactData.email}</a>
                  </td>
                </tr>
                ${contactData.phone ? `
                <tr style="background: #f9fafb;">
                  <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: 600; color: #1f2937;">Téléphone</td>
                  <td style="padding: 12px; border: 1px solid #e5e7eb; color: #4b5563;">
                    <a href="tel:${contactData.phone}" style="color: #c41e1e; text-decoration: none;">${contactData.phone}</a>
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: 600; color: #1f2937;">Sujet</td>
                  <td style="padding: 12px; border: 1px solid #e5e7eb; color: #4b5563;">${contactData.subject}</td>
                </tr>
              </table>
            </div>

            <div style="background: #f9fafb; border-left: 4px solid #c41e1e; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
              <h3 style="margin: 0 0 12px; color: #1f2937; font-size: 14px; font-weight: 700;">Message:</h3>
              <p style="margin: 0; color: #4b5563; line-height: 1.6; white-space: pre-wrap; word-break: break-word;">${contactData.message}</p>
            </div>

            <div style="background: #e8f5e9; border-left: 4px solid #22c55e; padding: 12px; border-radius: 6px; font-size: 12px; color: #1b5e20;">
              <p style="margin: 0;">✓ Message reçu le ${new Date().toLocaleString('fr-FR')}</p>
            </div>
          </div>
        </div>
      </div>
    `
  };
  return transporter.sendMail(mailOptions);
}

module.exports = { 
  sendConfirmationEmail, 
  sendOrderConfirmationEmail, 
  sendReturnConfirmationEmail, 
  sendDiscountNotificationEmail,
  sendContactConfirmationEmail,
  sendContactNotificationEmail
};

