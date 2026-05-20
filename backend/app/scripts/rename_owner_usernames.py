"""Rename all owner usernames sequentially.

Usage:
    python -m backend.app.scripts.rename_owner_usernames

Optional:
    python -m backend.app.scripts.rename_owner_usernames --base ralphskie --start 1
"""

import argparse
import asyncio
import uuid

from sqlalchemy import select

from backend.app.core.database import AsyncSessionLocal
from backend.app.models.user import User


async def rename_owner_usernames(base: str, start: int) -> None:
    async with AsyncSessionLocal() as db:
        owner_result = await db.execute(
            select(User).where(User.role == "owner").order_by(User.id.asc())
        )
        owners = owner_result.scalars().all()

        if not owners:
            print("No owners found. Nothing to rename.")
            return

        all_users_result = await db.execute(select(User.username))
        all_usernames = {row[0] for row in all_users_result.all() if row[0]}

        owner_ids = {owner.id for owner in owners}
        owner_username_result = await db.execute(
            select(User.id, User.username).where(User.id.in_(owner_ids))
        )
        owner_username_map = {row[0]: row[1] for row in owner_username_result.all()}

        # Usernames currently occupied by non-owners must never be reused.
        taken_by_non_owners = set(all_usernames) - {
            username for username in owner_username_map.values() if username
        }

        mapping: dict[int, str] = {}
        used_targets: set[str] = set()
        n = start

        for owner in owners:
            while True:
                candidate = f"{base}{n}"
                n += 1

                if candidate in taken_by_non_owners:
                    continue
                if candidate in used_targets:
                    continue

                mapping[owner.id] = candidate
                used_targets.add(candidate)
                break

        # Two-phase rename prevents collisions during updates.
        temp_prefix = "__tmp_owner_rename__"
        for owner in owners:
            owner.username = f"{temp_prefix}{owner.id}_{uuid.uuid4().hex[:8]}"
        await db.flush()

        for owner in owners:
            owner.username = mapping[owner.id]

        await db.commit()

        print(f"Renamed {len(owners)} owner usernames:")
        for owner in owners:
            print(f"  owner_id={owner.id} -> {mapping[owner.id]}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Rename all owner usernames sequentially."
    )
    parser.add_argument(
        "--base",
        default="ralphskie",
        help="Base prefix for usernames (default: ralphskie)",
    )
    parser.add_argument(
        "--start",
        type=int,
        default=1,
        help="Starting number suffix (default: 1)",
    )
    return parser.parse_args()


async def main() -> None:
    args = parse_args()

    if args.start < 1:
        raise ValueError("--start must be >= 1")

    await rename_owner_usernames(base=args.base, start=args.start)


if __name__ == "__main__":
    asyncio.run(main())
