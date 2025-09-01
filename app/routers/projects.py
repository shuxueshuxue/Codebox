from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.db.models.project import Project
from app.utils.id_gen import generate_id
from app.schemas.project import ProjectCreate, ProjectOut


router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("", response_model=ProjectOut)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)):
    exists = db.query(Project).filter(Project.name == payload.name, Project.is_deleted == 0).first()
    if exists:
        raise HTTPException(status_code=400, detail="Project name exists")
    p = Project(
        id=generate_id(),
        str_id=None,
        is_deleted=0,
        create_user_id=0,
        data_user_id=payload.data_user_id,
        data_dept_id=payload.data_dept_id,
        name=payload.name,
        description=payload.description,
        workspace_root=payload.workspace_root,
        status=payload.status,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.get("", response_model=list[ProjectOut])
def list_projects(db: Session = Depends(get_db)):
    rows = db.query(Project).filter(Project.is_deleted == 0).order_by(Project.create_time.desc()).all()
    return rows


