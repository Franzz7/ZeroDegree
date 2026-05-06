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

  const { full_name, email, postcode, phone } = data;

  if (!full_name || !email || !postcode) {
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

  const errors = [];

  await transporter.sendMail({
    from: `"Deep Chill Website" <${process.env.GMAIL_USER}>`,
    to: process.env.GMAIL_USER,
    subject: `New Prize Draw Entry from ${full_name} — Deep Chill`,
    text: [
      'New prize draw entry received via deepchill.co.uk/win',
      '',
      `Name:      ${full_name}`,
      `Email:     ${email}`,
      `Postcode:  ${postcode}`,
      `Phone:     ${phone || '—'}`
    ].join('\n')
  }).catch(function (err) { errors.push('notification: ' + err.message); });

  await transporter.sendMail({
    from: `"Deep Chill" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "You're entered — Deep Chill Prize Draw",
    text: [
      `Hi ${full_name},`,
      '',
      "You're in the draw! We've received your entry to the Deep Chill prize draw.",
      '',
      'Every entrant receives a 10% discount on their first month — look out for a follow-up email with your code.',
      '',
      'The winner will be announced on 30 June. Good luck!',
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
