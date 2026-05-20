"""Reset or create the superadmin password for VibeCheck.

Usage:
    python -m backend.app.scripts.reset_superadmin_password --password NewPass123!

Optional:
    python -m backend.app.scripts.reset_superadmin_password --username superadmin --password NewPass123! --create-if-missing
"""

import argparse
import asyncio

from sqlalchemy import select

from backend.app.core.constants import PROJECT_ROOT, SUPERADMIN_ROLE
from backend.app.core.database import AsyncSessionLocal, Base, engine
from backend.app.core.security import hash_password
from backend.app.models.user import User


DEFAULT_USERNAME = "superadmin"
DEFAULT_PASSWORD = "SuperAdmin123!"
DB_FILE = PROJECT_ROOT / "vibeCheck.db"


async def reset_superadmin_password(
    username: str,
    password: str,
    create_if_missing: bool,
) -> None:
    if DB_FILE.exists():
        print(f"Using database: {DB_FILE}")
    else:
        print(f"Database file not found: {DB_FILE}")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(User).where(User.role == SUPERADMIN_ROLE)
        )
        user = result.scalars().first()

        hashed = hash_password(password)

        if user is None:
            if not create_if_missing:
                print("No superadmin exists. Use --create-if-missing to create one.")
                return

            user = User(
                username=username,
                firstname="Super",
                lastname="Admin",
                role=SUPERADMIN_ROLE,
                hashed_password=hashed,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
            print("Created superadmin with new password.")
        else:
            user.hashed_password = hashed
            await db.commit()
            await db.refresh(user)
            print("Updated superadmin password.")

        print(f"username: {user.username}")
        print(f"password: {password}")
        print("Login via /api/auth/login with the new password.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Reset or create the superadmin password for VibeCheck."
    )
    parser.add_argument(
        "--username",
        default=DEFAULT_USERNAME,
        help="Superadmin username (default: superadmin)",
    )
    parser.add_argument(
        "--password",
        default=DEFAULT_PASSWORD,
        help="New superadmin password (default: SuperAdmin123!)",
    )
    parser.add_argument(
        "--create-if-missing",
        action="store_true",
        help="Create the superadmin account if it does not already exist",
    )
    return parser.parse_args()


async def main() -> None:
    args = parse_args()
    await reset_superadmin_password(
        username=args.username,
        password=args.password,
        create_if_missing=args.create_if_missing,
    )


if __name__ == "__main__":
    asyncio.run(main())
