"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateApiKey = exports.hashApiKey = exports.decryptToken = exports.encryptToken = void 0;
const crypto_1 = __importDefault(require("crypto"));
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const getKey = () => {
    const secret = process.env.ENCRYPTION_SECRET || 'default-secret-key-change-me-32ch';
    return crypto_1.default.scryptSync(secret, 'rsushop-salt', KEY_LENGTH);
};
const encryptToken = (text) => {
    const iv = crypto_1.default.randomBytes(IV_LENGTH);
    const key = getKey();
    const cipher = crypto_1.default.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
        cipher.update(text, 'utf8'),
        cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    // Format: iv:tag:encrypted (all base64)
    return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
};
exports.encryptToken = encryptToken;
const decryptToken = (encryptedText) => {
    try {
        const parts = encryptedText.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted token format');
        }
        const iv = Buffer.from(parts[0], 'base64');
        const tag = Buffer.from(parts[1], 'base64');
        const encrypted = Buffer.from(parts[2], 'base64');
        const key = getKey();
        const decipher = crypto_1.default.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);
        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final(),
        ]);
        return decrypted.toString('utf8');
    }
    catch (error) {
        // If decryption fails, the token might be stored in plaintext (old format)
        return encryptedText;
    }
};
exports.decryptToken = decryptToken;
const hashApiKey = (key) => {
    return crypto_1.default.createHash('sha256').update(key).digest('hex');
};
exports.hashApiKey = hashApiKey;
const generateApiKey = () => {
    const key = `rsk_${crypto_1.default.randomBytes(32).toString('base64url')}`;
    const keyHash = (0, exports.hashApiKey)(key);
    const keyPrefix = key.substring(0, 12);
    return { key, keyHash, keyPrefix };
};
exports.generateApiKey = generateApiKey;
//# sourceMappingURL=crypto.js.map