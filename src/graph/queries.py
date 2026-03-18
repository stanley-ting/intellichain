from src.graph.client import neo4j_client


async def get_suppliers_by_region(region: str) -> list[dict]:
    """Get all suppliers in a region."""
    query = """
    MATCH (s:Supplier)-[:LOCATED_IN]->(r:Region {name: $region})
    RETURN s.id as id, s.name as name, s.reliability_score as reliability_score
    """
    return await neo4j_client.execute(query, {"region": region})


async def get_skus_by_supplier(supplier_id: str) -> list[dict]:
    """Get all SKUs supplied by a supplier."""
    query = """
    MATCH (s:Supplier {id: $supplier_id})-[:SUPPLIES]->(sku:SKU)
    RETURN sku.id as id, sku.name as name, sku.category as category
    """
    return await neo4j_client.execute(query, {"supplier_id": supplier_id})


async def get_downstream_impact(supplier_id: str) -> dict:
    """
    Traverse graph to find all downstream impact from a supplier disruption.
    Returns affected SKUs, warehouses, and factories.
    """
    query = """
    MATCH (s:Supplier {id: $supplier_id})-[:SUPPLIES]->(sku:SKU)
    OPTIONAL MATCH (w:Warehouse)-[:STORES]->(sku)
    OPTIONAL MATCH (f:Factory)-[:PRODUCES]->(sku)
    RETURN
        collect(DISTINCT sku.id) as affected_skus,
        collect(DISTINCT w.id) as affected_warehouses,
        collect(DISTINCT f.id) as affected_factories
    """
    results = await neo4j_client.execute(query, {"supplier_id": supplier_id})
    if results:
        return results[0]
    return {"affected_skus": [], "affected_warehouses": [], "affected_factories": []}


async def get_alternative_suppliers(supplier_id: str) -> list[dict]:
    """Get alternative suppliers for a given supplier."""
    query = """
    MATCH (s:Supplier {id: $supplier_id})-[:ALTERNATIVE_TO]->(alt:Supplier)
    RETURN alt.id as id, alt.name as name, alt.reliability_score as reliability_score
    ORDER BY alt.reliability_score DESC
    """
    return await neo4j_client.execute(query, {"supplier_id": supplier_id})


async def get_suppliers_for_sku(sku_id: str) -> list[dict]:
    """Get all suppliers that can supply a specific SKU."""
    query = """
    MATCH (s:Supplier)-[:SUPPLIES]->(sku:SKU {id: $sku_id})
    RETURN s.id as id, s.name as name, s.reliability_score as reliability_score
    ORDER BY s.reliability_score DESC
    """
    return await neo4j_client.execute(query, {"sku_id": sku_id})


async def persist_disruption_event(event: dict) -> None:
    """Persist a disruption event to the graph and link to affected region."""
    query = """
    MERGE (e:DisruptionEvent {id: $event_id})
    SET e.type = $event_type,
        e.region = $region,
        e.severity = $severity,
        e.description = $description,
        e.timestamp = datetime($timestamp)
    WITH e
    MATCH (r:Region {name: $region})
    MERGE (e)-[:AFFECTS]->(r)
    """
    await neo4j_client.execute_write(query, {
        "event_id": event["event_id"],
        "event_type": event["event_type"],
        "region": event["region"],
        "severity": event["severity"],
        "description": event["description"],
        "timestamp": event["timestamp"],
    })


async def get_alternative_suppliers_with_history(
    supplier_id: str,
    lookback_days: int = 30
) -> list[dict]:
    """
    Get alternative suppliers with their recent disruption history.
    Returns alternatives sorted by: fewest recent disruptions, then reliability.
    """
    query = """
    MATCH (s:Supplier {id: $supplier_id})-[:ALTERNATIVE_TO]->(alt:Supplier)
    MATCH (alt)-[:LOCATED_IN]->(r:Region)
    OPTIONAL MATCH (r)<-[:AFFECTS]-(e:DisruptionEvent)
    WHERE e.timestamp > datetime() - duration({days: $lookback_days})
    WITH alt, r,
         collect(CASE WHEN e IS NOT NULL THEN {
             type: e.type,
             severity: e.severity,
             timestamp: toString(e.timestamp)
         } END) as disruptions
    RETURN
        alt.id as id,
        alt.name as name,
        alt.reliability_score as reliability_score,
        r.name as region,
        [d IN disruptions WHERE d IS NOT NULL] as recent_disruptions,
        size([d IN disruptions WHERE d IS NOT NULL]) as disruption_count
    ORDER BY disruption_count ASC, alt.reliability_score DESC
    """
    return await neo4j_client.execute(query, {
        "supplier_id": supplier_id,
        "lookback_days": lookback_days,
    })


