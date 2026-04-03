import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

const getKey = (): Buffer => {
  const secret = process.env.ENCRYPTION_SECRET || 'default-secret-key-change-me-32ch';
  return crypto.scryptSync(secret, 'rsushop-salt', KEY_LENGTH);
};

export const encryptToken = (text: string): string => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  // Format: iv:tag:encrypted (all base64)
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
};

export const decryptToken = (encryptedText: string): string => {
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted token format');
    }

    const iv = Buffer.from(parts[0], 'base64');
    const tag = Buffer.from(parts[1], 'base64');
    const encrypted = Buffer.from(parts[2], 'base64');

    const key = getKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch (error) {
    // If decryption fails, the token might be stored in plaintext (old format)
    return encryptedText;
  }
};

export const hashApiKey = (key: string): string => {
  return crypto.createHash('sha256').update(key).digest('hex');
};

export const generateApiKey = (): { key: string; keyHash: string; keyPrefix: string } => {
  const key = `rsk_${crypto.randomBytes(32).toString('base64url')}`;
  const keyHash = hashApiKey(key);
  const keyPrefix = key.substring(0, 12);
  return { key, keyHash, keyPrefix };
};
