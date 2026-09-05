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
  GMAIL_ADDRESS: '',
  GMAIL_APP_PASS: '',
  GMAIL_PASS:'',
  // Email when a new issue is filed (Issues navbar)
  DEVELOPER_EMAIL_ADDRESS: '',
  // Optional: fraBering login for issue scripts when ISSUES_EXPORT_TOKEN is unset
  DEVELOPER_PASSWORD: '',
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
  ROSTER_TOKEN: 'Bearer (string)',
  // Local roster data: firebase (legacy dev) or postgres (production)
  // See docs/roster-postgres.md
  ROSTER_DATA_STORE: 'firebase',
  NODE_OPTIONS:"--max-old-space-size=4096",
  // Optional: shared secret for GET /api/issues/agent-summary (scripts/export-team-backlog)
  ISSUES_EXPORT_TOKEN: '',
  // Optional: shared secret for GET /api/todaysFlights/ops-export (reservations daily board)
  // Also used by resBering POST /api/sms/incoming (Spidertracks helicopter alerts)
  FRAT_OPS_EXPORT_TOKEN: '',
  // Optional: override issue screenshot storage (default: <repo>/server/fileserver/issue-attachments)
  ISSUE_ATTACHMENT_ROOT: '',
  // ROT integration — source Postgres for one-time Evaluations import (scripts/migrate-rot-evaluations)
  ROT_SOURCE_URI: '',
  // ROT document storage root (default: <repo>/server/fileserver/rot)
  ROT_FILE_ROOT: ''
};
