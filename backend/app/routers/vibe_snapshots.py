from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.schemas.vibe_snapshot import VibeSnapshotResponse
from backend.app.services import vibe_snapshot_service

router = APIRouter()


@router.get("", response_model=list[VibeSnapshotResponse])
async def get_vibe_snapshots(db: Annotated[AsyncSession, Depends(get_db)]):
    return await vibe_snapshot_service.get_all_vibe_snapshots(db)


@router.get("/{snapshot_id}", response_model=VibeSnapshotResponse)
async def get_vibe_snapshot(snapshot_id: int, db: Annotated[AsyncSession, Depends(get_db)]):
    return await vibe_snapshot_service.get_vibe_snapshot_or_404(db, snapshot_id)


@router.get("/latest", response_model=VibeSnapshotResponse)
async def get_latest_vibe_snapshot(db: Annotated[AsyncSession, Depends(get_db)]):
    return await vibe_snapshot_service.get_latest_vibe_snapshot(db)