'use strict';

const nodemailer = require('nodemailer');

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify(payload)
  };
}

function methodNotAllowed() {
  return {
    statusCode: 405,
    headers: { Allow: 'POST' },
    body: 'Method Not Allowed'
  };
}

function parseJsonBody(event) {
  try {
    return JSON.parse(event.body || '{}');
  } catch (error) {
    return null;
  }
}

function cleanLine(value, maxLength = 160) {
  return String(value || '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function cleanBlock(value, maxLength = 1500) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim()
    .slice(0, maxLength);
}

function requireFields(data, fields) {
  return fields.filter((field) => !cleanLine(data[field]));
}

const MIN_FORM_FILL_MS = 3000;

// Blocks the two most common bot patterns: scripted blind POSTs straight to
// the function URL (no form_loaded_at timestamp, or one that's too fresh),
// and scraper bots that fill in every field they find, including the
// honeypot input that's hidden from real users.
function isBotSubmission(data) {
  if (cleanLine(data.website)) return true;

  const loadedAt = Number(data.form_loaded_at);
  if (!Number.isFinite(loadedAt)) return true;

  const elapsed = Date.now() - loadedAt;
  if (elapsed < MIN_FORM_FILL_MS) return true;

  return false;
}

function createTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_PASS;

  if (!user || !pass) {
    throw new Error('Missing Gmail environment configuration');
  }

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass }
  });
}

async function sendMail(message) {
  const transporter = createTransporter();
  return transporter.sendMail(message);
}

module.exports = {
  cleanBlock,
  cleanLine,
  isBotSubmission,
  json,
  methodNotAllowed,
  parseJsonBody,
  requireFields,
  sendMail
};