async def get_regional_disruption_summary(lookback_days: int = 30) -> list[dict]:
    """Get summary of recent disruptions by region."""
    query = """
    MATCH (r:Region)
    OPTIONAL MATCH (r)<-[:AFFECTS]-(e:DisruptionEvent)
    WHERE e.timestamp > datetime() - duration({days: $lookback_days})
    WITH r, collect(e {.type, .severity, .timestamp}) as events
    RETURN
        r.name as region,
        size([e IN events WHERE e IS NOT NULL]) as disruption_count,
        [e IN events WHERE e IS NOT NULL] as recent_events
    ORDER BY disruption_count DESC
    """
    return await neo4j_client.execute(query, {"lookback_days": lookback_days})


async def persist_workflow_run(workflow_id: str, event_id: str, result: dict) -> None:
    """Persist workflow run results to Neo4j."""
    import json
    query = """
    MERGE (w:WorkflowRun {id: $workflow_id})
    SET w.status = $status,
        w.event_id = $event_id,
        w.risk_level = $risk_level,
        w.risk_assessment = $risk_assessment,
        w.ranked_mitigations = $ranked_mitigations,
        w.recommended_action = $recommended_action,
        w.error = $error,
        w.created_at = datetime()
    WITH w
    MATCH (e:DisruptionEvent {id: $event_id})
    MERGE (w)-[:TRIGGERED_BY]->(e)
    """
    status = "error" if result.get("error") else "completed"
    await neo4j_client.execute_write(query, {
        "workflow_id": workflow_id,
        "event_id": event_id,
        "status": status,
        "risk_level": result.get("risk_level"),
        "risk_assessment": json.dumps(result.get("risk_assessment")) if result.get("risk_assessment") else None,
        "ranked_mitigations": json.dumps(result.get("ranked_mitigations", [])),
        "recommended_action": json.dumps(result.get("recommended_action")) if result.get("recommended_action") else None,
        "error": result.get("error"),
    })


