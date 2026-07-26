#!/usr/bin/env node

/**
 * Writes docs/team-backlog.md and downloads issue screenshots when the server supports
 * GET /api/issues/agent-summary?format=export (or /agent-export).
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
        const body = Buffer.concat(chunks);
        if (res.statusCode && res.statusCode >= 400) {
          reject(
            new Error(
              `HTTP ${res.statusCode} from ${url}${body.length ? ': ' + body.toString('utf8').trim() : ''}`
            )
          );
          return;
        }
        resolve(body);
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
    return {headers: {'x-issues-export-token': exportToken}, exportToken: exportToken};
  }
  const email = process.env.ISSUES_EXPORT_EMAIL;
  const password = process.env.ISSUES_EXPORT_PASSWORD;
  if (email && password) {
    const login = await postJson(`${base}/auth/local`, {email, password});
    if (!login.token) {
      throw new Error('Login succeeded but no token returned');
    }
    return {headers: {authorization: 'Bearer ' + login.token}, exportToken: null};
  }
  throw new Error(
    'Set ISSUES_EXPORT_TOKEN or ISSUES_EXPORT_EMAIL + ISSUES_EXPORT_PASSWORD (admin user)'
  );
}

async function fetchAttachmentBuffer(base, attachmentId, auth) {
  const headers = auth.headers;
  const urls = [
    `${base}/api/issues/export/attachments/${attachmentId}`,
    `${base}/api/issues/attachments/${attachmentId}`
  ];
  let lastError;
  for (const url of urls) {
    try {
      return await fetchBuffer(url, headers);
    } catch (error) {
      lastError = error;
      const msg = error.message || String(error);
      if (msg.includes('404') || msg.includes('401')) {
        continue;
      }
      throw error;
    }
  }
  const safeMsg = lastError && lastError.message ? lastError.message.replace(/exportToken=\S+/g, 'exportToken=***') : 'HTTP 404';
  throw new Error(safeMsg);
}

function parseExportBundleBody(body) {
  const text = body.toString('utf8').trim();
  if (!text.length) {
    return null;
  }
  if (text.charAt(0) === '{') {
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed.markdown === 'string') {
        return parsed;
      }
    } catch (e) {
      return null;
    }
  }
  if (text.charAt(0) === '#') {
    return {markdown: text, attachments: [], markdownOnly: true};
  }
  return null;
}

async function fetchExportBundle(base, headers) {
  const bundleUrls = [
    `${base}/api/issues/agent-summary?format=export`,
    `${base}/api/issues/agent-export`
  ];
  let markdownFallback = null;

  for (const url of bundleUrls) {
    try {
      const body = await fetchBuffer(url, headers);
      const bundle = parseExportBundleBody(body);
      if (bundle) {
        if (bundle.markdownOnly && !bundle.attachments.length) {
          markdownFallback = bundle.markdown;
          continue;
        }
        return bundle;
      }
    } catch (error) {
      const msg = error.message || String(error);
      if (msg.includes('404')) {
        continue;
      }
      throw error;
    }
  }

  if (markdownFallback) {
    console.warn(
      'Server returned markdown only (no ?format=export bundle). Screenshots skipped. Deploy latest server issue API and re-run.'
    );
    return {markdown: markdownFallback, attachments: []};
  }

  console.warn(
    'Export bundle API not available. Using markdown-only agent-summary; no screenshots. Deploy latest server issue API and re-run.'
  );
  const markdown = (await fetchBuffer(`${base}/api/issues/agent-summary`, headers)).toString(
    'utf8'
  );
  return {markdown: markdown, attachments: []};
}

async function main() {
  const base = resolveApiBase();
  const auth = await authHeaders(base);
  const bundle = await fetchExportBundle(base, auth.headers);
  const markdown = bundle.markdown || '';
  const attachments = bundle.attachments || [];

  const docsDir = path.join(process.cwd(), 'docs');
  const outPath = path.join(docsDir, 'team-backlog.md');
  const attachRoot = path.join(docsDir, 'team-backlog', 'attachments');

  fs.mkdirSync(attachRoot, {recursive: true});
  fs.writeFileSync(outPath, markdown.endsWith('\n') ? markdown : `${markdown}\n`);

  let saved = 0;
  let seenIds = {};
  for (const att of attachments) {
    if (!att.attachmentId || !att.relativePath) {
      continue;
    }
    if (seenIds[att.attachmentId]) {
      continue;
    }
    seenIds[att.attachmentId] = true;
    const dest = path.join(docsDir, att.relativePath);
    fs.mkdirSync(path.dirname(dest), {recursive: true});
    if (att.missing) {
      const reason =
        att.missing === 'file_not_on_server'
          ? 'file missing on prod under server/fileserver/issue-attachments/'
          : 'attachment row missing in database';
      console.warn(`Skipped attachment ${att.attachmentId} (${att.relativePath}): ${reason}`);
      continue;
    }
    try {
      if (att.base64) {
        fs.writeFileSync(dest, Buffer.from(att.base64, 'base64'));
        saved += 1;
      } else {
        const buf = await fetchAttachmentBuffer(base, att.attachmentId, auth);
        fs.writeFileSync(dest, buf);
        saved += 1;
      }
    } catch (error) {
      console.warn(
        `Skipped attachment ${att.attachmentId} (${att.relativePath}): ${error.message || error}`
      );
      if (!att.base64) {
        console.warn(
          '  → Deploy latest server (bundle embeds screenshots) or fix attachment routes on prod.'
        );
      }
    }
  }

  console.log(`Wrote ${outPath} from ${base}`);
  if (saved > 0) {
    console.log(`Downloaded ${saved} screenshot(s) under docs/team-backlog/attachments/`);
  } else if (attachments.length) {
    console.log('No screenshots downloaded (see warnings above).');
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
