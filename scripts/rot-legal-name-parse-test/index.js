'use strict';

/**
 * node scripts/rot-legal-name-parse-test/index.js
 */

const {
  parseLegalNameFromDocumentText,
  pickCertScanFilename
} = require('../../server/api/rot/rot.legalNameParse.lib.js');

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed += 1;
  } else {
    console.log('ok:', msg);
  }
}

assert(
  parseLegalNameFromDocumentText('Name: Conor Rocco Murray\nClass: First', 'Conor Murray') ===
    'Conor Rocco Murray',
  'medical label line'
);

assert(
  parseLegalNameFromDocumentText('Random\nSHAWN MICHAEL THOMAS GRAHAM\nDOB', 'Shawn Graham') ===
    'Shawn Michael Thomas Graham',
  'all caps line with matching last name'
);

assert(
  parseLegalNameFromDocumentText('Name: John Smith\n', 'Conor Murray') === null,
  'reject wrong last name'
);

let files = [
  '1183_01012020_CERT_Medical_old.pdf',
  '1183_09172026_CERT_Medical_scan.pdf',
  '1183_09172026_CERT_Certificate_x.pdf',
  '999_09172026_CERT_Medical_other.pdf'
];
assert(
  pickCertScanFilename(files, '1183') === '1183_09172026_CERT_Medical_scan.pdf',
  'prefer newest medical'
);

if (failed) process.exit(1);
console.log('All passed.');
