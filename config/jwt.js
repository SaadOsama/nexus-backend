require('dotenv').config();

module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || 'nexus_super_secret_key_123',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
};