'use strict';

const RECORDS_ACCESS_EMAILS = [
  'fen@beringair.com',
  'nathaniel@beringair.com',
  'nathanielwkolson@gmail.com',
  'smirciat@gmail.com',
  'kalebjanke@gmail.com'
];

/** FDR (#35) — hidden from nav unless user name matches (expand list in code when needed). */
const FDR_ACCESS_NAMES = [
  'Andy Smircich',
  'Nathaniel Olson',
  'Kaleb Janke',
  'Fen Kinneen',
  'Scott Gordon',
  'Kyle Lefebvre',
  'Brian Weckwerth',
  'Patrik Toerdal'
];

const COMPANY_INSTRUCTORS = [
  'Kyle Lefebvre',
  'Nick Hajdukovich',
  'Fen Kinneen',
  'Ryan Woehler',
  'Nathaniel Olson',
  'Mike R. Evans',
  'Michael K. Evans',
  'Andy Smircich',
  'Neill Toelle',
  'Josh Krebiehl',
  'Tim Kunkel',
  'Frank Parker',
  'Tim Hopley',
  'Scott Gordon'
];

function normalizeName(name) {
  if (!name) return '';
  return String(name).toLowerCase().replace(/[^a-z]/g, '');
}

function isCompanyInstructor(user) {
  if (!user || !user.name) return false;
  const userNorm = normalizeName(user.name);
  if (!userNorm) return false;
  return COMPANY_INSTRUCTORS.some(inst => {
    const instNorm = normalizeName(inst);
    if (!instNorm) return false;
    return userNorm === instNorm ||
      userNorm.indexOf(instNorm) > -1 ||
      instNorm.indexOf(userNorm) > -1;
  });
}

function nameMatchesAllowList(user, allowList) {
  if (!user || !user.name) return false;
  const userNorm = normalizeName(user.name);
  if (!userNorm) return false;
  return allowList.some(entry => {
    const entryNorm = normalizeName(entry);
    if (!entryNorm) return false;
    return userNorm === entryNorm ||
      userNorm.indexOf(entryNorm) > -1 ||
      entryNorm.indexOf(userNorm) > -1;
  });
}

export function canAccessFdr(user) {
  return nameMatchesAllowList(user, FDR_ACCESS_NAMES);
}

/** Lock/unlock Firebase hour sync for a closed FDR year (FDR team or admin). */
export function canManageFdrYearLock(user) {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'superadmin') return true;
  return canAccessFdr(user);
}

export function canAccessRecords(user) {
  if (!user || !user.email) return false;
  const email = String(user.email).toLowerCase();
  if (RECORDS_ACCESS_EMAILS.indexOf(email) > -1) return true;
  return isCompanyInstructor(user);
}

export function requireFdrAccess(req, res, next) {
  if (!canAccessFdr(req.user)) {
    return res.status(403).json({message: 'FDR access is restricted'});
  }
  return next();
}

export function requireRecordsAccess(req, res, next) {
  if (!canAccessRecords(req.user)) {
    return res.status(403).json({message: 'Training Records access is restricted'});
  }
  return next();
}

export function requireRecordsAccessIfRecordsCollection(req, res, next) {
  const collection = req.body && req.body.collection;
  if (collection === 'records') {
    return requireRecordsAccess(req, res, next);
  }
  return next();
}
