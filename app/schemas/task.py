from pydantic import BaseModel
from typing import Optional, List, Dict


class TaskCreate(BaseModel):
    project_id: int
    name: str
    description: Optional[str] = None
    session_id: str
    agent_ids: List[str]
    feature_ids: List[int]
    params: Optional[Dict] = None
    status: Optional[str] = "active"


class TaskOut(BaseModel):
    id: int
    project_id: int
    name: str
    description: Optional[str] = None
    session_id: str
    agent_ids: List[str]
    feature_ids: List[int]
    params: Optional[Dict] = None
    status: str


