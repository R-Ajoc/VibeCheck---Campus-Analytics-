# This module manages Vibe Snapshots, which are periodic aggregated summaries
# of the institution's confession sentiment at a point in time.
# business_id removed — snapshots are now institution-wide.

import datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.ml_registry import MLRegistry
from backend.app.models.vibe_snapshot import VibeSnapshot
from backend.app.services.vibe_service import (
    compute_vibe_summary,
    convert_sentiment_to_vibe_score,
)


async def get_vibe_snapshot_or_404(
    db: AsyncSession,
    snapshot_id: int,
) -> VibeSnapshot:
    """
    Fetch a single vibe snapshot by ID or raise 404 if not found.
    """
    result = await db.execute(
        select(VibeSnapshot).where(VibeSnapshot.id == snapshot_id)
    )

    snapshot = result.scalars().first()

    if not snapshot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vibe Snapshot not found",
        )

    return snapshot


async def get_all_vibe_snapshots(
    db: AsyncSession,
) -> list[VibeSnapshot]:
    """
    Retrieve all institution snapshots ordered by newest first.
    Replaces get_vibe_snapshots_for_business — no business_id filter.
    """
    result = await db.execute(
        select(VibeSnapshot)
        .order_by(VibeSnapshot.snapshot_date.desc())
    )

    return result.scalars().all()


async def create_vibe_snapshot(
    db: AsyncSession,
    models: MLRegistry,
    snapshot_date: datetime.datetime,
    use_ai_summary: bool = False,
) -> VibeSnapshot | None:
    """
    Generate and persist a single vibe snapshot from computed confession analytics.
    business_id removed — institution-wide snapshot.
    """
    # compute aggregated sentiment + summary at the given point in time
    data = await compute_vibe_summary(
        db,
        models,
        as_of_date=snapshot_date,
        allow_insufficient_data=True,
        use_ai_summary=use_ai_summary,
    )

    # skip snapshot creation if there is no usable data
    if data.get("status") == "insufficient_data":
        return None

    snapshot = VibeSnapshot(
        # business_id removed — set to None or remove from model later
        vibe_score=convert_sentiment_to_vibe_score(data["avg_score"]),
        vibe_label=data["vibe_label"],
        review_count=data["review_count"],
        positive_count=data["score_distribution"]["positive"],
        negative_count=data["score_distribution"]["negative"],
        summary_text=data["summary_text"],
        snapshot_date=snapshot_date,
    )

    db.add(snapshot)
    await db.flush()

    return snapshot


async def get_latest_vibe_snapshot(db: AsyncSession) -> VibeSnapshot | None:
    """
    Retrieve the most recent institution snapshot.
    business_id removed — institution-wide.
    """
    result = await db.execute(
        select(VibeSnapshot)
        .order_by(VibeSnapshot.snapshot_date.desc())
        .limit(1)
    )

    return result.scalars().first()


async def run_vibe_snapshot_pipeline(
    db: AsyncSession,
    models: MLRegistry,
    snapshot_date: datetime.datetime,
    use_ai_summary: bool = False,
) -> VibeSnapshot | None:
    """
    Executes full snapshot pipeline: compute + persist + commit.
    business_id removed — institution-wide.
    """
    snapshot = await create_vibe_snapshot(
        db,
        models,
        snapshot_date,
        use_ai_summary,
    )

    if snapshot:
        await db.commit()
        await db.refresh(snapshot)

    return snapshot