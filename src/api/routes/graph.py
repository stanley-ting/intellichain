from fastapi import APIRouter, HTTPException, Depends

from src.api.deps import get_db
from src.graph.queries import (
    get_cascading_impact_from_event,
    get_all_entities_with_coords,
    get_entity_connections,
)


router = APIRouter()


@router.get("/impact/{event_id}")
async def get_cascading_impact(event_id: str) -> dict:
    """
    Get cascading impact visualization data for a disruption event.
    Returns affected nodes in layers for animated graph visualization.
    """
    impact = await get_cascading_impact_from_event(event_id)
    if not impact.get("event"):
        raise HTTPException(status_code=404, detail="Event not found")
    return impact


@router.get("/entities")
async def get_entities() -> dict:
    """
    Get all supply chain entities with coordinates for map visualization.
    """
    return await get_all_entities_with_coords()


@router.get("/connections")
async def get_connections() -> list[dict]:
    """
    Get supply chain connections between entities.
    """
    return await get_entity_connections()
