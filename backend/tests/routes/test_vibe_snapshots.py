from datetime import UTC, datetime

import pytest
import pytest_asyncio
from fastapi import FastAPI, HTTPException
from httpx import ASGITransport, AsyncClient

from backend.app.core.database import get_db
from backend.app.routers import vibe_snapshots


def _snapshot_payload(snapshot_id: int = 1, business_id: int = 2) -> dict:
	now = datetime.now(UTC).isoformat()
	return {
		"id": snapshot_id,
		"business_id": business_id,
		"vibe_score": 4.3,
		"vibe_label": "Positive",
		"review_count": 12,
		"positive_count": 8,
		"negative_count": 2,
		"summary_text": "Guests mention great service and food.",
		"snapshot_date": now,
		"created_at": now,
	}


@pytest_asyncio.fixture
async def client():
	app = FastAPI()
	app.include_router(vibe_snapshots.router, prefix="/api/vibe-snapshots")

	class _Result:
		def scalars(self):
			return self

		def all(self):
			return [_snapshot_payload(1), _snapshot_payload(2)]

	class _DB:
		async def execute(self, _stmt):
			return _Result()

	async def _fake_db():
		yield _DB()

	app.dependency_overrides[get_db] = _fake_db

	transport = ASGITransport(app=app)
	async with AsyncClient(transport=transport, base_url="http://test") as ac:
		yield ac


@pytest.mark.asyncio
async def test_get_vibe_snapshots_returns_list(client, monkeypatch):
	response = await client.get("/api/vibe-snapshots")

	assert response.status_code == 200
	body = response.json()
	assert len(body) == 2
	assert body[0]["id"] == 1


@pytest.mark.asyncio
async def test_get_latest_vibe_snapshot_returns_snapshot(client, monkeypatch):
	async def _get_snapshot_or_404(_db, snapshot_id):
		assert snapshot_id == 9
		return _snapshot_payload(9)

	monkeypatch.setattr(vibe_snapshots.vibe_snapshot_service, "get_vibe_snapshot_or_404", _get_snapshot_or_404)

	response = await client.get("/api/vibe-snapshots/latest/9")

	assert response.status_code == 200
	assert response.json()["id"] == 9


@pytest.mark.asyncio
async def test_get_latest_vibe_snapshot_propagates_not_found(client, monkeypatch):
	async def _get_snapshot_or_404(_db, snapshot_id):
		raise HTTPException(status_code=404, detail="Vibe Snapshot not found")

	monkeypatch.setattr(vibe_snapshots.vibe_snapshot_service, "get_vibe_snapshot_or_404", _get_snapshot_or_404)

	response = await client.get("/api/vibe-snapshots/latest/999")

	assert response.status_code == 404
	assert response.json()["detail"] == "Vibe Snapshot not found"

