from __future__ import annotations

import json
import logging
import os
import uuid
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional
from pathlib import Path

import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor

logger = logging.getLogger("finvn.db")

# Nạp cấu hình từ biến môi trường hoặc file backend/.env
env_file = Path(__file__).resolve().parent.parent / ".env"
if env_file.exists():
    with open(env_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "5432"))
DB_NAME = os.getenv("DB_NAME", "finvn_db")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

_pool: Optional[pool.SimpleConnectionPool] = None


def get_connection_pool() -> pool.SimpleConnectionPool:
    global _pool
    if _pool is None or _pool.closed:
        if not DB_PASSWORD:
            raise RuntimeError("DB_PASSWORD is required; configure it in the backend environment.")
        _pool = pool.SimpleConnectionPool(
            minconn=1,
            maxconn=10,
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
        )
    return _pool


def get_db():
    p = get_connection_pool()
    conn = p.getconn()
    try:
        yield conn
    finally:
        p.putconn(conn)


def execute_query(sql: str, params: tuple = (), fetch_all: bool = False, fetch_one: bool = False, commit: bool = False) -> Any:
    p = get_connection_pool()
    conn = p.getconn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params)
            if commit:
                conn.commit()
            if fetch_one:
                return cur.fetchone()
            if fetch_all:
                return cur.fetchall()
            return None
    except Exception as e:
        if commit:
            conn.rollback()
        logger.error("Database query failed (%s)", type(e).__name__)
        raise
    finally:
        p.putconn(conn)


# =========================================================================
# QUẢN LÝ TÀI KHOẢN (ACCOUNTS)
# =========================================================================

def get_or_create_user(user_id: str, username: Optional[str] = None, email: Optional[str] = None, full_name: Optional[str] = None) -> Optional[Dict[str, Any]]:
    if not user_id or user_id == "user-demo":
        return None
    uname = username or user_id
    uemail = email or f"{user_id}@finvn.local"
    fname = full_name or "Người dùng FinVn"
    sql = """
    INSERT INTO users (id, username, email, full_name)
    VALUES (%s, %s, %s, %s)
    ON CONFLICT (id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
    RETURNING *;
    """
    return execute_query(sql, (user_id, uname, uemail, fname), fetch_one=True, commit=True)


def upsert_google_user(user_id: str, email: str, full_name: str, avatar_url: Optional[str] = None) -> Dict[str, Any]:
    sql = """
    INSERT INTO users (id, username, email, full_name, avatar_url)
    VALUES (%s, %s, %s, %s, %s)
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
        updated_at = CURRENT_TIMESTAMP
    RETURNING *;
    """
    return execute_query(sql, (user_id, email, email, full_name, avatar_url), fetch_one=True, commit=True)


def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    sql = "SELECT id, username, email, full_name, avatar_url, created_at FROM users WHERE id = %s LIMIT 1;"
    return execute_query(sql, (user_id,), fetch_one=True)


def get_accounts(user_id: str = "user-demo") -> List[Dict[str, Any]]:
    sql = """
    SELECT * FROM bank_accounts
    WHERE user_id = %s AND deleted_at IS NULL
    ORDER BY created_at ASC;
    """
    return execute_query(sql, (user_id,), fetch_all=True)


def get_account_by_number(account_number: str, user_id: str = "user-demo") -> Optional[Dict[str, Any]]:
    sql = """
    SELECT * FROM bank_accounts
    WHERE user_id = %s AND account_number = %s AND deleted_at IS NULL
    LIMIT 1;
    """
    return execute_query(sql, (user_id, account_number.strip()), fetch_one=True)


def get_account_by_id(account_id: str, user_id: str = "user-demo") -> Optional[Dict[str, Any]]:
    sql = """
    SELECT * FROM bank_accounts
    WHERE id = %s AND user_id = %s AND deleted_at IS NULL
    LIMIT 1;
    """
    return execute_query(sql, (account_id, user_id), fetch_one=True)


