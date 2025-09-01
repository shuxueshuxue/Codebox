from pydantic import BaseModel
from typing import Optional


class EdgeCreate(BaseModel):
    project_id: int
    from_feature_id: int
    to_feature_id: int
    kind: str
    description: Optional[str] = None
    confidence: Optional[float] = None
    data_user_id: Optional[int] = None
    data_dept_id: Optional[int] = None


class EdgeOut(BaseModel):
    id: int
    project_id: int
    from_feature_id: int
    to_feature_id: int
    kind: str
    description: Optional[str]
    confidence: Optional[float]
    class Config:
        from_attributes = True


