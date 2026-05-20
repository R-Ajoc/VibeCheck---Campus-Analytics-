import hashlib
import hmac
import secrets

from backend.app.core.constants import PASSWORD_HASH_ITERATIONS


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        PASSWORD_HASH_ITERATIONS,
    )
    return f"{salt}${key.hex()}"


def verify_password(password: str, hashed_password: str) -> bool:
    try:
        salt, stored_key = hashed_password.split("$", 1)
    except ValueError:
        return False

    key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        PASSWORD_HASH_ITERATIONS,
    )
    return hmac.compare_digest(key.hex(), stored_key)


def generate_access_token() -> str:
    return secrets.token_urlsafe(32)