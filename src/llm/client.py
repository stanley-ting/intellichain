import google.generativeai as genai
from src.config import GEMINI_API_KEY, GEMINI_FLASH_MODEL, GEMINI_PRO_MODEL


genai.configure(api_key=GEMINI_API_KEY)

flash_model = genai.GenerativeModel(GEMINI_FLASH_MODEL)
pro_model = genai.GenerativeModel(GEMINI_PRO_MODEL)

# Strict model for graph-grounded tasks - prevents hallucination
pro_model_strict = genai.GenerativeModel(
    GEMINI_PRO_MODEL,
    system_instruction="""You are a supply chain analyst that ONLY uses data from the knowledge graph.

CRITICAL RULES:
1. You may ONLY reference entities (suppliers, warehouses, factories) that appear in the provided graph data
2. You must use the EXACT entity_id and entity_name values from the graph query results
3. If the graph data is empty or insufficient, return an empty array [] - do NOT invent entities
4. Never fabricate company names, IDs, or data that wasn't explicitly provided
5. If you're unsure whether an entity exists in the data, exclude it

Violation of these rules causes real business harm. Only output what the graph data supports."""
)


async def enrich_event_description(
    event_type: str,
    region: str,
    user_description: str,
    severity: float
) -> str:
    """Use Gemini Flash to enrich a sparse user description into a detailed event description."""
    prompt = f"""Enrich this supply chain disruption into a detailed, realistic description. DO NOT CHANGE THE NAME OF THE USER INPUT.

Event type: {event_type}
Region: {region}
User input: {user_description}
Severity: {severity:.0%}

Write 2-3 sentences expanding on the user's input with realistic details (specific impacts, timelines). Keep the core facts from user input. Do not mention severity percentage."""

    response = await flash_model.generate_content_async(prompt)
    return response.text.strip()


async def assess_risk_from_evidence(
    event_description: str,
    event_type: str,
    region: str,
    severity: float,
    graph_evidence: str,
) -> dict:
    """Use Gemini Pro to assess risk based on LLM-queried graph evidence."""
    from src.llm.prompts import RISK_ASSESSMENT_FROM_EVIDENCE_PROMPT
    import json

    prompt = RISK_ASSESSMENT_FROM_EVIDENCE_PROMPT.format(
        event_description=event_description,
        event_type=event_type,
        region=region,
        severity=severity,
        graph_evidence=graph_evidence,
    )

    response = await pro_model.generate_content_async(
        prompt,
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json",
        )
    )

    return json.loads(response.text)


async def rank_mitigations_from_graph(
    event_description: str,
    event_type: str,
    region: str,
    risk_level: str,
    mitigation_options: str,
) -> list[dict]:
    """Use Gemini Pro (strict mode) to rank graph-discovered mitigations."""
    from src.llm.prompts import MITIGATION_RANKING_FROM_GRAPH_PROMPT
    import json

    prompt = MITIGATION_RANKING_FROM_GRAPH_PROMPT.format(
        event_description=event_description,
        event_type=event_type,
        region=region,
        risk_level=risk_level,
        mitigation_options=mitigation_options,
    )

    response = await pro_model_strict.generate_content_async(
        prompt,
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json",
        )
    )

    return json.loads(response.text)
