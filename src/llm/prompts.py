RISK_ASSESSMENT_FROM_EVIDENCE_PROMPT = """You are a supply chain risk analyst. Assess this disruption using the graph evidence provided.

## Event
Type: {event_type}
Region: {region}
Severity: {severity}
Description: {event_description}

## Graph Evidence (from knowledge graph queries)
{graph_evidence}

## Task
Analyze the risk and return a JSON object with:
- risk_level: one of "low", "medium", "high", "critical"
- confidence: float 0-1 indicating confidence in assessment
- reasoning: brief explanation (2-3 sentences)
- key_factors: list of 2-4 key factors driving the assessment
- estimated_recovery_days: integer estimate of days to recover
- affected_suppliers: list of supplier IDs/names found in evidence
- affected_skus: list of SKU IDs found in evidence

Use the graph evidence to ground your assessment. Consider:
- Scope of impact (suppliers, SKUs, downstream effects)
- Event severity and type
- Regional significance and historical patterns
- Potential for cascading effects

Return ONLY valid JSON, no markdown."""


MITIGATION_RANKING_FROM_GRAPH_PROMPT = """Rank mitigation options for this supply chain disruption.

## Event Context
Type: {event_type}
Region: {region} (AFFECTED - avoid entities here)
Risk Level: {risk_level}
Description: {event_description}

## Graph Query Results (YOUR ONLY DATA SOURCE)
```
{mitigation_options}
```

## Output Format
Return a JSON array. Each item must have:
- rank: integer (1 = best)
- entity_type: from graph (Supplier/Warehouse/Factory)
- entity_id: EXACT id from graph results above
- entity_name: EXACT name from graph results above
- action: "switch supply to" | "source inventory from" | "expedite production at"
- score: 0.0-1.0 suitability score
- reasoning: 1-2 sentences explaining why

## Ranking Criteria
1. Higher reliability_score = better
2. Different region from affected = better
3. More relevant SKUs = better

If graph results are empty, return: []"""
