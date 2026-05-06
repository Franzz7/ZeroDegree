'use strict';

const nodemailer = require('nodemailer');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch (e) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid request body' })
    };
  }

  const { name, phone, email, postcode, outdoor_tap, outdoor_power, message } = data;
  const pkg = data.package || '';

  if (!name || !phone || !email || !postcode || !outdoor_tap || !outdoor_power) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing required fields' })
    };
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS
    }
  });

  const packageLabel = pkg || 'Not specified';
  const messageText  = message || '—';

  const errors = [];

  await transporter.sendMail({
    from: `"Deep Chill Website" <${process.env.GMAIL_USER}>`,
    to: process.env.GMAIL_USER,
    subject: `New Enquiry from ${name} — Deep Chill`,
    text: [
      'New enquiry received via deepchill.co.uk',
      '',
      `Name:           ${name}`,
      `Phone:          ${phone}`,
      `Email:          ${email}`,
      `Postcode:       ${postcode}`,
      `Package:        ${packageLabel}`,
      `Outdoor tap:    ${outdoor_tap}`,
      `Outdoor power:  ${outdoor_power}`,
      '',
      'Message:',
      messageText
    ].join('\n')
  }).catch(function (err) { errors.push('notification: ' + err.message); });

  await transporter.sendMail({
    from: `"Deep Chill" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "We've received your enquiry — Deep Chill",
    text: [
      `Hi ${name},`,
      '',
      "Thank you for getting in touch with Deep Chill. We've received your enquiry and will confirm availability within one business day.",
      '',
      'If you need to reach us in the meantime, you can reply to this email or call us on 07363 087 890.',
      '',
      'Kind regards,',
      'The Deep Chill Team',
      '',
      '---',
      'Deep Chill | Home Cold Plunge Hire | deepchill.co.uk'
    ].join('\n')
  }).catch(function (err) { errors.push('autoreply: ' + err.message); });

  if (errors.length === 2) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to send emails', detail: errors.join('; ') })
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: true })
  };
};
