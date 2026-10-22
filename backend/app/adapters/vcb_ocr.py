from __future__ import annotations

import h5py
import numpy as np
from pathlib import Path
from PIL import Image

MODEL_PATH = (
    Path(__file__).resolve().parents[3]
    / "TÀI LIỆU API BANK"
    / "VCB-API-master"
    / "VCB-API-master"
    / "model"
    / "captcha_model.h5"
)

def sigmoid(x):
    return 1.0 / (1.0 + np.exp(-np.clip(x, -30, 30)))

def relu(x):
    return np.maximum(0, x)

def softmax(x, axis=-1):
    e_x = np.exp(x - np.max(x, axis=axis, keepdims=True))
    return e_x / np.sum(e_x, axis=axis, keepdims=True)

class VCBLocalOCR:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._load_weights()
        return cls._instance

    def _load_weights(self):
        f = h5py.File(str(MODEL_PATH), "r")
        mw = f["model_weights"]

        # Conv1 & Conv2
        self.c1_w = mw["Conv1"]["Conv1"]["kernel:0"][:]  # (3, 3, 1, 32)
        self.c1_b = mw["Conv1"]["Conv1"]["bias:0"][:]    # (32,)
        self.c2_w = mw["Conv2"]["Conv2"]["kernel:0"][:]  # (3, 3, 32, 64)
        self.c2_b = mw["Conv2"]["Conv2"]["bias:0"][:]    # (64,)

        # Dense1
        self.d1_w = mw["dense1"]["dense1"]["kernel:0"][:]  # (960, 64)
        self.d1_b = mw["dense1"]["dense1"]["bias:0"][:]    # (64,)

        # BiLSTM 1 (units=128)
        b1 = mw["bidirectional"]["bidirectional"]
        self.b1_f_w = b1["forward_lstm"]["lstm_cell_1"]["kernel:0"][:]
        self.b1_f_u = b1["forward_lstm"]["lstm_cell_1"]["recurrent_kernel:0"][:]
        self.b1_f_b = b1["forward_lstm"]["lstm_cell_1"]["bias:0"][:]

        self.b1_b_w = b1["backward_lstm"]["lstm_cell_2"]["kernel:0"][:]
        self.b1_b_u = b1["backward_lstm"]["lstm_cell_2"]["recurrent_kernel:0"][:]
        self.b1_b_b = b1["backward_lstm"]["lstm_cell_2"]["bias:0"][:]

        # BiLSTM 2 (units=64)
        b2 = mw["bidirectional_1"]["bidirectional_1"]
        self.b2_f_w = b2["forward_lstm_1"]["lstm_cell_4"]["kernel:0"][:]
        self.b2_f_u = b2["forward_lstm_1"]["lstm_cell_4"]["recurrent_kernel:0"][:]
        self.b2_f_b = b2["forward_lstm_1"]["lstm_cell_4"]["bias:0"][:]

        self.b2_b_w = b2["backward_lstm_1"]["lstm_cell_5"]["kernel:0"][:]
        self.b2_b_u = b2["backward_lstm_1"]["lstm_cell_5"]["recurrent_kernel:0"][:]
        self.b2_b_b = b2["backward_lstm_1"]["lstm_cell_5"]["bias:0"][:]

        # Dense2 (output)
        self.d2_w = mw["dense2"]["dense2"]["kernel:0"][:]  # (128, 61)
        self.d2_b = mw["dense2"]["dense2"]["bias:0"][:]    # (61,)
        f.close()

    @staticmethod
    def _run_lstm_layer(x, w, u, b, units, reverse=False):
        T = x.shape[0]
        h = np.zeros(units, dtype=np.float32)
        c = np.zeros(units, dtype=np.float32)
        out = np.zeros((T, units), dtype=np.float32)

        indices = range(T - 1, -1, -1) if reverse else range(T)
        for t in indices:
            xt = x[t]
            z = np.dot(xt, w) + np.dot(h, u) + b
            i = sigmoid(z[0*units:1*units])
            f = sigmoid(z[1*units:2*units])
            c_cand = np.tanh(z[2*units:3*units])
            o = sigmoid(z[3*units:4*units])

            c = f * c + i * c_cand
            h = o * np.tanh(c)
            out[t] = h
        return out

    def predict(self, img: Image.Image) -> str:
        # 1. Tiền xử lý ảnh đúng chuẩn model VCB (160, 60, transpose)
        img_gray = img.convert("L").resize((160, 60))
        arr = np.array(img_gray, dtype=np.float32) / 255.0
        # Transpose: shape (160, 60, 1)
        x = np.expand_dims(arr.T, axis=-1)

        # 2. Conv1 (same padding) + MaxPool (2x2)
        # Pad 1 each side on H & W
        padded = np.pad(x, ((1, 1), (1, 1), (0, 0)), mode="constant")
        # conv1 output: (160, 60, 32)
        conv1 = np.zeros((160, 60, 32), dtype=np.float32)
        for di in range(3):
            for dj in range(3):
                conv1 += np.dot(padded[di:di+160, dj:dj+60, :], self.c1_w[di, dj, :, :])
        conv1 = relu(conv1 + self.c1_b)

        # pool1 (2x2) -> (80, 30, 32)
        pool1 = conv1.reshape(80, 2, 30, 2, 32).max(axis=(1, 3))

        # 3. Conv2 (same padding) + MaxPool (2x2)
        padded2 = np.pad(pool1, ((1, 1), (1, 1), (0, 0)), mode="constant")
        conv2 = np.zeros((80, 30, 64), dtype=np.float32)
        for di in range(3):
            for dj in range(3):
                conv2 += np.dot(padded2[di:di+80, dj:dj+30, :], self.c2_w[di, dj, :, :])
        conv2 = relu(conv2 + self.c2_b)

        # pool2 (2x2) -> (40, 15, 64)
        pool2 = conv2.reshape(40, 2, 15, 2, 64).max(axis=(1, 3))

        # 4. Reshape -> (40, 960)
        flat = pool2.reshape(40, 15 * 64)

        # 5. Dense1 -> (40, 64)
        d1 = relu(np.dot(flat, self.d1_w) + self.d1_b)

        # 6. BiLSTM 1 (units=128) -> (40, 256)
        b1_f = self._run_lstm_layer(d1, self.b1_f_w, self.b1_f_u, self.b1_f_b, 128, reverse=False)
        b1_b = self._run_lstm_layer(d1, self.b1_b_w, self.b1_b_u, self.b1_b_b, 128, reverse=True)
        b1 = np.concatenate([b1_f, b1_b], axis=-1)

        # 7. BiLSTM 2 (units=64) -> (40, 128)
        b2_f = self._run_lstm_layer(b1, self.b2_f_w, self.b2_f_u, self.b2_f_b, 64, reverse=False)
        b2_b = self._run_lstm_layer(b1, self.b2_b_w, self.b2_b_u, self.b2_b_b, 64, reverse=True)
        b2 = np.concatenate([b2_f, b2_b], axis=-1)

        # 8. Dense2 (output) -> (40, 61)
        logits = np.dot(b2, self.d2_w) + self.d2_b
        probs = softmax(logits, axis=-1)

        # 9. CTC Greedy Decode
        vocab = [' ', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
        best_indices = np.argmax(probs, axis=-1)

        # Loại bỏ các ký tự lặp liên tiếp và blank token (0 hoặc 60)
        decoded_tokens = []
        prev = -1
        for idx in best_indices:
            if idx != prev:
                # Nếu idx thuộc các chữ số (index 2..11 trong vocab của Keras)
                # Hoặc kiểm tra xem idx map vào ký tự nào
                decoded_tokens.append(idx)
                prev = idx

        # Lọc ra chuỗi các chữ số (index 2..11 tương ứng '0'..'9')
        res_digits = []
        for t in decoded_tokens:
            if 2 <= t <= 11:
                res_digits.append(str(t - 2))

        result = "".join(res_digits)[:5]
        return result
