from pydantic import BaseModel
from typing import Optional, List


class FeatureCreate(BaseModel):
    project_id: int
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    data_user_id: Optional[int] = None
    data_dept_id: Optional[int] = None


class FeatureUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    hex_q: Optional[int] = None
    hex_r: Optional[int] = None
    layout_locked: Optional[int] = None


class FeatureOut(BaseModel):
    id: int
    project_id: int
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    hex_q: Optional[int] = None
    hex_r: Optional[int] = None
    layout_locked: int
    class Config:
        from_attributes = True


