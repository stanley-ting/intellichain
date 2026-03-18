import asyncio
from src.workers.enrichment import enrichment_worker
from src.workers.orchestrator import orchestrator_worker


async def run_all_workers(result_queue: asyncio.Queue | None = None):
    """Run all workers concurrently."""
    stop_event = asyncio.Event()

    workers = [
        asyncio.create_task(enrichment_worker(stop_event)),
        asyncio.create_task(orchestrator_worker(stop_event, result_queue)),
    ]

    return stop_event, workers


async def stop_workers(stop_event: asyncio.Event, workers: list):
    """Gracefully stop all workers."""
    stop_event.set()
    await asyncio.gather(*workers, return_exceptions=True)
