import pytest
from fastapi.testclient import TestClient
from backend.server import create_app


@pytest.fixture
def client():
    app = create_app()
    return TestClient(app)


def test_websocket_connects(client):
    """WebSocket endpoint accepts connection."""
    # First create a session
    response = client.post("/api/session", json={"idea": "test idea"})
    thread_id = response.json()["thread_id"]

    with client.websocket_connect(f"/ws/session/{thread_id}") as ws:
        # Should connect without error
        ws.send_json({"type": "ping"})
        # The WS handler should respond or at least not crash
