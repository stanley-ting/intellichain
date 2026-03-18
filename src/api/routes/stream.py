import json
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from src.api.deps import get_redis
from src.config import STREAM_UI_EVENTS


router = APIRouter()


@router.get("/{workflow_id}/stream")
async def stream_workflow_events(workflow_id: str, redis=Depends(get_redis)):
    """
    SSE endpoint for real-time workflow updates.
    Replays historical events first, then streams live updates.
    """

    async def event_generator():
        # First, replay historical events for this workflow
        last_id = "0"  # Start from beginning to get history
        found_completion = False
        historical_count = 0

        # Read all existing messages (non-blocking)
        while True:
            messages = await redis.read_stream(
                STREAM_UI_EVENTS,
                last_id,
                count=100,
                block=None,  # Non-blocking for history
            )

            if not messages:
                break

            for msg_id, data in messages:
                last_id = msg_id

                # Filter for this workflow
                if data.get("workflow_id") != workflow_id:
                    continue

                historical_count += 1
                yield f"data: {json.dumps(data)}\n\n"

                # Check if workflow already completed
                if data.get("node") == "route_action" and data.get("status") == "completed":
                    found_completion = True

                if data.get("status") == "error":
                    found_completion = True

        # If workflow already completed, we're done
        if found_completion:
            yield f"data: {json.dumps({'done': True, 'historical': True})}\n\n"
            return

        # Otherwise, continue with live streaming
        timeout_count = 0
        max_timeouts = 60  # stop after 60 seconds of no events

        while timeout_count < max_timeouts:
            messages = await redis.read_stream(
                STREAM_UI_EVENTS,
                last_id,
                count=10,
                block=1000,  # 1 second
            )

            if not messages:
                timeout_count += 1
                continue

            timeout_count = 0  # reset on activity

            for msg_id, data in messages:
                last_id = msg_id

                # Filter for this workflow
                if data.get("workflow_id") != workflow_id:
                    continue

                # Yield as SSE
                yield f"data: {json.dumps(data)}\n\n"

                # Stop if workflow completed or errored
                if data.get("node") == "route_action" and data.get("status") == "completed":
                    yield f"data: {json.dumps({'done': True})}\n\n"
                    return

                if data.get("status") == "error":
                    yield f"data: {json.dumps({'done': True, 'error': True})}\n\n"
                    return

        # Timeout reached
        yield f"data: {json.dumps({'done': True, 'timeout': True})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )

