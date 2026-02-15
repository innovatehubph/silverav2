const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
};

const validatePassword = (password) => {
  return password && typeof password === 'string' && password.length >= 6 && password.length <= 128;
};

const validateString = (str, maxLength = 255) => {
  return str && typeof str === 'string' && str.trim().length > 0 && str.length <= maxLength;
};

const validatePositiveNumber = (num) => {
  return typeof num === 'number' && num > 0 && isFinite(num);
};

const validatePositiveInteger = (num) => {
  return Number.isInteger(num) && num > 0;
};

const sanitizeString = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str.trim().slice(0, 1000);
};

module.exports = { validateEmail, validatePassword, validateString, validatePositiveNumber, validatePositiveInteger, sanitizeString };
