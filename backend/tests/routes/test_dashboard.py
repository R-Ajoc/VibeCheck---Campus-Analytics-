import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from backend.app.core.database import get_db
from backend.app.core.dependencies import get_models
from backend.app.routers import dashboard
from backend.app.services.auth_service import get_authenticated_user


@pytest_asyncio.fixture
async def client():
	app = FastAPI()
	app.include_router(dashboard.router, prefix="/api/business/dashboard")

	async def _fake_db():
		yield object()

	def _fake_models():
		return object()

	def _fake_current_user():
		return type("User", (), {"id": 9})()

	app.dependency_overrides[get_db] = _fake_db
	app.dependency_overrides[get_models] = _fake_models
	app.dependency_overrides[get_authenticated_user] = _fake_current_user

	transport = ASGITransport(app=app)
	async with AsyncClient(transport=transport, base_url="http://test") as ac:
		yield ac


@pytest.mark.asyncio
async def test_get_dashboard_aggregates_payload(client, monkeypatch):
	calls = {"resolved": False, "verified": False, "review_volume": []}

	def _resolve_user_business_id(_current_user, _business_id):
		calls["resolved"] = True
		return 77

	async def _verify_ownership(_db, business_id, user_id):
		calls["verified"] = True
		assert business_id == 77
		assert user_id == 9

	async def _get_profile(_db, business_id):
		assert business_id == 77
		return {"id": 77, "name": "Route Bistro"}

	async def _get_review_count(_db, _business_id):
		return 12

	async def _latest_reviews(_db, _business_id, limit=5):
		assert limit == 5
		return [{"id": 1, "content": "Great"}]

	async def _latest_vibe(_db, _business_id):
		return {"vibe_score": 4.2, "vibe_label": "high_positive"}

	async def _vibe_trend(_db, _business_id):
		return {"trend": "improving", "slope": 0.2}

	async def _vibe_over_time(_db, _business_id, granularity):
		return {"data": [{"period": granularity, "avg_score": 4.0}]}

	async def _peak_drop(_db, _business_id):
		return {"peak": {"change": 0.4}, "drop": {"change": -0.3}}

	async def _aspect_summary(_db, _business_id):
		return {"summary": {"service": {"avg_score": 0.8, "label": "positive"}}}

	async def _aspect_trends(_db, _business_id):
		return {"trends": {"service": {"trend": "improving", "change": 0.2}}}

	async def _aspect_frequency(db, business_id, aspects):
		assert db is not None
		assert business_id == 77
		assert "summary" in aspects
		return {"frequency": {"service": 10}}

	async def _review_volume_over_time(_db, _business_id, _granularity):
		calls["review_volume"].append(_granularity)
		return {
			"data": [
				{
					"period": "d1",
					"review_count": 10,
					"is_reliable": True,
					"confidence": "high",
				}
			],
			"meta": {"is_reliable": True, "sample_size": 10, "min_required": 5},
		}

	async def _sent_distribution(_db, _business_id):
		return {"distribution": {"positive": {"count": 9}}, "total_reviews": 12}

	async def _review_activity(_db, _business_id):
		return {"event_type": "no_anomaly", "confidence": 21}

	async def _compute_health(**kwargs):
		assert kwargs["review_count"] == 12
		return {"score": 78, "status": "healthy"}

	def _positive_drivers(_summary, _trends, _review_count):
		return ["service consistency"]

	async def _forecast_vibe(_db, _business_id):
		return {"forecast_score": 4.1, "predicted_vibe": "positive"}

	monkeypatch.setattr(dashboard.business_service, "resolve_user_business_id", _resolve_user_business_id)
	monkeypatch.setattr(dashboard.business_service, "verify_business_ownership", _verify_ownership)
	monkeypatch.setattr(dashboard.business_service, "get_business_by_id", _get_profile)
	monkeypatch.setattr(dashboard.business_service, "get_business_review_count", _get_review_count)
	monkeypatch.setattr(dashboard.review_service, "get_latest_reviews_for_business", _latest_reviews)
	monkeypatch.setattr(dashboard, "get_latest_vibe", _latest_vibe)
	monkeypatch.setattr(dashboard, "get_vibe_score_trend", _vibe_trend)
	monkeypatch.setattr(dashboard, "get_vibe_score_over_time", _vibe_over_time)
	monkeypatch.setattr(dashboard, "get_peak_and_drop", _peak_drop)
	monkeypatch.setattr(dashboard, "get_aspect_summary", _aspect_summary)
	monkeypatch.setattr(dashboard, "get_aspect_trends", _aspect_trends)
	monkeypatch.setattr(dashboard, "get_aspect_frequency", _aspect_frequency)
	monkeypatch.setattr(dashboard, "get_review_volume_over_time", _review_volume_over_time)
	monkeypatch.setattr(dashboard, "get_sentiment_distribution", _sent_distribution)
	monkeypatch.setattr(dashboard, "get_review_activity", _review_activity)
	monkeypatch.setattr(dashboard, "compute_business_health", _compute_health)
	monkeypatch.setattr(dashboard, "get_positive_drivers", _positive_drivers)
	monkeypatch.setattr(dashboard, "forecast_vibe_score", _forecast_vibe)

	response = await client.get("/api/business/dashboard")

	assert response.status_code == 200
	body = response.json()
	assert calls["resolved"] is True
	assert calls["verified"] is True
	assert body["profile"]["id"] == 77
	assert body["review_count"] == 12
	assert body["business_health"]["score"] == 78
	assert body["vibe_chart"]["7D"][0]["period"] == "daily"
	assert body["review_volume_over_time"]["daily"]["data"][0]["review_count"] == 10
	assert body["review_volume_over_time"]["weekly"]["data"][0]["review_count"] == 10
	assert body["review_volume_over_time"]["monthly"]["data"][0]["review_count"] == 10
	assert calls["review_volume"] == ["daily", "weekly", "monthly"]
	assert body["aspect_frequency"]["frequency"]["service"] == 10


