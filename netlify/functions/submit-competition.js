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

  const { full_name, email, postcode, phone, marketing } = data;

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
      `Phone:     ${phone || '—'}`,
      `Marketing: ${marketing || 'No'}`
    ].join('\n')
  }).catch(function (err) { errors.push('notification: ' + err.message); });

  await transporter.sendMail({
    from: `"Deep Chill" <${process.env.GMAIL_USER}>`,
    replyTo: process.env.GMAIL_USER,
    to: email,
    subject: 'Deep Chill prize draw entry',
    text: [
      `Hi ${full_name},`,
      '',
      'Thank you for entering the Deep Chill prize draw.',
      '',
      'You are now entered for a chance to win a free 1-month Deep Chill experience, worth £180.',
      '',
      'The prize includes the cold plunge tub, chiller, delivery, setup, and regular cleaning and maintenance.',
      '',
      'The winner will be contacted after the draw closes. The prize is subject to postcode coverage, suitable outdoor space, access to an outdoor tap, and a suitable outdoor power supply.',
      '',
      'Good luck!',
      '',
      'Kind regards,',
      'Franz',
      'Deep Chill',
      'deepchill.co.uk'
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
