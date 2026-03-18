from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.graph.client import neo4j_client
from src.events.redis_client import redis_client
from src.api.routes import disruptions, workflow, stream, graph


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await neo4j_client.connect()
    await redis_client.connect()
    yield
    # Shutdown
    await neo4j_client.close()
    await redis_client.close()


app = FastAPI(
    title="IntelliChain API",
    description="Supply Chain Risk Intelligence",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(disruptions.router, prefix="/api/disruptions", tags=["disruptions"])
app.include_router(workflow.router, prefix="/api/workflows", tags=["workflows"])
app.include_router(stream.router, prefix="/api/workflows", tags=["stream"])
app.include_router(graph.router, prefix="/api/graph", tags=["graph"])


@app.get("/health")
async def health():
    return {"status": "ok"}
