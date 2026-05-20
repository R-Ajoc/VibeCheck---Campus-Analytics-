from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.confession import Confession
from backend.app.schemas.confession import ConfessionCreate


async def create_confession(db: AsyncSession, payload: ConfessionCreate) -> Confession:
    conf = Confession(
        content=payload.content,
        original_content=payload.original_content,
        source=payload.source,
        language=payload.language,
        post_date=payload.post_date,
    )

    db.add(conf)
    await db.commit()
    await db.refresh(conf)

    return conf


async def bulk_import_confessions(db: AsyncSession, items: list[ConfessionCreate]) -> list[Confession]:
    objs = []
    for payload in items:
        objs.append(
            Confession(
                content=payload.content,
                original_content=payload.original_content,
                source=payload.source,
                language=payload.language,
                post_date=payload.post_date,
            )
        )

    db.add_all(objs)
    await db.commit()

    # refresh each
    for o in objs:
        await db.refresh(o)

    return objs


async def get_confession_or_404(db: AsyncSession, confession_id: int) -> Confession:
    result = await db.execute(select(Confession).where(Confession.id == confession_id))
    conf = result.scalars().first()

    if not conf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Confession not found")

    return conf


async def get_confessions(db: AsyncSession, offset: int = 0, limit: int = 50) -> list[Confession]:
    result = await db.execute(select(Confession).order_by(Confession.post_date.desc()).offset(offset).limit(limit))
    return result.scalars().all()
