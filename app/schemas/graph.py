from pydantic import BaseModel
from typing import Optional, List


class HexCell(BaseModel):
    q: int
    r: int


class FeatureNode(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    hex: Optional[HexCell] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    locked: int = 0


class Edge(BaseModel):
    id: int
    from_id: int
    to_id: int
    kind: str
    description: Optional[str] = None
    confidence: Optional[float] = None


class GraphSnapshot(BaseModel):
    project_id: int
    features: List[FeatureNode]
    edges: List[Edge]
    version: int = 1


