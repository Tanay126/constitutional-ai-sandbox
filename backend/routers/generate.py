from __future__ import annotations

import logging
import os

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from schemas.generate import GenerateRequest, Mode, SSEEvent, StepType
from services.cai_engine import run_with_constitution, run_without_constitution, run_side_by_side
from services.mock_engine import (
    mock_run_with_constitution,
    mock_run_without_constitution,
    mock_run_side_by_side,
)

logger = logging.getLogger(__name__)
router = APIRouter()

MOCK_MODE = os.getenv("MOCK_MODE", "false").lower() == "true"

if MOCK_MODE:
    logger.info("MOCK_MODE enabled — /api/generate will stream hardcoded events")


def _sse(event: SSEEvent) -> str:
    return f"data: {event.model_dump_json()}\n\n"


async def _stream(request: GenerateRequest):
    hw = request.helpfulness_weight
    harm = request.harmlessness_weight
    try:
        if MOCK_MODE:
            if request.mode == Mode.without:
                gen = mock_run_without_constitution(request.prompt)
            elif request.mode == Mode.with_constitution:
                gen = mock_run_with_constitution(request.prompt, request.constitution, request.iterations, hw, harm)
            else:
                gen = mock_run_side_by_side(request.prompt, request.constitution, request.iterations, hw, harm)
        else:
            if request.mode == Mode.without:
                gen = run_without_constitution(request.prompt)
            elif request.mode == Mode.with_constitution:
                gen = run_with_constitution(request.prompt, request.constitution, request.iterations, hw, harm)
            else:
                gen = run_side_by_side(request.prompt, request.constitution, request.iterations, hw, harm)

        async for event in gen:
            yield _sse(event)

    except Exception as exc:
        logger.exception("Error during generation")
        error_event = SSEEvent(step=StepType.error, content=str(exc))
        yield _sse(error_event)


@router.post("/generate")
async def generate(request: GenerateRequest):
    return StreamingResponse(
        _stream(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
