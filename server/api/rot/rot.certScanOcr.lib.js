'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const {execFile} = require('child_process');
const legalNameParse = require('./rot.legalNameParse.lib.js');

const parseLegalNameFromDocumentText = legalNameParse.parseLegalNameFromDocumentText;
const parseLegalNameFromOcrText = legalNameParse.parseLegalNameFromOcrText;
const medicalParse = require('./rot.medicalParse.lib.js');
const scoreMedicalOcrText = medicalParse.scoreMedicalOcrText;

const OCR_TRY_ANGLES = [0, 90, 180, 270];
let convertCliAvailable = null;

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

function pdfFirstPageToPngFromPath(pdfPath, dpi) {
  let tmpId = 'rot-ocr-' + process.pid + '-' + Date.now();
  let outPrefix = path.join(os.tmpdir(), tmpId);
  let pngPath = outPrefix + '.png';
  let resolution = dpi || 200;
  return execFileAsync('pdftoppm', [
    '-png',
    '-f',
    '1',
    '-l',
    '1',
    '-singlefile',
    '-r',
    String(resolution),
    pdfPath,
    outPrefix
  ]).then(() => {
    if (!fs.existsSync(pngPath)) {
      throw new Error('pdftoppm produced no PNG');
    }
    return fs.readFileSync(pngPath);
  }).finally(() => {
    unlinkQuiet(pngPath);
  });
}

function pdfFirstPageToPng(pdfBuffer) {
  let tmpId = 'rot-ocr-' + process.pid + '-' + Date.now();
  let pdfPath = path.join(os.tmpdir(), tmpId + '.pdf');
  fs.writeFileSync(pdfPath, pdfBuffer);
  return pdfFirstPageToPngFromPath(pdfPath, 200).finally(() => {
    unlinkQuiet(pdfPath);
  });
}

function dpiForPdfSize(fileSizeBytes) {
  let size = fileSizeBytes || 0;
  if (size > 2.5 * 1024 * 1024) return 100;
  if (size > 1.25 * 1024 * 1024) return 120;
  if (size > 600 * 1024) return 150;
  return 200;
}

