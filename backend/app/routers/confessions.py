from typing import Annotated

import asyncio
import datetime
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db, AsyncSessionLocal
from backend.app.schemas.confession import (
    ConfessionCreate,
    ConfessionBulkItem,
    ConfessionResponse,
)
from backend.app.services import confession_service
from backend.app.services import absa_service
from backend.app.services.vibe_snapshot_service import create_vibe_snapshot

router = APIRouter()


@router.get("", response_model=list[ConfessionResponse])
async def list_confessions(
    offset: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    return await confession_service.get_confessions(db, offset=offset, limit=limit)


@router.post("/import", response_model=list[ConfessionResponse])
async def import_confessions(
    items: list[ConfessionBulkItem],
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    objs = await confession_service.bulk_import_confessions(db, items)

    models = request.app.state.models

    async def _process_imported(confession_ids: list[int]):
        import logging
        async with AsyncSessionLocal() as session:
            processed = 0
            skipped = 0
            for cid in confession_ids:
                try:
                    conf = await confession_service.get_confession_or_404(session, cid)
                    await absa_service.run_absa_for_confession(session, conf, models)
                    await session.commit()
                    processed += 1
                except Exception as e:
                    skipped += 1
                    logging.warning(f"ABSA failed for confession {cid}: {e}")

            logging.info(f"ABSA complete: {processed} processed, {skipped} skipped")

            if confession_ids:
                try:
                    now = datetime.datetime.now(datetime.timezone.utc)
                    await create_vibe_snapshot(session, models, now, use_ai_summary=False)
                    await session.commit()
                except Exception as e:
                    logging.warning(f"Snapshot failed: {e}")

    confession_ids = [o.id for o in objs]
    asyncio.create_task(_process_imported(confession_ids))

    return objs


@router.post("", response_model=ConfessionResponse)
async def create_confession(
    payload: ConfessionCreate,
    db: AsyncSession = Depends(get_db),
):
    return await confession_service.create_confession(db, payload)


@router.get("/{confession_id}", response_model=ConfessionResponse)
async def get_confession(confession_id: int, db: AsyncSession = Depends(get_db)):
    return await confession_service.get_confession_or_404(db, confession_id)
