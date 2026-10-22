"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = require("node:crypto");
const moment_1 = __importDefault(require("moment"));
const undici_1 = require("undici");
const Global_1 = require("./utils/Global");
const LoadWasm_1 = __importDefault(require("./utils/LoadWasm"));
const OCRModel_1 = __importDefault(require("./utils/OCRModel"));
const Tesseract_1 = __importDefault(require("./utils/Tesseract"));
const Wasm_1 = __importDefault(require("./utils/Wasm"));
/**
 * Main client class for MB Bank API integration.
 * Provides functionality for authentication, account balance queries, and transaction history.
 *
 * @example
 * ```typescript
 * // Initialize the MB client
 * const mb = new MB({
 *   username: '0123456789',   // Your MB Bank phone number
 *   password: 'your_password' // Your MB Bank password
 * });
 *
 * // Login and get account balance
 * async function checkBalance() {
 *   await mb.login();
 *   const balance = await mb.getBalance();
 *   console.log('Total balance:', balance.totalBalance);
 *   console.log('Accounts:', balance.balances);
 * }
 *
 * checkBalance().catch(console.error);
 * ```
 */
class MB {
    /**
     * MB Bank account username (usually phone number).
     * @readonly
     * @type {string}
     */
    username;
    /**
     * MB Bank account password.
     * @readonly
     * @type {string}
     */
    password;
    /**
     * Session identifier returned by MB Bank's API after successful authentication.
     * Used to validate subsequent requests.
     * @type {string|null|undefined}
     */
    sessionId;
    /**
     * Device identifier used for authentication with MB Bank API.
     * This is automatically generated for each session.
     * @type {string}
     */
    deviceId = (0, Global_1.generateDeviceId)();
    /**
     * HTTP client for making requests to MB Bank's API.
     * @type {Client}
     */
    client = new undici_1.Client("https://online.mbbank.com.vn");
    /**
     * WASM binary data downloaded from MB Bank.
     * Used for request encryption.
     * @private
     * @type {Buffer}
     */
    wasmData;
    /**
     * Custom OCR function for captcha recognition.
     * Allows implementing your own captcha recognition logic.
     *
     * @private
     * @type {Function|undefined}
     * @param {Buffer} image - The captcha image buffer to be recognized
     * @returns {Promise<string>} Recognized text from the captcha
     *
     * @example
     * ```typescript
     * const mb = new MB({
     *   username: '0123456789',
     *   password: 'your_password',
     *   preferredOCRMethod: 'custom',
     *   customOCRFunction: async (imageBuffer) => {
     *     // Your custom OCR logic here
     *     // For example, using a third-party OCR service:
     *     const result = await someOCRService.recognize(imageBuffer);
     *     return result.text;
     *   }
     * });
     * ```
     */
    customOCRFunction;
    /**
     * The OCR method to use for captcha recognition.
     * - "default": Uses the pre-trained OCR model (recommended)
     * - "tesseract": Uses Tesseract OCR engine
     * - "custom": Uses the custom OCR function provided
     *
     * @private
     * @type {"default"|"tesseract"|"custom"}
     * @default "default"
     */
    preferredOCRMethod = "default";
    /**
     * Whether to save the WASM file to disk.
     * Useful for debugging or caching purposes.
     *
     * @private
     * @type {boolean}
     * @default false
     */
    saveWasm = false;
    /**
     * Creates a new MB client instance.
     *
     * @param {Object} data - Configuration options
     * @param {string} data.username - MB Bank login username (usually your registered phone number)
     * @param {string} data.password - MB Bank login password
     * @param {"default"|"tesseract"|"custom"} [data.preferredOCRMethod="default"] - OCR method for captcha recognition
     * @param {Function} [data.customOCRFunction] - Custom OCR function (required if preferredOCRMethod is "custom")
     * @param {boolean} [data.saveWasm=false] - Whether to save the WASM file to disk
     *
     * @throws {Error} If username or password is not provided
     *
     * @example
     * ```typescript
     * // Basic usage with default OCR
     * const mbClient = new MB({
     *   username: '0123456789',
     *   password: 'your_password'
     * });
     *
     * // Using Tesseract OCR
     * const mbWithTesseract = new MB({
     *   username: '0123456789',
     *   password: 'your_password',
     *   preferredOCRMethod: 'tesseract'
     * });
     *
     * // Using custom OCR function
     * const mbWithCustomOCR = new MB({
     *   username: '0123456789',
     *   password: 'your_password',
     *   preferredOCRMethod: 'custom',
     *   customOCRFunction: async (image) => {
     *     // Your custom captcha recognition logic
     *     return recognizedText;
     *   }
     * });
     * ```
     */
    constructor(data) {
        if (!data.username || !data.password)
            throw new Error("You must define at least a MB account to use with this library!");
        this.username = data.username;
        this.password = data.password;
        if (data.preferredOCRMethod)
            this.preferredOCRMethod = data.preferredOCRMethod;
        if (data.customOCRFunction)
            this.customOCRFunction = data.customOCRFunction;
        if (data.saveWasm)
            this.saveWasm = data.saveWasm;
    }
    /**
     * Processes captcha image according to the configured OCR method.
     *
     * @private
     * @param {Buffer} image - Captcha image buffer
     * @returns {Promise<string|null>} Recognized captcha text or null if recognition failed
     */
    async recognizeCaptcha(image) {
        switch (this.preferredOCRMethod) {
            case "default":
                // eslint-disable-next-line no-case-declarations
                const model = new OCRModel_1.default();
                await model.loadModel();
                // eslint-disable-next-line no-case-declarations
                const modelPredictedCaptcha = await model.predict(image);
                if (modelPredictedCaptcha.length !== 6)
                    return null;
                return modelPredictedCaptcha;
            case "tesseract":
                return await Tesseract_1.default.recognizeText(image);
            case "custom":
                if (!this.customOCRFunction)
                    return null;
                // eslint-disable-next-line no-case-declarations
                const customPredictedCaptcha = await this.customOCRFunction(image);
                if (customPredictedCaptcha.length !== 6)
                    return null;
                return customPredictedCaptcha;
        }
    }
    /**
     * Since version 1.8.7, MB Bank requires biometric verification for transactions.
     * This function will checks for biometric verification requirement and return if you need to complete biometric verification.
     * This function should be called before performing any transaction-related operations.
     * @private
     * @returns {Promise<boolean>}
     */
    async verifyBiometricTransaction() {
        const biometricStatus = await this.mbRequest({ path: "/api/retail-go-ekycms/v1.0/verify-biometric-nfc-transaction" });
        if (!biometricStatus)
            return false;
        return biometricStatus.result.responseCode == "00" && biometricStatus.result.ok;
    }
    /**
     * Authenticates with MB Bank API by solving captcha and sending login credentials.
     * Sets the session ID upon successful login.
     *
     * @returns {Promise<LoginResponseData>} Login response from the API
     * @throws {Error} If login fails with specific error code and message
     *
     * @example
     * ```typescript
     * const mb = new MB({
     *   username: '0123456789',
     *   password: 'your_password'
     * });
     *
     * try {
     *   const loginResponse = await mb.login();
     *   console.log('Login successful!');
     *   console.log('Session ID:', mb.sessionId);
     * } catch (error) {
     *   console.error('Login failed:', error.message);
     * }
     * ```
     */
    async login() {
        // Request ID/Ref ID for MB
        const rId = (0, Global_1.getTimeNow)();
        const headers = Global_1.defaultHeaders;
        headers["X-Request-Id"] = rId;
        headers["Deviceid"] = this.deviceId;
        headers["Refno"] = rId;
        const captchaReq = await this.client.request({
            method: "POST",
            path: "/api/retail-internetbankingms/getCaptchaImage",
            headers,
            body: JSON.stringify({
                "sessionId": "",
                "refNo": rId,
                "deviceIdCommon": this.deviceId,
            }),
        });
        const captchaRes = await captchaReq.body.json();
        const captchaBuffer = Buffer.from(captchaRes.imageString, "base64");
        const captchaContent = await this.recognizeCaptcha(captchaBuffer);
        if (captchaContent === null)
            return this.login();
        // wasm
        if (!this.wasmData) {
            this.wasmData = await Wasm_1.default.loadWasm(this.saveWasm ? "main.wasm" : undefined);
        }
        // Create Data
        const requestData = {
            userId: this.username,
            password: (0, node_crypto_1.createHash)("md5").update(this.password).digest("hex"),
            captcha: captchaContent,
            ibAuthen2faString: Global_1.FPR,
            sessionId: null,
            refNo: (0, Global_1.getTimeNow)(),
            deviceIdCommon: this.deviceId,
        };
        const loginReq = await this.client.request({
            method: "POST",
            path: "/api/retail_web/internetbanking/v2.0/doLogin",
            headers: Global_1.defaultHeaders,
            body: JSON.stringify({
                dataEnc: await (0, LoadWasm_1.default)(this.wasmData, requestData, "0"),
            }),
        });
        const loginRes = await loginReq.body.json();
        if (!loginRes.result) {
            throw new Error("Login failed: Unknown data");
        }
        if (loginRes.result.ok) {
            this.sessionId = loginRes.sessionId;
            const biometricVerified = await this.verifyBiometricTransaction();
            if (!biometricVerified) {
                throw new Error("Biometric verification required for transactions. Please complete biometric verification in the MB Bank mobile app.");
            }
            return loginRes;
        }
        else if (loginRes.result.responseCode === "GW283") {
            // Again...
            return this.login();
        }
        else {
            const e = new Error("Login failed: (" + loginRes.result.responseCode + "): " + loginRes.result.message);
            e.code = loginRes.result.responseCode;
            throw e;
        }
    }
    /**
     * Generates a reference ID required by MB Bank API.
     * The format is "{username}-{timestamp}".
     *
     * @private
     * @returns {string} Reference ID for API requests
     */
    getRefNo() {
        return `${this.username}-${(0, Global_1.getTimeNow)()}`;
    }
    /**
     * Makes an authenticated request to MB Bank API.
     * Handles session expiration by automatically re-logging in.
     *
     * @private
     * @param {Object} data - Request parameters
     * @param {string} data.path - API endpoint path
     * @param {Object} [data.json] - Request body data
     * @param {Object} [data.headers] - Additional request headers
     * @returns {Promise<any>} API response
     * @throws {Error} If the request fails with error code and message
     */
    async mbRequest(data) {
        if (!this.sessionId) {
            await this.login();
        }
        const rId = this.getRefNo();
        const headers = Global_1.defaultHeaders;
        headers["X-Request-Id"] = rId;
        headers["Deviceid"] = this.deviceId,
            headers["Refno"] = rId;
        const defaultBody = {
            "sessionId": this.sessionId,
            "refNo": rId,
            "deviceIdCommon": this.deviceId,
        };
        const body = Object.assign(defaultBody, data.json);
        const httpReq = await this.client.request({
            method: "POST",
            path: data.path,
            headers,
            body: JSON.stringify(body),
        });
        const httpRes = await httpReq.body.json();
        if (!httpRes || !httpRes.result) {
            return false;
        }
        else if (httpRes.result.ok == true)
            return httpRes;
        else if (httpRes.result.responseCode === "GW200") {
            await this.login();
            return this.mbRequest(data);
        }
        else {
            throw new Error("Request failed (" + httpRes.result.responseCode + "): " + httpRes.result.message);
        }
    }
    /**
     * Retrieves account balance information for all accounts.
     *
     * @returns {Promise<BalanceList|undefined>} Account balance data or undefined if request fails
     *
     * @example
     * ```typescript
     * const mb = new MB({
     *   username: '0123456789',
     *   password: 'your_password'
     * });
     *
     * async function getAccountInfo() {
     *   await mb.login();
     *   const balanceInfo = await mb.getBalance();
     *
     *   if (balanceInfo) {
     *     console.log(`Total balance: ${balanceInfo.totalBalance} ${balanceInfo.currencyEquivalent}`);
     *
     *     // Display each account's details
     *     balanceInfo.balances.forEach(account => {
     *       console.log(`Account: ${account.name} (${account.number})`);
     *       console.log(`Balance: ${account.balance} ${account.currency}`);
     *       console.log('---');
     *     });
     *   }
     * }
     *
     * getAccountInfo().catch(console.error);
     * ```
     */
    async getBalance() {
        const balanceData = await this.mbRequest({ path: "/api/retail-accountms/accountms/getBalance" });
        if (!balanceData)
            return;
        const balance = {
            totalBalance: balanceData.totalBalanceEquivalent,
            currencyEquivalent: balanceData.currencyEquivalent,
            balances: [],
        };
        balanceData.acct_list.forEach((acctInfo) => {
            const acct = acctInfo;
            const balanceData = {
                number: acct.acctNo,
                name: acct.acctNm,
                currency: acct.ccyCd,
                balance: acct.currentBalance,
            };
            balance.balances?.push(balanceData);
        });
        balanceData.internationalAcctList.forEach((acctInfo) => {
            const acct = acctInfo;
            const balanceData = {
                number: acct.acctNo,
                name: acct.acctNm,
                currency: acct.ccyCd,
                balance: acct.currentBalance,
            };
            balance.balances?.push(balanceData);
        });
        return balance;
    }
    /**
     * Retrieves transaction history for a specific account within a date range.
     *
     * @param {Object} data - Request parameters
     * @param {string} data.accountNumber - MB Bank account number to query
     * @param {string} data.fromDate - Start date in format "DD/MM/YYYY" or "D/M/YYYY"
     * @param {string} data.toDate - End date in format "DD/MM/YYYY" or "D/M/YYYY"
     * @returns {Promise<TransactionInfo[]|undefined>} Array of transaction details or undefined if request fails
     * @throws {Error} If date range exceeds 90 days or date format is invalid
     *
     * @example
     * ```typescript
     * const mb = new MB({
     *   username: '0123456789',
     *   password: 'your_password'
     * });
     *
     * async function getLastMonthTransactions() {
     *   await mb.login();
     *
     *   // Get account first
     *   const balanceInfo = await mb.getBalance();
     *   if (!balanceInfo?.balances?.length) {
     *     console.log('No accounts found');
     *     return;
     *   }
     *
     *   const accountNumber = balanceInfo.balances[0].number;
     *
     *   // Get transactions for the last 30 days
     *   const today = new Date();
     *   const lastMonth = new Date();
     *   lastMonth.setDate(today.getDate() - 30);
     *
     *   const fromDate = `${lastMonth.getDate()}/${lastMonth.getMonth() + 1}/${lastMonth.getFullYear()}`;
     *   const toDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
     *
     *   const transactions = await mb.getTransactionsHistory({
     *     accountNumber,
     *     fromDate,
     *     toDate
     *   });
     *
     *   if (transactions) {
     *     console.log(`Found ${transactions.length} transactions`);
     *
     *     transactions.forEach(tx => {
     *       const amount = tx.creditAmount || tx.debitAmount;
     *       const type = tx.creditAmount ? 'CREDIT' : 'DEBIT';
     *
     *       console.log(`${tx.transactionDate} | ${type} | ${amount} ${tx.transactionCurrency}`);
     *       console.log(`Description: ${tx.transactionDesc}`);
     *       if (tx.toAccountName) {
     *         console.log(`To: ${tx.toAccountName} (${tx.toAccountNumber}) at ${tx.toBank}`);
     *       }
     *       console.log('---');
     *     });
     *   }
     * }
     *
     * getLastMonthTransactions().catch(console.error);
     * ```
     */
    async getTransactionsHistory(data) {
        if ((0, moment_1.default)().day() - (0, moment_1.default)(data.fromDate, "D/M/YYYY").day() > 90 || (0, moment_1.default)().day() - (0, moment_1.default)(data.fromDate, "D/M/YYYY").day() > 90)
            throw new Error("Date formatting error: Max transaction history must be shorter than 90 days!");
        if ((0, moment_1.default)(data.fromDate, "DD/MM/YYYY").day() - (0, moment_1.default)(data.toDate, "D/M/YYYY").day() > 90)
            throw new Error("Date formatting error: Max transaction history must be shorter than 90 days!");
        const body = {
            "accountNo": data.accountNumber,
            "fromDate": (0, moment_1.default)(data.fromDate, "D/M/YYYY").format("DD/MM/YYYY"),
            "toDate": (0, moment_1.default)(data.toDate, "D/M/YYYY").format("DD/MM/YYYY"),
        };
        const historyData = await this.mbRequest({ path: "/api/retail-transactionms/transactionms/get-account-transaction-history", json: body });
        if (!historyData || !historyData.transactionHistoryList)
            return;
        const transactionHistories = [];
        historyData.transactionHistoryList.forEach((transactionRaw) => {
            const transaction = transactionRaw;
            const transactionData = {
                postDate: transaction.postingDate,
                transactionDate: transaction.transactionDate,
                accountNumber: transaction.accountNo,
                creditAmount: transaction.creditAmount,
                debitAmount: transaction.debitAmount,
                transactionCurrency: transaction.currency,
                transactionDesc: transaction.description,
                balanceAvailable: transaction.availableBalance,
                refNo: transaction.refNo,
                toAccountName: transaction.benAccountName,
                toBank: transaction.bankName,
                toAccountNumber: transaction.benAccountNo,
                type: transaction.transactionType,
            };
            transactionHistories.push(transactionData);
        });
        return transactionHistories;
    }
}
exports.default = MB;