function pdfPagePngForOcr(pdfPath, fileSizeBytes) {
  let dpi = dpiForPdfSize(fileSizeBytes);
  return pdfFirstPageToPngFromPath(pdfPath, dpi).then(png => {
    if (png.length <= MAX_OCR_IMAGE_BYTES) return png;
    if (dpi > 100) return pdfFirstPageToPngFromPath(pdfPath, 100);
    return png;
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

function probeConvertCli() {
  if (convertCliAvailable !== null) {
    return Promise.resolve(convertCliAvailable);
  }
  return execFileAsync('convert', ['-version'])
    .then(() => {
      convertCliAvailable = true;
      return true;
    })
    .catch(() => {
      convertCliAvailable = false;
      return false;
    });
}

function scoreLegalNameOcrText(text, rosterName) {
  let legalName = parseLegalNameFromOcrText(text, rosterName);
  if (legalName) return 1000;
  if (!rosterName) return 0;
  let upper = String(text || '').toUpperCase();
  let parts = String(rosterName).trim().split(/\s+/);
  let last = parts.length ? parts[parts.length - 1].toUpperCase() : '';
  if (last && last.length > 2 && upper.indexOf(last) > -1) return 80;
  let alnum = upper.replace(/[^A-Z0-9]/g, '');
  if (alnum.length > 30) return 10;
  return 0;
}

/** Normalize to PNG; apply JPEG EXIF orientation when ImageMagick is available. */
function preparePngForOcr(imageBuffer, filename) {
  return probeConvertCli().then(hasConvert => {
    if (!hasConvert) return imageBuffer;
    let tmpId = 'rot-ocr-' + process.pid + '-' + Date.now();
    let isJpeg = /\.(jpe?g)$/i.test(filename || '') ||
      (imageBuffer[0] === 0xff && imageBuffer[1] === 0xd8);
    let inPath = path.join(os.tmpdir(), tmpId + (isJpeg ? '.jpg' : '.png'));
    let outPath = path.join(os.tmpdir(), tmpId + '-prep.png');
    fs.writeFileSync(inPath, imageBuffer);
    let args = isJpeg ? [inPath, '-auto-orient', '+repage', outPath] : [inPath, outPath];
    return execFileAsync('convert', args)
      .then(() => fs.readFileSync(outPath))
      .catch(err => {
        console.error('rot OCR prepare image', err && err.message ? err.message : err);
        return imageBuffer;
      })
      .finally(() => {
        unlinkQuiet(inPath);
        unlinkQuiet(outPath);
      });
  });
}

function rotateImageBuffer(imageBuffer, degrees) {
  if (!degrees) return Promise.resolve(imageBuffer);
  return probeConvertCli().then(hasConvert => {
    if (!hasConvert) return imageBuffer;
    let tmpId = 'rot-ocr-' + process.pid + '-' + Date.now() + '-r' + degrees;
    let inPath = path.join(os.tmpdir(), tmpId + '.png');
    let outPath = path.join(os.tmpdir(), tmpId + '-out.png');
    fs.writeFileSync(inPath, imageBuffer);
    return execFileAsync('convert', [inPath, '-rotate', String(degrees), outPath])
      .then(() => fs.readFileSync(outPath))
      .finally(() => {
        unlinkQuiet(inPath);
        unlinkQuiet(outPath);
      });
  });
}

/**
 * Run Tesseract at 0/90/180/270° (sideways med/certs). Needs `convert` for rotation;
 * without it, single pass at 0° only.
 */
function ocrImageBufferBestOrientation(imageBuffer, scoreTextFn, options) {
  options = options || {};
  if (!imageBuffer || imageBuffer.length > MAX_OCR_IMAGE_BYTES) {
    return Promise.reject(new Error('Image too large for OCR'));
  }
  let scoreFn = scoreTextFn || function(text) {
    return String(text || '').replace(/\s/g, '').length;
  };
  return preparePngForOcr(imageBuffer, options.filename).then(png => {
    return probeConvertCli().then(hasConvert => {
    let angles = hasConvert ? OCR_TRY_ANGLES : [0];
    let chain = Promise.resolve(null);
    let best = {text: '', score: -1, angle: 0};
    angles.forEach(angle => {
      chain = chain.then(() => rotateImageBuffer(png, angle))
        .then(rotated => ocrImageBufferCli(rotated))
        .then(text => {
          let score = scoreFn(text, options);
          if (score > best.score) {
            best = {text: String(text || ''), score: score, angle: angle};
          }
        })
        .catch(err => {
          console.error('rot OCR angle ' + angle, err && err.message ? err.message : err);
        });
    });
    return chain.then(() => best);
    });
  });
}

function ocrCertImageBuffer(imageBuffer, rosterName) {
  return ocrImageBufferBestOrientation(imageBuffer, function(text) {
    return scoreLegalNameOcrText(text, rosterName);
  }, {rosterName: rosterName})
    .then(best => {
      let text = best.text;
      let legalName = parseLegalNameFromOcrText(text, rosterName);
      return {
        legalName: legalName,
        reason: legalName ? 'ocr' : 'ocr_no_name_match',
        ocrTextSample: text ? String(text).slice(0, 400) : '',
        ocrOrientation: best.angle
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

/** OCR page 1 from PDF on disk — does not load whole PDF into Node. */
function ocrCertPdfFile(pdfPath, rosterName, fileSizeBytes) {
  let size = fileSizeBytes;
  if (size == null) {
    try {
      size = fs.statSync(pdfPath).size;
    } catch (e) {
      size = 0;
    }
  }
  return pdfPagePngForOcr(pdfPath, size)
    .then(png => ocrCertImageBuffer(png, rosterName))
    .catch(err => {
      let msg = err && err.message ? err.message : String(err);
      if (msg.indexOf('Image too large') > -1) {
        return {
          legalName: null,
          reason: 'ocr_skipped_too_large',
          ocrTextSample: ''
        };
      }
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

/** Raw OCR text from a CERT upload on disk (JPEG or scanned PDF page 1). */
function ocrCertUploadRawText(fullPath, filename) {
  if (!fullPath || !fs.existsSync(fullPath)) {
    return Promise.resolve({text: '', reason: 'file_missing'});
  }
  let fileSizeBytes = 0;
  try {
    fileSizeBytes = fs.statSync(fullPath).size;
  } catch (e) {
    return Promise.resolve({text: '', reason: 'file_missing'});
  }
  if (/\.(jpe?g)$/i.test(filename || '')) {
    let buf = fs.readFileSync(fullPath);
    return ocrImageBufferBestOrientation(buf, scoreMedicalOcrText, {filename: filename})
      .then(best => ({
        text: String(best.text || ''),
        reason: 'ocr',
        ocrOrientation: best.angle
      }))
      .catch(err => {
        let msg = err && err.message ? err.message : String(err);
        if (msg.indexOf('ENOENT') > -1 || /spawn tesseract/i.test(msg)) {
          return {text: '', reason: 'ocr_needs_tesseract'};
        }
        console.error('rot medical OCR image error', err);
        return {text: '', reason: 'ocr_failed'};
      });
  }
  return pdfPagePngForOcr(fullPath, fileSizeBytes)
    .then(png => ocrImageBufferBestOrientation(png, scoreMedicalOcrText, {filename: filename})
      .then(best => ({
        text: String(best.text || ''),
        reason: 'ocr',
        ocrOrientation: best.angle
      })))
    .catch(err => {
      let msg = err && err.message ? err.message : String(err);
      if (msg.indexOf('ENOENT') > -1 || msg.indexOf('pdftoppm') > -1) {
        return {text: '', reason: 'ocr_needs_poppler'};
      }
      if (msg.indexOf('Image too large') > -1) {
        return {text: '', reason: 'ocr_skipped_too_large'};
      }
      console.error('rot medical OCR pdf error', msg);
      return {text: '', reason: 'ocr_failed'};
    });
}

module.exports = {
  ocrImageBuffer,
  ocrImageBufferBestOrientation,
  ocrCertImageBuffer,
  ocrCertPdfBuffer,
  ocrCertPdfFile,
  ocrCertUploadRawText,
  pdfFirstPageToPng,
  pdfFirstPageToPngFromPath,
  scoreLegalNameOcrText
};
