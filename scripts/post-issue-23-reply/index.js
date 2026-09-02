#!/usr/bin/env node

/**
 * Post the "Draft reply to Nate" from docs/issues-23-records-redesign.md on issue #23.
 *
 *   node scripts/post-issue-23-reply/index.js
 *   node scripts/post-issue-23-reply/index.js --no-email
 *   node scripts/post-issue-23-reply/index.js --dry-run
 */

'use strict';

const fs = require('fs');
const path = require('path');
const {spawnSync} = require('child_process');

const DOC = path.join(__dirname, '../../docs/issues-23-records-redesign.md');

function extractDraft() {
  const doc = fs.readFileSync(DOC, 'utf8');
  const match = doc.match(/## Draft reply to Nate[\s\S]*?```markdown\n([\s\S]*?)\n```/);
  if (!match || !match[1].trim()) {
    throw new Error('Could not find draft markdown in ' + DOC);
  }
  return match[1].trim();
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const body = extractDraft();

  if (dryRun) {
    process.stdout.write(body + '\n');
    return;
  }

  const args = ['scripts/issue-comment/index.js', '23'];
  if (process.argv.includes('--no-email')) {
    args.push('--no-email');
  }

  const result = spawnSync(process.execPath, args, {
    cwd: path.join(__dirname, '../..'),
    input: body,
    encoding: 'utf8',
    stdio: ['pipe', 'inherit', 'inherit']
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

main();
