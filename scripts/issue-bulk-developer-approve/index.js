#!/usr/bin/env node

/**
 * Bulk-set developerApproved on issues matching a reporter name pattern.
 *
 *   node scripts/issue-bulk-developer-approve/index.js --dry-run
 *   node scripts/issue-bulk-developer-approve/index.js --apply
 *   node scripts/issue-bulk-developer-approve/index.js --apply --reporter nathaniel
 *
 * Auth: same as scripts/issue-auth.js (token for PATCH; JWT for GET /api/issues).
 */

'use strict';

const path = require('path');
const http = require('http');
const https = require('https');
const {
  loadLocalEnv,
  authHeadersForIssueList,
  authHeadersForIssueWrite
} = require('../issue-auth');

const PROD_API_BASE = 'https://frat.beringair.com';

const PRI_RANK = {critical: 0, high: 1, medium: 2, low: 3};

function requestJson(method, url, headers, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;
    const data = body ? JSON.stringify(body) : null;
    const req = client.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + (parsed.search || ''),
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
            reject(new Error('HTTP ' + res.statusCode + ' ' + method + ' ' + url + ': ' + text));
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

function reporterMatches(name, pattern) {
  if (!name) return false;
  return String(name).toLowerCase().indexOf(String(pattern).toLowerCase()) >= 0;
}

function sortIssues(rows) {
  return rows.slice().sort((a, b) => {
    const pa = PRI_RANK[a.priority] != null ? PRI_RANK[a.priority] : 9;
    const pb = PRI_RANK[b.priority] != null ? PRI_RANK[b.priority] : 9;
    if (pa !== pb) return pa - pb;
    return b._id - a._id;
  });
}

function buildRankedMarkdown(issues, reporterPattern) {
  const sorted = sortIssues(issues);
  const lines = [
    '# Nathaniel issues — ranked build queue',
    '',
    '_Developer-approved batch from `scripts/issue-bulk-developer-approve`. Regenerate after triage._',
    '',
    '**Rank order:** critical → high → medium → low, then newest id within tier.',
    '',
    '| Rank | # | Priority | Status | Kind | Title |',
    '|------|---|----------|--------|------|-------|'
  ];
  sorted.forEach((issue, i) => {
    const title = String(issue.title || '').replace(/\|/g, '\\|').slice(0, 80);
    lines.push(
      '| ' +
        (i + 1) +
        ' | #' +
        issue._id +
        ' | ' +
        (issue.priority || '') +
        ' | ' +
        (issue.status || '') +
        ' | ' +
        (issue.kind || '') +
        ' | ' +
        title +
        ' |'
    );
  });
  lines.push('', '## Detail', '');
  sorted.forEach((issue, i) => {
    lines.push('### ' + (i + 1) + '. #' + issue._id + ' — ' + issue.title);
    lines.push('');
    lines.push(
      '- **Priority:** ' +
        issue.priority +
        ' · **Status:** ' +
        issue.status +
        ' · **Kind:** ' +
        issue.kind
    );
    lines.push('- **Reporter:** ' + issue.reporterName);
    if (issue.description) {
      const desc = String(issue.description).trim().slice(0, 1200);
      lines.push('', desc, '');
    }
    lines.push('---', '');
  });
  return lines.join('\n');
}

async function main() {
  loadLocalEnv();

  const apply = process.argv.includes('--apply');
  const dryRun = !apply || process.argv.includes('--dry-run');
  const reporterIdx = process.argv.indexOf('--reporter');
  const reporterPattern =
    reporterIdx >= 0 ? String(process.argv[reporterIdx + 1] || 'nathaniel') : 'nathaniel';

  const base = (process.env.API_BASE_URL || PROD_API_BASE).replace(/\/$/, '');
  const readAuth = await authHeadersForIssueList(base);
  const writeAuth = await authHeadersForIssueWrite(base);

  const all = await requestJson('GET', base + '/api/issues', readAuth.headers);
  if (!Array.isArray(all)) {
    throw new Error('Expected array from GET /api/issues');
  }

  const skipStatuses = ['done', 'closed'];
  const candidates = all.filter((issue) => {
    if (!reporterMatches(issue.reporterName, reporterPattern)) return false;
    if (skipStatuses.indexOf(issue.status) >= 0) return false;
    if (issue.developerApproved) return false;
    return true;
  });

  const alreadyApproved = all.filter(
    (issue) =>
      reporterMatches(issue.reporterName, reporterPattern) &&
      skipStatuses.indexOf(issue.status) < 0 &&
      issue.developerApproved
  );

  console.log(
    'Reporter ~"' +
      reporterPattern +
      '": ' +
      candidates.length +
      ' to approve, ' +
      alreadyApproved.length +
      ' already approved (active statuses).'
  );

  if (!candidates.length) {
    console.log('Nothing to do.');
    return;
  }

  candidates.sort((a, b) => a._id - b._id).forEach((issue) => {
    console.log(
      '  #' +
        issue._id +
        ' [' +
        issue.priority +
        '/' +
        issue.status +
        '] ' +
        issue.title
    );
  });

  if (dryRun) {
    console.log('\nDry run — pass --apply to set developerApproved on the list above.');
    return;
  }

  for (const issue of candidates) {
    await requestJson('PATCH', base + '/api/issues/' + issue._id, writeAuth.headers, {
      developerApproved: true
    });
    console.log('Approved #' + issue._id);
  }

  const allAfter = await requestJson('GET', base + '/api/issues', readAuth.headers);
  const queue = allAfter.filter(
    (issue) =>
      reporterMatches(issue.reporterName, reporterPattern) &&
      skipStatuses.indexOf(issue.status) < 0 &&
      issue.developerApproved
  );
  const outPath = path.join(__dirname, '../../docs/nathaniel-issues-ranked.md');
  require('fs').writeFileSync(outPath, buildRankedMarkdown(queue, reporterPattern), 'utf8');
  console.log('\nWrote ' + outPath);
  console.log('Next: node scripts/export-team-backlog/index.js');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
