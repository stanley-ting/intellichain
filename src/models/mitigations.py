from enum import Enum
from pydantic import BaseModel, Field


class MitigationType(str, Enum):
    SWITCH_SUPPLIER = "switch_supplier"
    REROUTE_SHIPMENT = "reroute_shipment"
    INCREASE_INVENTORY = "increase_inventory"
    DELAY_ORDERS = "delay_orders"
    EXPEDITE_PRODUCTION = "expedite_production"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class MitigationCandidate(BaseModel):
    id: str
    type: MitigationType
    description: str
    affected_skus: list[str] = Field(default_factory=list)
    estimated_cost: float = 0
    estimated_lead_time_days: int = 0
    alternative_supplier_id: str | None = None


class RankedMitigation(BaseModel):
    mitigation: MitigationCandidate
    rank: int
    score: float = Field(ge=0, le=1)
    reasoning: str


class RecommendedAction(BaseModel):
    mitigation: RankedMitigation
    action_type: str  # "auto" or "manual"
    confidence: float = Field(ge=0, le=1)
    summary: str
