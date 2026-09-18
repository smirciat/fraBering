'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const {execFile} = require('child_process');
const legalNameParse = require('./rot.legalNameParse.lib.js');

const parseLegalNameFromDocumentText = legalNameParse.parseLegalNameFromDocumentText;
const parseLegalNameFromOcrText = legalNameParse.parseLegalNameFromOcrText;

const EXEC_MAX_BUFFER = 12 * 1024 * 1024;
const MAX_OCR_IMAGE_BYTES = 12 * 1024 * 1024;

function execFileAsync(cmd, args, options) {
  return new Promise((resolve, reject) => {
    let opts = Object.assign({maxBuffer: EXEC_MAX_BUFFER}, options || {});
    execFile(cmd, args, opts, (err, stdout, stderr) => {
      if (err) {
        reject(err);
        return;
      }
      resolve({stdout, stderr});
    });
  });
}

function unlinkQuiet(filePath) {
  try {
    fs.unlinkSync(filePath);
  } catch (e) {
    /* ignore */
  }
}

function pdfFirstPageToPng(pdfBuffer) {
  let tmpId = 'rot-ocr-' + process.pid + '-' + Date.now();
  let pdfPath = path.join(os.tmpdir(), tmpId + '.pdf');
  let outPrefix = path.join(os.tmpdir(), tmpId);
  let pngPath = outPrefix + '.png';
  fs.writeFileSync(pdfPath, pdfBuffer);
  return execFileAsync('pdftoppm', [
    '-png',
    '-f',
    '1',
    '-l',
    '1',
    '-singlefile',
    '-r',
    '200',
    pdfPath,
    outPrefix
  ])
    .then(() => {
      if (!fs.existsSync(pngPath)) {
        throw new Error('pdftoppm produced no PNG');
      }
      return fs.readFileSync(pngPath);
    })
    .finally(() => {
      unlinkQuiet(pdfPath);
      unlinkQuiet(pngPath);
    });
}

/** Prefer system `tesseract` CLI — isolated child process, avoids Node worker crashes (502). */
function ocrImageBufferCli(imageBuffer) {
  if (!imageBuffer || imageBuffer.length > MAX_OCR_IMAGE_BYTES) {
    return Promise.reject(new Error('Image too large for OCR'));
  }
  let tmpId = 'rot-ocr-' + process.pid + '-' + Date.now();
  let imgPath = path.join(os.tmpdir(), tmpId + '.png');
  fs.writeFileSync(imgPath, imageBuffer);
  return execFileAsync('tesseract', [imgPath, 'stdout', '-l', 'eng'])
    .then(result => String(result.stdout || ''))
    .finally(() => unlinkQuiet(imgPath));
}

/** Node 12 prod — use system `tesseract` only (tesseract.js v4 needs Node 14+). */
function ocrImageBuffer(imageBuffer) {
  return ocrImageBufferCli(imageBuffer);
}

function ocrCertImageBuffer(imageBuffer, rosterName) {
  return ocrImageBuffer(imageBuffer)
    .then(text => {
      let legalName = parseLegalNameFromOcrText(text, rosterName);
      return {
        legalName: legalName,
        reason: legalName ? 'ocr' : 'ocr_no_name_match',
        ocrTextSample: text ? String(text).slice(0, 400) : ''
      };
    })
    .catch(err => {
      let msg = err && err.message ? err.message : String(err);
      console.error('rot OCR image error', msg);
      if (msg.indexOf('ENOENT') > -1 || /spawn tesseract/i.test(msg)) {
        return {
          legalName: null,
          reason: 'ocr_needs_tesseract',
          ocrTextSample: ''
        };
      }
      return {
        legalName: null,
        reason: 'ocr_failed',
        ocrTextSample: msg.slice(0, 200)
      };
    });
}

function ocrCertPdfBuffer(pdfBuffer, rosterName) {
  return pdfFirstPageToPng(pdfBuffer)
    .then(png => ocrCertImageBuffer(png, rosterName))
    .catch(err => {
      let msg = err && err.message ? err.message : String(err);
      if (msg.indexOf('ENOENT') > -1 || msg.indexOf('pdftoppm') > -1) {
        return {
          legalName: null,
          reason: 'ocr_needs_poppler',
          ocrTextSample: ''
        };
      }
      return {
        legalName: null,
        reason: 'ocr_failed',
        ocrTextSample: msg.slice(0, 200)
      };
    });
}

module.exports = {
  ocrImageBuffer,
  ocrCertImageBuffer,
  ocrCertPdfBuffer,
  pdfFirstPageToPng
};
