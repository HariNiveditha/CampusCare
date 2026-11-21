// JWT Configuration Helper

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim() === '') {
    throw new Error('FATAL CONFIGURATION ERROR: JWT_SECRET environment variable is missing or empty.');
  }
  return secret;
};

const getJwtExpiresIn = () => {
  return process.env.JWT_EXPIRES_IN || '24h';
};

module.exports = {
  getJwtSecret,
  getJwtExpiresIn,
};
