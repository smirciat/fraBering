'use strict';

// Production specific configuration
// =================================
module.exports = {
  // Server IP
  ip:     process.env.OPENSHIFT_NODEJS_IP ||
          process.env.IP ||
          '0.0.0.0',

  // Server port
  port:   process.env.OPENSHIFT_NODEJS_PORT ||
          process.env.PORT ||
          8080,

  sequelize: {
    uri:  process.env.DATABASE_URL || process.env.SEQUELIZE_URI ||
          'sqlite://',
    options: {
      dialect:'postgres',
      protocol:'postgres',
      logging: false,
      dialectOptions: {
          ssl: true
      },
      storage: 'dev.sqlite',
      define: {
        timestamps: false
      }
    }
  }
};
