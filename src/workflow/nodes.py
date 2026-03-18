import uuid
import json
from src.workflow.state import RiskState
from src.workflow.prompts import GRAPH_EVIDENCE_PROMPT, GRAPH_MITIGATION_PROMPT
from src.models.events import DisruptionEvent
from src.graph.queries import persist_disruption_event
from src.llm.client import assess_risk_from_evidence, rank_mitigations_from_graph, enrich_event_description
from src.observability.emitter import emit_node_started, emit_node_completed, emit_node_error, emit_cypher_query, emit_llm_reasoning
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_neo4j import Neo4jGraph, GraphCypherQAChain
from src.config import NEO4J_USER, NEO4J_URI, NEO4J_PASSWORD, GEMINI_PRO_MODEL

# Initialize graph and cypher chain
graph = Neo4jGraph(url=NEO4J_URI, password=NEO4J_PASSWORD, username=NEO4J_USER)
cypher_chain = GraphCypherQAChain.from_llm(
    graph=graph,
    llm=ChatGoogleGenerativeAI(model=GEMINI_PRO_MODEL),
    verbose=True,
    return_intermediate_steps=True,
    allow_dangerous_requests=True,
)


async def load_event(state: RiskState) -> RiskState:
    """Parse and validate incoming event."""
    workflow_id = state.get("workflow_id", str(uuid.uuid4()))
    await emit_node_started(workflow_id, "load_event")

    try:
        event_data = state["event"]
        event = DisruptionEvent(**event_data)
        await emit_node_completed(workflow_id, "load_event", {"event_id": event.event_id})
        return {"workflow_id": workflow_id, "event": event.model_dump(mode="json")}
    except Exception as e:
        await emit_node_error(workflow_id, "load_event", str(e))
        return {"workflow_id": workflow_id, "error": str(e)}


async def enrich_description(state: RiskState) -> RiskState:
    """Enrich sparse user description with LLM-generated details."""
    workflow_id = state["workflow_id"]
    await emit_node_started(workflow_id, "enrich_description")

    try:
        event = state["event"]
        user_desc = event["description"]

        # Enrich if description is short (< 100 chars)
        if len(user_desc) < 100:
            enriched = await enrich_event_description(
                event_type=event["event_type"],
                region=event["region"],
                user_description=user_desc,
                severity=event["severity"],
            )
            event = {**event, "description": enriched, "original_description": user_desc}

        await emit_node_completed(workflow_id, "enrich_description", {
            "enriched": len(user_desc) < 100,
            "description_length": len(event["description"]),
        })
        return {"event": event}
    except Exception as e:
        await emit_node_error(workflow_id, "enrich_description", str(e))
        return {"error": str(e)}


async def persist_event(state: RiskState) -> RiskState:
    """Persist the disruption event to Neo4j for historical tracking."""
    workflow_id = state["workflow_id"]
    await emit_node_started(workflow_id, "persist_event")

    try:
        event = state["event"]
        await persist_disruption_event(event)
        await emit_node_completed(workflow_id, "persist_event", {"event_id": event["event_id"]})
        return {}
    except Exception as e:
        await emit_node_error(workflow_id, "persist_event", str(e))
        return {"error": str(e)}


async def query_graph_for_evidence(state: RiskState) -> RiskState:
    """LLM autonomously queries graph for relevant evidence about the disruption."""
    workflow_id = state["workflow_id"]
    await emit_node_started(workflow_id, "gather_evidence")

    try:
        event = state["event"]
        prompt = GRAPH_EVIDENCE_PROMPT.format(
            schema=graph.schema,
            event_type=event["event_type"],
            region=event["region"],
            severity=event["severity"],
            description=event["description"],
        )

        # LLM decides what to query, chain executes
        result = await cypher_chain.ainvoke({"query": prompt})

        # Extract the result - chain returns dict with 'result' and 'intermediate_steps'
        graph_evidence = result.get("result", str(result))

        # Extract and emit Cypher query for reasoning panel
        intermediate_steps = result.get("intermediate_steps", [])
        if intermediate_steps:
            cypher_query = intermediate_steps[0].get("query", "")
            query_result = intermediate_steps[0].get("context", "")
            await emit_cypher_query(
                workflow_id,
                "gather_evidence",
                query=cypher_query,
                result=str(query_result)[:500] if query_result else None,
                reasoning=f"Finding suppliers, SKUs, and facilities affected by {event['event_type']} in {event['region']}",
            )

        await emit_node_completed(workflow_id, "gather_evidence", {
            "evidence_length": len(str(graph_evidence)),
        })

        return {"graph_evidence": str(graph_evidence)}
    except Exception as e:
        await emit_node_error(workflow_id, "gather_evidence", str(e))
        return {"error": str(e)}


