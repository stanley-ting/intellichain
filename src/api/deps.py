from src.graph.client import neo4j_client
from src.events.redis_client import redis_client 

async def get_db():
    return neo4j_client

async def get_redis():
    return redis_client