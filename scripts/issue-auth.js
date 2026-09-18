'use strict';

const path = require('path');
const http = require('http');
const https = require('https');

function loadLocalEnv() {
  try {
    const local = require(path.join(__dirname, '../server/config/local.env.js'));
    Object.keys(local).forEach((key) => {
      if (process.env[key] === undefined && local[key] !== undefined && local[key] !== '') {
        process.env[key] = String(local[key]);
      }
    });
  } catch (e) {
    // local.env.js is optional
  }
}

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

function resolveLoginCredentials() {
  const email = process.env.ISSUES_EXPORT_EMAIL || process.env.DEVELOPER_EMAIL_ADDRESS;
  const password = process.env.ISSUES_EXPORT_PASSWORD || process.env.DEVELOPER_PASSWORD;
  return {email, password};
}

async function jwtAuthHeaders(base) {
  const {email, password} = resolveLoginCredentials();
  if (!email || !password) {
    throw new Error(
      'JWT login requires ISSUES_EXPORT_EMAIL + ISSUES_EXPORT_PASSWORD ' +
        '(or DEVELOPER_EMAIL_ADDRESS + DEVELOPER_PASSWORD) in server/config/local.env.js'
    );
  }
  const login = await requestJson('POST', base + '/auth/local', {}, {email, password});
  if (!login.token) {
    throw new Error('Login succeeded but no token returned');
  }
  return {headers: {authorization: 'Bearer ' + login.token}, exportToken: null};
}

async function authHeaders(base) {
  const exportToken = process.env.ISSUES_EXPORT_TOKEN;
  if (exportToken) {
    return {headers: {'x-issues-export-token': exportToken}, exportToken: exportToken};
  }
  return jwtAuthHeaders(base);
}

/** List issues (GET /api/issues) — requires JWT; export token is not accepted on that route. */
async function authHeadersForIssueList(base) {
  return jwtAuthHeaders(base);
}

/** PATCH issues — export token (admin) or JWT. */
async function authHeadersForIssueWrite(base) {
  return authHeaders(base);
}

module.exports = {
  loadLocalEnv,
  authHeaders,
  jwtAuthHeaders,
  authHeadersForIssueList,
  authHeadersForIssueWrite
};
