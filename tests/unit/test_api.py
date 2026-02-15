"""Tests for FastAPI REST endpoints."""

import pytest
from fastapi.testclient import TestClient
from backend.server import create_app


@pytest.fixture
def client():
    app = create_app()
    return TestClient(app)


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200


def test_create_session(client):
    response = client.post("/api/session", json={"idea": "AI todo app"})
    assert response.status_code == 200
    data = response.json()
    assert "thread_id" in data


def test_get_history(client):
    response = client.get("/api/history")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
