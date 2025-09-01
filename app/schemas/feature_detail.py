from pydantic import BaseModel
from typing import Optional, List, Literal


class FileItem(BaseModel):
    path: str
    role: Optional[str] = None
    rw: Optional[Literal["r","w","rw"]] = None
    notes: Optional[str] = None


class FileDep(BaseModel):
    src: str
    dst: str
    dep_type: str
    inferred_by: Optional[str] = None
    confidence: Optional[float] = None


class FeatureDetailsPayload(BaseModel):
    files: Optional[List[FileItem]] = None
    file_deps: Optional[List[FileDep]] = None
    llm_notes_json: Optional[dict] = None
    extras_json: Optional[dict] = None


