import asyncio
from src.events.redis_client import redis_client
from src.config import STREAM_WORKFLOW_EVENTS
from src.workflow.graph import risk_workflow
from src.graph.queries import persist_workflow_run


CONSUMER_GROUP = "orchestrator_workers"
CONSUMER_NAME = "orchestrator_1"


async def orchestrator_worker(stop_event: asyncio.Event, result_queue: asyncio.Queue | None = None):
    """Worker that executes the LangGraph workflow on incoming events."""
    await redis_client.create_consumer_group(STREAM_WORKFLOW_EVENTS, CONSUMER_GROUP)

    print(f"[Orchestrator Worker] Started, consuming from {STREAM_WORKFLOW_EVENTS}")

    while not stop_event.is_set():
        try:
            messages = await redis_client.read_group(
                STREAM_WORKFLOW_EVENTS,
                CONSUMER_GROUP,
                CONSUMER_NAME,
                count=1,
                block=1000,
            )

            for msg_id, data in messages:
                try:
                    event_id = data.get("event_id", "unknown")
                    workflow_id = data.get("workflow_id", event_id)  # fallback to event_id
                    print(f"[Orchestrator Worker] Running workflow {workflow_id} for event: {event_id}")

                    # Execute workflow
                    initial_state = {"event": data, "workflow_id": workflow_id}
                    result = await risk_workflow.ainvoke(initial_state)

                    if result.get("error"):
                        print(f"[Orchestrator Worker] Workflow error: {result['error']}")
                    else:
                        rec = result.get("recommended_action")
                        if rec:
                            print(f"[Orchestrator Worker] Recommendation: {rec['summary']}")

                    # Persist workflow result to Neo4j
                    await persist_workflow_run(workflow_id, event_id, result)
                    print(f"[Orchestrator Worker] Persisted workflow {workflow_id}")

                    # Put result in queue for demo script
                    if result_queue:
                        await result_queue.put(result)

                    await redis_client.ack(STREAM_WORKFLOW_EVENTS, CONSUMER_GROUP, msg_id)

                except Exception as e:
                    print(f"[Orchestrator Worker] Error: {e}")
                    import traceback
                    traceback.print_exc()

        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[Orchestrator Worker] Error: {e}")
            await asyncio.sleep(1)

    print("[Orchestrator Worker] Stopped")
