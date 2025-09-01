from pydantic import BaseModel
from typing import Optional


class FileOut(BaseModel):
    id: int
    project_id: int
    path: str
    is_dir: int
    size_bytes: Optional[int] = None
    hash_sha256: Optional[str] = None
    lang: Optional[str] = None
    parent_path: Optional[str] = None
    class Config:
        from_attributes = True


