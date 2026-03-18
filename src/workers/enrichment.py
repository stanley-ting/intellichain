import asyncio
from src.events.redis_client import redis_client
from src.events.streams import publish_workflow_event
from src.config import STREAM_NORMALIZED_EVENTS
from src.models.events import DisruptionEvent


CONSUMER_GROUP = "enrichment_workers"
CONSUMER_NAME = "enrichment_1"


async def process_event(event_data: dict) -> dict:
    """Validate and enrich event data."""
    # Preserve workflow_id before validation
    workflow_id = event_data.get("workflow_id")

    # Validate with Pydantic
    event = DisruptionEvent(**event_data)

    # Enrichment could add more data here
    enriched = event.model_dump(mode="json")
    enriched["enriched"] = True

    # Restore workflow_id
    if workflow_id:
        enriched["workflow_id"] = workflow_id

    return enriched


async def enrichment_worker(stop_event: asyncio.Event):
    """Worker that consumes normalized events and publishes to workflow stream."""
    await redis_client.create_consumer_group(STREAM_NORMALIZED_EVENTS, CONSUMER_GROUP)

    print(f"[Enrichment Worker] Started, consuming from {STREAM_NORMALIZED_EVENTS}")

    while not stop_event.is_set():
        try:
            messages = await redis_client.read_group(
                STREAM_NORMALIZED_EVENTS,
                CONSUMER_GROUP,
                CONSUMER_NAME,
                count=1,
                block=1000,
            )

            for msg_id, data in messages:
                try:
                    print(f"[Enrichment Worker] Processing event: {data.get('event_id', 'unknown')}")
                    enriched = await process_event(data)
                    await publish_workflow_event(enriched)
                    await redis_client.ack(STREAM_NORMALIZED_EVENTS, CONSUMER_GROUP, msg_id)
                    print(f"[Enrichment Worker] Event enriched and forwarded")
                except Exception as e:
                    print(f"[Enrichment Worker] Error processing: {e}")

        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[Enrichment Worker] Error: {e}")
            await asyncio.sleep(1)

    print("[Enrichment Worker] Stopped")
