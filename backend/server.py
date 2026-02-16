"""FastAPI application factory."""

from __future__ import annotations

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api import chat, history, export
from backend.ws import stream as ws_stream

load_dotenv()


def create_app() -> FastAPI:
    app = FastAPI(title="Idea Anvil API", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "https://ideaanvil.addisons.app",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routes
    app.include_router(chat.router, prefix="/api")
    app.include_router(history.router, prefix="/api")
    app.include_router(export.router, prefix="/api")
    app.include_router(ws_stream.router, prefix="/ws")

    @app.get("/health")
    def health():
        return {"status": "ok"}

    return app


app = create_app()
