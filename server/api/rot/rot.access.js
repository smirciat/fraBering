'use strict';

const RECORDS_ACCESS_EMAILS = [
  'fen@beringair.com',
  'nathaniel@beringair.com',
  'nathanielwkolson@gmail.com',
  'smirciat@gmail.com',
  'kalebjanke@gmail.com'
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

export function canAccessRecords(user) {
  if (!user || !user.email) return false;
  const email = String(user.email).toLowerCase();
  if (RECORDS_ACCESS_EMAILS.indexOf(email) > -1) return true;
  return isCompanyInstructor(user);
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
