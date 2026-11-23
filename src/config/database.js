const { Sequelize } = require('sequelize');
const env = require('./env');
const sslOptions = require('./dbSsl');

module.exports = new Sequelize(env.db.name, env.db.user, env.db.pass, {
  host: env.db.host,
  port: env.db.port,
  dialect: 'postgres',
  logging: false,
  dialectOptions: env.db.ssl ? { ssl: sslOptions() } : {},
  pool: { max: 10, min: 0, idle: 10000 },
});
