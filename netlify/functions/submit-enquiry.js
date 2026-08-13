'use strict';

const {
  cleanBlock,
  cleanLine,
  isBotSubmission,
  json,
  methodNotAllowed,
  parseJsonBody,
  requireFields,
  sendMail
} = require('./_mail');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const INTEREST_LABELS = {
  'home-self': 'Home hire — self-managed',
  'home-myozone': 'Home hire — self-managed + MyoZone',
  'home-managed': 'Home hire — fully managed',
  'gym': 'Managed gym hire',
  'event': 'Event hire',
  'production': 'Production hire',
  'not-sure': 'Not sure — please advise'
};

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

  const missing = requireFields(data, [
    'name',
    'phone',
    'email',
    'postcode',
    'interest'
  ]);

  if (missing.length) {
    return json(400, { error: 'Missing required fields', fields: missing });
  }

  const name = cleanLine(data.name);
  const phone = cleanLine(data.phone);
  const email = cleanLine(data.email);
  const postcode = cleanLine(data.postcode);
  const preferredDate = cleanLine(data.preferred_date) || 'Not provided';
  const message = cleanBlock(data.message) || 'Not provided';
  const interest = cleanLine(data.interest);
  const interestLabel = INTEREST_LABELS[interest] || 'Not sure — please advise';
  const siteEmail = process.env.GMAIL_USER;

  if (!EMAIL_RE.test(email)) {
    return json(400, { error: 'Invalid email address' });
  }

  try {
    await sendMail({
      from: `"Deep Chill Website" <${siteEmail}>`,
      replyTo: email,
      to: siteEmail,
      subject: `New ${interestLabel} Enquiry from ${name} - Deep Chill`,
      text: [
        'New enquiry received via deepchill.co.uk',
        '',
        `Interested in:   ${interestLabel}`,
        `Name:            ${name}`,
        `Phone:           ${phone}`,
        `Email:           ${email}`,
        `Location:        ${postcode}`,
        `Preferred date:  ${preferredDate}`,
        '',
        'Message:',
        message
      ].join('\n')
    });
  } catch (error) {
    console.error('Enquiry notification failed:', error);
    return json(500, { error: 'Failed to send enquiry' });
  }

  const autoreplyText = [
    'Thank you for your enquiry.',
    '',
    "We've received your details and will be in touch shortly to confirm availability and pricing.",
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
    subject: "We've received your enquiry - Deep Chill",
    text: autoreplyText
  }).catch((error) => {
    console.error('Enquiry autoreply failed:', error);
  });

  return json(200, { success: true });
};
