# IntelliChain Backend Implementation

## Project Structure

```
intellichain/
├── docker-compose.yml          # Neo4j, Redis, seed, backend services
├── Dockerfile                  # Python 3.12-slim
├── requirements.txt            # FastAPI, langgraph, neo4j, redis, google-generativeai, pydantic
├── src/
│   ├── config.py               # env vars, model names, stream names
│   ├── api/                    # FastAPI layer
│   │   ├── main.py             # app entry, lifespan, CORS, routes
│   │   ├── deps.py             # DI: get_db(), get_redis()
│   │   └── routes/
│   │       ├── disruptions.py  # POST/GET disruptions
│   │       ├── workflow.py     # GET workflow results
│   │       └── stream.py       # SSE endpoint
│   ├── models/
│   │   ├── events.py           # DisruptionEvent, UIEvent, EventType enum
│   │   ├── graph.py            # Supplier, SKU, Warehouse, Factory, Region, Port
│   │   └── mitigations.py      # MitigationCandidate, RankedMitigation, RecommendedAction
│   ├── graph/
│   │   ├── client.py           # Neo4jClient (async)
│   │   ├── schema.py           # constraints + indexes
│   │   └── queries.py          # all Cypher queries
│   ├── events/
│   │   ├── redis_client.py     # RedisClient (streams, consumer groups)
│   │   ├── streams.py          # publish helpers
│   │   └── generators.py       # synthetic event generation
│   ├── llm/
│   │   ├── client.py           # Gemini Flash + Pro calls
│   │   └── prompts.py          # RISK_ASSESSMENT_PROMPT, MITIGATION_RANKING_PROMPT
│   ├── workflow/
│   │   ├── state.py            # RiskState TypedDict
│   │   ├── nodes.py            # 7 workflow nodes
│   │   └── graph.py            # LangGraph StateGraph
│   ├── workers/
│   │   ├── enrichment.py       # consumes normalized.events
│   │   ├── orchestrator.py     # consumes workflow.events, runs LangGraph, persists results
│   │   └── router.py           # starts/stops workers
│   └── observability/
│       └── emitter.py          # emit_node_started/completed/error → ui.events
├── scripts/
│   ├── seed_graph.py           # populates Neo4j with sample data
│   └── run_demo.py             # CLI demo
└── tests/
```

---

## API Endpoints

### Disruptions

**POST /api/disruptions**
```json
Request:
{
  "event_type": "supplier_outage" | "weather" | "port_congestion" | "demand_spike",
  "region": "Asia Pacific" | "Europe" | "Americas",
  "severity": 0.0-1.0,
  "description": "string"
}

Response:
{
  "workflow_id": "uuid",
  "event_id": "uuid",
  "message": "Disruption event created..."
}
```
- Publishes to `normalized.events` stream with workflow_id attached
- Returns immediately (async processing)

**GET /api/disruptions**
- Returns last 50 disruption events from Neo4j
- Includes region_name from AFFECTS relationship

**GET /api/disruptions/{event_id}**
- Returns single event with region_name
- 404 if not found

### Workflows

**GET /api/workflows**
- Returns last 20 workflow runs (summary: id, status, event_id, risk_level, created_at)

**GET /api/workflows/{workflow_id}**
```json
Response:
{
  "workflow_id": "uuid",
  "status": "completed" | "error",
  "event": { DisruptionEvent },
  "risk_level": "low" | "medium" | "high" | "critical",
  "risk_assessment": {
    "risk_level": "string",
    "confidence": 0.0-1.0,
    "reasoning": "string",
    "key_factors": ["string"],
    "estimated_recovery_days": int
  },
  "ranked_mitigations": [
    {
      "mitigation": { MitigationCandidate },
      "rank": 1,
      "score": 0.0-1.0,
      "reasoning": "string"
    }
  ],
  "recommended_action": {
    "mitigation": { RankedMitigation },
    "action_type": "auto" | "manual",
    "confidence": 0.0-1.0,
    "summary": "string"
  },
  "error": "string" | null
}
```

### SSE Stream

**GET /api/workflows/{workflow_id}/stream**
- Server-Sent Events endpoint
- Filters `ui.events` Redis stream for matching workflow_id
- Yields events as they happen:
```
data: {"workflow_id":"abc","node":"load_event","status":"started",...}\n\n
data: {"workflow_id":"abc","node":"load_event","status":"completed",...}\n\n
data: {"workflow_id":"abc","node":"persist_event","status":"started",...}\n\n
...
data: {"done": true}\n\n
```
- Closes when route_action completes or after 60s timeout

---

## Redis Streams

| Stream | Purpose | Producer | Consumer |
|--------|---------|----------|----------|
| `normalized.events` | Raw disruption events | API (create_disruption) | enrichment worker |
| `workflow.events` | Enriched events for workflow | enrichment worker | orchestrator worker |
| `ui.events` | Observable events for frontend | workflow nodes (emitter.py) | SSE endpoint |

**Consumer Groups:**
- `enrichment_workers` on `normalized.events`
- `orchestrator_workers` on `workflow.events`

---

## Neo4j Schema

### Nodes

```
(:Supplier {id, name, reliability_score})
(:SKU {id, name, category})
(:Warehouse {id, name, region, capacity})
(:Factory {id, name, region})
(:Region {id, name})
(:Port {id, name, region})
(:DisruptionEvent {id, type, region, severity, description, timestamp})
(:WorkflowRun {id, status, event_id, risk_level, risk_assessment, ranked_mitigations, recommended_action, error, created_at})
```

