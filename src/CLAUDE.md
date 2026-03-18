# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start infrastructure
docker-compose up -d neo4j redis

# Seed Neo4j with sample data
python scripts/seed_graph.py

# Run API server
uvicorn src.api.main:app --reload --port 8000

# Run workers (separate terminal - required for processing events)
python -c "
import asyncio
from src.workers.router import run_all_workers
from src.graph.client import neo4j_client
from src.events.redis_client import redis_client
async def main():
    await neo4j_client.connect()
    await redis_client.connect()
    stop, workers = await run_all_workers()
    await asyncio.gather(*workers)
asyncio.run(main())
"

# Run full demo (starts workers + generates event)
python scripts/run_demo.py

# Test API
curl http://localhost:8000/health
curl -X POST http://localhost:8000/api/disruptions \
  -H "Content-Type: application/json" \
  -d '{"event_type":"supplier_outage","region":"Asia Pacific","severity":0.8,"description":"Test"}'
```

## Architecture

### Event Flow (Redis Streams)
```
POST /api/disruptions
    → normalized.events (stream)
    → enrichment_worker
    → workflow.events (stream)
    → orchestrator_worker (runs LangGraph)
    → ui.events (stream) ← emitted by each workflow node
    → GET /api/workflows/{id}/stream (SSE)
```

### LangGraph Workflow (src/workflow/)
7-node pipeline: `load_event → persist_event → gather_evidence → assess_risk → generate_mitigations → rank_mitigations → route_action`

State flows through `RiskState` TypedDict. Each node emits to `ui.events` via `src/observability/emitter.py` for real-time SSE updates.

### Neo4j Graph Model
Nodes: `Supplier`, `SKU`, `Warehouse`, `Factory`, `Region`, `Port`, `DisruptionEvent`, `WorkflowRun`

Key relationships:
- `(:Supplier)-[:SUPPLIES]->(:SKU)`
- `(:Supplier)-[:LOCATED_IN]->(:Region)`
- `(:Supplier)-[:ALTERNATIVE_TO]->(:Supplier)`
- `(:DisruptionEvent)-[:AFFECTS]->(:Region)`

### Key Patterns
- All DB/Redis clients are async singletons (`neo4j_client`, `redis_client`)
- Redis uses consumer groups for worker coordination
- Gemini Flash for event generation, Gemini Pro for reasoning (risk assessment, ranking)
- Pydantic models in `src/models/` define all data shapes
