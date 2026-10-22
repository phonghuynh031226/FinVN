"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const ort = __importStar(require("onnxruntime-node"));
const path = __importStar(require("path"));
const sharp_1 = __importDefault(require("sharp"));
const undici_1 = require("undici");
const dirPath = path.dirname(require.main ? require.main.filename : __filename);
/**
 * OCR model for recognizing characters in images
 * @class
 */
class OCRModel {
    /**
     * Character set for recognition
     * @private
     * @type {string[]}
     */
    chars;
    /**
     * Path to the ONNX model file
     * @private
     * @type {string}
     */
    modelPath;
    /**
     * ONNX inference session
     * @private
     * @type {ort.InferenceSession}
     */
    session;
    /**
     * Creates a new OCR model
     * @param {string|null} modelPath - Optional custom path to the ONNX model file
     */
    constructor(modelPath = null) {
        // Create and sort the characters array (digits + letters)
        this.chars = [];
        // Add digits (0-9)
        for (let i = 0; i < 10; i++) {
            this.chars.push(String(i));
        }
        // Add lowercase and uppercase letters (a-z, A-Z)
        for (let i = 97; i <= 122; i++) {
            this.chars.push(String.fromCharCode(i));
        }
        for (let i = 65; i <= 90; i++) {
            this.chars.push(String.fromCharCode(i));
        }
        this.chars.sort();
        // Set the model path
        this.modelPath = modelPath || path.join(dirPath, '/../model.onnx');
    }
    /**
     * Loads the ONNX model for inference
     * @returns {Promise<void>} A promise that resolves when the model is loaded
     */
    async loadModel() {
        if (!(0, fs_1.existsSync)(this.modelPath))
            await this.downloadOnnxModel();
        this.session = await ort.InferenceSession.create(this.modelPath);
    }
    /**
     * Predicts text from an image
     * @param {Buffer} imageBuffer - The image buffer to process
     * @returns {Promise<string>} A promise that resolves to the recognized text
     */
    async predict(imageBuffer) {
        // Convert image to grayscale and resize
        const processedImage = await (0, sharp_1.default)(imageBuffer)
            .grayscale()
            .resize(160, 50)
            .raw()
            .toBuffer();
        // Convert to float32 array and normalize to 0-1
        const imageArray = new Float32Array(processedImage.length);
        for (let i = 0; i < processedImage.length; i++) {
            imageArray[i] = processedImage[i] / 255.0;
        }
        // Reshape to match the expected input shape [1, 1, 50, 160]
        const tensor = new ort.Tensor('float32', imageArray, [1, 1, 50, 160]);
        // Get input name
        const inputName = this.session.inputNames[0];
        const feeds = {};
        feeds[inputName] = tensor;
        // Run inference
        const results = await this.session.run(feeds);
        const outputData = Object.values(results)[0].data;
        const outputShape = Object.values(results)[0].dims;
        // Process predictions
        const pred = this.reshapeTensor(outputData, outputShape);
        const predLabels = this.argmax(pred, 2);
        // Convert label indices to characters
        let predText = '';
        for (const label of predLabels[0]) {
            if (label >= 0 && label < this.chars.length) {
                predText += this.chars[label];
            }
        }
        return predText;
    }
    /**
     * Downloads the ONNX model from GitHub
     * @private
     * @returns {Promise<void>} A promise that resolves when the model is downloaded
     * @throws {Error} If the download fails
     */
    async downloadOnnxModel() {
        try {
            // Make the HTTP request
            const model = await (0, undici_1.request)("https://github.com/thedtvn/mbbank-capcha-ocr/raw/refs/heads/master/mb_capcha_ocr/model.onnx", {
                maxRedirections: 10,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                },
            });
            // Create a write stream
            const fileStream = (0, fs_1.createWriteStream)(this.modelPath);
            // Pipe the response body to the file
            await new Promise((resolve, reject) => {
                model.body.pipe(fileStream);
                model.body.on('error', (err) => {
                    reject(err);
                });
                fileStream.on('finish', () => {
                    resolve();
                });
                fileStream.on('error', (err) => {
                    reject(err);
                });
            });
        }
        catch (error) {
            console.error('Error downloading model:', error);
            throw error;
        }
    }
    /**
     * Reshapes a flat tensor into a 3D array
     * @private
     * @param {Float32Array} data - The flat tensor data
     * @param {number[]} shape - The target shape [batchSize, seqLength, numClasses]
     * @returns {number[][][]} Reshaped 3D array
     */
    reshapeTensor(data, shape) {
        const result = [];
        const [batchSize, seqLength, numClasses] = shape;
        for (let b = 0; b < batchSize; b++) {
            const batchResult = [];
            for (let s = 0; s < seqLength; s++) {
                const classProbs = [];
                for (let c = 0; c < numClasses; c++) {
                    const idx = b * seqLength * numClasses + s * numClasses + c;
                    classProbs.push(data[idx]);
                }
                batchResult.push(classProbs);
            }
            result.push(batchResult);
        }
        return result;
    }
    /**
     * Computes argmax along a specified axis
     * @private
     * @param {number[][][]} tensor - The input tensor
     * @param {number} axis - The axis along which to compute argmax (only 2 is supported)
     * @returns {number[][]} The indices of maximum values
     */
    argmax(tensor, axis) {
        const result = [];
        if (axis === 2) {
            for (let b = 0; b < tensor.length; b++) {
                const batchResult = [];
                for (let s = 0; s < tensor[b].length; s++) {
                    let maxIdx = 0;
                    let maxVal = tensor[b][s][0];
                    for (let c = 1; c < tensor[b][s].length; c++) {
                        if (tensor[b][s][c] > maxVal) {
                            maxVal = tensor[b][s][c];
                            maxIdx = c;
                        }
                    }
                    batchResult.push(maxIdx);
                }
                result.push(batchResult);
            }
        }
        return result;
    }
}
exports.default = OCRModel;


