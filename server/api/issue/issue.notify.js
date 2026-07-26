'use strict';

import nodemailer from 'nodemailer';
import localEnv from '../../config/local.env.js';

function configString(key) {
  var fromEnv = process.env[key];
  if (fromEnv != null && String(fromEnv).trim() !== '') {
    return String(fromEnv).trim();
  }
  if (localEnv[key] != null && String(localEnv[key]).trim() !== '') {
    return String(localEnv[key]).trim();
  }
  return '';
}

function gmailAppPass() {
  return configString('GMAIL_APP_PASS') || configString('GMAIL_PASS');
}

function getTransporter() {
  var user = configString('GMAIL_ADDRESS');
  var pass = gmailAppPass();
  if (!user || !pass) {
    return null;
  }
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {user: user, pass: pass}
  });
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Short email to DEVELOPER_EMAIL_ADDRESS when a new issue is filed. Fire-and-forget.
 */
export function notifyNewIssue(issue, attachmentCount) {
  var to = configString('DEVELOPER_EMAIL_ADDRESS');
  if (!to) {
    console.log('issue notify: skipped — DEVELOPER_EMAIL_ADDRESS not set (local.env.js or env)');
    return;
  }

  var from = configString('GMAIL_ADDRESS');
  var transporter = getTransporter();
  if (!transporter) {
    console.warn('issue notify: skipped — GMAIL_ADDRESS or GMAIL_APP_PASS / GMAIL_PASS not set');
    return;
  }

  var json = issue.toJSON ? issue.toJSON() : issue;
  var id = json._id;
  var domain = configString('DOMAIN').replace(/\/$/, '');
  var link = domain ? (domain + '/issues?issueId=' + id) : '';

  var desc = json.description || '';
  if (desc.length > 500) {
    desc = desc.slice(0, 500) + '…';
  }

  var html = 'New fraBering issue #' + id + '<br><br>' +
    '<b>' + escapeHtml(json.title || '') + '</b><br>' +
    'Kind: ' + escapeHtml(json.kind || '') + '<br>' +
    'Priority: ' + escapeHtml(json.priority || '') + '<br>' +
    'Reporter: ' + escapeHtml(json.reporterName || '') + '<br>';
  if (attachmentCount > 0) {
    html += 'Attachments: ' + attachmentCount + '<br>';
  }
  html += '<br>' + escapeHtml(desc).replace(/\n/g, '<br>');
  if (link) {
    html += '<br><br><a href="' + escapeHtml(link) + '">Open in fraBering</a>';
  }

  console.log('issue notify: sending email for issue #' + id + ' to ' + to);

  transporter.sendMail({
    from: from,
    to: to,
    subject: '[fraBering issue #' + id + '] ' + (json.title || 'New issue'),
    html: html
  }, function(err, info) {
    if (err) {
      console.error('issue notify: send failed for issue #' + id + ':', err);
      return;
    }
    console.log('issue notify: sent for issue #' + id + (info && info.messageId ? ' (' + info.messageId + ')' : ''));
  });
}