### Relationships

```
(:Supplier)-[:SUPPLIES]->(:SKU)
(:Supplier)-[:LOCATED_IN]->(:Region)
(:Supplier)-[:ALTERNATIVE_TO]->(:Supplier)
(:Warehouse)-[:STORES]->(:SKU)
(:Factory)-[:PRODUCES]->(:SKU)
(:DisruptionEvent)-[:AFFECTS]->(:Region)
(:WorkflowRun)-[:TRIGGERED_BY]->(:DisruptionEvent)
```

### Key Queries (in queries.py)

- `get_suppliers_by_region(region)` - suppliers in affected region
- `get_downstream_impact(supplier_id)` - affected SKUs, warehouses, factories
- `get_alternative_suppliers_with_history(supplier_id)` - alternatives WITH recent disruption history (for smart ranking)
- `persist_disruption_event(event)` - save event to graph
- `persist_workflow_run(workflow_id, event_id, result)` - save workflow result
- `get_workflow_run(workflow_id)` - retrieve workflow result
- `list_workflow_runs(limit)` - recent workflows

---

## LangGraph Workflow

### State (RiskState)
```python
{
    "workflow_id": str,
    "event": dict,
    "affected_suppliers": list[str],
    "affected_skus": list[str],
    "downstream_impact": dict,
    "evidence": list[dict],
    "risk_level": str | None,
    "risk_assessment": dict | None,
    "candidate_mitigations": list[dict],
    "regional_context": list[dict],  # disruption history per region
    "ranked_mitigations": list[dict],
    "recommended_action": dict | None,
    "error": str | None
}
```

### Nodes (in order)

1. **load_event** - validate with Pydantic
2. **persist_event** - save to Neo4j (for historical tracking)
3. **gather_evidence** - query Neo4j for affected suppliers/SKUs
4. **assess_risk** - Gemini Pro evaluates severity → returns risk_level, confidence, reasoning
5. **generate_mitigations** - deterministic candidates based on event type + alternatives query (with disruption history)
6. **rank_mitigations** - Gemini Pro ranks candidates, considering regional stability
7. **route_action** - deterministic rules for auto vs manual

Each node emits to `ui.events` via `emit_node_started()` and `emit_node_completed()`.

### Graph Flow
```
load_event → persist_event → gather_evidence → assess_risk
    → generate_mitigations → rank_mitigations → route_action → END
```
Conditional edges check for errors after each node.

---

## Pydantic Models

### EventType (enum)
- weather, supplier_outage, port_congestion, demand_spike

### DisruptionEvent
- event_id, event_type, region, severity (0-1), description, timestamp

### MitigationType (enum)
- switch_supplier, reroute_shipment, increase_inventory, delay_orders, expedite_production

### MitigationCandidate
- id, type, description, affected_skus, estimated_cost, estimated_lead_time_days, alternative_supplier_id

### RiskLevel (enum)
- low, medium, high, critical

### UIEvent
- event_id, workflow_id, node, status (started/completed/error), timestamp, data

---

## LLM Integration

### Models
- **Gemini Flash** (`gemini-2.0-flash`): event description generation
- **Gemini Pro** (`gemini-2.0-pro`): risk assessment, mitigation ranking

### Prompts (prompts.py)

**RISK_ASSESSMENT_PROMPT** - returns JSON:
```json
{
  "risk_level": "high",
  "confidence": 0.85,
  "reasoning": "...",
  "key_factors": ["...", "..."],
  "estimated_recovery_days": 14
}
```

**MITIGATION_RANKING_PROMPT** - includes regional disruption history, returns JSON array:
```json
[
  {"id": "mit_xxx", "rank": 1, "score": 0.9, "reasoning": "..."},
  ...
]
```
Key instruction: "deprioritize suppliers in regions with recent disruptions"

---

## Seed Data (seed_graph.py)

- 3 regions: Asia Pacific, Europe, Americas
- 10 suppliers with LOCATED_IN and ALTERNATIVE_TO relationships
- 20 SKUs with SUPPLIES relationships
- 5 warehouses with STORES relationships
- 3 factories with PRODUCES relationships
- 3 ports

---

## Running

```bash
# Start infrastructure
docker-compose up -d neo4j redis

# Seed graph
python scripts/seed_graph.py

# Start workers (terminal 1)
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

# Start API (terminal 2)
uvicorn src.api.main:app --reload --port 8000

# Test
curl http://localhost:8000/health
curl -X POST http://localhost:8000/api/disruptions \
  -H "Content-Type: application/json" \
  -d '{"event_type":"supplier_outage","region":"Asia Pacific","severity":0.8,"description":"Test"}'
```

---

## Frontend Requirements (for future)

1. **Dashboard page** - list recent disruptions + workflows
2. **Map view** - show suppliers/warehouses geographically (need lat/lng in data)
3. **Create disruption form** - POST to /api/disruptions
4. **Workflow viewer** - connect to SSE, show node progression in real-time
5. **Mitigation review** - show ranked options, allow approve/reject (needs new endpoints)

### Missing endpoints for frontend:
- `GET /api/suppliers` - list all suppliers (for map)
- `GET /api/regions` - list regions with stats
- `POST /api/workflows/{id}/mitigations/{mid}/approve` - user action
- `GET /api/stats/overview` - dashboard stats
