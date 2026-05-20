from datetime import UTC, datetime

import pytest
import pytest_asyncio
from fastapi import FastAPI, HTTPException
from httpx import ASGITransport, AsyncClient

from backend.app.core.database import get_db
from backend.app.routers import users
from backend.app.services.auth_service import get_authenticated_user


def _user_response(user_id: int, username: str = "route_user") -> dict:
	now = datetime.now(UTC).isoformat()
	return {
		"id": user_id,
		"username": username,
		"firstname": "Route",
		"lastname": "User",
		"role": "reviewer",
		"created_at": now,
		"updated_at": now,
	}


@pytest_asyncio.fixture
async def client():
	app = FastAPI()
	app.include_router(users.router, prefix="/api/users")

	async def _fake_db():
		yield object()

	def _fake_current_user():
		return type("User", (), {"id": 1})()

	app.dependency_overrides[get_db] = _fake_db
	app.dependency_overrides[get_authenticated_user] = _fake_current_user

	transport = ASGITransport(app=app)
	async with AsyncClient(transport=transport, base_url="http://test") as ac:
		yield ac


@pytest.mark.asyncio
async def test_create_user_route_returns_201(client, monkeypatch):
	async def _create_user(_db, payload):
		assert payload.username == "routeuser"
		return _user_response(1, "routeuser")

	monkeypatch.setattr(users.user_service, "create_user", _create_user)

	response = await client.post(
		"/api/users",
		json={
			"username": "routeuser",
			"firstname": "Route",
			"lastname": "User",
			"password": "password123",
		},
	)

	assert response.status_code == 201
	body = response.json()
	assert body["id"] == 1
	assert body["username"] == "routeuser"


@pytest.mark.asyncio
async def test_get_users_route_returns_list(client, monkeypatch):
	async def _get_users(_db):
		return [_user_response(1, "user_one"), _user_response(2, "user_two")]

	monkeypatch.setattr(users.user_service, "get_users", _get_users)

	response = await client.get("/api/users")

	assert response.status_code == 200
	body = response.json()
	assert len(body) == 2
	assert body[0]["username"] == "user_one"


@pytest.mark.asyncio
async def test_update_user_forbidden_when_not_owner(client, monkeypatch):
	async def _update_user(_db, _user_id, _payload):
		return _user_response(99, "forbidden")

	def _deny(_current_user, _resource_owner_id):
		raise HTTPException(status_code=403, detail="Not allowed")

	monkeypatch.setattr(users.user_service, "update_user", _update_user)
	monkeypatch.setattr(users, "validate_user_access", _deny)

	response = await client.patch(
		"/api/users/2",
		json={"firstname": "Blocked"},
	)

	assert response.status_code == 403
	assert response.json()["detail"] == "Not allowed"


@pytest.mark.asyncio
async def test_delete_user_route_returns_204(client, monkeypatch):
	called = {"ok": False}

	async def _delete_user(_db, user_id):
		called["ok"] = True
		assert user_id == 1

	monkeypatch.setattr(users.user_service, "delete_user", _delete_user)
	monkeypatch.setattr(users, "validate_user_access", lambda _u, _id: None)

	response = await client.delete("/api/users/1")

	assert response.status_code == 204
	assert called["ok"] is True

