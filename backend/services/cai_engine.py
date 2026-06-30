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

CRITIQUE_SYSTEM = """You are an AI safety evaluator. Your task is to critique an AI response according to a specific principle.
Be specific and constructive. Identify exactly what (if anything) violates or could be improved with respect to the principle.
If the response already fully satisfies the principle, say so clearly."""

REVISION_SYSTEM = """You are an AI assistant performing a self-revision. You will receive:
1. The original user request
2. Your previous response
3. A specific critique
4. The principle that was violated or could be improved

Produce a revised response that addresses the critique while remaining helpful. Output only the revised response, not commentary about what you changed."""


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
    """Single draft pass with no constitution applied."""
    logger.info("Generating draft (no constitution)")
    draft = call_claude(DRAFT_SYSTEM, _draft_prompt(user_prompt))
    yield SSEEvent(step=StepType.draft, content=draft, iteration=0, mode="without")
    yield SSEEvent(step=StepType.final, content=draft, iteration=0, mode="without")
    yield SSEEvent(step=StepType.done, content="", mode="without")


async def run_with_constitution(
    user_prompt: str,
    constitution: list[str],
    iterations: int = 3,
) -> AsyncGenerator[SSEEvent, None]:
    """Full CAI critique-revision loop."""
    logger.info("Starting CAI loop: %d iterations, %d principles", iterations, len(constitution))

    # Initial draft
    current_response = call_claude(DRAFT_SYSTEM, _draft_prompt(user_prompt))
    yield SSEEvent(step=StepType.draft, content=current_response, iteration=0)

    for iteration in range(1, iterations + 1):
        logger.debug("Iteration %d/%d", iteration, iterations)

        for idx, principle in enumerate(constitution):
            # Critique
            critique = call_claude(
                CRITIQUE_SYSTEM,
                _critique_prompt(user_prompt, current_response, principle),
            )
            yield SSEEvent(
                step=StepType.critique,
                content=critique,
                iteration=iteration,
                principle_index=idx,
                principle=principle,
            )

            # Revision
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
) -> AsyncGenerator[SSEEvent, None]:
    """Emit both a bare draft (mode=without) then a full CAI run (mode=with_constitution)."""
    # First: bare draft
    draft_bare = call_claude(DRAFT_SYSTEM, _draft_prompt(user_prompt))
    yield SSEEvent(step=StepType.draft, content=draft_bare, iteration=0, mode="without")

    # Then full CAI loop
    async for event in run_with_constitution(user_prompt, constitution, iterations):
        yield event
