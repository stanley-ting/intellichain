#!/usr/bin/env python3
"""Run all workers."""
import asyncio
from src.workers.router import run_all_workers
from src.graph.client import neo4j_client
from src.events.redis_client import redis_client


async def main():
    await neo4j_client.connect()
    await redis_client.connect()
    print("[Workers] Connected to Neo4j and Redis")
    stop, workers = await run_all_workers()
    await asyncio.gather(*workers)


if __name__ == "__main__":
    asyncio.run(main())