def save_bank_credential(user_id: str, account_id: str, encrypted: Any) -> None:
    execute_query("""INSERT INTO bank_credentials (account_id, user_id, key_id, nonce, ciphertext, tag)
        SELECT %s, %s, %s, %s, %s, %s
        WHERE EXISTS (SELECT 1 FROM bank_accounts WHERE id = %s AND user_id = %s AND deleted_at IS NULL)
        ON CONFLICT (account_id) DO UPDATE SET user_id = EXCLUDED.user_id, key_id = EXCLUDED.key_id,
        nonce = EXCLUDED.nonce, ciphertext = EXCLUDED.ciphertext, tag = EXCLUDED.tag, updated_at = CURRENT_TIMESTAMP""",
        (account_id, user_id, encrypted.key_id, encrypted.nonce, encrypted.ciphertext, encrypted.tag, account_id, user_id), commit=True)


def get_bank_credential(user_id: str, account_id: str) -> Optional[Dict[str, Any]]:
    return execute_query("SELECT key_id, nonce, ciphertext, tag FROM bank_credentials WHERE user_id = %s AND account_id = %s",
                         (user_id, account_id), fetch_one=True)


def upsert_account(
    user_id: str,
    bank_name: str,
    display_name: str,
    account_number: str,
    current_balance: int,
    initial_balance: Optional[int] = None,
    color: Optional[str] = "#10b981",
    created_at: Optional[Any] = None,
) -> Dict[str, Any]:
    get_or_create_user(user_id)
    existing = get_account_by_number(account_number, user_id)
    
    if existing:
        account_id = existing["id"]
        sql = """
        UPDATE bank_accounts
        SET bank_name = %s,
            display_name = %s,
            current_balance = %s,
            color = COALESCE(%s, color),
            created_at = COALESCE(%s::timestamptz, created_at),
            last_synced_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = %s
        RETURNING *;
        """
        return execute_query(sql, (bank_name, display_name, current_balance, color, created_at, account_id), fetch_one=True, commit=True)
    else:
        account_id = f"acc-{uuid.uuid4().hex[:12]}"
        init_bal = initial_balance if initial_balance is not None else current_balance
        sql = """
        INSERT INTO bank_accounts (
            id, user_id, bank_name, display_name, account_number, 
            initial_balance, current_balance, color, last_synced_at, created_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, COALESCE(%s::timestamptz, CURRENT_TIMESTAMP))
        RETURNING *;
        """
        return execute_query(
            sql,
            (account_id, user_id, bank_name, display_name, account_number.strip(), init_bal, current_balance, color, created_at),
            fetch_one=True,
            commit=True,
        )


def soft_delete_account(account_id: str, user_id: str = "user-demo") -> bool:
    sql = """
    UPDATE bank_accounts
    SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = %s AND user_id = %s
    """
    result = execute_query(sql + " RETURNING id;", (account_id, user_id), fetch_one=True, commit=True)
    return bool(result)


