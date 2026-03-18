#!/usr/bin/env python3
"""Demo script showing end-to-end IntelliChain workflow."""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.events.redis_client import redis_client
from src.graph.client import neo4j_client
from src.events.generators import generate_synthetic_event
from src.events.streams import publish_normalized_event
from src.workers.router import run_all_workers, stop_workers
from src.models.events import EventType


def print_header(text: str):
    print(f"\n{'='*60}")
    print(f"  {text}")
    print(f"{'='*60}\n")


def print_event(event: dict):
    print(f"  Event ID:    {event['event_id'][:8]}...")
    print(f"  Type:        {event['event_type']}")
    print(f"  Region:      {event['region']}")
    print(f"  Severity:    {event['severity']:.0%}")
    print(f"  Description: {event['description'][:80]}...")


def print_result(result: dict):
    if result.get("error"):
        print(f"  ERROR: {result['error']}")
        return

    print(f"  Workflow ID: {result.get('workflow_id', 'N/A')[:8]}...")
    print(f"  Risk Level:  {result.get('risk_level', 'N/A')}")

    assessment = result.get("risk_assessment", {})
    if assessment:
        print(f"  Confidence:  {assessment.get('confidence', 0):.0%}")
        print(f"  Reasoning:   {assessment.get('reasoning', 'N/A')[:80]}...")

    print(f"\n  Affected Suppliers: {len(result.get('affected_suppliers', []))}")
    print(f"  Affected SKUs:      {len(result.get('affected_skus', []))}")

    ranked = result.get("ranked_mitigations", [])
    if ranked:
        print(f"\n  Top Mitigations:")
        for i, m in enumerate(ranked[:3], 1):
            mit = m["mitigation"]
            print(f"    {i}. [{m['score']:.0%}] {mit['type']}: {mit['description'][:50]}")
            print(f"       Reasoning: {m['reasoning'][:60]}...")

    rec = result.get("recommended_action")
    if rec:
        print(f"\n  RECOMMENDATION:")
        print(f"    Action:     {rec['action_type'].upper()}")
        print(f"    Summary:    {rec['summary']}")
        print(f"    Confidence: {rec['confidence']:.0%}")


async def main():
    print_header("IntelliChain Demo - Supply Chain Risk Intelligence")

    # Connect to services
    print("Connecting to Neo4j and Redis...")
    await neo4j_client.connect()
    await redis_client.connect()

    result_queue = asyncio.Queue()

    try:
        # Start workers
        print("Starting workers...")
        stop_event, workers = await run_all_workers(result_queue)
        await asyncio.sleep(1)  # Let workers initialize

        # Generate synthetic event
        print_header("Generating Synthetic Disruption Event")

        event = await generate_synthetic_event(
            event_type=EventType.SUPPLIER_OUTAGE,
            region="Asia Pacific",
            use_llm=True,
        )
        event_dict = event.model_dump(mode="json")
        print_event(event_dict)

        # Publish to stream
        print_header("Publishing Event to Stream")
        msg_id = await publish_normalized_event(event_dict)
        print(f"  Published to normalized.events: {msg_id}")

        # Wait for result
        print_header("Waiting for Workflow Result")
        print("  Processing...\n")

        try:
            result = await asyncio.wait_for(result_queue.get(), timeout=60)
            print_header("Workflow Complete")
            print_result(result)
        except asyncio.TimeoutError:
            print("  Timeout waiting for result")

        # Cleanup
        print_header("Shutting Down")
        await stop_workers(stop_event, workers)

    finally:
        await neo4j_client.close()
        await redis_client.close()

    print("\nDemo complete!")


if __name__ == "__main__":
    asyncio.run(main())
