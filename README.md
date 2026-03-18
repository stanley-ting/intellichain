# IntelliChain

Real-time supply chain risk intelligence system that detects disruptions and automatically generates AI-powered mitigation strategies.

## Overview

IntelliChain uses a knowledge graph + LLMs to proactively surface cascading supply chain risks and rank alternative suppliers based on historical regional disruption patterns.

**Core Flow:**
1. Disruption event detected (e.g., supplier outage in Asia Pacific)
2. Event routed through Redis Streams worker pipeline
3. LangGraph orchestrates 7-node AI workflow:
   - Enriches event with LLM-generated context
   - Queries Neo4j graph for affected suppliers/SKUs/facilities
   - Assesses risk severity with reasoning
   - Generates mitigation options from graph
   - Ranks alternatives by feasibility and regional stability
4. Real-time SSE streams updates to frontend as each node completes

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   FastAPI   │────▶│ Redis Streams│────▶│    Workers      │
│   + SSE     │     │              │     │  (enrichment,   │
└─────────────┘     └──────────────┘     │   orchestrator) │
                                         └────────┬────────┘
                                                  │
                    ┌──────────────┐              │
                    │    Neo4j     │◀─────────────┤
                    │ Knowledge    │              │
                    │   Graph      │              ▼
                    └──────────────┘     ┌─────────────────┐
                                         │   LangGraph     │
                                         │   + Gemini      │
                                         └─────────────────┘
```

### LangGraph Workflow

```
load_event → enrich_description → persist_event → gather_evidence → assess_risk → generate_mitigations → rank_mitigations → route_action
```

Each node emits events to `ui.events` stream for real-time frontend updates.

### Neo4j Graph Model

**Nodes:** `Supplier`, `SKU`, `Warehouse`, `Factory`, `Region`, `Port`, `DisruptionEvent`, `WorkflowRun`

**Key Relationships:**
- `(:Supplier)-[:SUPPLIES]->(:SKU)`
- `(:Supplier)-[:LOCATED_IN]->(:Region)`
- `(:Supplier)-[:ALTERNATIVE_TO]->(:Supplier)`
- `(:DisruptionEvent)-[:AFFECTS]->(:Region)`

## Tech Stack

| Layer | Technology |
|-------|------------|
| API | FastAPI (async) + SSE |
| Event Backbone | Redis Streams + Consumer Groups |
| Knowledge Graph | Neo4j + Cypher |
| Orchestration | LangGraph |
| LLMs | Gemini Flash (fast tasks), Gemini Pro (reasoning) |
| Frontend | Next.js, Tailwind, amCharts (map visualization) |
| Infrastructure | Docker Compose |

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Python 3.11+
- Gemini API key

### Setup

```bash
# Clone and setup
git clone https://github.com/stanley-ting/intellichain.git
cd intellichain

# Create .env file
cp .env.example .env
# Add your GEMINI_API_KEY to .env

# Start everything with Docker
docker-compose up -d

# Or run locally:
docker-compose up -d neo4j redis    # Start infrastructure
python scripts/seed_graph.py        # Seed sample data
uvicorn src.api.main:app --reload --port 8000  # Start API (terminal 1)
python scripts/run_workers.py       # Start workers (terminal 2)
```

### Test the API

```bash
# Health check
curl http://localhost:8000/health

# Create a disruption event
curl -X POST http://localhost:8000/api/disruptions \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "supplier_outage",
    "region": "Asia Pacific",
    "severity": 0.8,
    "description": "Major semiconductor supplier offline due to flooding"
  }'

# Stream workflow progress (SSE)
curl http://localhost:8000/api/workflows/{workflow_id}/stream
```

### Run Demo

```bash
python scripts/run_demo.py
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/disruptions` | Create disruption event, returns workflow_id |
| `GET` | `/api/disruptions` | List recent disruptions |
| `GET` | `/api/workflows/{id}` | Get workflow result |
| `GET` | `/api/workflows/{id}/stream` | SSE stream for real-time updates |
| `GET` | `/health` | Health check |

## Project Structure

```
src/
├── api/              # FastAPI routes + SSE endpoints
├── events/           # Redis Streams client + event generators
├── graph/            # Neo4j client + Cypher queries
├── llm/              # Gemini client + prompts
├── models/           # Pydantic schemas
├── observability/    # Event emitter for SSE
├── workers/          # Redis stream consumers
└── workflow/         # LangGraph nodes + state
frontend/
├── src/
│   ├── app/          # Next.js pages
│   └── components/   # UI components (map, workflow viz, dashboard)
```

## License

MIT
