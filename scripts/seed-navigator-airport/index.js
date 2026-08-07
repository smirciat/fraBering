#!/usr/bin/env node
'use strict';

/**
 * Upsert Navigator (NAV) as an OMESeasonal airport for the Nome status sidebar (May–September).
 *
 * Usage (from repo root):
 *   node -r babel-register scripts/seed-navigator-airport/index.js
 *   node -r babel-register scripts/seed-navigator-airport/index.js --production
 */

const path = require('path');
const fs = require('fs');

function loadLocalEnv() {
  try {
    const envPath = path.join(__dirname, '../../server/config/local.env.js');
    const local = require(envPath);
    Object.keys(local).forEach(key => {
      if (
        process.env[key] === undefined &&
        local[key] !== undefined &&
        local[key] !== ''
      ) {
        process.env[key] = String(local[key]);
      }
    });
  } catch (e) {
    // local.env.js is optional
  }
}

function parseArgs(argv) {
  const args = { production: false };
  argv.forEach(arg => {
    if (arg === '--production') args.production = true;
  });
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = args.production ? 'production' : 'development';
}
loadLocalEnv();

const envFile = path.join(
  __dirname,
  '../../server/config/environment',
  process.env.NODE_ENV + '.js'
);
if (!fs.existsSync(envFile)) {
  console.error('Missing Sequelize env file: ' + envFile);
  if (process.env.NODE_ENV === 'development') {
    console.error('Copy server/config/environment/development.sample.js to development.js');
  }
  console.error('Or run with --production if SEQUELIZE_URI is set in local.env.js');
  process.exit(1);
}

require('babel-register');

const NAVIGATOR = {
  name: 'Navigator',
  threeLetter: 'NAV',
  icao: 'A06',
  base: false,
  baseGroup: 'OMESeasonal',
  latitude: '65.655556',
  longitude: '-165.356389',
  runways: [1],
  runwayScore: '5',
  openClosed: 'Open',
  comment: 'Seasonal camp airstrip (May–September).',
  pilotComment: '',
  visibilityRequirement: { red: 0.5, yellow: 3, ifr: 2, night: 5 },
  ceilingRequirement: { red: 200, yellow: 2000, ifr: 1000, night: 3000 },
  windRequirement: { level1: 35, level15: 30 },
  runwayCondition: 1,
  nonPilot: false,
  closed: false
};

async function main() {
  const sqldb = require(path.join(__dirname, '../../server/sqldb'));
  const { AirportRequirement } = sqldb;

  let existing = await AirportRequirement.findOne({
    where: { threeLetter: 'NAV' }
  });
  if (!existing) {
    existing = await AirportRequirement.findOne({
      where: { icao: 'A06' }
    });
  }

  if (existing) {
    await existing.update(NAVIGATOR);
    console.log('Updated Navigator airport (id %s).', existing._id);
  } else {
    const created = await AirportRequirement.create(NAVIGATOR);
    console.log('Created Navigator airport (id %s).', created._id);
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
