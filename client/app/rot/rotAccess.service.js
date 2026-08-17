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

    function canAccessRecords(user) {
      if (!user || !user.email) return false;
      const email = String(user.email).toLowerCase();
      if (RECORDS_ACCESS_EMAILS.indexOf(email) > -1) return true;
      return isCompanyInstructor(user);
    }

    return {
      canAccessRecords: canAccessRecords,
      isCompanyInstructor: isCompanyInstructor
    };
  });
