#!/usr/bin/env node
'use strict';

/**
 * Bulk infer pilot legalName from on-disk CERT scans → optional Firebase update.
 *
 * Run on the app server (needs server/firebase.json + server/fileserver/rot/records).
 *
 *   node scripts/rot-infer-legal-names/index.js              # dry-run (default)
 *   node scripts/rot-infer-legal-names/index.js --apply
 *   node scripts/rot-infer-legal-names/index.js --apply --force   # overwrite existing legalName
 *   node scripts/rot-infer-legal-names/index.js --pilot 1174
 *   node scripts/rot-infer-legal-names/index.js --pilot "Graham"
 *   node scripts/rot-infer-legal-names/index.js --delay 2000    # ms between pilots (OCR load)
 *   node scripts/rot-infer-legal-names/index.js --limit 5
 *   node scripts/rot-infer-legal-names/index.js --verbose   # OCR text snippet on no-match
 */

require('babel-register')({
  extensions: ['.js'],
  ignore: /node_modules/,
  presets: ['es2015'],
  plugins: ['transform-class-properties', 'transform-runtime']
});

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const {loadFirebasePilots} = require('../../server/api/rot/rot.fdr.firebaseQuery.js');
const {inferLegalNameFromScanFiles} = require('../../server/api/rot/rot.legalNameFromScan.js');
const {rotFileRoot} = require('../../server/api/rot/rot.storage.js');

function parseArgs(argv) {
  let opts = {
    apply: false,
    force: false,
    pilot: null,
    limit: 0,
    delayMs: 1500,
    activeOnly: true,
    verbose: false
  };
  for (let i = 2; i < argv.length; i++) {
    let a = argv[i];
    if (a === '--verbose') opts.verbose = true;
    else if (a === '--apply') opts.apply = true;
    else if (a === '--force') opts.force = true;
    else if (a === '--all-pilots') opts.activeOnly = false;
    else if (a === '--dry-run') opts.apply = false;
    else if (a === '--pilot' && argv[i + 1]) opts.pilot = argv[++i];
    else if (a === '--limit' && argv[i + 1]) opts.limit = parseInt(argv[++i], 10) || 0;
    else if (a === '--delay' && argv[i + 1]) opts.delayMs = parseInt(argv[++i], 10) || 0;
    else if (a === '--help' || a === '-h') {
      console.log(require('fs').readFileSync(__filename, 'utf8').split('\n').slice(0, 16).join('\n'));
      process.exit(0);
    }
  }
  return opts;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function recordsFileList() {
  let folder = path.join(rotFileRoot(), 'records');
  fs.mkdirSync(folder, {recursive: true});
  return fs.readdirSync(folder).filter(f => f && f.charAt(0) !== '.');
}

function filterPilots(pilots, opts) {
  let list = pilots.filter(p => p && p._id && p.name && String(p.name).trim());
  if (opts.activeOnly) {
    list = list.filter(p => {
      return (p.isActive === undefined || p.isActive) &&
        p.pilotBase && p.pilotBase !== 'none';
    });
  }
  if (opts.pilot) {
    let q = String(opts.pilot).trim().toLowerCase();
    list = list.filter(p => {
      if (String(p._id) === q) return true;
      return String(p.name).toLowerCase().indexOf(q) > -1;
    });
  }
  list.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  if (opts.limit > 0) list = list.slice(0, opts.limit);
  return list;
}

async function writeLegalName(pilotId, legalName) {
  let id = String(pilotId);
  await admin.firestore().collection('pilots').doc(id).set({legalName: legalName}, {merge: true});
}

async function main() {
  let opts = parseArgs(process.argv);
  let files = recordsFileList();
  console.log('CERT files in records/:', files.length);
  console.log('Mode:', opts.apply ? 'APPLY (writes Firebase)' : 'dry-run');
  if (opts.force) console.log('Force: overwrite existing legalName');
  console.log('Delay between pilots:', opts.delayMs + 'ms');
  console.log('');

  let pilots = await loadFirebasePilots();
  pilots = filterPilots(pilots, opts);
  console.log('Pilots to process:', pilots.length);
  if (!pilots.length) return;

  let stats = {inferred: 0, applied: 0, skipped: 0, noMatch: 0, errors: 0};

  for (let i = 0; i < pilots.length; i++) {
    let pilot = pilots[i];
    let id = String(pilot._id);
    let rosterName = String(pilot.name).trim();
    let existing = pilot.legalName && String(pilot.legalName).trim();

    if (existing && !opts.force) {
      console.log('[skip] ' + id + ' ' + rosterName + ' — legalName already set: ' + existing);
      stats.skipped += 1;
      continue;
    }

    let result;
    try {
      result = await inferLegalNameFromScanFiles(files, id, rosterName);
    } catch (err) {
      console.error('[error] ' + id + ' ' + rosterName + ' — ' + (err.message || err));
      stats.errors += 1;
      if (opts.delayMs && i < pilots.length - 1) await sleep(opts.delayMs);
      continue;
    }

    let inferred = result && result.legalName;
    let reason = result && result.reason;
    let method = result && result.method;
    let source = result && result.sourceFile;

    if (!inferred) {
      let tried = result && result.alsoTriedSources;
      let triedNote = tried && tried.length ? ' [also tried: ' + tried.join(', ') + ']' : '';
      if (reason === 'ocr_skipped_too_large') {
        triedNote += ' (file over 800KB — skipped OCR, no pdftoppm)';
      }
      console.log(
        '[no match] ' + id + ' ' + rosterName +
          ' — ' + (reason || '?') +
          (source ? ' (' + source + ')' : '') +
          triedNote
      );
      if (opts.verbose && result && result.ocrTextSample) {
        console.log('        OCR sample: ' + String(result.ocrTextSample).replace(/\s+/g, ' ').slice(0, 200));
      }
      stats.noMatch += 1;
    } else {
      stats.inferred += 1;
      let from = result && result.fallbackFromSources;
      let fromNote = from && from.length ? ' [after medical: ' + from.join(', ') + ']' : '';
      let line = '[infer] ' + id + ' ' + rosterName + ' → ' + inferred +
        ' (' + (method || reason) + (source ? ', ' + source : '') + ')' + fromNote;
      if (existing && opts.force && existing !== inferred) {
        line += ' [was: ' + existing + ']';
      }
      console.log(line);

      if (opts.apply) {
        await writeLegalName(id, inferred);
        stats.applied += 1;
        console.log('        → Firebase legalName updated');
      }
    }

    if (opts.delayMs && i < pilots.length - 1) {
      let ocr = result && (result.ocrAttempted || method === 'ocr');
      if (ocr || inferred) await sleep(opts.delayMs);
    }
  }

  console.log('');
  console.log('Done.', JSON.stringify(stats));
  if (!opts.apply && stats.inferred > 0) {
    console.log('Re-run with --apply to write inferred names to Firebase.');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
