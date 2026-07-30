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

const ENQUIRY_TYPE_LABELS = {
  'home': 'Monthly Home Hire',
  'promo-event': 'Promotional Partner Event',
  'event': 'Standard Event Hire',
  'gym': 'Managed Gym Hire',
  'production': 'Production Hire',
  'partnership': 'Partnership Enquiry',
  'general': 'General Enquiry'
};

const BUSINESS_FIELD_BY_TYPE = {
  'promo-event': 'promo_business',
  'event': 'std_business',
  'gym': 'gym_business',
  'production': 'prod_business',
  'partnership': 'partner_business'
};

const TYPE_FIELDS = {
  'home': [
    ['home_installation_area', 'Proposed installation area'],
    ['home_start_date', 'Preferred start date'],
    ['home_installation_location', 'Indoors or outdoors'],
    ['home_power_access', 'Access to power supply'],
    ['home_water_drainage_access', 'Access to water and drainage']
  ],
  'promo-event': [
    ['promo_event_date', 'Event date'],
    ['promo_event_time', 'Event start/finish time'],
    ['promo_event_type', 'Type of event'],
    ['promo_participants', 'Expected participants'],
    ['promo_details', 'Proposed promotional activity'],
    ['promo_venue_access', 'Power/water/drainage at venue']
  ],
  'event': [
    ['std_event_date', 'Event date'],
    ['std_event_time', 'Event start/finish time'],
    ['std_event_type', 'Type of event'],
    ['std_participants', 'Expected participants'],
    ['std_setups', 'Setups required'],
    ['std_venue_access', 'Power/water/drainage at venue'],
    ['std_additional_details', 'Additional event details']
  ],
  'gym': [
    ['gym_usage', 'Gym and expected usage'],
    ['gym_installation_area', 'Proposed installation area'],
    ['gym_venue_access', 'Power/water/drainage available'],
    ['gym_start_date', 'Preferred start date'],
    ['gym_additional_info', 'Additional information']
  ],
  'production': [
    ['prod_date', 'Production date'],
    ['prod_delivery_times', 'Delivery/collection times'],
    ['prod_type', 'Type of production'],
    ['prod_setups', 'Setups required'],
    ['prod_equipment_usage', 'How equipment will be used'],
    ['prod_requirements', 'Production requirements'],
    ['prod_venue_access', 'Power/water/drainage at location']
  ],
  'partnership': [
    ['partner_business_type', 'Type of business'],
    ['partner_website', 'Website'],
    ['partner_social', 'Instagram/Facebook'],
    ['partner_members', 'Approx. members/clients'],
    ['partner_collab_details', 'How they want to work with Deep Chill']
  ],
  'general': [
    ['general_details', 'Enquiry details']
  ]
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
    'enquiry_type'
  ]);

  if (missing.length) {
    return json(400, { error: 'Missing required fields', fields: missing });
  }

  if (!data.privacy_ack) {
    return json(400, { error: 'Please confirm you have read the Privacy Policy.' });
  }

  const name = cleanLine(data.name);
  const phone = cleanLine(data.phone);
  const email = cleanLine(data.email);
  const postcode = cleanLine(data.postcode);
  const enquiryType = cleanLine(data.enquiry_type);
  const enquiryTypeLabel = ENQUIRY_TYPE_LABELS[enquiryType] || 'General Enquiry';
  const referralCode = cleanLine(data.referral_code) || 'None';
  const siteEmail = process.env.GMAIL_USER;

  if (!EMAIL_RE.test(email)) {
    return json(400, { error: 'Invalid email address' });
  }

  const businessField = BUSINESS_FIELD_BY_TYPE[enquiryType];
  const business = businessField ? (cleanLine(data[businessField]) || 'Not provided') : 'Not applicable';

  const typeFields = TYPE_FIELDS[enquiryType] || [];
  const typeLines = typeFields.map(function (entry) {
    return `${entry[1]}: ${cleanBlock(data[entry[0]]) || 'Not provided'}`;
  });

  try {
    await sendMail({
      from: `"Deep Chill Website" <${siteEmail}>`,
      replyTo: email,
      to: siteEmail,
      subject: `New ${enquiryTypeLabel} Enquiry from ${name} - Deep Chill`,
      text: [
        'New enquiry received via deepchill.co.uk',
        '',
        `Enquiring about: ${enquiryTypeLabel}`,
        `Name:            ${name}`,
        `Business/org:    ${business}`,
        `Phone:           ${phone}`,
        `Email:           ${email}`,
        `Location:        ${postcode}`,
        '',
        ...typeLines,
        '',
        `Referral code:   ${referralCode}`
      ].join('\n')
    });
  } catch (error) {
    console.error('Enquiry notification failed:', error);
    return json(500, { error: 'Failed to send enquiry' });
  }

  const autoreplyText = [
    'Hi,',
    '',
    `Thank you for your ${enquiryTypeLabel.toLowerCase()} enquiry with Deep Chill. We've received your details and will confirm availability or respond to your enquiry as soon as possible.`,
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
