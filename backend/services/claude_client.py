from __future__ import annotations

import logging
import time

import anthropic
from anthropic import APIStatusError, APIConnectionError, RateLimitError

logger = logging.getLogger(__name__)

_client: anthropic.Anthropic | None = None

MODEL = "claude-sonnet-4-6"
MAX_TOKENS = 1024


def get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic()
    return _client


def call_claude(
    system: str,
    user: str,
    *,
    max_retries: int = 3,
    base_delay: float = 1.0,
) -> str:
    client = get_client()
    last_exc: Exception | None = None

    for attempt in range(max_retries):
        try:
            message = client.messages.create(
                model=MODEL,
                max_tokens=MAX_TOKENS,
                system=system,
                messages=[{"role": "user", "content": user}],
            )
            return message.content[0].text
        except RateLimitError as e:
            delay = base_delay * (2**attempt)
            logger.warning("Rate limit hit, retrying in %.1fs (attempt %d/%d)", delay, attempt + 1, max_retries)
            last_exc = e
            time.sleep(delay)
        except APIConnectionError as e:
            delay = base_delay * (2**attempt)
            logger.warning("Connection error, retrying in %.1fs (attempt %d/%d)", delay, attempt + 1, max_retries)
            last_exc = e
            time.sleep(delay)
        except APIStatusError as e:
            logger.error("Claude API error %d: %s", e.status_code, e.message)
            raise

    raise RuntimeError(f"Claude API failed after {max_retries} retries") from last_exc
