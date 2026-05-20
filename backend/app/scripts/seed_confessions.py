"""Seed sample confession data into the VibeCheck database.

Usage:
    python -m backend.app.scripts.seed_confessions

Behavior:
- Does NOT delete existing data — only adds new confessions on top.
- Runs ABSA on each inserted confession immediately.
- Generates one vibe snapshot per month covered by the seeded data.
"""

import asyncio
import calendar
from datetime import datetime, timezone

from sentence_transformers import SentenceTransformer
from transformers import pipeline

from backend.app.core.aspects import ASPECTS
from backend.app.core.database import AsyncSessionLocal, Base, engine
from backend.app.core.ml_registry import MLRegistry
from backend.app.models.confession import Confession
from backend.app.services import absa_service
from backend.app.services.vibe_snapshot_service import create_vibe_snapshot


SAMPLE_CONFESSIONS = [
    # January 2026
    {
        "content": "Enrolling this semester was a nightmare. The lines at the registrar were unbearably long and nobody could give clear answers about my schedule.",
        "original_content": "Enrolling this semester was a nightmare. The lines at the registrar were long and nobody could give clear answers.",
        "source": "scraped",
        "language": "en",
        "post_date": datetime(2026, 1, 8, 9, 0, tzinfo=timezone.utc),
    },
    {
        "content": "The canteen was closed for renovation during the first week of classes. Had to walk far just to find something to eat. Really inconvenient timing.",
        "original_content": "The canteen was closed for renovation during the first week of classes. Had to walk far just to find food.",
        "source": "imported",
        "language": "en",
        "post_date": datetime(2026, 1, 12, 12, 0, tzinfo=timezone.utc),
    },
    {
        "content": "Most of my professors introduced themselves really well and gave clear syllabi. I feel like this semester has a solid start academically.",
        "original_content": "Most professors introduced themselves well and gave clear syllabi. Solid academic start.",
        "source": "scraped",
        "language": "en",
        "post_date": datetime(2026, 1, 20, 15, 30, tzinfo=timezone.utc),
    },
    {
        "content": "The shuttle service to campus runs way too infrequently in the morning. I was late to my first class because of it.",
        "original_content": "The shuttle runs too infrequently in the morning. Was late to my first class because of it.",
        "source": "scraped",
        "language": "en",
        "post_date": datetime(2026, 1, 25, 8, 0, tzinfo=timezone.utc),
    },
    # February 2026
    {
        "content": "The campus grounds are really beautiful and well kept. I love studying near the garden. It makes stressful days feel a little more bearable.",
        "original_content": "Campus grounds are beautiful and well kept. Studying near the garden makes stressful days bearable.",
        "source": "scraped",
        "language": "en",
        "post_date": datetime(2026, 2, 5, 10, 0, tzinfo=timezone.utc),
    },
    {
        "content": "I had an issue with my tuition billing and the finance office took three visits to fix something that should have been simple. Very exhausting.",
        "original_content": "Had a tuition billing issue. Finance office took three visits to fix something simple.",
        "source": "imported",
        "language": "en",
        "post_date": datetime(2026, 2, 11, 14, 0, tzinfo=timezone.utc),
    },
    {
        "content": "My professor in data structures is genuinely one of the best teachers I have had. Clear, patient, and always checks if everyone understands.",
        "original_content": "My data structures professor is one of the best. Clear, patient, always checks comprehension.",
        "source": "scraped",
        "language": "en",
        "post_date": datetime(2026, 2, 14, 9, 30, tzinfo=timezone.utc),
    },
    {
        "content": "The comfort rooms near the gym are always dirty and smell awful. It does not look like they are being cleaned regularly. Really off-putting.",
        "original_content": "Comfort rooms near the gym are always dirty and smell awful. Not cleaned regularly.",
        "source": "scraped",
        "language": "en",
        "post_date": datetime(2026, 2, 20, 16, 0, tzinfo=timezone.utc),
    },
    {
        "content": "Mental health support on campus is seriously lacking. I went to the guidance office and was told to just come back next week. Not helpful at all.",
        "original_content": "Mental health support is lacking. Guidance office told me to come back next week.",
        "source": "imported",
        "language": "en",
        "post_date": datetime(2026, 2, 26, 11, 0, tzinfo=timezone.utc),
    },
    # March 2026
    {
        "content": "The midterm period is absolutely brutal this year. Three major exams in two days with no coordination from admin. Should be planned better.",
        "original_content": "Midterm period is brutal. Three major exams in two days with no admin coordination.",
        "source": "scraped",
        "language": "en",
        "post_date": datetime(2026, 3, 3, 8, 0, tzinfo=timezone.utc),
    },
    {
        "content": "The cafeteria added new food options this month and quality noticeably improved. Prices are still high for students on a tight budget though.",
        "original_content": "Cafeteria added new food options and quality improved. Prices still high for budget students.",
        "source": "scraped",
        "language": "en",
        "post_date": datetime(2026, 3, 10, 13, 0, tzinfo=timezone.utc),
    },
    {
        "content": "I appreciate how the admin staff in the department office actually respond to emails now. It was not like that last year. Big improvement.",
        "original_content": "Admin staff now respond to emails. Was not the case last year. Big improvement.",
        "source": "imported",
        "language": "en",
        "post_date": datetime(2026, 3, 15, 10, 30, tzinfo=timezone.utc),
    },
    {
        "content": "Parking near the main building is a daily nightmare. Students who commute by car have nowhere to park safely. Needs to be addressed.",
        "original_content": "Parking near the main building is a nightmare. No safe parking for commuter students.",
        "source": "scraped",
        "language": "en",
        "post_date": datetime(2026, 3, 22, 7, 45, tzinfo=timezone.utc),
    },
    # April 2026
    {
        "content": "The new study pods in the library are a great addition. Quiet, well lit, and spacious enough for group work. Finally a place to actually focus.",
        "original_content": "New study pods in the library are great. Quiet, well lit, spacious enough for group work.",
        "source": "scraped",
        "language": "en",
        "post_date": datetime(2026, 4, 2, 9, 0, tzinfo=timezone.utc),
    },
    {
        "content": "Some professors seem completely disengaged. They just read from slides and dismiss questions. The contrast with actually good professors is glaring.",
        "original_content": "Some professors are disengaged. Read from slides and dismiss questions.",
        "source": "imported",
        "language": "en",
        "post_date": datetime(2026, 4, 8, 14, 0, tzinfo=timezone.utc),
    },
    {
        "content": "Miscellaneous fees keep appearing in my account without any explanation. When I asked the cashier they could not tell me what half of them were for.",
        "original_content": "Miscellaneous fees appear without explanation. Cashier could not explain what they were for.",
        "source": "scraped",
        "language": "en",
        "post_date": datetime(2026, 4, 14, 11, 0, tzinfo=timezone.utc),
    },
    {
        "content": "The intramural sports week was a highlight this semester. The campus felt alive and energetic. Events like this really build school spirit.",
        "original_content": "Intramural sports week was a highlight. Campus felt alive and energetic. Builds school spirit.",
        "source": "scraped",
        "language": "en",
        "post_date": datetime(2026, 4, 20, 17, 0, tzinfo=timezone.utc),
    },
    {
        "content": "Overall campus experience this semester has been mixed. Some things are improving but cleanliness and service speed remain unaddressed.",
        "original_content": "Campus experience is mixed. Some improvements but cleanliness and service speed are still issues.",
        "source": "imported",
        "language": "en",
        "post_date": datetime(2026, 4, 28, 10, 0, tzinfo=timezone.utc),
    },
    # May 2026
    {
        "content": "Finals season and the library is so crowded there are students sitting on the floor. Extended hours or more seating would help a lot.",
        "original_content": "Library is packed during finals. Students sitting on the floor. Extended hours would help.",
        "source": "scraped",
        "language": "en",
        "post_date": datetime(2026, 5, 5, 8, 30, tzinfo=timezone.utc),
    },
    {
        "content": "The air conditioning in the main lecture hall has been broken for two weeks. Sitting through a two-hour class in that heat is genuinely unbearable.",
        "original_content": "AC in the main lecture hall broken for two weeks. Two-hour class in that heat is unbearable.",
        "source": "scraped",
        "language": "en",
        "post_date": datetime(2026, 5, 10, 13, 0, tzinfo=timezone.utc),
    },
    {
        "content": "My adviser was incredibly helpful during pre-enrollment. She took time to walk through my options and made sure I was on track for graduation.",
        "original_content": "My adviser was very helpful during pre-enrollment. Walked me through options and confirmed I am on track.",
        "source": "imported",
        "language": "en",
        "post_date": datetime(2026, 5, 15, 11, 0, tzinfo=timezone.utc),
    },
    {
        "content": "Canteen prices keep rising every semester but the food quality stays exactly the same. Students on scholarship can barely afford to eat on campus.",
        "original_content": "Canteen prices keep rising but quality stays the same. Scholarship students can barely afford to eat.",
        "source": "scraped",
        "language": "en",
        "post_date": datetime(2026, 5, 18, 9, 0, tzinfo=timezone.utc),
    },
]


