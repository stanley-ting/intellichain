from src.events.redis_client import redis_client
from src.config import STREAM_NORMALIZED_EVENTS, STREAM_WORKFLOW_EVENTS, STREAM_UI_EVENTS


async def publish_normalized_event(event_data: dict) -> str:
    """Publish a disruption event to the normalized events stream."""
    return await redis_client.publish_to_stream(STREAM_NORMALIZED_EVENTS, event_data)


async def publish_workflow_event(event_data: dict) -> str:
    """Publish workflow state to the workflow events stream."""
    return await redis_client.publish_to_stream(STREAM_WORKFLOW_EVENTS, event_data)


async def publish_ui_event(event_data: dict) -> str:
    """Publish UI-observable event."""
    return await redis_client.publish_to_stream(STREAM_UI_EVENTS, event_data)
