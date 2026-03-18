from datetime import datetime
from src.models.events import UIEvent, UIEventStatus
from src.events.streams import publish_ui_event


async def emit_node_started(workflow_id: str, node: str, data: dict | None = None):
    """Emit event when a workflow node starts."""
    event = UIEvent(
        event_id=f"{workflow_id}_{node}_start",
        workflow_id=workflow_id,
        node=node,
        status=UIEventStatus.STARTED,
        timestamp=datetime.utcnow(),
        data=data or {},
    )
    await publish_ui_event(event.model_dump(mode="json"))


async def emit_node_completed(workflow_id: str, node: str, data: dict | None = None):
    """Emit event when a workflow node completes."""
    event = UIEvent(
        event_id=f"{workflow_id}_{node}_complete",
        workflow_id=workflow_id,
        node=node,
        status=UIEventStatus.COMPLETED,
        timestamp=datetime.utcnow(),
        data=data or {},
    )
    await publish_ui_event(event.model_dump(mode="json"))


async def emit_node_error(workflow_id: str, node: str, error: str):
    """Emit event when a workflow node errors."""
    event = UIEvent(
        event_id=f"{workflow_id}_{node}_error",
        workflow_id=workflow_id,
        node=node,
        status=UIEventStatus.ERROR,
        timestamp=datetime.utcnow(),
        data={"error": error},
    )
    await publish_ui_event(event.model_dump(mode="json"))


async def emit_cypher_query(
    workflow_id: str,
    node: str,
    query: str,
    result: str | None = None,
    reasoning: str | None = None,
):
    """Emit Cypher query executed by LLM for reasoning panel."""
    event = UIEvent(
        event_id=f"{workflow_id}_{node}_cypher",
        workflow_id=workflow_id,
        node=node,
        status=UIEventStatus.COMPLETED,
        timestamp=datetime.utcnow(),
        data={
            "type": "cypher",
            "query": query,
            "result": result,
            "reasoning": reasoning,
        },
    )
    await publish_ui_event(event.model_dump(mode="json"))


async def emit_llm_reasoning(
    workflow_id: str,
    node: str,
    step: str,
    prompt_summary: str | None = None,
    output_summary: str | None = None,
    thinking: str | None = None,
):
    """Emit LLM reasoning step for transparency panel."""
    event = UIEvent(
        event_id=f"{workflow_id}_{node}_reasoning_{step}",
        workflow_id=workflow_id,
        node=node,
        status=UIEventStatus.COMPLETED,
        timestamp=datetime.utcnow(),
        data={
            "type": "reasoning",
            "step": step,
            "prompt_summary": prompt_summary,
            "output_summary": output_summary,
            "thinking": thinking,
        },
    )
    await publish_ui_event(event.model_dump(mode="json"))
