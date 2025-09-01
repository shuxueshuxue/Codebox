from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import json

from app.core.deps import get_db
from app.db.models.task import Task
from app.schemas.task import TaskCreate, TaskOut
from app.utils.id_gen import generate_id


router = APIRouter(prefix="/projects/{project_id}/tasks", tags=["tasks"])


@router.post("", response_model=TaskOut)
def create_task(project_id: int, payload: TaskCreate, db: Session = Depends(get_db)):
    exists = db.query(Task).filter(Task.project_id == project_id, Task.name == payload.name, Task.is_deleted == 0).first()
    if exists:
        raise HTTPException(status_code=400, detail="Task name exists in project")
    row = Task(
        id=generate_id(),
        str_id=None,
        is_deleted=0,
        create_user_id=0,
        project_id=project_id,
        name=payload.name,
        description=payload.description,
        session_id=payload.session_id,
        agent_ids_json=json.dumps(payload.agent_ids or [], ensure_ascii=False),
        feature_ids_json=json.dumps(payload.feature_ids or [], ensure_ascii=False),
        params_json=json.dumps(payload.params or {}, ensure_ascii=False),
        status=payload.status or "active",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return TaskOut(
        id=row.id,
        project_id=row.project_id,
        name=row.name,
        description=row.description,
        session_id=row.session_id,
        agent_ids=json.loads(row.agent_ids_json or "[]"),
        feature_ids=json.loads(row.feature_ids_json or "[]"),
        params=json.loads(row.params_json or "{}"),
        status=row.status,
    )


@router.get("", response_model=list[TaskOut])
def list_tasks(project_id: int, db: Session = Depends(get_db)):
    rows = db.query(Task).filter(Task.project_id == project_id, Task.is_deleted == 0).all()
    out = []
    for r in rows:
        out.append(TaskOut(
            id=r.id,
            project_id=r.project_id,
            name=r.name,
            description=r.description,
            session_id=r.session_id,
            agent_ids=json.loads(r.agent_ids_json or "[]"),
            feature_ids=json.loads(r.feature_ids_json or "[]"),
            params=json.loads(r.params_json or "{}"),
            status=r.status,
        ))
    return out


