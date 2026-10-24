from __future__ import annotations

import base64
import json
import os
import secrets
from dataclasses import dataclass

from Crypto.Cipher import AES


@dataclass(frozen=True)
class EncryptedCredential:
    key_id: str
    nonce: bytes
    ciphertext: bytes
    tag: bytes


def _keyring() -> tuple[str, dict[str, bytes]]:
    value = os.getenv("BANK_CREDENTIALS_KEYRING", "")
    keys: dict[str, bytes] = {}
    for item in value.split(","):
        if not item.strip():
            continue
        key_id, separator, encoded = item.partition(":")
        if not separator:
            raise RuntimeError("Invalid BANK_CREDENTIALS_KEYRING format")
        key = base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4))
        if len(key) != 32:
            raise RuntimeError("Bank credential encryption keys must be 32 bytes")
        keys[key_id] = key
    active = os.getenv("BANK_CREDENTIALS_ACTIVE_KEY", "")
    if not keys or active not in keys:
        raise RuntimeError("Configure BANK_CREDENTIALS_KEYRING and BANK_CREDENTIALS_ACTIVE_KEY")
    return active, keys


def encrypt_bank_credentials(user_id: str, account_id: str, value: dict) -> EncryptedCredential:
    active, keys = _keyring()
    nonce = secrets.token_bytes(12)
    cipher = AES.new(keys[active], AES.MODE_GCM, nonce=nonce)
    cipher.update(f"{user_id}:{account_id}".encode())
    ciphertext, tag = cipher.encrypt_and_digest(json.dumps(value).encode())
    return EncryptedCredential(active, nonce, ciphertext, tag)


def decrypt_bank_credentials(user_id: str, account_id: str, key_id: str, nonce: bytes, ciphertext: bytes, tag: bytes) -> dict:
    _, keys = _keyring()
    key = keys.get(key_id)
    if key is None:
        raise RuntimeError("Encryption key version unavailable")
    cipher = AES.new(key, AES.MODE_GCM, nonce=bytes(nonce))
    cipher.update(f"{user_id}:{account_id}".encode())
    return json.loads(cipher.decrypt_and_verify(bytes(ciphertext), bytes(tag)))
