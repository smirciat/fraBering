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

function sendIssueMail(to, subject, html, logLabel) {
  if (!to) {
    return;
  }
  var from = configString('GMAIL_ADDRESS');
  var transporter = getTransporter();
  if (!transporter) {
    console.warn('issue notify: skipped — GMAIL_ADDRESS or GMAIL_APP_PASS / GMAIL_PASS not set');
    return;
  }
  transporter.sendMail({
    from: from,
    to: to,
    subject: subject,
    html: html
  }, function(err, info) {
    if (err) {
      console.error('issue notify: send failed (' + logLabel + '):', err);
      return;
    }
    console.log('issue notify: sent (' + logLabel + ')' + (info && info.messageId ? ' (' + info.messageId + ')' : ''));
  });
}

function issueCommentHtml(issueJson, commentJson) {
  var id = issueJson._id;
  var domain = configString('DOMAIN').replace(/\/$/, '');
  var link = domain ? (domain + '/issues?issueId=' + id) : '';
  var body = commentJson.body || '';
  if (body.length > 800) {
    body = body.slice(0, 800) + '…';
  }
  var html = 'New comment on fraBering issue #' + id + '<br><br>' +
    '<b>' + escapeHtml(issueJson.title || '') + '</b><br>' +
    'From: ' + escapeHtml(commentJson.authorName || '') + '<br><br>' +
    escapeHtml(body).replace(/\n/g, '<br>');
  if (link) {
    html += '<br><br><a href="' + escapeHtml(link) + '">Open in fraBering</a>';
  }
  return html;
}

/**
 * Optional email when a follow-up comment is posted.
 */
export function notifyIssueComment(issue, comment, options) {
  options = options || {};
  var issueJson = issue.toJSON ? issue.toJSON() : issue;
  var commentJson = comment.toJSON ? comment.toJSON() : comment;
  var subject = '[fraBering issue #' + issueJson._id + '] New comment';
  var html = issueCommentHtml(issueJson, commentJson);

  if (options.emailDeveloper) {
    var devTo = configString('DEVELOPER_EMAIL_ADDRESS');
    if (!devTo) {
      console.log('issue notify: skipped developer comment email — DEVELOPER_EMAIL_ADDRESS not set');
    } else {
      sendIssueMail(devTo, subject, html, 'comment developer issue #' + issueJson._id);
    }
  }

  if (options.emailReporter && options.reporterEmail) {
    sendIssueMail(options.reporterEmail, subject, html, 'comment reporter issue #' + issueJson._id);
  } else if (options.emailReporter) {
    console.log('issue notify: skipped reporter comment email — no reporter email on issue #' + issueJson._id);
  }
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
  sendIssueMail(to, '[fraBering issue #' + id + '] ' + (json.title || 'New issue'), html, 'new issue #' + id);
}