def get_snapshot_dates(confessions: list) -> list:
    seen = set()
    dates = []
    for c in confessions:
        d = c["post_date"]
        key = (d.year, d.month)
        if key not in seen:
            seen.add(key)
            last_day = calendar.monthrange(d.year, d.month)[1]
            dates.append(datetime(d.year, d.month, last_day, 23, 59, tzinfo=timezone.utc))
    return sorted(dates)


async def load_models() -> MLRegistry:
    print("Loading ML models...")
    sentiment_model = pipeline(
        "sentiment-analysis",
        model="distilbert-base-uncased-finetuned-sst-2-english",
    )
    embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
    aspect_embeddings = embedding_model.encode(
        list(ASPECTS.values()), convert_to_tensor=True
    )
    print("Models loaded.\n")
    return MLRegistry(
        sentiment=sentiment_model,
        embedding=embedding_model,
        aspect_embeddings=aspect_embeddings,
        large_language_model=None,
        keyword_extractor=None,
    )


async def seed_confessions() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    models = await load_models()

    # --- Insert confessions ---
    inserted = []
    async with AsyncSessionLocal() as db:
        print(f"Inserting {len(SAMPLE_CONFESSIONS)} confessions...")
        for item in SAMPLE_CONFESSIONS:
            obj = Confession(**item)
            db.add(obj)
            await db.flush()
            await db.refresh(obj)
            inserted.append(obj)
            print(f"  id={obj.id}  date={obj.post_date.date()}  source={obj.source}")
        await db.commit()

    # --- Run ABSA ---
    print(f"\nRunning ABSA on {len(inserted)} confessions...")
    async with AsyncSessionLocal() as db:
        for obj in inserted:
            try:
                results = await absa_service.run_absa_for_confession(db, obj, models)
                if results:
                    avg_score = sum(r.sentiment_score for r in results) / len(results)
                    dominant_label = max(
                        {"positive", "negative", "neutral"},
                        key=lambda l: sum(1 for r in results if r.sentiment_label == l),
                    )
                    obj.sentiment_score = avg_score
                    obj.sentiment_label = dominant_label
                    db.add(obj)
                await db.commit()
                print(f"  ABSA done  id={obj.id}  label={obj.sentiment_label}  score={round(obj.sentiment_score or 0, 3)}")
            except Exception as e:
                print(f"  ABSA failed  id={obj.id}: {e}")

    # --- Generate vibe snapshots ---
    # 1. Historical monthly snapshots
    snapshot_dates = get_snapshot_dates(SAMPLE_CONFESSIONS)
    
    # 2. Add clean daily trail snapshots for the past 14 days
    import datetime as dt
    now = datetime.now(timezone.utc)
    for i in range(14, -1, -1):
        trail_date = now - dt.timedelta(days=i)
        trail_date_end = dt.datetime.combine(trail_date.date(), dt.time(23, 59, 59), tzinfo=timezone.utc)
        if trail_date_end not in snapshot_dates:
            snapshot_dates.append(trail_date_end)
            
    # Keep them in chronological order
    snapshot_dates.sort()

    print(f"\nGenerating {len(snapshot_dates)} vibe snapshots (monthly history + recent daily trail)...")
    async with AsyncSessionLocal() as db:
        for snap_date in snapshot_dates:
            try:
                snapshot = await create_vibe_snapshot(db, models, snap_date, use_ai_summary=False)
                if snapshot:
                    print(f"  Snapshot created  date={snap_date.date()}  score={round(snapshot.vibe_score, 3)}  label={snapshot.vibe_label}")
                else:
                    print(f"  Snapshot skipped  date={snap_date.date()}  (insufficient data)")
            except Exception as e:
                print(f"  Snapshot failed  date={snap_date.date()}: {e}")

    print(f"\nDone. {len(inserted)} confessions seeded.")

if __name__ == "__main__":
    asyncio.run(seed_confessions())