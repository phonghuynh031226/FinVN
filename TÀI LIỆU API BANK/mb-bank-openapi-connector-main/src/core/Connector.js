const OriginalCore = require('../engine/index.js');
const logger = require('../utils/logger');
const constants = require('../config/constants');
const CryptoUtils = require('../utils/crypto');

/**
 * BankConnector
 * Core class for handling banking connections
 */
class BankConnector extends OriginalCore.MB {
    constructor(credentials) {
        super(credentials);
        this._initializedAt = new Date();
        this._instanceId = CryptoUtils.generateUUID();
        
        logger.info(`Connector instance [${this._instanceId}] initialized.`);
    }

    async getBalanceInfo() {
        logger.info("Fetching balance info...");
        try {
            return await this.getBalance();
        } catch (error) {
            logger.error("Failed to fetch balance: ", error.message);
            throw error;
        }
    }

    async getHistory(accountNumber, fromDate, toDate) {
        logger.info(`Fetching history for account ${accountNumber} from ${fromDate} to ${toDate}`);
        return await this.getTransactionsHistory({
            accountNumber,
            fromDate,
            toDate
        });
    }
}

module.exports = {
    BankConnector,
    ...OriginalCore
};
