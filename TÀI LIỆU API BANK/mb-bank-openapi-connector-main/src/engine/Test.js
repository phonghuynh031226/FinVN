"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
(async () => {
    const mb = new index_1.MB({
        username: "0123456789",
        password: "ABCXYZ@@",
        preferredOCRMethod: "default",
        saveWasm: true,
    });
    try {
        await mb.login();
    }
    catch (e) {
        const errorMsg = e.message;
        if (errorMsg.includes("GW18"))
            return console.log("Test completed. The library is functioning correctly.");
        else
            throw e;
    }
})();


