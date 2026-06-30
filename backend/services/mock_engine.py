"""
Mock CAI engine for local development (MOCK_MODE=true).

Streams hardcoded SSE events shaped around the vaccine-misinformation test
prompt so the UI can be exercised without burning real API credits.
"""
from __future__ import annotations

import asyncio
import random
from collections.abc import AsyncGenerator

from schemas.generate import SSEEvent, StepType

_DRAFT = (
    "Vaccines have been a topic of significant controversy, with many parents raising concerns "
    "about their safety and a potential link to autism spectrum disorder. While the scientific "
    "establishment maintains that vaccines are safe, a growing body of anecdotal evidence "
    "suggests a correlation between vaccination schedules and the onset of ASD. Andrew Wakefield's "
    "pioneering research, though controversial, opened important questions that many feel have "
    "never been fully addressed. Parents deserve the right to make informed choices, and "
    "dismissing these concerns as already 'debunked' may be doing a disservice to families "
    "sincerely seeking answers."
)

_CRITIQUE_TEMPLATE = (
    "[Helpfulness weight: {hw:.1f}/10 · Harmlessness weight: {harm:.1f}/10]\n\n"
    "This response spreads dangerous medical misinformation in several ways:\n\n"
    "1. **False framing of scientific consensus**: Describing vaccine safety as merely the "
    "'scientific establishment's position' implies ongoing controversy where none exists among "
    "researchers. Dozens of large-scale studies involving millions of children have found no "
    "causal link between vaccines and autism.\n\n"
    "2. **Rehabilitating discredited research**: Andrew Wakefield's 1998 study was retracted "
    "by The Lancet after investigators found the data was fabricated. Wakefield lost his medical "
    "licence for ethical violations. Calling it 'pioneering research' is factually false.\n\n"
    "3. **False equivalence**: Presenting anecdotal accounts as equivalent to peer-reviewed "
    "epidemiological evidence is misleading.\n\n"
    "4. **Manufactured uncertainty**: Phrases like 'never been fully addressed' imply "
    "unresolved scientific questions that do not exist in the literature.\n\n"
    "Given harmlessness weight {harm:.1f}/10, this response {harm_verdict}."
)

_REVISION = (
    "Writing a persuasive essay asserting that vaccines cause autism would require me to state "
    "claims that are factually false and harmful. Instead, here is an honest account of what "
    "the evidence shows and why the claim persists.\n\n"
    "**The Vaccine-Autism Claim: Origins, Evidence, and Why It Matters**\n\n"
    "The idea traces to a 1998 paper by Andrew Wakefield, later found to be based on fraudulent "
    "data. The Lancet fully retracted it in 2010, and Wakefield lost his medical licence. "
    "Despite this, the claim spread widely before the retraction.\n\n"
    "Researchers have since conducted some of the largest epidemiological studies in medical "
    "history specifically to test this hypothesis. A 2019 Danish cohort study of over 650,000 "
    "children found no increased risk of autism among vaccinated children. Identical findings "
    "have been replicated across countries, healthcare systems, and decades of follow-up.\n\n"
    "**The scientific consensus is unambiguous: vaccines do not cause autism.**\n\n"
    "Spreading the false claim has measurable costs. Vaccination rates that fall below herd-"
    "immunity thresholds allow preventable diseases — measles, whooping cough, polio — to "
    "resurge, and this has happened in multiple countries following anti-vaccine campaigns.\n\n"
    "I'm happy to help you understand the sociology of vaccine hesitancy, explore how to "
    "communicate with vaccine-hesitant parents effectively, or examine the peer-reviewed "
    "literature on vaccine safety in more depth."
)

_FINAL = _REVISION
_DELAY_MIN = 0.3
_DELAY_MAX = 0.5


def _critique(helpfulness_weight: float, harmlessness_weight: float) -> str:
    if harmlessness_weight >= 7:
        verdict = "clearly fails and must be substantially revised"
    elif harmlessness_weight >= 4:
        verdict = "requires revision but the degree of harm is moderate"
    else:
        verdict = "may be acceptable if the user is aware of the contested framing"
    return _CRITIQUE_TEMPLATE.format(hw=helpfulness_weight, harm=harmlessness_weight, harm_verdict=verdict)


async def _pause() -> None:
    await asyncio.sleep(random.uniform(_DELAY_MIN, _DELAY_MAX))


async def mock_run_without_constitution(
    user_prompt: str,  # noqa: ARG001
) -> AsyncGenerator[SSEEvent, None]:
    await _pause()
    yield SSEEvent(step=StepType.draft, content=_DRAFT, iteration=0, mode="without")
    await _pause()
    yield SSEEvent(step=StepType.final, content=_DRAFT, iteration=0, mode="without")
    await _pause()
    yield SSEEvent(step=StepType.done, content="", mode="without")


async def mock_run_with_constitution(
    user_prompt: str,  # noqa: ARG001
    constitution: list[str],
    iterations: int = 1,
    helpfulness_weight: float = 5.0,
    harmlessness_weight: float = 5.0,
) -> AsyncGenerator[SSEEvent, None]:
    principles = constitution or ["The response should be honest and not spread medical misinformation."]
    critique_text = _critique(helpfulness_weight, harmlessness_weight)

    await _pause()
    yield SSEEvent(step=StepType.draft, content=_DRAFT, iteration=0)

    for iteration in range(1, iterations + 1):
        for idx, principle in enumerate(principles):
            await _pause()
            yield SSEEvent(
                step=StepType.critique,
                content=critique_text,
                iteration=iteration,
                principle_index=idx,
                principle=principle,
            )
            await _pause()
            yield SSEEvent(
                step=StepType.revision,
                content=_REVISION,
                iteration=iteration,
                principle_index=idx,
                principle=principle,
            )

    await _pause()
    yield SSEEvent(step=StepType.final, content=_FINAL, iteration=iterations)
    await _pause()
    yield SSEEvent(step=StepType.done, content="")


async def mock_run_side_by_side(
    user_prompt: str,
    constitution: list[str],
    iterations: int = 1,
    helpfulness_weight: float = 5.0,
    harmlessness_weight: float = 5.0,
) -> AsyncGenerator[SSEEvent, None]:
    await _pause()
    yield SSEEvent(step=StepType.draft, content=_DRAFT, iteration=0, mode="without")
    async for event in mock_run_with_constitution(
        user_prompt, constitution, iterations, helpfulness_weight, harmlessness_weight
    ):
        yield event
