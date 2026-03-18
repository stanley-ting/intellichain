import json
import redis.asyncio as redis
from src.config import REDIS_URL


class RedisClient:
    def __init__(self):
        self._client: redis.Redis | None = None

    async def connect(self):
        self._client = redis.from_url(REDIS_URL, decode_responses=True)

    async def close(self):
        if self._client:
            await self._client.close()

    async def publish_to_stream(self, stream: str, data: dict) -> str:
        """Publish a message to a Redis stream. Returns message ID."""
        return await self._client.xadd(stream, {"data": json.dumps(data)})

    async def read_stream(
        self,
        stream: str,
        last_id: str = "0",
        count: int = 10,
        block: int | None = None
    ) -> list[tuple[str, dict]]:
        """Read messages from a stream. Returns list of (id, data) tuples."""
        messages = await self._client.xread(
            {stream: last_id},
            count=count,
            block=block
        )
        results = []
        if messages:
            for stream_name, stream_messages in messages:
                for msg_id, msg_data in stream_messages:
                    data = json.loads(msg_data.get("data", "{}"))
                    results.append((msg_id, data))
        return results

    async def create_consumer_group(self, stream: str, group: str):
        """Create a consumer group for a stream."""
        try:
            await self._client.xgroup_create(stream, group, id="0", mkstream=True)
        except redis.ResponseError as e:
            if "BUSYGROUP" not in str(e):
                raise

    async def read_group(
        self,
        stream: str,
        group: str,
        consumer: str,
        count: int = 1,
        block: int | None = 5000
    ) -> list[tuple[str, dict]]:
        """Read messages as part of a consumer group."""
        messages = await self._client.xreadgroup(
            group,
            consumer,
            {stream: ">"},
            count=count,
            block=block
        )
        results = []
        if messages:
            for stream_name, stream_messages in messages:
                for msg_id, msg_data in stream_messages:
                    data = json.loads(msg_data.get("data", "{}"))
                    results.append((msg_id, data))
        return results

    async def ack(self, stream: str, group: str, msg_id: str):
        """Acknowledge a message in a consumer group."""
        await self._client.xack(stream, group, msg_id)


redis_client = RedisClient()
