import os
from dotenv import load_dotenv

load_dotenv()

# Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_FLASH_MODEL = "gemini-2.0-flash"
GEMINI_PRO_MODEL = "gemini-2.5-pro"

# Neo4j
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password123")

# Redis
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

# Streams
STREAM_NORMALIZED_EVENTS = "normalized.events"
STREAM_WORKFLOW_EVENTS = "workflow.events"
STREAM_UI_EVENTS = "ui.events"
