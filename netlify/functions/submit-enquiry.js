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
    'enquiry_type'
  ]);

  if (missing.length) {
    return json(400, { error: 'Missing required fields', fields: missing });
  }

  const name = cleanLine(data.name);
  const phone = cleanLine(data.phone);
  const email = cleanLine(data.email);
  const postcode = cleanLine(data.postcode);
  const enquiryType = cleanLine(data.enquiry_type);
  const isEvent = enquiryType === 'event';
  const enquiryTypeLabel = isEvent ? 'Event or production hire' : 'Home hire';
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
      subject: `New ${isEvent ? 'Event Hire ' : ''}Enquiry from ${name} - Deep Chill`,
      text: [
        'New enquiry received via deepchill.co.uk',
        '',
        `Enquiring about: ${enquiryTypeLabel}`,
        `Name:            ${name}`,
        `Phone:           ${phone}`,
        `Email:           ${email}`,
        `Postcode/Location: ${postcode}`,
        `Referral code:   ${referralCode}`,
        '',
        'Message:',
        messageText
      ].join('\n')
    });
  } catch (error) {
    console.error('Enquiry notification failed:', error);
    return json(500, { error: 'Failed to send enquiry' });
  }

  const autoreplyText = isEvent
    ? [
        'Hi,',
        '',
        "Thank you for your event hire enquiry. We've received your details and will be in touch shortly to confirm availability and pricing.",
        '',
        'If you need to reach us in the meantime, simply reply to this message or call us on 07363 087890.',
        '',
        'Kind regards,',
        'The Deep Chill Team',
        '',
        'deepchill.co.uk'
      ].join('\n')
    : [
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
      ].join('\n');

  await sendMail({
    from: `"Deep Chill" <${siteEmail}>`,
    replyTo: siteEmail,
    to: email,
    subject: isEvent
      ? "We've received your event hire enquiry - Deep Chill"
      : "We've received your enquiry - Deep Chill",
    text: autoreplyText
  }).catch((error) => {
    console.error('Enquiry autoreply failed:', error);
  });

  return json(200, { success: true });
};
