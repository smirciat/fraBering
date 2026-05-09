'use strict';


import localEnv from '../local.env.js';
import fs from 'fs';

// Production specific configuration
// =================================
module.exports = {
  // Server IP
  ip:  '127.0.0.1',

  // Server port
  port:   58779,

  sequelize: {
    uri:  localEnv.SEQUELIZE_URI ||
          'sqlite://',
    options: {
      dialect:'postgres',
      protocol:'postgres',
      logging: false,
      dialectOptions: {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          }
      },
      storage: 'dev.sqlite',
      define: {
        timestamps: false
      }
    }
  }
};
