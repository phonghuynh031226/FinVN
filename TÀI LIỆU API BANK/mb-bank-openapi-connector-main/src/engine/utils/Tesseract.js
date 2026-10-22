"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_tesseract_ocr_1 = require("node-tesseract-ocr");
const Global_1 = require("./Global");
/**
 * Utility class for working with Tesseract OCR for captcha recognition
 */
class TesseractUtils {
    /**
     * Cleans a captcha image to improve OCR recognition accuracy
     *
     * @param {Buffer} image - The raw captcha image buffer
     * @returns {Promise<Buffer>} A promise that resolves to the cleaned image buffer
     *
     * @example
     * ```typescript
     * // Clean captcha image for better OCR recognition
     * const rawImage = fs.readFileSync('./captcha.png');
     * const cleanedImage = await TesseractUtils.cleanImage(rawImage);
     * ```
     */
    static async cleanImage(image) {
        // Phase 1 - Replace #857069 with #ffffff
        image = await (0, Global_1.replaceColor)({
            image,
            target: "#857069",
            replace: "#ffffff",
        });
        // Phase 2 - Replase #ffe4d6 with #ffffff
        image = await (0, Global_1.replaceColor)({
            image,
            target: "#ffe4d6",
            replace: "#ffffff",
        });
        // Phase 3 - Cut border by 1px
        image = await (0, Global_1.cutBorder)({
            image,
            borderWidth: 1,
        });
        return image;
    }
    /**
     * Recognizes text from a captcha image using Tesseract OCR
     *
     * @param {Buffer} image - The captcha image buffer to process
     * @returns {Promise<string|null>} A promise that resolves to the recognized text, or null if recognition failed
     *
     * @example
     * ```typescript
     * // Recognize text from a captcha image
     * const captchaImage = fs.readFileSync('./captcha.png');
     * const recognizedText = await TesseractUtils.recognizeText(captchaImage);
     *
     * if (recognizedText) {
     *   console.log('Captcha text:', recognizedText);
     * } else {
     *   console.log('Failed to recognize captcha');
     * }
     * ```
     */
    static async recognizeText(image) {
        // Clean the image before processing
        image = await this.cleanImage(image);
        // Recognize text from the image
        const captchaContent = await (0, node_tesseract_ocr_1.recognize)(image, Global_1.defaultTesseractConfig);
        captchaContent.replaceAll("\n", "");
        captchaContent.replaceAll(" ", "");
        captchaContent.slice(0, -1);
        if ((captchaContent.length !== 6) || !(/^[a-z0-9]+$/i.test(captchaContent))) {
            return null;
        }
        return captchaContent;
    }
}
exports.default = TesseractUtils;


