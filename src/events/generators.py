import random
from datetime import datetime
from src.models.events import DisruptionEvent, EventType
from src.llm.client import generate_event_description


REGIONS = ["Asia Pacific", "Europe", "Americas"]

EVENT_TEMPLATES = {
    EventType.WEATHER: {
        "contexts": ["typhoon", "flooding", "earthquake", "extreme heat wave"],
        "severity_range": (0.4, 0.9),
    },
    EventType.SUPPLIER_OUTAGE: {
        "contexts": ["factory fire", "equipment failure", "labor strike", "bankruptcy"],
        "severity_range": (0.5, 1.0),
    },
    EventType.PORT_CONGESTION: {
        "contexts": ["vessel backlog", "crane malfunction", "customs delay", "container shortage"],
        "severity_range": (0.3, 0.7),
    },
    EventType.DEMAND_SPIKE: {
        "contexts": ["viral product trend", "competitor shortage", "seasonal surge", "bulk order"],
        "severity_range": (0.2, 0.6),
    },
}


async def generate_synthetic_event(
    event_type: EventType | None = None,
    region: str | None = None,
    use_llm: bool = True
) -> DisruptionEvent:
    """Generate a synthetic disruption event."""
    if event_type is None:
        event_type = random.choice(list(EventType))

    if region is None:
        region = random.choice(REGIONS)

    template = EVENT_TEMPLATES[event_type]
    context = random.choice(template["contexts"])
    severity = random.uniform(*template["severity_range"])

    if use_llm:
        description = await generate_event_description(event_type.value, region, context, severity)
    else:
        description = f"{context.title()} affecting {region} region. Severity: {severity:.1%}"

    return DisruptionEvent(
        event_type=event_type,
        region=region,
        severity=round(severity, 2),
        description=description,
        timestamp=datetime.utcnow(),
    )


def generate_synthetic_event_sync(
    event_type: EventType | None = None,
    region: str | None = None,
) -> DisruptionEvent:
    """Generate a synthetic event without LLM (for testing)."""
    if event_type is None:
        event_type = random.choice(list(EventType))

    if region is None:
        region = random.choice(REGIONS)

    template = EVENT_TEMPLATES[event_type]
    context = random.choice(template["contexts"])
    severity = random.uniform(*template["severity_range"])

    return DisruptionEvent(
        event_type=event_type,
        region=region,
        severity=round(severity, 2),
        description=f"{context.title()} affecting {region} region. Severity: {severity:.1%}",
        timestamp=datetime.utcnow(),
    )
