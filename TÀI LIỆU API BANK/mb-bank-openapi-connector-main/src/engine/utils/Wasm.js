"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const undici_1 = require("undici");
const Global_1 = require("./Global");
/**
 * Utility class for managing WebAssembly binary files
 */
class WasmUtils {
    /**
     * Downloads the WebAssembly binary from MB Bank's website
     *
     * @returns {Promise<Buffer>} A promise that resolves to the WebAssembly binary buffer
     *
     * @example
     * ```typescript
     * const wasmBinary = await WasmUtils.downloadWasm();
     * // Use the WebAssembly binary for encryption
     * ```
     */
    static async downloadWasm() {
        const wasm = await (0, undici_1.request)("https://online.mbbank.com.vn/assets/wasm/main.wasm", {
            headers: Global_1.defaultHeaders,
        });
        return Buffer.from(await wasm.body.arrayBuffer());
    }
    /**
     * Loads WebAssembly binary, either by downloading it or retrieving from disk
     *
     * @param {string} [path] - Optional path to save/load the WebAssembly file
     * @returns {Promise<Buffer>} A promise that resolves to the WebAssembly binary buffer
     *
     * @example
     * ```typescript
     * // Download the WASM file each time
     * const wasmData = await WasmUtils.loadWasm();
     *
     * // Or save/load it from disk for caching
     * const wasmData = await WasmUtils.loadWasm('./cache/main.wasm');
     * ```
     */
    static async loadWasm(path) {
        if (!path) {
            return this.downloadWasm();
        }
        if (!(0, fs_1.existsSync)(path)) {
            const wasm = await this.downloadWasm();
            (0, fs_1.writeFileSync)(path, wasm, { encoding: "binary" });
            return wasm;
        }
        return Buffer.from((0, fs_1.readFileSync)(path, "binary"), "binary");
    }
}
exports.default = WasmUtils;