def _convert_neo4j_types(obj):
    """Recursively convert neo4j types to JSON-serializable types."""
    from neo4j.time import DateTime
    if isinstance(obj, dict):
        return {k: _convert_neo4j_types(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_convert_neo4j_types(v) for v in obj]
    elif isinstance(obj, DateTime):
        return obj.isoformat()
    return obj


async def get_workflow_run(workflow_id: str) -> dict | None:
    """Get a workflow run by ID."""
    import json
    query = """
    MATCH (w:WorkflowRun {id: $workflow_id})
    OPTIONAL MATCH (w)-[:TRIGGERED_BY]->(e:DisruptionEvent)
    RETURN w {.*} as workflow, e {.*} as event
    """
    results = await neo4j_client.execute(query, {"workflow_id": workflow_id})
    if not results:
        return None

    row = results[0]
    workflow = _convert_neo4j_types(row["workflow"])

    # Parse JSON fields back to dicts
    if workflow.get("risk_assessment"):
        workflow["risk_assessment"] = json.loads(workflow["risk_assessment"])
    if workflow.get("ranked_mitigations"):
        workflow["ranked_mitigations"] = json.loads(workflow["ranked_mitigations"])
    if workflow.get("recommended_action"):
        workflow["recommended_action"] = json.loads(workflow["recommended_action"])

    workflow["event"] = _convert_neo4j_types(row["event"])
    return workflow


async def get_cascading_impact_from_event(event_id: str) -> dict:
    """
    Get cascading impact visualization data for a disruption event.
    Returns nodes in layers: region → suppliers → SKUs → warehouses/factories.
    """
    query = """
    MATCH (e:DisruptionEvent {id: $event_id})-[:AFFECTS]->(r:Region)
    OPTIONAL MATCH (s:Supplier)-[:LOCATED_IN]->(r)
    OPTIONAL MATCH (s)-[:SUPPLIES]->(sku:SKU)
    OPTIONAL MATCH (w:Warehouse)-[:STORES]->(sku)
    OPTIONAL MATCH (f:Factory)-[:PRODUCES]->(sku)
    WITH e, r,
         collect(DISTINCT s {.id, .name, .reliability_score, .lat, .lng}) as suppliers,
         collect(DISTINCT sku {.id, .name, .category}) as skus,
         collect(DISTINCT w {.id, .name, .capacity, .lat, .lng}) as warehouses,
         collect(DISTINCT f {.id, .name, .lat, .lng}) as factories
    RETURN {
        event: e {.id, .type, .severity, .region},
        region: r {.id, .name},
        suppliers: [s IN suppliers WHERE s.id IS NOT NULL],
        skus: [sku IN skus WHERE sku.id IS NOT NULL],
        warehouses: [w IN warehouses WHERE w.id IS NOT NULL],
        factories: [f IN factories WHERE f.id IS NOT NULL]
    } as impact
    """
    results = await neo4j_client.execute(query, {"event_id": event_id})
    if results and results[0].get("impact"):
        return _convert_neo4j_types(results[0]["impact"])
    return {"event": None, "region": None, "suppliers": [], "skus": [], "warehouses": [], "factories": []}


async def get_all_entities_with_coords() -> dict:
    """
    Get all supply chain entities with coordinates for map visualization.
    """
    query = """
    MATCH (s:Supplier)
    OPTIONAL MATCH (s)-[:LOCATED_IN]->(r:Region)
    WITH collect(s {.id, .name, .reliability_score, .lat, .lng, region: r.name}) as suppliers

    MATCH (w:Warehouse)
    WITH suppliers, collect(w {.id, .name, .capacity, .region, .lat, .lng}) as warehouses

    MATCH (f:Factory)
    WITH suppliers, warehouses, collect(f {.id, .name, .region, .lat, .lng}) as factories

    MATCH (p:Port)
    WITH suppliers, warehouses, factories, collect(p {.id, .name, .region, .lat, .lng}) as ports

    MATCH (reg:Region)
    WITH suppliers, warehouses, factories, ports, collect(reg {.id, .name, .lat, .lng}) as regions

    RETURN {
        suppliers: suppliers,
        warehouses: warehouses,
        factories: factories,
        ports: ports,
        regions: regions
    } as entities
    """
    results = await neo4j_client.execute(query)
    if results and results[0].get("entities"):
        return _convert_neo4j_types(results[0]["entities"])
    return {"suppliers": [], "warehouses": [], "factories": [], "ports": [], "regions": []}


async def get_entity_connections() -> list[dict]:
    """Get supply chain connections between entities."""
    query = """
    MATCH (s:Supplier)-[:SUPPLIES]->(sku:SKU)<-[:STORES]-(w:Warehouse)
    RETURN DISTINCT s.id as from_id, 'supplier' as from_type, w.id as to_id, 'warehouse' as to_type
    UNION
    MATCH (s:Supplier)-[:SUPPLIES]->(sku:SKU)<-[:PRODUCES]-(f:Factory)
    RETURN DISTINCT s.id as from_id, 'supplier' as from_type, f.id as to_id, 'factory' as to_type
    UNION
    MATCH (w:Warehouse)-[:STORES]->(sku:SKU)<-[:PRODUCES]-(f:Factory)
    RETURN DISTINCT w.id as from_id, 'warehouse' as from_type, f.id as to_id, 'factory' as to_type
    """
    return await neo4j_client.execute(query)


async def list_workflow_runs(limit: int = 20) -> list[dict]:
    """List recent workflow runs."""
    import json
    query = """
    MATCH (w:WorkflowRun)
    OPTIONAL MATCH (w)-[:TRIGGERED_BY]->(e:DisruptionEvent)
    RETURN w {.*} as workflow, e {.*} as event
    ORDER BY w.created_at DESC
    LIMIT $limit
    """
    results = await neo4j_client.execute(query, {"limit": limit})

    workflows = []
    for row in results:
        workflow = _convert_neo4j_types(row["workflow"])
        if workflow.get("risk_assessment"):
            workflow["risk_assessment"] = json.loads(workflow["risk_assessment"])
        if workflow.get("ranked_mitigations"):
            workflow["ranked_mitigations"] = json.loads(workflow["ranked_mitigations"])
        if workflow.get("recommended_action"):
            workflow["recommended_action"] = json.loads(workflow["recommended_action"])
        workflow["event"] = _convert_neo4j_types(row["event"])
        workflows.append(workflow)

    return workflows
