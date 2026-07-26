'use strict';

import nodemailer from 'nodemailer';
import localEnv from '../../config/local.env.js';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: localEnv.GMAIL_ADDRESS,
    pass: localEnv.GMAIL_APP_PASS
  }
});

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
  var to = localEnv.DEVELOPER_EMAIL_ADDRESS;
  if (!to) {
    return;
  }
  if (!localEnv.GMAIL_ADDRESS || !localEnv.GMAIL_APP_PASS) {
    console.warn('issue notify: GMAIL_ADDRESS / GMAIL_APP_PASS not set');
    return;
  }

  var json = issue.toJSON ? issue.toJSON() : issue;
  var id = json._id;
  var domain = (localEnv.DOMAIN || '').replace(/\/$/, '');
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

  transporter.sendMail({
    from: localEnv.GMAIL_ADDRESS,
    to: to,
    subject: '[fraBering issue #' + id + '] ' + (json.title || 'New issue'),
    html: html
  }, function(err) {
    if (err) {
      console.error('issue notify email failed:', err);
    }
  });
}
