import asyncio
from backend.app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def reset():
    async with AsyncSessionLocal() as db:
        await db.execute(text("DELETE FROM aspect_sentiments;"))
        await db.execute(text("DELETE FROM vibe_snapshots;"))
        await db.execute(text("DELETE FROM confessions;"))
        await db.commit()
        print("Database cleared successfully!")

if __name__ == "__main__":
    asyncio.run(reset())