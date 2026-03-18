from langgraph.graph import StateGraph, END
from src.workflow.state import RiskState
from src.workflow.nodes import (
    load_event,
    enrich_description,
    persist_event,
    query_graph_for_evidence,
    assess_risk_node,
    query_graph_for_mitigations,
    rank_mitigations_node,
    route_action,
)


def should_continue(state: RiskState) -> str:
    """Check if workflow should continue or exit on error."""
    if state.get("error"):
        return "end"
    return "continue"


def build_workflow() -> StateGraph:
    """Build the LangGraph workflow with LLM-driven graph querying."""
    workflow = StateGraph(RiskState)

    # Add nodes - SSE names kept for frontend compatibility
    workflow.add_node("load_event", load_event)
    workflow.add_node("enrich_description", enrich_description)
    workflow.add_node("persist_event", persist_event)
    workflow.add_node("gather_evidence", query_graph_for_evidence)  # emits as "gather_evidence"
    workflow.add_node("assess_risk", assess_risk_node)
    workflow.add_node("generate_mitigations", query_graph_for_mitigations)  # emits as "generate_mitigations"
    workflow.add_node("rank_mitigations", rank_mitigations_node)
    workflow.add_node("route_action", route_action)

    # Set entry point
    workflow.set_entry_point("load_event")

    # Add edges with error checking
    workflow.add_conditional_edges(
        "load_event",
        should_continue,
        {"continue": "enrich_description", "end": END}
    )
    workflow.add_conditional_edges(
        "enrich_description",
        should_continue,
        {"continue": "persist_event", "end": END}
    )
    workflow.add_conditional_edges(
        "persist_event",
        should_continue,
        {"continue": "gather_evidence", "end": END}
    )
    workflow.add_conditional_edges(
        "gather_evidence",
        should_continue,
        {"continue": "assess_risk", "end": END}
    )
    workflow.add_conditional_edges(
        "assess_risk",
        should_continue,
        {"continue": "generate_mitigations", "end": END}
    )
    workflow.add_conditional_edges(
        "generate_mitigations",
        should_continue,
        {"continue": "rank_mitigations", "end": END}
    )
    workflow.add_conditional_edges(
        "rank_mitigations",
        should_continue,
        {"continue": "route_action", "end": END}
    )
    workflow.add_edge("route_action", END)

    return workflow.compile()


# Compiled workflow instance
risk_workflow = build_workflow()
