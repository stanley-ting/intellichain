"""Prompts for LLM-driven graph querying."""

GRAPH_EVIDENCE_PROMPT = """You have access to a supply chain knowledge graph.

Schema:
{schema}

Disruption event:
- Type: {event_type}
- Region: {region}
- Severity: {severity}
- Description: {description}

Query for information to assess impact: affected suppliers, SKUs, warehouses, factories in the region.

IMPORTANT Cypher rules:
- Use simple MATCH/WHERE/RETURN patterns
- Filter with WHERE clause AFTER MATCH, not inside list comprehensions
- Example: MATCH (s:Supplier)-[:LOCATED_IN]->(r:Region {{name: '{region}'}}) RETURN s.name, s.reliability_score

Query for suppliers, SKUs, and facilities in the affected region."""

GRAPH_MITIGATION_PROMPT = """Find mitigation options for these EXACT SKUs that were affected:
{affected_skus}

Affected region to EXCLUDE: {affected_region}

Schema:
{schema}

CRITICAL: Use ONLY the exact SKU names listed above. DO NOT invent or modify SKU names.

Query for:
1. Alternative suppliers (in other regions) that supply the EXACT SKUs listed above
2. Warehouses (in other regions) that store the EXACT SKUs listed above
3. Factories (in other regions) that produce the EXACT SKUs listed above

Cypher rules:
- Use WHERE sku.name IN {affected_skus} to match exact names
- Use WHERE r.name <> '{affected_region}' to exclude affected region
- Return entity name, type, region, and which SKU they can supply

Example query:
MATCH (s:Supplier)-[:SUPPLIES]->(sku:SKU), (s)-[:LOCATED_IN]->(r:Region)
WHERE sku.name IN ['Memory Module B2', 'Circuit Board G7'] AND r.name <> 'Europe'
RETURN 'Supplier' as type, s.name as name, r.name as region, sku.name as sku"""
