/**
 * Simple Logger Utility
 */
class Logger {
    constructor(prefix = "App") {
        this.prefix = prefix;
    }

    info(msg, ...args) {
        console.log(`[${new Date().toISOString()}] [INFO] [${this.prefix}] ${msg}`, ...args);
    }

    warn(msg, ...args) {
        console.warn(`[${new Date().toISOString()}] [WARN] [${this.prefix}] ${msg}`, ...args);
    }

    error(msg, ...args) {
        console.error(`[${new Date().toISOString()}] [ERROR] [${this.prefix}] ${msg}`, ...args);
    }
}

module.exports = new Logger("BankConnector");
