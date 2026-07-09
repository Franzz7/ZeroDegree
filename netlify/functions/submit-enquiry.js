'use strict';

const {
  cleanBlock,
  cleanLine,
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

  const missing = requireFields(data, [
    'name',
    'phone',
    'email',
    'postcode',
    'outdoor_tap',
    'outdoor_power'
  ]);

  if (missing.length) {
    return json(400, { error: 'Missing required fields', fields: missing });
  }

  const name = cleanLine(data.name);
  const phone = cleanLine(data.phone);
  const email = cleanLine(data.email);
  const postcode = cleanLine(data.postcode, 24).toUpperCase();
  const packageLabel = cleanLine(data.package) || 'Not specified';
  const outdoorTap = cleanLine(data.outdoor_tap);
  const outdoorPower = cleanLine(data.outdoor_power);
  const referralCode = cleanLine(data.referral_code) || 'None';
  const messageText = cleanBlock(data.message) || 'None';
  const siteEmail = process.env.GMAIL_USER;

  if (!EMAIL_RE.test(email)) {
    return json(400, { error: 'Invalid email address' });
  }

  try {
    await sendMail({
      from: `"Deep Chill Website" <${siteEmail}>`,
      replyTo: email,
      to: siteEmail,
      subject: `New Enquiry from ${name} - Deep Chill`,
      text: [
        'New enquiry received via deepchill.co.uk',
        '',
        `Name:           ${name}`,
        `Phone:          ${phone}`,
        `Email:          ${email}`,
        `Postcode:       ${postcode}`,
        `Package:        ${packageLabel}`,
        `Outdoor tap:    ${outdoorTap}`,
        `Outdoor power:  ${outdoorPower}`,
        `Referral code:  ${referralCode}`,
        '',
        'Message:',
        messageText
      ].join('\n')
    });
  } catch (error) {
    console.error('Enquiry notification failed:', error);
    return json(500, { error: 'Failed to send enquiry' });
  }

  await sendMail({
    from: `"Deep Chill" <${siteEmail}>`,
    replyTo: siteEmail,
    to: email,
    subject: "We've received your enquiry - Deep Chill",
    text: [
      'Hi,',
      '',
      "Thank you for getting in touch with Deep Chill. We've received your enquiry and will get back to you within one business day to confirm availability in your area.",
      '',
      'If you need to reach us in the meantime, simply reply to this message or call us on 07363 087890.',
      '',
      'Kind regards,',
      'The Deep Chill Team',
      '',
      'deepchill.co.uk'
    ].join('\n')
  }).catch((error) => {
    console.error('Enquiry autoreply failed:', error);
  });

  return json(200, { success: true });
};
