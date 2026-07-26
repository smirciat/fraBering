#!/usr/bin/env node

/**
 * Writes docs/team-backlog.md from GET /api/issues/agent-summary.
 *
 * **Usual workflow (dev laptop):** run this in your fraBering repo on your machine.
 * It calls **production** API and saves markdown **in this repo** (docs/team-backlog.md).
 * You do not need to run export on the prod server unless you want the file there.
 *
 *   node scripts/export-team-backlog/index.js
 *     → https://frat.beringair.com (default), token from server/config/local.env.js if set
 *   node scripts/export-team-backlog/index.js --local
 *     → http://localhost:9000 (dev DB only)
 *
 * Auth: ISSUES_EXPORT_TOKEN in local.env.js (same string as on prod server) or env vars below.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const LOCAL_API_BASE = 'http://localhost:9000';
const PROD_API_BASE = 'https://frat.beringair.com';

function loadLocalEnv() {
  try {
    const envPath = path.join(__dirname, '../../server/config/local.env.js');
    const local = require(envPath);
    Object.keys(local).forEach((key) => {
      if (
        process.env[key] === undefined &&
        local[key] !== undefined &&
        local[key] !== ''
      ) {
        process.env[key] = String(local[key]);
      }
    });
  } catch (e) {
    // local.env.js is optional for export
  }
}

loadLocalEnv();

function fetchBuffer(url, headers) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {headers: headers || {}}, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode} from ${url}${body ? ': ' + body.trim() : ''}`));
          return;
        }
        resolve(Buffer.from(body, 'utf8'));
      });
    });
    req.on('error', reject);
  });
}

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;
    const data = JSON.stringify(body);
    const req = client.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${text}`));
            return;
          }
          resolve(JSON.parse(text));
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function resolveApiBase() {
  if (process.argv.includes('--local')) {
    return LOCAL_API_BASE;
  }
  if (process.env.API_BASE_URL) {
    return process.env.API_BASE_URL.replace(/\/$/, '');
  }
  if (process.env.FRA_API_BASE) {
    return process.env.FRA_API_BASE.replace(/\/$/, '');
  }
  return PROD_API_BASE;
}

async function authHeaders(base) {
  const exportToken = process.env.ISSUES_EXPORT_TOKEN;
  if (exportToken) {
    return {'x-issues-export-token': exportToken};
  }
  const email = process.env.ISSUES_EXPORT_EMAIL;
  const password = process.env.ISSUES_EXPORT_PASSWORD;
  if (email && password) {
    const login = await postJson(`${base}/auth/local`, {email, password});
    if (!login.token) {
      throw new Error('Login succeeded but no token returned');
    }
    return {authorization: 'Bearer ' + login.token};
  }
  throw new Error(
    'Set ISSUES_EXPORT_TOKEN or ISSUES_EXPORT_EMAIL + ISSUES_EXPORT_PASSWORD (admin user)'
  );
}

async function main() {
  const base = resolveApiBase();
  const headers = await authHeaders(base);
  const markdown = (
    await fetchBuffer(`${base}/api/issues/agent-summary`, headers)
  ).toString('utf8');
  const outPath = path.join(process.cwd(), 'docs/team-backlog.md');
  fs.mkdirSync(path.dirname(outPath), {recursive: true});
  fs.writeFileSync(outPath, markdown.endsWith('\n') ? markdown : `${markdown}\n`);
  console.log(`Wrote ${outPath} from ${base}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
