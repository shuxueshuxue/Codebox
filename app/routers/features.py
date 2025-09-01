from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import json

from app.core.deps import get_db
from app.db.models.feature import Feature
from app.db.models.feature_detail import FeatureDetail
from app.schemas.feature import FeatureCreate, FeatureUpdate, FeatureOut
from app.schemas.feature_detail import FeatureDetailsPayload
from app.utils.id_gen import generate_id


router = APIRouter(prefix="/projects/{project_id}/features", tags=["features"])


@router.post("", response_model=FeatureOut)
def create_feature(project_id: int, payload: FeatureCreate, db: Session = Depends(get_db)):
    exists = db.query(Feature).filter(Feature.project_id == project_id, Feature.name == payload.name, Feature.is_deleted == 0).first()
    if exists:
        raise HTTPException(status_code=400, detail="Feature name exists in project")
    tags_json = json.dumps(payload.tags or [], ensure_ascii=False)
    row = Feature(
        id=generate_id(),
        str_id=None,
        is_deleted=0,
        create_user_id=0,
        data_user_id=payload.data_user_id,
        data_dept_id=payload.data_dept_id,
        project_id=project_id,
        name=payload.name,
        description=payload.description,
        category=payload.category,
        tags_json=tags_json,
        layout_locked=0,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_feature_out(row)


@router.get("", response_model=list[FeatureOut])
def list_features(project_id: int, db: Session = Depends(get_db)):
    rows = db.query(Feature).filter(Feature.project_id == project_id, Feature.is_deleted == 0).all()
    return [_to_feature_out(r) for r in rows]


@router.patch("/{feature_id}", response_model=FeatureOut)
def update_feature(project_id: int, feature_id: int, payload: FeatureUpdate, db: Session = Depends(get_db)):
    row = db.query(Feature).filter(Feature.id == feature_id, Feature.project_id == project_id, Feature.is_deleted == 0).first()
    if not row:
        raise HTTPException(status_code=404, detail="Feature not found")
    if payload.name is not None:
        row.name = payload.name
    if payload.description is not None:
        row.description = payload.description
    if payload.category is not None:
        row.category = payload.category
    if payload.tags is not None:
        row.tags_json = json.dumps(payload.tags, ensure_ascii=False)
    if payload.hex_q is not None:
        row.hex_q = payload.hex_q
    if payload.hex_r is not None:
        row.hex_r = payload.hex_r
    if payload.layout_locked is not None:
        row.layout_locked = payload.layout_locked
    db.commit()
    db.refresh(row)
    return _to_feature_out(row)


@router.put("/{feature_id}/details")
def put_feature_details(project_id: int, feature_id: int, payload: FeatureDetailsPayload, db: Session = Depends(get_db)):
    row = db.query(Feature).filter(Feature.id == feature_id, Feature.project_id == project_id, Feature.is_deleted == 0).first()
    if not row:
        raise HTTPException(status_code=404, detail="Feature not found")
    existing = db.query(FeatureDetail).filter(FeatureDetail.project_id == project_id, FeatureDetail.feature_id == feature_id, FeatureDetail.is_deleted == 0).first()
    files_json = json.dumps([f.dict() for f in (payload.files or [])], ensure_ascii=False)
    deps_json = json.dumps([d.dict() for d in (payload.file_deps or [])], ensure_ascii=False)
    notes_json = json.dumps(payload.llm_notes_json or {}, ensure_ascii=False)
    extras_json = json.dumps(payload.extras_json or {}, ensure_ascii=False)
    if existing:
        existing.files_json = files_json
        existing.file_deps_json = deps_json
        existing.llm_notes_json = notes_json
        existing.extras_json = extras_json
    else:
        rec = FeatureDetail(
            id=generate_id(),
            str_id=None,
            is_deleted=0,
            create_user_id=0,
            project_id=project_id,
            feature_id=feature_id,
            files_json=files_json,
            file_deps_json=deps_json,
            llm_notes_json=notes_json,
            extras_json=extras_json,
        )
        db.add(rec)
    db.commit()
    return {"ok": True}


def _to_feature_out(row: Feature) -> FeatureOut:
    tags = None
    try:
        tags = json.loads(row.tags_json) if row.tags_json else None
    except Exception:
        tags = None
    return FeatureOut(
        id=row.id,
        project_id=row.project_id,
        name=row.name,
        description=row.description,
        category=row.category,
        tags=tags,
        hex_q=row.hex_q,
        hex_r=row.hex_r,
        layout_locked=row.layout_locked or 0,
    )


