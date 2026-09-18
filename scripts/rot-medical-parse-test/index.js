'use strict';

const assert = require('assert');
const {parseMedicalFromOcrText, scoreMedicalOcrText} = require('../../server/api/rot/rot.medicalParse.lib.js');

const sample = `
FAA MEDICAL CERTIFICATE
DATE OF EXAMINATION 03/15/2026
FIRST-CLASS MEDICAL CERTIFICATE
EXPIRATION DATE 03/31/2027
`;

let r = parseMedicalFromOcrText(sample);
assert.strictEqual(r.medicalDate, '3/15/2026', 'exam date');
assert.strictEqual(r.medicalClass, 'FIRST', 'class');
assert.strictEqual(r.expirationDate, '3/31/2027', 'expiration hint');

let r2 = parseMedicalFromOcrText('SECOND CLASS 12/01/25 EXAM DATE 12/01/2025');
assert.strictEqual(r2.medicalClass, 'SECOND', 'second class');
assert.strictEqual(r2.medicalDate, '12/1/2025', 'exam');

let sideways = 'xxx\n' + sample.split('\n').join(' ').slice(0, 40);
assert.ok(scoreMedicalOcrText(sample) > scoreMedicalOcrText(sideways), 'scorer prefers full medical text');

console.log('rot-medical-parse-test: ok');
