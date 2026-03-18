from neo4j import AsyncGraphDatabase
from src.config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD


class Neo4jClient:
    def __init__(self):
        self._driver = None

    async def connect(self):
        self._driver = AsyncGraphDatabase.driver(
            NEO4J_URI,
            auth=(NEO4J_USER, NEO4J_PASSWORD)
        )

    async def close(self):
        if self._driver:
            await self._driver.close()

    async def execute(self, query: str, params: dict | None = None) -> list[dict]:
        async with self._driver.session() as session:
            result = await session.run(query, params or {})
            return [record.data() async for record in result]

    async def execute_write(self, query: str, params: dict | None = None):
        async with self._driver.session() as session:
            await session.run(query, params or {})


neo4j_client = Neo4jClient()