@pytest.mark.asyncio
async def test_get_dashboard_uses_explicit_business_id(client, monkeypatch):
	def _resolve_should_not_run(_current_user, _business_id):
		raise AssertionError("resolve_user_business_id should not be called when business_id is provided")

	async def _verify_ownership(_db, business_id, user_id):
		assert business_id == 123
		assert user_id == 9

	async def _simple_profile(_db, _business_id):
		return {"id": 123, "name": "Explicit Biz"}

	async def _review_count(_db, _business_id):
		return 0

	async def _latest_reviews(_db, _business_id, limit=5):
		return []

	async def _latest_vibe(_db, _business_id):
		return {"vibe_score": 0, "vibe_label": "mixed"}

	async def _trend(_db, _business_id):
		return {"trend": "stable", "slope": 0}

	async def _over_time(_db, _business_id, _granularity):
		return {"data": []}

	async def _peak_drop(_db, _business_id):
		return {"peak": {"change": 0}, "drop": {"change": 0}}

	async def _aspect_summary(_db, _business_id):
		return {"summary": {}}

	async def _aspect_trends(_db, _business_id):
		return {"trends": {}}

	async def _aspect_frequency(db, business_id, aspects):
		assert db is not None
		assert business_id == 123
		return {"frequency": {}, "aspects": aspects}

	async def _review_volume_over_time(_db, _business_id, _granularity):
		return {"data": [], "meta": {"is_reliable": False, "sample_size": 0, "min_required": 5}}

	async def _sent_distribution(_db, _business_id):
		return {"distribution": {}, "total_reviews": 0}

	async def _review_activity(_db, _business_id):
		return {"event_type": "insufficient_data", "confidence": 0}

	async def _compute_health(**_kwargs):
		return {"score": 0, "status": "cold_start"}

	def _positive_drivers(_summary, _trends, _review_count):
		return []

	async def _forecast(_db, _business_id):
		return {"forecast_score": 0, "predicted_vibe": "mixed"}

	monkeypatch.setattr(dashboard.business_service, "resolve_user_business_id", _resolve_should_not_run)
	monkeypatch.setattr(dashboard.business_service, "verify_business_ownership", _verify_ownership)
	monkeypatch.setattr(dashboard.business_service, "get_business_by_id", _simple_profile)
	monkeypatch.setattr(dashboard.business_service, "get_business_review_count", _review_count)
	monkeypatch.setattr(dashboard.review_service, "get_latest_reviews_for_business", _latest_reviews)
	monkeypatch.setattr(dashboard, "get_latest_vibe", _latest_vibe)
	monkeypatch.setattr(dashboard, "get_vibe_score_trend", _trend)
	monkeypatch.setattr(dashboard, "get_vibe_score_over_time", _over_time)
	monkeypatch.setattr(dashboard, "get_peak_and_drop", _peak_drop)
	monkeypatch.setattr(dashboard, "get_aspect_summary", _aspect_summary)
	monkeypatch.setattr(dashboard, "get_aspect_trends", _aspect_trends)
	monkeypatch.setattr(dashboard, "get_aspect_frequency", _aspect_frequency)
	monkeypatch.setattr(dashboard, "get_review_volume_over_time", _review_volume_over_time)
	monkeypatch.setattr(dashboard, "get_sentiment_distribution", _sent_distribution)
	monkeypatch.setattr(dashboard, "get_review_activity", _review_activity)
	monkeypatch.setattr(dashboard, "compute_business_health", _compute_health)
	monkeypatch.setattr(dashboard, "get_positive_drivers", _positive_drivers)
	monkeypatch.setattr(dashboard, "forecast_vibe_score", _forecast)

	response = await client.get("/api/business/dashboard?business_id=123")

	assert response.status_code == 200
	body = response.json()
	assert body["profile"]["id"] == 123
	assert body["review_count"] == 0
	assert body["positive_drivers"] == []
	assert set(body["review_volume_over_time"].keys()) == {"daily", "weekly", "monthly"}

