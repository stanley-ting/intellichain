import uuid
from datetime import UTC, datetime
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from src.models.events import EventType, DisruptionEvent
from src.events.streams import publish_normalized_event
from src.api.deps import get_db, get_redis


router = APIRouter()


# Request/Response schemas
class CreateDisruptionRequest(BaseModel):
    event_type: EventType
    region: str
    severity: float = Field(ge=0, le=1)
    description: str


class CreateDisruptionResponse(BaseModel):
    workflow_id: str
    event_id: str
    message: str


@router.post("", response_model=CreateDisruptionResponse)
async def create_disruption(request: CreateDisruptionRequest):
    workflow_id = str(uuid.uuid4())
    event_id = str(uuid.uuid4())

    event = DisruptionEvent(
        event_id = event_id,
        event_type = request.event_type,
        region = request.region,
        severity = request.severity,
        description= request.description,
        timestamp = datetime.now(tz = UTC)
    )

    await publish_normalized_event({
        **event.model_dump(mode="json"),
        "workflow_id": workflow_id,
    })
    
    return CreateDisruptionResponse(
        workflow_id=workflow_id,
        event_id=event_id,
        message= f"Disruption event created {event_id}"
    )

def _convert_neo4j_types(obj):
    """Recursively convert neo4j types to JSON-serializable types."""
    from neo4j.time import DateTime
    if isinstance(obj, dict):
        return {k: _convert_neo4j_types(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_convert_neo4j_types(v) for v in obj]
    elif isinstance(obj, DateTime):
        return obj.isoformat()
    return obj


def _format_disruption(event: dict) -> dict:
    """Format disruption event for API response."""
    converted = _convert_neo4j_types(event)
    # Rename fields to match frontend expectations
    return {
        "event_id": converted.get("id"),
        "event_type": converted.get("type"),
        "region": converted.get("region"),
        "severity": converted.get("severity"),
        "description": converted.get("description"),
        "timestamp": converted.get("timestamp"),
        "region_name": converted.get("region_name"),
    }


@router.get("")
async def list_disruptions(db=Depends(get_db)) -> list[dict]:
    """
    List recent disruption events from Neo4j.
    """
    query = """
    MATCH (e:DisruptionEvent)
    OPTIONAL MATCH (e)-[:AFFECTS]->(r:Region)
    RETURN e {.*, region_name: r.name} as event
    ORDER BY e.timestamp DESC
    LIMIT 50
    """
    results = await db.execute(query)
    return [_format_disruption(r["event"]) for r in results]


@router.get("/{event_id}")
async def get_disruption(event_id: str, db=Depends(get_db)) -> dict:
    """
    Get a single disruption event by ID.
    """
    query = """
    MATCH (e:DisruptionEvent {id: $event_id})
    OPTIONAL MATCH (e)-[:AFFECTS]->(r:Region)
    RETURN e {.*, region_name: r.name} as event
    """
    results = await db.execute(query, {"event_id": event_id})
    if not results:
        raise HTTPException(status_code=404, detail="Event not found")
    return _format_disruption(results[0]["event"])
