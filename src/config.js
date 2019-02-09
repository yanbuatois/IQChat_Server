/* eslint-disable camelcase */
require('dotenv').config();

const CONFIG = {};

CONFIG.app = process.env.APP ?? 'dev';
CONFIG.port = parseInt(process.env.PORT ?? '8080');
CONFIG.host = process.env.HOST ?? 'localhost';
CONFIG.db_host = process.env.DB_HOST ?? 'localhost';
CONFIG.db_port = parseInt(process.env.DB_PORT ?? '27017');
CONFIG.db_name = process.env.DB_NAME ?? 'iqchat';
CONFIG.db_user = process.env.DB_USER ?? '';
CONFIG.db_password = process.env.DB_PASSWORD ?? '';

CONFIG.jwt_encryption = process.env.JWT_ENCRYPTION ?? '';
CONFIG.jwt_expiration = process.env.JWT_EXPIRATION ?? '10000';

CONFIG.password_salt_rounds = parseInt(process.env.PASSWORD_SALT_ROUNDS ?? '10');

module.exports = CONFIG;