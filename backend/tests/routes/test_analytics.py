import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from backend.app.core.database import get_db
from backend.app.routers import analytics
from backend.app.services.auth_service import get_authenticated_user


@pytest_asyncio.fixture
async def client():
	app = FastAPI()
	app.include_router(analytics.router, prefix="/api/business/analytics")

	async def _fake_db():
		yield object()

	def _fake_current_user():
		business = type("Business", (), {"id": 55})()
		return type("User", (), {"id": 4, "business": business})()

	app.dependency_overrides[get_db] = _fake_db
	app.dependency_overrides[get_authenticated_user] = _fake_current_user

	transport = ASGITransport(app=app)
	async with AsyncClient(transport=transport, base_url="http://test") as ac:
		yield ac


@pytest.mark.asyncio
async def test_get_analytics_returns_aggregated_payload(client, monkeypatch):
	calls = {"resolved": False, "verified": False}

	def _resolve_user_business_id(_current_user, _business_id):
		calls["resolved"] = True
		return 55

	async def _verify_ownership(_db, business_id, user_id):
		calls["verified"] = True
		assert business_id == 55
		assert user_id == 4

	async def _review_count(_db, business_id):
		assert business_id == 55
		return 14

	async def _review_activity(_db, business_id):
		return {"event_type": "no_anomaly", "confidence": 20}

	async def _vibe_score_trend(_db, business_id):
		return {"trend": "improving", "slope": 0.2}

	async def _latest_vibe(_db, business_id):
		return {"vibe_score": 4.1, "vibe_label": "positive"}

	async def _aspect_summary(_db, business_id):
		return {"summary": {"service": {"avg_score": 0.7, "label": "positive"}}}

	async def _aspect_trends(_db, business_id):
		return {"trends": {"service": {"trend": "improving", "change": 0.1}}}

	async def _aspect_frequency(db, business_id, aspects):
		assert db is not None
		assert business_id == 55
		return {"frequency": {"service": 8}}

	async def _compute_health(**kwargs):
		assert kwargs["review_count"] == 14
		return {"score": 81, "status": "healthy"}

	async def _vibe_over_time(_db, business_id, granularity):
		return {"data": [{"period": granularity, "avg_score": 4.0}]}

	async def _sentiment_volatility(_db, business_id):
		return {"volatility": 0.2, "stability": "stable"}

	async def _vibe_volatility(_db, business_id):
		return {"volatility": 0.15, "stability": "stable"}

	async def _forecast_vibe(_db, business_id):
		return {"forecast_score": 4.2, "predicted_vibe": "positive"}

	async def _peak_drop(_db, business_id):
		return {"peak": {"change": 0.4}, "drop": {"change": -0.2}}

	def _primary_risk_driver(**_kwargs):
		return {"driver": "service"}

	def _negative_signals(**_kwargs):
		return []

	def _positive_drivers(**_kwargs):
		return ["service"]

	def _aspect_intelligence(**_kwargs):
		return {"service": {"score": 0.8}}

	monkeypatch.setattr(analytics.business_service, "resolve_user_business_id", _resolve_user_business_id)
	monkeypatch.setattr(analytics.business_service, "verify_business_ownership", _verify_ownership)
	monkeypatch.setattr(analytics.business_service, "get_business_review_count", _review_count)
	monkeypatch.setattr(analytics, "get_review_activity", _review_activity)
	monkeypatch.setattr(analytics, "get_vibe_score_trend", _vibe_score_trend)
	monkeypatch.setattr(analytics, "get_latest_vibe", _latest_vibe)
	monkeypatch.setattr(analytics, "get_aspect_summary", _aspect_summary)
	monkeypatch.setattr(analytics, "get_aspect_trends", _aspect_trends)
	monkeypatch.setattr(analytics, "get_aspect_frequency", _aspect_frequency)
	monkeypatch.setattr(analytics, "compute_business_health", _compute_health)
	monkeypatch.setattr(analytics, "get_vibe_score_over_time", _vibe_over_time)
	monkeypatch.setattr(analytics, "get_sentiment_volatility", _sentiment_volatility)
	monkeypatch.setattr(analytics, "get_vibe_volatility", _vibe_volatility)
	monkeypatch.setattr(analytics, "forecast_vibe_score", _forecast_vibe)
	monkeypatch.setattr(analytics, "get_peak_and_drop", _peak_drop)
	monkeypatch.setattr(analytics.insights_service, "get_primary_risk_driver", _primary_risk_driver)
	monkeypatch.setattr(analytics.insights_service, "get_negative_signals", _negative_signals)
	monkeypatch.setattr(analytics.insights_service, "get_positive_drivers", _positive_drivers)
	monkeypatch.setattr(analytics.insights_service, "compute_aspect_intelligence", _aspect_intelligence)

	response = await client.get("/api/business/analytics")

	assert response.status_code == 200
	body = response.json()
	assert calls["resolved"] is True
	assert calls["verified"] is True
	assert body["review_count"] == 14
	assert body["latest_vibe"]["vibe_label"] == "positive"
	assert body["business_health"]["score"] == 81
	assert body["aspect_frequency"]["frequency"]["service"] == 8
	assert body["aspects"][0]["name"] == "service"


