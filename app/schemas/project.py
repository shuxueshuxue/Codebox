from pydantic import BaseModel
from typing import Optional


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    workspace_root: Optional[str] = None
    status: Optional[str] = None
    data_user_id: Optional[int] = None
    data_dept_id: Optional[int] = None


class ProjectOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    workspace_root: Optional[str] = None
    status: Optional[str] = None
    class Config:
        from_attributes = True



