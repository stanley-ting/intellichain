from typing import TypedDict
from src.models.events import DisruptionEvent
from src.models.mitigations import RankedMitigation, RecommendedAction
from pydantic import BaseModel

class RiskState(TypedDict, total=False):
    workflow_id: str
    event: dict  # DisruptionEvent as dict (may include original_description if enriched)
    # LLM-queried graph data
    graph_evidence: str  # raw evidence from GraphCypherQAChain
    mitigation_options: str  # raw mitigation data from GraphCypherQAChain
    # Legacy fields (still populated by LLM interpretation)
    affected_suppliers: list[str]
    affected_skus: list[str]
    downstream_impact: dict
    evidence: list[dict]
    risk_level: str | None
    risk_assessment: dict | None
    candidate_mitigations: list[dict]
    regional_context: list[dict]  # disruption history per alternative's region
    ranked_mitigations: list[dict]
    recommended_action: dict | None
    error: str | None

class AnalysisModel(BaseModel):
    affected_suppliers : list[str]
    