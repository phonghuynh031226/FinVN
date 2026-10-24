-- =========================================================================
-- FINVN - HỆ THỐNG QUẢN LÝ TÀI CHÍNH CÁ NHÂN & ĐỒNG BỘ NGÂN HÀNG
-- SCRIPT KHỞI TẠO CƠ SỞ DỮ LIỆU POSTGRESQL (PRODUCTION-READY)
-- =========================================================================

-- 1. Kích hoạt extension hỗ trợ UUID (nếu cần)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Bảng Người dùng (Users)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(100) UNIQUE,
    email VARCHAR(255) UNIQUE,
    full_name VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_sessions (
    token_hash CHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    csrf_hash CHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);

-- 3. Bảng Tài khoản Ngân hàng (Bank Accounts)
CREATE TABLE IF NOT EXISTS bank_accounts (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bank_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    initial_balance BIGINT NOT NULL DEFAULT 0,
    current_balance BIGINT NOT NULL DEFAULT 0,
    color VARCHAR(50) DEFAULT '#10b981',
    last_synced_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_bank_account UNIQUE (user_id, account_number)
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
CREATE TABLE IF NOT EXISTS bank_credentials (
    account_id VARCHAR(64) PRIMARY KEY REFERENCES bank_accounts(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_id VARCHAR(64) NOT NULL,
    nonce BYTEA NOT NULL,
    ciphertext BYTEA NOT NULL,
    tag BYTEA NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Bảng Giao dịch Thu/Chi (Transactions)
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id VARCHAR(64) NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
    amount BIGINT NOT NULL CHECK (amount > 0),
    type VARCHAR(20) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE', 'TRANSFER')),
    category VARCHAR(100),
    user_category VARCHAR(100),
    description TEXT,
    user_note TEXT,
    transaction_date TIMESTAMPTZ NOT NULL,
    reference VARCHAR(255),
    source VARCHAR(50) NOT NULL DEFAULT 'BANK_SYNC' CHECK (source IN ('MANUAL', 'BANK_SYNC', 'IMPORT', 'BANK_API')),
    raw_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Ràng buộc & Chỉ mục (Indexes) chống trùng lặp và tăng tốc độ lọc
-- Chống trùng lặp giao dịch theo từng tài khoản và số tham chiếu/bút toán ngân hàng
CREATE UNIQUE INDEX IF NOT EXISTS uq_tx_account_reference 
ON transactions (account_id, reference) 
WHERE reference IS NOT NULL AND reference <> '';

-- Chỉ mục tối ưu tốc độ lọc lịch sử theo thời gian và tài khoản
CREATE INDEX IF NOT EXISTS idx_tx_account_date ON transactions (account_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_tx_user_date ON transactions (user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_active ON bank_accounts (user_id) WHERE deleted_at IS NULL;

-- 6. Trigger tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_bank_accounts_timestamp ON bank_accounts;
CREATE TRIGGER trg_update_bank_accounts_timestamp
    BEFORE UPDATE ON bank_accounts
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trg_update_transactions_timestamp ON transactions;
CREATE TRIGGER trg_update_transactions_timestamp
    BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- =========================================================================
-- HOÀN TẤT KHỞI TẠO CƠ SỞ DỮ LIỆU FINVN
-- =========================================================================
