const { BankConnector } = require('./core/Connector');
const logger = require('./utils/logger');
const CryptoUtils = require('./utils/crypto');
const constants = require('./config/constants');

/**
 * Bank API Connector
 * Provides unified interface to interact with the API
 */
module.exports = {
    // Primary Export
    BankConnector,

    // For backwards compatibility if needed
    MB: BankConnector,

    // Utilities
    logger,
    CryptoUtils,
    constants,

    // Error Handling
    errors: require('./errors/BankError')
};
