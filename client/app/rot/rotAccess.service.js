'use strict';

angular.module('workspaceApp')
  .factory('RotAccess', function() {
    const RECORDS_ACCESS_EMAILS = [
      'fen@beringair.com',
      'nathaniel@beringair.com',
      'nathanielwkolson@gmail.com',
      'smirciat@gmail.com',
      'kalebjanke@gmail.com'
    ];

    const FDR_ACCESS_NAMES = [
      'Andy Smircich',
      'Nathaniel Olson',
      'Kaleb Janke',
      'Fen Kinneen',
      'Scott Gordon',
      'Kyle Lefebvre',
      'Brian Weckwerth'
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
      return COMPANY_INSTRUCTORS.some(function(inst) {
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
      return allowList.some(function(entry) {
        const entryNorm = normalizeName(entry);
        if (!entryNorm) return false;
        return userNorm === entryNorm ||
          userNorm.indexOf(entryNorm) > -1 ||
          entryNorm.indexOf(userNorm) > -1;
      });
    }

    function canAccessFdr(user) {
      return nameMatchesAllowList(user, FDR_ACCESS_NAMES);
    }

    function canManageFdrYearLock(user) {
      if (!user) return false;
      if (user.role === 'admin' || user.role === 'superadmin') return true;
      return canAccessFdr(user);
    }

    function canAccessRecords(user) {
      if (!user || !user.email) return false;
      const email = String(user.email).toLowerCase();
      if (RECORDS_ACCESS_EMAILS.indexOf(email) > -1) return true;
      return isCompanyInstructor(user);
    }

    return {
      canAccessRecords: canAccessRecords,
      canAccessFdr: canAccessFdr,
      canManageFdrYearLock: canManageFdrYearLock,
      isCompanyInstructor: isCompanyInstructor
    };
  });
