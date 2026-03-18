from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field
import uuid


class EventType(str, Enum):
    WEATHER = "weather"
    SUPPLIER_OUTAGE = "supplier_outage"
    PORT_CONGESTION = "port_congestion"
    DEMAND_SPIKE = "demand_spike"


class DisruptionEvent(BaseModel):
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_type: EventType
    region: str
    severity: float = Field(ge=0, le=1)
    description: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class UIEventStatus(str, Enum):
    STARTED = "started"
    COMPLETED = "completed"
    ERROR = "error"


class UIEvent(BaseModel):
    event_id: str
    workflow_id: str
    node: str
    status: UIEventStatus
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    data: dict = Field(default_factory=dict)
