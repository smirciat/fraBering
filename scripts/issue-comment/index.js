#!/usr/bin/env node

/**
 * Post a comment on an issue (and optionally update status).
 *
 *   node scripts/issue-comment/index.js <issueId> [--status needs_clarification] [--no-email]
 *
 * Body: stdin or ISSUE_COMMENT_BODY env var.
 * Auth: ISSUES_EXPORT_TOKEN, or ISSUES_EXPORT_EMAIL + ISSUES_EXPORT_PASSWORD,
 * or DEVELOPER_EMAIL_ADDRESS + DEVELOPER_PASSWORD in local.env.js
 */

'use strict';

const http = require('http');
const https = require('https');
const {loadLocalEnv, authHeaders} = require('../issue-auth');

const PROD_API_BASE = 'https://frat.beringair.com';

function requestJson(method, url, headers, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;
    const data = body ? JSON.stringify(body) : null;
    const req = client.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname,
        method: method,
        headers: Object.assign(
          {'Content-Type': 'application/json'},
          data ? {'Content-Length': Buffer.byteLength(data)} : {},
          headers || {}
        )
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          if (res.statusCode >= 400) {
            reject(new Error('HTTP ' + res.statusCode + ': ' + text));
            return;
          }
          try {
            resolve(text ? JSON.parse(text) : {});
          } catch (e) {
            resolve(text);
          }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function readStdin() {
  return new Promise((resolve, reject) => {
    if (process.stdin.isTTY) {
      resolve('');
      return;
    }
    const chunks = [];
    process.stdin.on('data', (chunk) => chunks.push(chunk));
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    process.stdin.on('error', reject);
  });
}

async function main() {
  loadLocalEnv();

  const issueId = parseInt(process.argv[2], 10);
  if (!Number.isFinite(issueId)) {
    throw new Error('Usage: node scripts/issue-comment/index.js <issueId> [--status STATUS] [--no-email]');
  }

  const statusIdx = process.argv.indexOf('--status');
  const status = statusIdx >= 0 ? process.argv[statusIdx + 1] : null;
  const emailReporter = !process.argv.includes('--no-email');

  let body = process.env.ISSUE_COMMENT_BODY || '';
  if (!body.trim()) {
    body = await readStdin();
  }
  if (!body.trim()) {
    throw new Error('Comment body required on stdin or ISSUE_COMMENT_BODY');
  }

  const base = (process.env.API_BASE_URL || PROD_API_BASE).replace(/\/$/, '');
  const auth = await authHeaders(base);

  if (status) {
    await requestJson('PATCH', base + '/api/issues/' + issueId, auth.headers, {status: status});
    console.log('Status -> ' + status);
  }

  await requestJson('POST', base + '/api/issues/' + issueId + '/comments', auth.headers, {
    body: body.trim(),
    emailReporter: emailReporter
  });

  console.log('Comment posted on #' + issueId + (emailReporter ? ' (reporter emailed)' : ''));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
