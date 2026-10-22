class BankError extends Error {
    constructor(message, code) {
        super(message);
        this.name = 'BankError';
        this.code = code || 'UNKNOWN_ERROR';
        this.timestamp = new Date();
    }
}

class AuthenticationError extends BankError {
    constructor(message) {
        super(message, 'AUTH_FAILED');
        this.name = 'AuthenticationError';
    }
}

class NetworkError extends BankError {
    constructor(message) {
        super(message, 'NETWORK_FAILED');
        this.name = 'NetworkError';
    }
}

module.exports = {
    BankError,
    AuthenticationError,
    NetworkError
};
