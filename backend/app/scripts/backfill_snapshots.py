import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.ml_registry import MLRegistry
from backend.app.services.vibe_snapshot_service import create_vibe_snapshot

async def backfill_historical_snapshots(
    db: AsyncSession, 
    models: MLRegistry, 
    days_to_backfill: int = 14
):
    """
    Simulates daily snapshot generation going back X days.
    This populates 'vibe_score_over_time' so charts aren't empty on day one.
    """
    print(f"--- Starting snapshot backfill for the last {days_to_backfill} days ---")
    
    now = datetime.datetime.now(datetime.UTC)
    snapshots_created = 0

    # Step backward through time day-by-day
    for i in range(days_to_backfill - 1, -1, -1):
        target_date = now - datetime.timedelta(days=i)
        
        # Format the date cleanly for the snapshot (e.g., midnight of that day)
        target_date_midnight = datetime.datetime.combine(
            target_date.date(), 
            datetime.time(23, 59, 59), 
            tzinfo=datetime.UTC
        )

        print(f"Generating snapshot for: {target_date_midnight.strftime('%Y-%m-%d')}...")
        
        try:
            # We call your existing logic, passing the historical date
            snapshot = await create_vibe_snapshot(
                db=db,
                models=models,
                snapshot_date=target_date_midnight,
                use_ai_summary=False # Fast calculation for seeding
            )
            
            if snapshot:
                snapshots_created += 1
                print(f"  -> Success! Vibe: {snapshot.vibe_label} ({snapshot.vibe_score})")
            else:
                print("  -> Skipped (Likely insufficient or no data recorded before this date)")
                
        except Exception as e:
            print(f"  -> Error generating snapshot for this day: {e}")

    if snapshots_created > 0:
        await db.commit()
        print(f"--- Backfill complete! Successfully committed {snapshots_created} snapshots. ---")
    else:
        print("--- Backfill complete! No snapshots were generated. ---")