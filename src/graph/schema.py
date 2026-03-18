SCHEMA_QUERIES = [
    # Constraints
    "CREATE CONSTRAINT supplier_id IF NOT EXISTS FOR (s:Supplier) REQUIRE s.id IS UNIQUE",
    "CREATE CONSTRAINT sku_id IF NOT EXISTS FOR (s:SKU) REQUIRE s.id IS UNIQUE",
    "CREATE CONSTRAINT warehouse_id IF NOT EXISTS FOR (w:Warehouse) REQUIRE w.id IS UNIQUE",
    "CREATE CONSTRAINT factory_id IF NOT EXISTS FOR (f:Factory) REQUIRE f.id IS UNIQUE",
    "CREATE CONSTRAINT region_id IF NOT EXISTS FOR (r:Region) REQUIRE r.id IS UNIQUE",
    "CREATE CONSTRAINT port_id IF NOT EXISTS FOR (p:Port) REQUIRE p.id IS UNIQUE",
    "CREATE CONSTRAINT disruption_id IF NOT EXISTS FOR (d:DisruptionEvent) REQUIRE d.id IS UNIQUE",
    "CREATE CONSTRAINT workflow_id IF NOT EXISTS FOR (w:WorkflowRun) REQUIRE w.id IS UNIQUE",
    # Indexes
    "CREATE INDEX disruption_timestamp IF NOT EXISTS FOR (d:DisruptionEvent) ON (d.timestamp)",
    "CREATE INDEX workflow_created IF NOT EXISTS FOR (w:WorkflowRun) ON (w.created_at)",
]


async def init_schema(client):
    for query in SCHEMA_QUERIES:
        try:
            await client.execute_write(query)
        except Exception:
            pass  # constraint may already exist
