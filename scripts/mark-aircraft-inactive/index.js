#!/usr/bin/env node

/**
 * Mark helicopter (or any) tail numbers inactive in Firebase aircraft collection.
 *
 *   node scripts/mark-aircraft-inactive/index.js N62AR N644CH
 *   API_BASE_URL=https://frat.beringair.com node scripts/mark-aircraft-inactive/index.js N62AR N644CH
 */

'use strict';

const http = require('http');
const https = require('https');

const PROD_API_BASE = 'https://frat.beringair.com';
const LOCAL_API_BASE = 'http://localhost:9000';

function resolveApiBase() {
  if (process.argv.includes('--local')) return LOCAL_API_BASE;
  if (process.env.API_BASE_URL) return process.env.API_BASE_URL.replace(/\/$/, '');
  return PROD_API_BASE;
}

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;
    const data = JSON.stringify(body);
    const req = client.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode >= 400) {
          reject(new Error('HTTP ' + res.statusCode + ': ' + text));
          return;
        }
        try {
          resolve(JSON.parse(text));
        } catch (e) {
          resolve(text);
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const tails = process.argv.slice(2).filter(a => a && !a.startsWith('--'));
  if (!tails.length) {
    console.error('Usage: node scripts/mark-aircraft-inactive/index.js [--local] N62AR N644CH ...');
    process.exit(1);
  }
  const base = resolveApiBase();
  for (const tail of tails) {
    const doc = { _id: tail, isInactive: true };
    const result = await postJson(base + '/api/airplanes/updateFirebaseNew', {
      collection: 'aircraft',
      doc: doc
    });
    console.log('Marked inactive:', tail, result);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
