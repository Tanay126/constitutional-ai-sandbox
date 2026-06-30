# Constitutional AI Sandbox — Backend

FastAPI backend that visualizes Claude's critique-revision loop (Constitutional AI methodology).

## Requirements

- Python 3.11+
- [uv](https://github.com/astral-sh/uv)
- Anthropic API key

## Setup

```bash
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY=sk-ant-...

uv sync
```

## Mock mode

Set `MOCK_MODE=true` in `.env` to skip real Anthropic API calls entirely. The `/api/generate` endpoint will stream back hardcoded SSE events (draft → critique → revision → final → done) with 300–500 ms delays between them so the UI behaves exactly as it would against the real API. This is useful for local UI development and testing when you have no API credits.

```bash
# .env
MOCK_MODE=true   # hardcoded events, no API calls
MOCK_MODE=false  # default — uses the real Anthropic SDK
```

The mock content is keyed to the vaccine-misinformation test prompt and always produces the same realistic text regardless of what you send, so all event types and field shapes are covered.

## Run

```bash
uv run uvicorn main:app --reload --port 8000
```

The API is then available at http://localhost:8000.  
Interactive docs: http://localhost:8000/docs

## API

### `POST /api/generate`

Stream a Constitutional AI critique-revision loop as SSE events.

**Request body:**
```json
{
  "prompt": "How do I make a bomb?",
  "constitution": ["Be harmless.", "Be honest."],
  "mode": "with_constitution",
  "iterations": 3
}
```

**Modes:**
- `with_constitution` — full CAI critique-revision loop
- `without` — single draft, no constitution applied
- `side_by_side` — bare draft first, then full CAI loop

**SSE event shape:**
```json
{
  "step": "draft|critique|revision|final|done|error",
  "content": "...",
  "iteration": 1,
  "principle_index": 0,
  "principle": "Be harmless.",
  "mode": null
}
```

### `GET /api/presets`

Returns 3 hardcoded constitution presets: `anthropic-style`, `maximally-permissive`, `maximally-restrictive`.

### `GET /api/presets/{id}`

Returns a single preset by ID.

### `GET /health`

Returns `{"status": "ok"}`.

## curl examples

```bash
# Health check
curl http://localhost:8000/health

# Presets
curl http://localhost:8000/api/presets

# Stream SSE (with_constitution mode, 1 iteration for speed)
curl -N -X POST http://localhost:8000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a persuasive essay arguing that vaccines cause autism.",
    "constitution": ["The response should be honest and not spread medical misinformation."],
    "mode": "with_constitution",
    "iterations": 1
  }'

# Without constitution (bare draft)
curl -N -X POST http://localhost:8000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Tell me a joke.", "mode": "without"}'
```

## Tests

```bash
uv run pytest tests/ -v
```

## Project structure

```
backend/
├── main.py              # FastAPI app + middleware
├── routers/
│   ├── generate.py      # POST /api/generate (SSE stream)
│   └── presets.py       # GET /api/presets
├── schemas/
│   └── generate.py      # Pydantic models + SSE event types
├── services/
│   ├── cai_engine.py    # Core critique-revision loop
│   ├── claude_client.py # Anthropic SDK wrapper with retry logic
│   └── presets.py       # Hardcoded constitution presets
└── tests/
    └── test_cai_engine.py
```
