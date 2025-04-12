'use strict';

// Use local.env.js for environment variables that grunt will set when the serv$
// Use for your api keys, secrets, etc. This file should not be tracked by git.
//
// You will need to set these on the server you deploy to.

module.exports = {
  DOMAIN: 'http://localhost:9000',
  SESSION_SECRET: 'workspace-secret',
  // Control debug level for modules using visionmedia/debug
  DEBUG: '',
  GMAIL_PASS:'',
  TWILIO_AUTH_TOKEN: '',
  TWILIO_ACCOUNT_SID: '',
  TWILIO_PHONE_NUMBER: '',
  TWILIO_PHONE_NUMBER_SID: '',
  SEQUELIZE_URI:'postgres://postgres:pg_password@localhost:5432/metar',
  TOKEN:'',
  PASSWORD:'',
  AVWX_TOKEN:'',
  AVWX_TOKEN2:'',
  KEY: '/etc/letsencrypt/live/domainname.com/privkey.pem',
  CERT: '/etc/letsencrypt/live/domainname.com/fullchain.pem',
  ROSTER_TOKEN: 'Bearer (string)'
};
