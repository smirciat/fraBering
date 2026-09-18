'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const {execFile} = require('child_process');
const legalNameParse = require('./rot.legalNameParse.lib.js');

const parseLegalNameFromDocumentText = legalNameParse.parseLegalNameFromDocumentText;
const parseLegalNameFromOcrText = legalNameParse.parseLegalNameFromOcrText;

function execFileAsync(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, (err, stdout, stderr) => {
      if (err) {
        reject(err);
        return;
      }
      resolve({stdout, stderr});
    });
  });
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
      try {
        fs.unlinkSync(pdfPath);
      } catch (e) {
        /* ignore */
      }
      try {
        fs.unlinkSync(pngPath);
      } catch (e) {
        /* ignore */
      }
    });
}

function ocrImageBuffer(imageBuffer) {
  let createWorker;
  try {
    createWorker = require('tesseract.js').createWorker;
  } catch (e) {
    return Promise.reject(new Error('tesseract.js is not installed on the server'));
  }
  return createWorker('eng')
    .then(worker => {
      return worker
        .recognize(imageBuffer)
        .then(result => {
          let text =
            result && result.data && result.data.text ? result.data.text : '';
          return worker.terminate().then(() => text);
        })
        .catch(err => worker.terminate().then(() => Promise.reject(err)));
    });
}

function ocrCertImageBuffer(imageBuffer, rosterName) {
  return ocrImageBuffer(imageBuffer).then(text => {
    let legalName = parseLegalNameFromOcrText(text, rosterName);
    return {
      legalName: legalName,
      reason: legalName ? 'ocr' : 'ocr_no_name_match',
      ocrTextSample: text ? String(text).slice(0, 400) : ''
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
