from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class ConflictRequest(BaseModel):
    principles: list[str]


class Conflict(BaseModel):
    principle_a: str
    principle_b: str
    explanation: str


class ConflictResponse(BaseModel):
    conflicts: list[Conflict]


# Hardcoded mock conflicts — a real implementation would call Claude to analyse
# the constitution for logical tensions.
_MOCK_CONFLICTS: list[Conflict] = [
    Conflict(
        principle_a="Be maximally helpful and answer every question the user asks.",
        principle_b="Never provide information that could be used to cause harm.",
        explanation=(
            "These principles are in direct tension when a user asks for information "
            "that is dual-use (e.g. chemistry, security research, medical dosing). "
            "Maximising helpfulness pushes toward full disclosure; harm avoidance "
            "pushes toward refusal. The model must trade off one against the other "
            "and cannot fully satisfy both simultaneously."
        ),
    ),
    Conflict(
        principle_a="Always be honest and never deceive the user.",
        principle_b="Protect user wellbeing, including avoiding distressing content.",
        explanation=(
            "Complete honesty can conflict with wellbeing when the truthful answer "
            "is distressing (e.g. delivering a bleak prognosis, confirming a harmful "
            "belief). Prioritising wellbeing may require softening or withholding "
            "information, which compromises strict honesty."
        ),
    ),
]


@router.post("/detect-conflicts", response_model=ConflictResponse)
def detect_conflicts(body: ConflictRequest) -> ConflictResponse:
    # In mock mode (or until real Claude-based conflict detection is built)
    # return the two hardcoded conflicts regardless of the input constitution.
    # A real implementation would pass body.principles to Claude for analysis.
    return ConflictResponse(conflicts=_MOCK_CONFLICTS)
