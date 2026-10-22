const crypto = require('crypto');

/**
 * Common cryptographic operations
 */
class CryptoUtils {
    static md5(data) {
        return crypto.createHash('md5').update(data).digest('hex');
    }

    static generateUUID() {
        return crypto.randomUUID();
    }

    static encodeBase64(data) {
        return Buffer.from(data).toString('base64');
    }

    static decodeBase64(base64) {
        return Buffer.from(base64, 'base64').toString('ascii');
    }
}

module.exports = CryptoUtils;
