'use strict';

const {
  cleanLine,
  isBotSubmission,
  json,
  methodNotAllowed,
  parseJsonBody,
  requireFields,
  sendMail
} = require('./_mail');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return methodNotAllowed();
  }

  const data = parseJsonBody(event);
  if (!data) {
    return json(400, { error: 'Invalid request body' });
  }

  if (isBotSubmission(data)) {
    return json(200, { success: true });
  }

  const missing = requireFields(data, ['full_name', 'email', 'postcode']);
  if (missing.length) {
    return json(400, { error: 'Missing required fields', fields: missing });
  }

  const fullName = cleanLine(data.full_name);
  const email = cleanLine(data.email);
  const postcode = cleanLine(data.postcode, 24).toUpperCase();
  const phone = cleanLine(data.phone) || '—';
  const marketing = cleanLine(data.marketing) === 'Yes';
  const siteEmail = process.env.GMAIL_USER;

  if (!EMAIL_RE.test(email)) {
    return json(400, { error: 'Invalid email address' });
  }

  try {
    await sendMail({
      from: `"Deep Chill Website" <${siteEmail}>`,
      replyTo: email,
      to: siteEmail,
      subject: `New Prize Draw Entry from ${fullName} — Deep Chill`,
      text: [
        'New prize draw entry received via deepchill.co.uk/win',
        '',
        `Name:      ${fullName}`,
        `Email:     ${email}`,
        `Postcode:  ${postcode}`,
        `Phone:     ${phone}`,
        `Email marketing: ${marketing ? 'YES — happy to receive emails' : 'NO — does not want emails'}`
      ].join('\n')
    });
  } catch (error) {
    console.error('Competition notification failed:', error);
    return json(500, { error: 'Failed to send entry' });
  }

  await sendMail({
    from: `"Deep Chill" <${siteEmail}>`,
    replyTo: siteEmail,
    to: email,
    subject: 'Deep Chill prize draw entry',
    text: [
      `Hi ${fullName},`,
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
  }).catch((error) => {
    console.error('Competition autoreply failed:', error);
  });

  return json(200, { success: true });
};