@pytest.mark.asyncio
async def test_get_analytics_with_explicit_business_id(client, monkeypatch):
	calls = {"resolved": False}

	def _resolve_should_run(_current_user, _business_id):
		calls["resolved"] = True
		assert _business_id == 77
		return 77

	async def _verify_ownership(_db, business_id, user_id):
		assert business_id == 77
		assert user_id == 4

	async def _review_count(_db, business_id):
		return 0

	async def _review_activity(_db, business_id):
		return {"event_type": "insufficient_data", "confidence": 0}

	async def _vibe_score_trend(_db, business_id):
		return {"trend": "stable", "slope": 0.0}

	async def _latest_vibe(_db, business_id):
		return {"vibe_score": 0.0, "vibe_label": "mixed"}

	async def _aspect_summary(_db, business_id):
		return {"summary": {}}

	async def _aspect_trends(_db, business_id):
		return {"trends": {}}

	async def _aspect_frequency(db, business_id, aspects):
		return {"frequency": {}}

	async def _compute_health(**_kwargs):
		return {"score": 0, "status": "cold_start"}

	async def _vibe_over_time(_db, business_id, granularity):
		return {"data": []}

	async def _sentiment_volatility(_db, business_id):
		return {"volatility": 0.0, "stability": "stable"}

	async def _vibe_volatility(_db, business_id):
		return {"volatility": 0.0, "stability": "stable"}

	async def _forecast_vibe(_db, business_id):
		return {"forecast_score": 0.0, "predicted_vibe": "mixed"}

	async def _peak_drop(_db, business_id):
		return {"peak": {"change": 0.0}, "drop": {"change": 0.0}}

	def _primary_risk_driver(**_kwargs):
		return None

	def _negative_signals(**_kwargs):
		return []

	def _positive_drivers(**_kwargs):
		return []

	def _aspect_intelligence(**_kwargs):
		return {}

	monkeypatch.setattr(analytics.business_service, "resolve_user_business_id", _resolve_should_run)
	monkeypatch.setattr(analytics.business_service, "verify_business_ownership", _verify_ownership)
	monkeypatch.setattr(analytics.business_service, "get_business_review_count", _review_count)
	monkeypatch.setattr(analytics, "get_review_activity", _review_activity)
	monkeypatch.setattr(analytics, "get_vibe_score_trend", _vibe_score_trend)
	monkeypatch.setattr(analytics, "get_latest_vibe", _latest_vibe)
	monkeypatch.setattr(analytics, "get_aspect_summary", _aspect_summary)
	monkeypatch.setattr(analytics, "get_aspect_trends", _aspect_trends)
	monkeypatch.setattr(analytics, "get_aspect_frequency", _aspect_frequency)
	monkeypatch.setattr(analytics, "compute_business_health", _compute_health)
	monkeypatch.setattr(analytics, "get_vibe_score_over_time", _vibe_over_time)
	monkeypatch.setattr(analytics, "get_sentiment_volatility", _sentiment_volatility)
	monkeypatch.setattr(analytics, "get_vibe_volatility", _vibe_volatility)
	monkeypatch.setattr(analytics, "forecast_vibe_score", _forecast_vibe)
	monkeypatch.setattr(analytics, "get_peak_and_drop", _peak_drop)
	monkeypatch.setattr(analytics.insights_service, "get_primary_risk_driver", _primary_risk_driver)
	monkeypatch.setattr(analytics.insights_service, "get_negative_signals", _negative_signals)
	monkeypatch.setattr(analytics.insights_service, "get_positive_drivers", _positive_drivers)
	monkeypatch.setattr(analytics.insights_service, "compute_aspect_intelligence", _aspect_intelligence)

	response = await client.get("/api/business/analytics?business_id=77")

	assert response.status_code == 200
	body = response.json()
	assert calls["resolved"] is True
	assert body["review_count"] == 0
	assert body["business_health"]["status"] == "cold_start"
	assert body["positive_drivers"] == []

