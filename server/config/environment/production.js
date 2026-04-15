'use strict';


import localEnv from '../local.env.js';
import fs from 'fs';

// Production specific configuration
// =================================
module.exports = {
  // Server IP
  ip:     '0.0.0.0'|| process.env.OPENSHIFT_NODEJS_IP ||
          process.env.IP ||
          '0.0.0.0',

  // Server port
  port:   58785 || process.env.OPENSHIFT_NODEJS_PORT ||
          process.env.PORT ||
          8080,

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
