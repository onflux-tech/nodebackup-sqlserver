const CryptoJS = require('crypto-js');
const fs = require('fs');
const path = require('path');

const OLD_ENCRYPTION_KEY = 'aB3$zP9!sW8*qY2@uF5#vG6$cR7&tJ1^';

const isPkg = typeof process.pkg !== 'undefined';
let baseDir;
try {
  baseDir = isPkg ? path.dirname(process.execPath) : process.cwd();
} catch (error) {
  baseDir = process.cwd();
}

function getOrCreateEncryptionKey() {
  const keyPath = path.join(baseDir, '.encryption.key');

  if (fs.existsSync(keyPath)) {
    try {
      return fs.readFileSync(keyPath, 'utf8');
    } catch (error) {
      console.warn('⚠️ Erro ao ler chave existente, gerando nova:', error.message);
    }
  }

  const crypto = require('crypto');
  const newKey = crypto.randomBytes(32).toString('hex');

  try {
    fs.writeFileSync(keyPath, newKey, { mode: 0o600 });
  } catch (error) {
    console.warn('⚠️ Erro ao salvar chave no disco:', error.message);
    return newKey;
  }

  return newKey;
}

const ENCRYPTION_KEY = getOrCreateEncryptionKey();

/**
 * @param {object} data
 * @returns {string|null}
 */
function encrypt(data) {
  if (!data) return null;

  try {
    const jsonString = JSON.stringify(data, null, 2);
    return CryptoJS.AES.encrypt(jsonString, ENCRYPTION_KEY).toString();
  } catch (error) {
    console.error('❌ Erro ao criptografar dados:', error);
    return null;
  }
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

    if (decryptedString) {
      return JSON.parse(decryptedString);
    }
  } catch (error) {
  }

  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, OLD_ENCRYPTION_KEY);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);

    if (!decryptedString) {
      console.error('❌ Falha na descriptografia: string vazia');
      return null;
    }

    const decryptedData = JSON.parse(decryptedString);

    decryptedData._needsMigration = true;

    return decryptedData;
  } catch (error) {
    console.error('❌ Erro ao descriptografar dados:', error.message);
    return null;
  }
}

module.exports = {
  encrypt,
  decrypt
}; 