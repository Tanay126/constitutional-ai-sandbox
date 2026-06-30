"""
Tests for the CAI critique-revision engine.
Uses monkeypatching to avoid real API calls.
"""
from __future__ import annotations

import pytest

from schemas.generate import StepType


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_call_claude(responses: list[str]):
    """Return a fake call_claude that pops from responses list."""
    queue = list(responses)

    def _fake(system: str, user: str, **kwargs) -> str:
        if not queue:
            raise RuntimeError("call_claude called more times than expected")
        return queue.pop(0)

    return _fake


# ---------------------------------------------------------------------------
# run_without_constitution
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_without_constitution_emits_draft_final_done(monkeypatch):
    import services.cai_engine as engine

    monkeypatch.setattr(engine, "call_claude", make_call_claude(["bare response"]))

    events = []
    async for evt in engine.run_without_constitution("tell me a joke"):
        events.append(evt)

    steps = [e.step for e in events]
    assert steps == [StepType.draft, StepType.final, StepType.done]
    assert events[0].content == "bare response"
    assert events[1].content == "bare response"


@pytest.mark.asyncio
async def test_without_constitution_mode_tag(monkeypatch):
    import services.cai_engine as engine

    monkeypatch.setattr(engine, "call_claude", make_call_claude(["x"]))

    events = []
    async for evt in engine.run_without_constitution("hi"):
        events.append(evt)

    assert all(e.mode == "without" for e in events if e.step != StepType.done)


# ---------------------------------------------------------------------------
# run_with_constitution
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_with_constitution_single_principle_one_iteration(monkeypatch):
    import services.cai_engine as engine

    # Sequence: draft, critique(p0), revision(p0)
    monkeypatch.setattr(
        engine, "call_claude",
        make_call_claude(["draft text", "critique text", "revised text"]),
    )

    principles = ["Be honest."]
    events = []
    async for evt in engine.run_with_constitution("hello", principles, iterations=1):
        events.append(evt)

    steps = [e.step for e in events]
    assert steps == [StepType.draft, StepType.critique, StepType.revision, StepType.final, StepType.done]

    assert events[0].content == "draft text"
    assert events[1].content == "critique text"
    assert events[1].principle == "Be honest."
    assert events[1].principle_index == 0
    assert events[1].iteration == 1
    assert events[2].content == "revised text"
    assert events[3].content == "revised text"  # final == last revision


@pytest.mark.asyncio
async def test_with_constitution_two_principles_two_iterations(monkeypatch):
    import services.cai_engine as engine

    principles = ["Principle A", "Principle B"]
    # draft + (critique+revision) * 2 principles * 2 iterations = 1 + 8 = 9 calls
    responses = ["draft"] + [f"resp_{i}" for i in range(8)]
    monkeypatch.setattr(engine, "call_claude", make_call_claude(responses))

    events = []
    async for evt in engine.run_with_constitution("hi", principles, iterations=2):
        events.append(evt)

    draft_events = [e for e in events if e.step == StepType.draft]
    critique_events = [e for e in events if e.step == StepType.critique]
    revision_events = [e for e in events if e.step == StepType.revision]
    final_events = [e for e in events if e.step == StepType.final]
    done_events = [e for e in events if e.step == StepType.done]

    assert len(draft_events) == 1
    assert len(critique_events) == 4   # 2 principles × 2 iterations
    assert len(revision_events) == 4
    assert len(final_events) == 1
    assert len(done_events) == 1


@pytest.mark.asyncio
async def test_revision_becomes_next_input(monkeypatch):
    """The last revision of iteration N should feed into iteration N+1."""
    import services.cai_engine as engine

    call_args: list[tuple[str, str]] = []

    def capturing_claude(system: str, user: str, **kwargs) -> str:
        call_args.append((system, user))
        return f"response_{len(call_args)}"

    monkeypatch.setattr(engine, "call_claude", capturing_claude)

    principles = ["Be helpful."]
    events = []
    async for evt in engine.run_with_constitution("prompt", principles, iterations=2):
        events.append(evt)

    # Call 1: draft
    # Call 2: critique iteration 1
    # Call 3: revision iteration 1  -> produces "response_3"
    # Call 4: critique iteration 2  -> user prompt must contain "response_3"
    # Call 5: revision iteration 2

    critique_iter2_prompt = call_args[3][1]  # 4th call (0-indexed: 3)
    assert "response_3" in critique_iter2_prompt


# ---------------------------------------------------------------------------
# run_side_by_side
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_side_by_side_emits_bare_draft_first(monkeypatch):
    import services.cai_engine as engine

    # bare draft + full CAI (draft + critique + revision + final + done)
    responses = ["bare_draft", "cai_draft", "critique", "revision"]
    monkeypatch.setattr(engine, "call_claude", make_call_claude(responses))

    events = []
    async for evt in engine.run_side_by_side("hi", ["Be helpful."], iterations=1):
        events.append(evt)

    first = events[0]
    assert first.step == StepType.draft
    assert first.mode == "without"
    assert first.content == "bare_draft"


# ---------------------------------------------------------------------------
# Presets
# ---------------------------------------------------------------------------

def test_presets_all_present():
    from services.presets import PRESETS, PRESETS_BY_ID

    assert len(PRESETS) == 3
    ids = {p.id for p in PRESETS}
    assert "anthropic-style" in ids
    assert "maximally-permissive" in ids
    assert "maximally-restrictive" in ids

    for p in PRESETS:
        assert len(p.principles) >= 1
        assert p.name
        assert p.description


def test_presets_by_id_lookup():
    from services.presets import PRESETS_BY_ID

    p = PRESETS_BY_ID["anthropic-style"]
    assert p.id == "anthropic-style"
