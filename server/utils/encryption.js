import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

const getEncryptionKey = () => {
  const secret = process.env.ENCRYPTION_KEY || 'socialy-escrow-secret-key-32b-hash!';
  return crypto.createHash('sha256').update(secret).digest();
};

/**
 * Encrypts a string or JSON object with AES-256-GCM
 * @param {string|object} data
 * @returns {string} iv:tag:encryptedData
 */
export const encryptData = (data) => {
  if (data === null || data === undefined) return null;
  const text = typeof data === 'object' ? JSON.stringify(data) : String(data);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
};

/**
 * Decrypts an AES-256-GCM encrypted string
 * @param {string} encryptedString
 * @returns {string|object} Decrypted text or parsed object
 */
export const decryptData = (encryptedString) => {
  if (!encryptedString || typeof encryptedString !== 'string') return encryptedString;
  const parts = encryptedString.split(':');
  if (parts.length !== 3) return encryptedString;

  try {
    const [ivHex, tagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const key = getEncryptionKey();

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted;
    }
  } catch (err) {
    console.error('Decryption error:', err);
    return null;
  }
};
