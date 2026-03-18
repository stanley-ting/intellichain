from pydantic import BaseModel


class Supplier(BaseModel):
    id: str
    name: str
    region: str
    reliability_score: float = 1.0


class SKU(BaseModel):
    id: str
    name: str
    category: str


class Warehouse(BaseModel):
    id: str
    name: str
    region: str
    capacity: int


class Factory(BaseModel):
    id: str
    name: str
    region: str


class Region(BaseModel):
    id: str
    name: str


class Port(BaseModel):
    id: str
    name: str
    region: str
