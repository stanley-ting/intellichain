from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from src.api.deps import get_db
from src.graph.queries import get_workflow_run, list_workflow_runs


router = APIRouter()


class WorkflowResponse(BaseModel):
    workflow_id: str
    status: str
    event: dict | None = None
    risk_level: str | None = None
    risk_assessment: dict | None = None
    ranked_mitigations: list[dict] = []
    recommended_action: dict | None = None
    error: str | None = None


@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(workflow_id: str, db=Depends(get_db)):
    """
    Get workflow state and results.
    """
    workflow = await get_workflow_run(workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    return WorkflowResponse(
        workflow_id=workflow["id"],
        status=workflow.get("status", "unknown"),
        event=workflow.get("event"),
        risk_level=workflow.get("risk_level"),
        risk_assessment=workflow.get("risk_assessment"),
        ranked_mitigations=workflow.get("ranked_mitigations", []),
        recommended_action=workflow.get("recommended_action"),
        error=workflow.get("error"),
    )


@router.get("")
async def list_workflows(db=Depends(get_db), limit: int = 20) -> list[dict]:
    """
    List recent workflow runs.
    """
    workflows = await list_workflow_runs(limit=limit)
    return [
        {
            "id": w["id"],
            "status": w.get("status"),
            "event_id": w.get("event_id"),
            "risk_level": w.get("risk_level"),
            "created_at": str(w.get("created_at")) if w.get("created_at") else None,
        }
        for w in workflows
    ]
