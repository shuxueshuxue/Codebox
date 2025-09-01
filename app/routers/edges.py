from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.db.models.edge import Edge
from app.schemas.edge import EdgeCreate, EdgeOut
from app.utils.id_gen import generate_id


router = APIRouter(prefix="/projects/{project_id}/edges", tags=["edges"])


@router.post("", response_model=EdgeOut)
def create_edge(project_id: int, payload: EdgeCreate, db: Session = Depends(get_db)):
    row = Edge(
        id=generate_id(),
        str_id=None,
        is_deleted=0,
        create_user_id=0,
        data_user_id=payload.data_user_id,
        data_dept_id=payload.data_dept_id,
        project_id=project_id,
        from_feature_id=payload.from_feature_id,
        to_feature_id=payload.to_feature_id,
        kind=payload.kind,
        description=payload.description,
        confidence=payload.confidence,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return EdgeOut(
        id=row.id,
        project_id=row.project_id,
        from_feature_id=row.from_feature_id,
        to_feature_id=row.to_feature_id,
        kind=row.kind,
        description=row.description,
        confidence=float(row.confidence) if row.confidence is not None else None,
    )


@router.get("", response_model=list[EdgeOut])
def list_edges(project_id: int, db: Session = Depends(get_db)):
    rows = db.query(Edge).filter(Edge.project_id == project_id, Edge.is_deleted == 0).all()
    return [EdgeOut(
        id=r.id,
        project_id=r.project_id,
        from_feature_id=r.from_feature_id,
        to_feature_id=r.to_feature_id,
        kind=r.kind,
        description=r.description,
        confidence=float(r.confidence) if r.confidence is not None else None,
    ) for r in rows]


