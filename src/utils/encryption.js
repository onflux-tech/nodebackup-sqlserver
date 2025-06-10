const CryptoJS = require('crypto-js');

const ENCRYPTION_KEY = 'aB3$zP9!sW8*qY2@uF5#vG6$cR7&tJ1^';

/**
 * @param {object} data
 * @returns {string}
 */
function encrypt(data) {
  if (!data) return null;
  const jsonString = JSON.stringify(data, null, 2);
  return CryptoJS.AES.encrypt(jsonString, ENCRYPTION_KEY).toString();
}

/**
 * @param {string} encryptedData
 * @returns {object|null}
 */
function decrypt(encryptedData) {
  if (!encryptedData) return null;
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedString) {
      return null;
    }
    return JSON.parse(decryptedString);
  } catch (error) {
    console.error('Erro ao descriptografar ou parsear os dados:', error);
    return null;
  }
}

module.exports = {
  encrypt,
  decrypt
}; 