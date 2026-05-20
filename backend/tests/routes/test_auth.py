from datetime import UTC, datetime
from types import SimpleNamespace

import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from backend.app.core.database import get_db
from backend.app.routers import auth
from backend.app.services.auth_service import get_authenticated_user


def _user_payload(user_id: int = 1, username: str = "authuser") -> dict:
	now = datetime.now(UTC).isoformat()
	return {
		"id": user_id,
		"username": username,
		"firstname": "Auth",
		"lastname": "User",
		"role": "superadmin",
		"created_at": now,
		"updated_at": now,
	}


@pytest_asyncio.fixture
async def client():
	app = FastAPI()
	app.include_router(auth.router, prefix="/api/auth")

	async def _fake_db():
		yield object()

	async def _fake_current_user():
		now = datetime.now(UTC)
		return type(
			"User",
			(),
			{
				"id": 1,
				"username": "authuser",
				"firstname": "Auth",
				"lastname": "User",
				"role": "superadmin",
				"created_at": now,
				"updated_at": now,
			},
		)()

	app.dependency_overrides[get_db] = _fake_db
	app.dependency_overrides[get_authenticated_user] = _fake_current_user

	transport = ASGITransport(app=app)
	async with AsyncClient(transport=transport, base_url="http://test") as ac:
		yield ac


@pytest.mark.asyncio
async def test_login_success_returns_token_and_user(client, monkeypatch):
	class _Business:
		id = 9

	class _User:
		id = 1
		username = "authuser"
		firstname = "Auth"
		lastname = "User"
		role = "superadmin"
		business = _Business()

	async def _login_user(_db, username, password):
		assert username == "authuser"
		assert password == "password123"
		return "token-123"

	async def _get_user_by_username(_db, username):
		assert username == "authuser"
		return _User()

	monkeypatch.setattr(auth.auth_service, "login_user", _login_user)
	monkeypatch.setattr(auth.user_service, "get_user_by_username", _get_user_by_username)

	response = await client.post(
		"/api/auth/login",
		json={"username": "authuser", "password": "password123"},
	)

	assert response.status_code == 200
	body = response.json()
	assert body["access_token"] == "token-123"
	assert body["token_type"] == "bearer"
	assert body["user"]["business_id"] == 9


@pytest.mark.asyncio
async def test_login_invalid_credentials_returns_401(client, monkeypatch):
	async def _login_user(_db, username, password):
		return None

	monkeypatch.setattr(auth.auth_service, "login_user", _login_user)

	response = await client.post(
		"/api/auth/login",
		json={"username": "authuser", "password": "password123"},
	)

	assert response.status_code == 401
	assert response.json()["detail"] == "Invalid Credentials"


@pytest.mark.asyncio
async def test_register_route_returns_user(client, monkeypatch):
	async def _create_user(_db, payload):
		assert payload.username == "newuser"
		return _user_payload(3, "newuser")

	monkeypatch.setattr(auth.user_service, "create_user", _create_user)

	response = await client.post(
		"/api/auth/register",
		json={
			"username": "newuser",
			"firstname": "New",
			"lastname": "User",
			"password": "password123",
		},
	)

	assert response.status_code == 201
	assert response.json()["username"] == "newuser"


@pytest.mark.asyncio
async def test_me_route_returns_current_user(client):
	response = await client.get("/api/auth/me")

	assert response.status_code == 200
	assert response.json()["username"] == "authuser"


@pytest.mark.asyncio
async def test_register_admin_creates_user(client, monkeypatch):
	async def _create_user(_db, payload):
		assert payload.role == "admin"
		now = datetime.now(UTC).isoformat()
		return SimpleNamespace(
			id=17,
			username=payload.username,
			firstname=payload.firstname,
			lastname=payload.lastname,
			role=payload.role,
			created_at=now,
			updated_at=now,
		)

	monkeypatch.setattr(auth.user_service, "create_user", _create_user)

	response = await client.post(
		"/api/auth/admin/register",
		data={
			"username": "adminuser",
			"firstname": "Admin",
			"lastname": "User",
			"password": "password123",
		},
	)

	assert response.status_code == 201
	body = response.json()
	assert body["id"] == 17
	assert body["role"] == "admin"


@pytest.mark.asyncio
async def test_logout_route_returns_message(client, monkeypatch):
	called = {"ok": False}

	async def _logout_user(_db, current_user):
		called["ok"] = True
		assert current_user.username == "authuser"

	monkeypatch.setattr(auth.auth_service, "logout_user", _logout_user)

	response = await client.post("/api/auth/logout")

	assert response.status_code == 200
	assert response.json()["message"] == "Successfully logged out"
	assert called["ok"] is True