async def assess_risk_node(state: RiskState) -> RiskState:
    """Use Gemini Pro to assess risk based on LLM-queried evidence."""
    workflow_id = state["workflow_id"]
    await emit_node_started(workflow_id, "assess_risk")

    try:
        event = state["event"]
        graph_evidence = state.get("graph_evidence", "No evidence gathered")

        # Emit what we're asking the LLM
        await emit_llm_reasoning(
            workflow_id,
            "assess_risk",
            step="prompt",
            prompt_summary=f"Analyze {event['event_type']} in {event['region']} with {len(graph_evidence)} chars of graph evidence",
            thinking="Evaluating severity, affected entities, and recovery timeline based on graph data...",
        )

        assessment = await assess_risk_from_evidence(
            event_description=event["description"],
            event_type=event["event_type"],
            region=event["region"],
            severity=event["severity"],
            graph_evidence=graph_evidence,
        )

        # Emit the LLM's reasoning
        await emit_llm_reasoning(
            workflow_id,
            "assess_risk",
            step="output",
            output_summary=f"Risk: {assessment.get('risk_level', 'unknown').upper()} | Confidence: {assessment.get('confidence', 0):.0%}",
            thinking=assessment.get("reasoning", "")[:300],
        )

        await emit_node_completed(workflow_id, "assess_risk", {
            "risk_level": assessment.get("risk_level"),
            "confidence": assessment.get("confidence"),
        })

        return {
            "risk_level": assessment.get("risk_level"),
            "risk_assessment": assessment,
            # Extract structured data from LLM assessment
            "affected_suppliers": assessment.get("affected_suppliers", []),
            "affected_skus": assessment.get("affected_skus", []),
        }
    except Exception as e:
        await emit_node_error(workflow_id, "assess_risk", str(e))
        return {"error": str(e)}


async def query_graph_for_mitigations(state: RiskState) -> RiskState:
    """LLM autonomously queries graph for mitigation options."""
    workflow_id = state["workflow_id"]
    await emit_node_started(workflow_id, "generate_mitigations")

    try:
        graph_evidence = state.get("graph_evidence", "")

        # Extract actual SKU names from evidence (parse the JSON-like string)
        import re
        sku_pattern = r"'sku':\s*'([^']+)'"
        skus_from_evidence = list(set(re.findall(sku_pattern, graph_evidence)))

        # Fallback: try to get from risk assessment
        if not skus_from_evidence:
            risk_assessment = state.get("risk_assessment", {})
            skus_from_evidence = risk_assessment.get("affected_skus", [])

        # Format as list for the prompt
        affected_skus_str = str(skus_from_evidence) if skus_from_evidence else "[]"

        prompt = GRAPH_MITIGATION_PROMPT.format(
            affected_skus=affected_skus_str,
            schema=graph.schema,
            affected_region=state["event"]["region"],
        )

        result = await cypher_chain.ainvoke({"query": prompt})
        mitigation_options = result.get("result", str(result))

        # Extract and emit Cypher query for reasoning panel
        intermediate_steps = result.get("intermediate_steps", [])
        if intermediate_steps:
            cypher_query = intermediate_steps[0].get("query", "")
            query_result = intermediate_steps[0].get("context", "")
            await emit_cypher_query(
                workflow_id,
                "generate_mitigations",
                query=cypher_query,
                result=str(query_result)[:500] if query_result else None,
                reasoning="Searching for alternative suppliers and backup facilities to mitigate disruption",
            )

        await emit_node_completed(workflow_id, "generate_mitigations", {
            "options_length": len(str(mitigation_options)),
        })

        return {"mitigation_options": str(mitigation_options)}
    except Exception as e:
        await emit_node_error(workflow_id, "generate_mitigations", str(e))
        return {"error": str(e)}


async def rank_mitigations_node(state: RiskState) -> RiskState:
    """Use Gemini Pro to rank graph-discovered mitigation options."""
    workflow_id = state["workflow_id"]
    await emit_node_started(workflow_id, "rank_mitigations")

    try:
        event = state["event"]
        mitigation_options = state.get("mitigation_options", "")
        risk_level = state.get("risk_level", "medium")

        if not mitigation_options:
            await emit_node_completed(workflow_id, "rank_mitigations", {"ranked": 0})
            return {"ranked_mitigations": []}

        # Emit what we're asking the LLM
        await emit_llm_reasoning(
            workflow_id,
            "rank_mitigations",
            step="prompt",
            prompt_summary=f"Rank mitigation options for {risk_level} risk {event['event_type']}",
            thinking="Scoring alternatives by reliability, regional stability, and capacity...",
        )

        ranked = await rank_mitigations_from_graph(
            event_description=event["description"],
            event_type=event["event_type"],
            region=event["region"],
            risk_level=risk_level,
            mitigation_options=mitigation_options,
        )

        # Emit the LLM's ranking decision
        top_3 = [f"{m.get('entity_name')} ({m.get('score', 0):.0%})" for m in ranked[:3]]
        await emit_llm_reasoning(
            workflow_id,
            "rank_mitigations",
            step="output",
            output_summary=f"Top picks: {', '.join(top_3)}" if top_3 else "No alternatives found",
            thinking=ranked[0].get("reasoning", "")[:200] if ranked else "",
        )

        await emit_node_completed(workflow_id, "rank_mitigations", {
            "top_entity": ranked[0].get("entity_name") if ranked else None,
            "total_ranked": len(ranked),
        })

        return {"ranked_mitigations": ranked}
    except Exception as e:
        await emit_node_error(workflow_id, "rank_mitigations", str(e))
        return {"error": str(e)}


async def route_action(state: RiskState) -> RiskState:
    """Select the top recommended mitigation."""
    workflow_id = state["workflow_id"]
    await emit_node_started(workflow_id, "route_action")

    try:
        ranked = state.get("ranked_mitigations", [])
        if not ranked:
            await emit_node_completed(workflow_id, "route_action", {"action": "none"})
            return {"recommended_action": None}

        top = ranked[0]
        recommended = {
            "mitigation": top,
            "summary": f"{top.get('action', 'Use')} {top.get('entity_name', 'unknown')}",
        }

        await emit_node_completed(workflow_id, "route_action", {
            "entity": top.get("entity_name"),
            "score": top.get("score"),
        })

        return {"recommended_action": recommended}
    except Exception as e:
        await emit_node_error(workflow_id, "route_action", str(e))
        return {"error": str(e)}
