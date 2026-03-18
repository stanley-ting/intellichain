#!/usr/bin/env python3
"""Seed Neo4j with sample supply chain data."""
import asyncio
from src.graph.client import neo4j_client
from src.graph.schema import init_schema

SEED_DATA = """
// Regions (with center coords for visualization)
CREATE (asia:Region {id: 'region_asia', name: 'Asia Pacific', lat: 35.0, lng: 105.0})
CREATE (europe:Region {id: 'region_europe', name: 'Europe', lat: 50.0, lng: 10.0})
CREATE (americas:Region {id: 'region_americas', name: 'Americas', lat: 37.0, lng: -95.0})

// Ports
CREATE (shanghai:Port {id: 'port_shanghai', name: 'Shanghai Port', region: 'Asia Pacific', lat: 31.23, lng: 121.47})
CREATE (rotterdam:Port {id: 'port_rotterdam', name: 'Rotterdam Port', region: 'Europe', lat: 51.92, lng: 4.48})
CREATE (la:Port {id: 'port_la', name: 'Los Angeles Port', region: 'Americas', lat: 33.74, lng: -118.27})

// Suppliers - Asia
CREATE (s1:Supplier {id: 'sup_001', name: 'TechParts Asia', reliability_score: 0.95, lat: 31.23, lng: 121.47})
CREATE (s2:Supplier {id: 'sup_002', name: 'ChipMaster Ltd', reliability_score: 0.88, lat: 22.32, lng: 114.17})
CREATE (s3:Supplier {id: 'sup_003', name: 'AsiaComponents', reliability_score: 0.92, lat: 35.68, lng: 139.69})

// Suppliers - Europe
CREATE (s4:Supplier {id: 'sup_004', name: 'EuroParts GmbH', reliability_score: 0.90, lat: 48.14, lng: 11.58})
CREATE (s5:Supplier {id: 'sup_005', name: 'Nordic Supply Co', reliability_score: 0.85, lat: 59.33, lng: 18.07})

// Suppliers - Americas
CREATE (s6:Supplier {id: 'sup_006', name: 'AmeriChip Inc', reliability_score: 0.87, lat: 37.77, lng: -122.42})
CREATE (s7:Supplier {id: 'sup_007', name: 'MexParts SA', reliability_score: 0.82, lat: 19.43, lng: -99.13})

// Additional suppliers for alternatives
CREATE (s8:Supplier {id: 'sup_008', name: 'Taiwan Semi Parts', reliability_score: 0.93, lat: 25.03, lng: 121.57})
CREATE (s9:Supplier {id: 'sup_009', name: 'Korea Electronics', reliability_score: 0.91, lat: 37.57, lng: 126.98})
CREATE (s10:Supplier {id: 'sup_010', name: 'India Tech Supply', reliability_score: 0.80, lat: 12.97, lng: 77.59})

// SKUs
CREATE (sku1:SKU {id: 'sku_chip_a1', name: 'Microprocessor A1', category: 'Electronics'})
CREATE (sku2:SKU {id: 'sku_chip_b2', name: 'Memory Module B2', category: 'Electronics'})
CREATE (sku3:SKU {id: 'sku_sensor_c3', name: 'Sensor Array C3', category: 'Electronics'})
CREATE (sku4:SKU {id: 'sku_battery_d4', name: 'Li-Ion Battery D4', category: 'Power'})
CREATE (sku5:SKU {id: 'sku_display_e5', name: 'OLED Display E5', category: 'Display'})
CREATE (sku6:SKU {id: 'sku_motor_f6', name: 'Servo Motor F6', category: 'Mechanical'})
CREATE (sku7:SKU {id: 'sku_pcb_g7', name: 'Circuit Board G7', category: 'Electronics'})
CREATE (sku8:SKU {id: 'sku_casing_h8', name: 'Aluminum Casing H8', category: 'Mechanical'})

// More SKUs
CREATE (sku9:SKU {id: 'sku_connector_i9', name: 'USB-C Connector I9', category: 'Electronics'})
CREATE (sku10:SKU {id: 'sku_lens_j10', name: 'Camera Lens J10', category: 'Optics'})
CREATE (sku11:SKU {id: 'sku_speaker_k11', name: 'Micro Speaker K11', category: 'Audio'})
CREATE (sku12:SKU {id: 'sku_antenna_l12', name: '5G Antenna L12', category: 'Communications'})

// Additional SKUs
CREATE (sku13:SKU {id: 'sku_capacitor_m13', name: 'Capacitor Array M13', category: 'Electronics'})
CREATE (sku14:SKU {id: 'sku_resistor_n14', name: 'Precision Resistor N14', category: 'Electronics'})
CREATE (sku15:SKU {id: 'sku_inductor_o15', name: 'Power Inductor O15', category: 'Electronics'})
CREATE (sku16:SKU {id: 'sku_transformer_p16', name: 'Mini Transformer P16', category: 'Power'})
CREATE (sku17:SKU {id: 'sku_heatsink_q17', name: 'Heatsink Q17', category: 'Thermal'})
CREATE (sku18:SKU {id: 'sku_fan_r18', name: 'Cooling Fan R18', category: 'Thermal'})
CREATE (sku19:SKU {id: 'sku_cable_s19', name: 'Flex Cable S19', category: 'Connectivity'})
CREATE (sku20:SKU {id: 'sku_switch_t20', name: 'Power Switch T20', category: 'Electronics'})

// Warehouses
CREATE (w1:Warehouse {id: 'wh_001', name: 'Shanghai DC', region: 'Asia Pacific', capacity: 10000, lat: 31.23, lng: 121.47})
CREATE (w2:Warehouse {id: 'wh_002', name: 'Frankfurt DC', region: 'Europe', capacity: 8000, lat: 50.11, lng: 8.68})
CREATE (w3:Warehouse {id: 'wh_003', name: 'Dallas DC', region: 'Americas', capacity: 12000, lat: 32.78, lng: -96.80})
CREATE (w4:Warehouse {id: 'wh_004', name: 'Singapore DC', region: 'Asia Pacific', capacity: 6000, lat: 1.35, lng: 103.82})
CREATE (w5:Warehouse {id: 'wh_005', name: 'Amsterdam DC', region: 'Europe', capacity: 7000, lat: 52.37, lng: 4.90})

// Factories
CREATE (f1:Factory {id: 'fac_001', name: 'Shenzhen Assembly', region: 'Asia Pacific', lat: 22.54, lng: 114.06})
CREATE (f2:Factory {id: 'fac_002', name: 'Munich Factory', region: 'Europe', lat: 48.14, lng: 11.58})
CREATE (f3:Factory {id: 'fac_003', name: 'Austin Plant', region: 'Americas', lat: 30.27, lng: -97.74})

// Supplier locations
CREATE (s1)-[:LOCATED_IN]->(asia)
CREATE (s2)-[:LOCATED_IN]->(asia)
CREATE (s3)-[:LOCATED_IN]->(asia)
CREATE (s4)-[:LOCATED_IN]->(europe)
CREATE (s5)-[:LOCATED_IN]->(europe)
CREATE (s6)-[:LOCATED_IN]->(americas)
CREATE (s7)-[:LOCATED_IN]->(americas)
CREATE (s8)-[:LOCATED_IN]->(asia)
CREATE (s9)-[:LOCATED_IN]->(asia)
CREATE (s10)-[:LOCATED_IN]->(asia)

// Supplier -> SKU relationships
CREATE (s1)-[:SUPPLIES]->(sku1)
CREATE (s1)-[:SUPPLIES]->(sku2)
CREATE (s1)-[:SUPPLIES]->(sku7)
CREATE (s2)-[:SUPPLIES]->(sku1)
CREATE (s2)-[:SUPPLIES]->(sku3)
CREATE (s3)-[:SUPPLIES]->(sku4)
CREATE (s3)-[:SUPPLIES]->(sku5)
CREATE (s4)-[:SUPPLIES]->(sku6)
CREATE (s4)-[:SUPPLIES]->(sku8)
CREATE (s5)-[:SUPPLIES]->(sku2)
CREATE (s5)-[:SUPPLIES]->(sku7)
CREATE (s6)-[:SUPPLIES]->(sku1)
CREATE (s6)-[:SUPPLIES]->(sku9)
CREATE (s7)-[:SUPPLIES]->(sku6)
CREATE (s7)-[:SUPPLIES]->(sku8)
CREATE (s8)-[:SUPPLIES]->(sku1)
CREATE (s8)-[:SUPPLIES]->(sku2)
CREATE (s8)-[:SUPPLIES]->(sku3)
CREATE (s9)-[:SUPPLIES]->(sku5)
CREATE (s9)-[:SUPPLIES]->(sku10)
CREATE (s10)-[:SUPPLIES]->(sku4)
CREATE (s10)-[:SUPPLIES]->(sku11)
CREATE (s10)-[:SUPPLIES]->(sku12)

// Additional supplies
CREATE (s1)-[:SUPPLIES]->(sku13)
CREATE (s2)-[:SUPPLIES]->(sku14)
CREATE (s3)-[:SUPPLIES]->(sku15)
CREATE (s4)-[:SUPPLIES]->(sku16)
CREATE (s5)-[:SUPPLIES]->(sku17)
CREATE (s6)-[:SUPPLIES]->(sku18)
CREATE (s8)-[:SUPPLIES]->(sku19)
CREATE (s9)-[:SUPPLIES]->(sku20)

// Alternative supplier relationships
CREATE (s1)-[:ALTERNATIVE_TO]->(s8)
CREATE (s1)-[:ALTERNATIVE_TO]->(s9)
CREATE (s2)-[:ALTERNATIVE_TO]->(s8)
CREATE (s3)-[:ALTERNATIVE_TO]->(s10)
CREATE (s4)-[:ALTERNATIVE_TO]->(s7)
CREATE (s5)-[:ALTERNATIVE_TO]->(s4)
CREATE (s6)-[:ALTERNATIVE_TO]->(s2)

// Warehouse -> SKU storage
CREATE (w1)-[:STORES]->(sku1)
CREATE (w1)-[:STORES]->(sku2)
CREATE (w1)-[:STORES]->(sku3)
CREATE (w1)-[:STORES]->(sku4)
CREATE (w2)-[:STORES]->(sku5)
CREATE (w2)-[:STORES]->(sku6)
CREATE (w2)-[:STORES]->(sku7)
CREATE (w3)-[:STORES]->(sku1)
CREATE (w3)-[:STORES]->(sku8)
CREATE (w3)-[:STORES]->(sku9)
CREATE (w4)-[:STORES]->(sku10)
CREATE (w4)-[:STORES]->(sku11)
CREATE (w5)-[:STORES]->(sku12)
CREATE (w5)-[:STORES]->(sku2)

// Factory -> SKU production
CREATE (f1)-[:PRODUCES]->(sku1)
CREATE (f1)-[:PRODUCES]->(sku2)
CREATE (f1)-[:PRODUCES]->(sku5)
CREATE (f2)-[:PRODUCES]->(sku6)
CREATE (f2)-[:PRODUCES]->(sku8)
CREATE (f3)-[:PRODUCES]->(sku9)
CREATE (f3)-[:PRODUCES]->(sku1)
"""


async def clear_database():
    """Clear all nodes and relationships."""
    await neo4j_client.execute_write("MATCH (n) DETACH DELETE n")
    print("Database cleared")


async def seed():
    await neo4j_client.connect()
    try:
        await clear_database()
        await init_schema(neo4j_client)
        await neo4j_client.execute_write(SEED_DATA)

        # Verify
        result = await neo4j_client.execute("MATCH (n) RETURN labels(n)[0] as label, count(*) as count")
        print("Seeded nodes:")
        for r in result:
            print(f"  {r['label']}: {r['count']}")

        rel_result = await neo4j_client.execute("MATCH ()-[r]->() RETURN type(r) as type, count(*) as count")
        print("Seeded relationships:")
        for r in rel_result:
            print(f"  {r['type']}: {r['count']}")

    finally:
        await neo4j_client.close()


if __name__ == "__main__":
    asyncio.run(seed())