def update_account(account_id: str, user_id: str, values: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    return execute_query("""UPDATE bank_accounts SET bank_name=COALESCE(%s,bank_name), display_name=COALESCE(%s,display_name),
        current_balance=COALESCE(%s,current_balance), initial_balance=COALESCE(%s,initial_balance), color=COALESCE(%s,color),
        updated_at=CURRENT_TIMESTAMP WHERE id=%s AND user_id=%s AND deleted_at IS NULL RETURNING *""",
        (values.get("bank_name"), values.get("display_name"), values.get("current_balance"), values.get("initial_balance"),
         values.get("color"), account_id, user_id), fetch_one=True, commit=True)


def create_manual_transaction(user_id: str, account_id: str, amount: int, tx_type: str, category: str,
                              description: str, user_note: Optional[str], transaction_date: datetime) -> Optional[Dict[str, Any]]:
    if amount <= 0 or tx_type not in ("INCOME", "EXPENSE"):
        raise ValueError("Invalid amount or type")
    p = get_connection_pool(); conn = p.getconn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT id FROM bank_accounts WHERE id=%s AND user_id=%s AND deleted_at IS NULL FOR UPDATE", (account_id, user_id))
            if not cur.fetchone(): return None
            delta = amount if tx_type == "INCOME" else -amount
            cur.execute("UPDATE bank_accounts SET current_balance=current_balance+%s,updated_at=CURRENT_TIMESTAMP WHERE id=%s AND user_id=%s", (delta, account_id, user_id))
            cur.execute("""INSERT INTO transactions(id,user_id,account_id,amount,type,category,user_category,description,user_note,transaction_date,source)
                VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'MANUAL') RETURNING *""",
                (f"tx-{uuid.uuid4().hex[:14]}", user_id, account_id, amount, tx_type, category, category, description, user_note, transaction_date))
            result = cur.fetchone()
        conn.commit(); return result
    except Exception:
        conn.rollback(); raise
    finally:
        p.putconn(conn)


def delete_transaction(tx_id: str, user_id: str) -> bool:
    p = get_connection_pool(); conn = p.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT account_id,amount,type FROM transactions WHERE id=%s AND user_id=%s FOR UPDATE", (tx_id, user_id))
            row = cur.fetchone()
            if not row: return False
            account_id, amount, tx_type = row
            delta = -amount if tx_type == "INCOME" else amount
            cur.execute("UPDATE bank_accounts SET current_balance=current_balance+%s,updated_at=CURRENT_TIMESTAMP WHERE id=%s AND user_id=%s", (delta, account_id, user_id))
            cur.execute("DELETE FROM transactions WHERE id=%s AND user_id=%s", (tx_id, user_id))
        conn.commit(); return True
    except Exception:
        conn.rollback(); raise
    finally:
        p.putconn(conn)


# =========================================================================
# ĐỒNG BỘ GIA TĂNG (INCREMENTAL SYNC) & QUẢN LÝ GIAO DỊCH
# =========================================================================

def get_latest_transaction_date(account_id: str) -> Optional[date]:
    """
    Tìm ngày giao dịch mới nhất đã có trong cơ sở dữ liệu của tài khoản này.
    Nếu có: dùng làm mốc bắt đầu đồng bộ gia tăng (lấy từ ngày đó đến nay).
    Nếu chưa có: trả về None (cần đồng bộ ban đầu 30-90 ngày).
    """
    sql = """
    SELECT transaction_date FROM transactions
    WHERE account_id = %s
    ORDER BY transaction_date DESC
    LIMIT 1;
    """
    row = execute_query(sql, (account_id,), fetch_one=True)
    if row and row.get("transaction_date"):
        dt = row["transaction_date"]
        if isinstance(dt, datetime):
            return dt.date()
        if isinstance(dt, date):
            return dt
    return None


def parse_tx_date(val: Any) -> datetime:
    if isinstance(val, datetime):
        return val
    if isinstance(val, date):
        return datetime.combine(val, datetime.min.time())
    
    val_str = str(val).strip()
    if not val_str or val_str.lower() in ("none", "null"):
        raise ValueError("Missing transaction date")

    # 1. Thử phân tích định dạng ISO 8601 (hỗ trợ cả đuôi Z và múi giờ +07:00)
    clean_iso = val_str.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(clean_iso)
    except (ValueError, TypeError):
        pass

    # 2. Thử nếu là timestamp dạng số (milliseconds hoặc seconds)
    try:
        if val_str.isdigit():
            ts = int(val_str)
            if ts > 10_000_000_000:  # milliseconds
                return datetime.fromtimestamp(ts / 1000)
            return datetime.fromtimestamp(ts)
    except Exception:
        pass

    # 3. Các định dạng ngân hàng VN thường dùng
    formats = [
        "%d/%m/%Y %H:%M:%S",
        "%d/%m/%Y %H:%M",
        "%d/%m/%Y",
        "%d-%m-%Y %H:%M:%S",
        "%d-%m-%Y %H:%M",
        "%d-%m-%Y",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%S.%f",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(val_str, fmt)
        except ValueError:
            pass

    raise ValueError(f"Unsupported transaction date format: {val_str!r}")


def save_transactions(user_id: str, account_id: str, transactions: List[Dict[str, Any]]) -> int:
    """
    Lưu danh sách giao dịch ngân hàng vào PostgreSQL với cơ chế chống trùng lặp:
    1. Nếu có reference: Dùng Unique Index (account_id, reference). Cập nhật ngày và số tiền nếu có thay đổi.
    2. Nếu không có reference: Kiểm tra khớp (account_id, amount, date, description).
    Trả về số lượng giao dịch MỚI/CẬP NHẬT được xử lý.
    """
    if not transactions:
        return 0

    p = get_connection_pool()
    conn = p.getconn()
    inserted_count = 0

    try:
        with conn.cursor() as cur:
            for tx in transactions:
                tx_id = f"tx-{uuid.uuid4().hex[:14]}"
                amount = int(tx.get("amount") or 0)
                if amount <= 0:
                    continue

                tx_type = tx.get("type", "EXPENSE")
                desc = tx.get("description") or ""
                ref = (tx.get("reference") or "").strip() or None
                tx_date_value = tx.get("transaction_date")
                source_raw_data = tx.get("raw_data") or {}
                if not tx_date_value and isinstance(source_raw_data, dict):
                    raw_date_fields = {str(key).lower(): value for key, value in source_raw_data.items()}
                    tx_date_value = next((
                        raw_date_fields[key]
                        for key in (
                            "transactiondate", "transaction_date", "transactiondatetime", "transaction_date_time",
                            "transdate", "trans_date", "trandate", "tran_date", "txndate", "txn_date",
                            "txndatetime", "postingdate", "posting_date", "date",
                        )
                        if raw_date_fields.get(key) not in (None, "")
                    ), None)
                try:
                    tx_date = parse_tx_date(tx_date_value)
                except (ValueError, TypeError, OverflowError) as date_error:
                    logger.warning("Skipping bank transaction with invalid date (reference=%s): %s", ref, date_error)
                    continue
                category = tx.get("category")
                user_category = tx.get("user_category")
                user_note = tx.get("user_note")
                source = tx.get("source", "BANK_SYNC")
                if source not in ("MANUAL", "BANK_SYNC", "IMPORT", "BANK_API"):
                    source = "BANK_SYNC"
                raw_data = json.dumps(source_raw_data)

                if ref:
                    # Giao dịch có mã tham chiếu ngân hàng: Cập nhật ngày chính xác nếu bị sai ngày
                    sql = """
                    INSERT INTO transactions (
                        id, user_id, account_id, amount, type, category, 
                        user_category, description, user_note, transaction_date, 
                        reference, source, raw_data
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (account_id, reference) WHERE reference IS NOT NULL AND reference <> ''
                    DO UPDATE SET 
                        transaction_date = EXCLUDED.transaction_date,
                        amount = EXCLUDED.amount,
                        description = EXCLUDED.description
                    RETURNING id;
                    """
                    cur.execute(sql, (
                        tx_id, user_id, account_id, amount, tx_type, category,
                        user_category, desc, user_note, tx_date, ref, source, raw_data
                    ))
                    if cur.fetchone():
                        inserted_count += 1
                else:
                    # Không có mã tham chiếu: nếu chỉ có duy nhất một giao dịch cùng tài khoản,
                    # số tiền, loại và nội dung thì cập nhật ngày để sửa dữ liệu nhập sai trước đó.
                    match_sql = """
                    SELECT id FROM transactions
                    WHERE account_id = %s
                      AND amount = %s
                      AND type = %s
                      AND description = %s
                      AND (reference IS NULL OR reference = '')
                    LIMIT 2;
                    """
                    cur.execute(match_sql, (account_id, amount, tx_type, desc))
                    matching_rows = cur.fetchall()
                    if len(matching_rows) == 1:
                        cur.execute("""
                            UPDATE transactions
                            SET transaction_date = %s,
                                amount = %s,
                                description = %s,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id = %s;
                        """, (tx_date, amount, desc, matching_rows[0][0]))
                        inserted_count += 1
                        continue

                    # Nếu không thể khớp duy nhất, tránh chèn nếu đã có bản ghi cùng ngày.
                    check_sql = """
                    SELECT id FROM transactions
                    WHERE account_id = %s 
                      AND amount = %s 
                      AND DATE(transaction_date) = DATE(%s)
                      AND description = %s
                    LIMIT 1;
                    """
                    cur.execute(check_sql, (account_id, amount, tx_date, desc))
                    if not cur.fetchone():
                        insert_sql = """
                        INSERT INTO transactions (
                            id, user_id, account_id, amount, type, category, 
                            user_category, description, user_note, transaction_date, 
                            reference, source, raw_data
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
                        """
                        cur.execute(insert_sql, (
                            tx_id, user_id, account_id, amount, tx_type, category,
                            user_category, desc, user_note, tx_date, None, source, raw_data
                        ))
                        inserted_count += 1

            # Cập nhật thời điểm đồng bộ của tài khoản
            cur.execute("""
                UPDATE bank_accounts 
                SET last_synced_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
                WHERE id = %s;
            """, (account_id,))

            conn.commit()
            return inserted_count
    except Exception as e:
        conn.rollback()
        logger.error(f"Error saving transactions: {e}")
        raise e
    finally:
        p.putconn(conn)


def get_transactions(
    user_id: str = "user-demo",
    account_id: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    limit: int = 500,
) -> List[Dict[str, Any]]:
    conditions = ["t.user_id = %s"]
    params: List[Any] = [user_id]

    if account_id and account_id != "ALL":
        conditions.append("t.account_id = %s")
        params.append(account_id)

    if from_date:
        conditions.append("t.transaction_date >= %s")
        params.append(datetime.combine(from_date, datetime.min.time()))

    if to_date:
        conditions.append("t.transaction_date <= %s")
        params.append(datetime.combine(to_date, datetime.max.time()))

    where_clause = " AND ".join(conditions)

    sql = f"""
    SELECT 
        t.id, t.user_id, t.account_id, t.amount, t.type, t.category,
        t.user_category, t.description, t.user_note, t.transaction_date,
        t.reference, t.source, t.raw_data, t.created_at, t.updated_at,
        b.bank_name, b.display_name as account_name, b.account_number, b.color as account_color
    FROM transactions t
    JOIN bank_accounts b ON t.account_id = b.id
    WHERE {where_clause}
    ORDER BY t.transaction_date DESC
    LIMIT %s;
    """
    params.append(limit)
    rows = execute_query(sql, tuple(params), fetch_all=True)

    # Format ngày giờ trả về ISO string cho frontend
    for r in rows:
        if isinstance(r.get("transaction_date"), (datetime, date)):
            r["transaction_date"] = r["transaction_date"].isoformat()
        if isinstance(r.get("created_at"), datetime):
            r["created_at"] = r["created_at"].isoformat()
        if isinstance(r.get("updated_at"), datetime):
            r["updated_at"] = r["updated_at"].isoformat()

    return rows


def update_transaction(tx_id: str, user_id: str = "user-demo", user_category: Optional[str] = None, user_note: Optional[str] = None) -> Optional[Dict[str, Any]]:
    sql = """
    UPDATE transactions
    SET user_category = COALESCE(%s, user_category),
        user_note = COALESCE(%s, user_note),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = %s AND user_id = %s
    RETURNING *;
    """
    return execute_query(sql, (user_category, user_note, tx_id, user_id), fetch_one=True, commit=True)
