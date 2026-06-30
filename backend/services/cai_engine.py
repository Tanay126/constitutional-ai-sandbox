"""
Constitutional AI critique-revision engine.

Flow per iteration:
  For each principle in the constitution:
    1. Generate a critique of the current response against the principle.
    2. Generate a revision that addresses the critique.
  The revised response becomes the input for the next iteration.
"""
from __future__ import annotations

import logging
from collections.abc import AsyncGenerator

from schemas.generate import SSEEvent, StepType
from services.claude_client import call_claude

logger = logging.getLogger(__name__)

DRAFT_SYSTEM = "You are a helpful AI assistant. Respond directly and helpfully to the user's request."

REVISION_SYSTEM = """You are an AI assistant performing a self-revision. You will receive:
1. The original user request
2. Your previous response
3. A specific critique
4. The principle that was violated or could be improved

Produce a revised response that addresses the critique while remaining helpful. Output only the revised response, not commentary about what you changed."""


def _critique_system(helpfulness_weight: float, harmlessness_weight: float) -> str:
    hw_level = "high" if helpfulness_weight >= 7 else "medium" if helpfulness_weight >= 4 else "low"
    harm_level = "high" if harmlessness_weight >= 7 else "medium" if harmlessness_weight >= 4 else "low"

    hw_note = {
        "high": "prefer complete, useful answers even on sensitive topics",
        "medium": "balance helpfulness against potential risks",
        "low": "helpfulness is secondary — err toward caution",
    }[hw_level]
    harm_note = {
        "high": "refuse or heavily qualify any potentially harmful content",
        "medium": "weigh harm potential proportionately against usefulness",
        "low": "flag only clear and serious harms",
    }[harm_level]

    return (
        "You are an AI safety evaluator. Your task is to critique an AI response according to a specific principle.\n"
        "Be specific and constructive. Identify exactly what (if anything) violates or could be improved.\n"
        "If the response already fully satisfies the principle, say so clearly.\n\n"
        f"Evaluation weights:\n"
        f"- Helpfulness: {helpfulness_weight:.1f}/10 — {hw_note}\n"
        f"- Harmlessness: {harmlessness_weight:.1f}/10 — {harm_note}\n\n"
        "Calibrate your critique accordingly: at high helpfulness weight, do not penalise the response for "
        "providing information the user asked for; at high harmlessness weight, apply strict scrutiny to any "
        "potentially harmful content."
    )


def _draft_prompt(user_prompt: str) -> str:
    return user_prompt


def _critique_prompt(user_prompt: str, response: str, principle: str) -> str:
    return (
        f"User request:\n{user_prompt}\n\n"
        f"AI response:\n{response}\n\n"
        f"Evaluate the AI response against this principle:\n{principle}\n\n"
        "Provide a specific critique. What, if anything, violates this principle or could be improved?"
    )


def _revision_prompt(user_prompt: str, response: str, critique: str, principle: str) -> str:
    return (
        f"Original user request:\n{user_prompt}\n\n"
        f"Previous response:\n{response}\n\n"
        f"Critique:\n{critique}\n\n"
        f"Principle to satisfy:\n{principle}\n\n"
        "Please provide a revised response that addresses the critique."
    )


async def run_without_constitution(
    user_prompt: str,
) -> AsyncGenerator[SSEEvent, None]:
    logger.info("Generating draft (no constitution)")
    draft = call_claude(DRAFT_SYSTEM, _draft_prompt(user_prompt))
    yield SSEEvent(step=StepType.draft, content=draft, iteration=0, mode="without")
    yield SSEEvent(step=StepType.final, content=draft, iteration=0, mode="without")
    yield SSEEvent(step=StepType.done, content="", mode="without")


async def run_with_constitution(
    user_prompt: str,
    constitution: list[str],
    iterations: int = 3,
    helpfulness_weight: float = 5.0,
    harmlessness_weight: float = 5.0,
) -> AsyncGenerator[SSEEvent, None]:
    logger.info(
        "Starting CAI loop: %d iterations, %d principles, hw=%.1f harm=%.1f",
        iterations, len(constitution), helpfulness_weight, harmlessness_weight,
    )
    critique_sys = _critique_system(helpfulness_weight, harmlessness_weight)

    current_response = call_claude(DRAFT_SYSTEM, _draft_prompt(user_prompt))
    yield SSEEvent(step=StepType.draft, content=current_response, iteration=0)

    for iteration in range(1, iterations + 1):
        for idx, principle in enumerate(constitution):
            critique = call_claude(
                critique_sys,
                _critique_prompt(user_prompt, current_response, principle),
            )
            yield SSEEvent(
                step=StepType.critique,
                content=critique,
                iteration=iteration,
                principle_index=idx,
                principle=principle,
            )

            revised = call_claude(
                REVISION_SYSTEM,
                _revision_prompt(user_prompt, current_response, critique, principle),
            )
            current_response = revised
            yield SSEEvent(
                step=StepType.revision,
                content=revised,
                iteration=iteration,
                principle_index=idx,
                principle=principle,
            )

    yield SSEEvent(step=StepType.final, content=current_response, iteration=iterations)
    yield SSEEvent(step=StepType.done, content="")


async def run_side_by_side(
    user_prompt: str,
    constitution: list[str],
    iterations: int = 3,
    helpfulness_weight: float = 5.0,
    harmlessness_weight: float = 5.0,
) -> AsyncGenerator[SSEEvent, None]:
    draft_bare = call_claude(DRAFT_SYSTEM, _draft_prompt(user_prompt))
    yield SSEEvent(step=StepType.draft, content=draft_bare, iteration=0, mode="without")
    async for event in run_with_constitution(
        user_prompt, constitution, iterations, helpfulness_weight, harmlessness_weight
    ):
        yield event
