from __future__ import annotations

import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

from routers import conflicts as conflicts_router
from routers import generate as generate_router
from routers import presets as presets_router

app = FastAPI(
    title="Constitutional AI Sandbox",
    description="Visualize Claude's critique-revision loop (Constitutional AI methodology)",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(generate_router.router, prefix="/api")
app.include_router(presets_router.router, prefix="/api")
app.include_router(conflicts_router.router, prefix="/api")


_MOCK_MODE = os.getenv("MOCK_MODE", "false").lower() == "true"


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/config")
def config():
    return {"mock_mode": _MOCK_MODE, "version": "1.0.0"}
