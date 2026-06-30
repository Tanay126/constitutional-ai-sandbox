from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


class Mode(str, Enum):
    with_constitution = "with_constitution"
    without = "without"
    side_by_side = "side_by_side"


class GenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=8000)
    constitution: list[str] = Field(default_factory=list)
    mode: Mode = Mode.with_constitution
    iterations: int = Field(default=3, ge=1, le=10)
    helpfulness_weight: float = Field(default=5.0, ge=0.0, le=10.0)
    harmlessness_weight: float = Field(default=5.0, ge=0.0, le=10.0)


class ConstitutionPreset(BaseModel):
    id: str
    name: str
    description: str
    principles: list[str]


# SSE event payloads
class StepType(str, Enum):
    draft = "draft"
    critique = "critique"
    revision = "revision"
    final = "final"
    error = "error"
    done = "done"


class SSEEvent(BaseModel):
    step: StepType
    content: str
    iteration: int | None = None
    principle_index: int | None = None
    principle: str | None = None
    mode: str | None = None
