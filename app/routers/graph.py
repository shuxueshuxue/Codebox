from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import json

from app.core.deps import get_db
from app.db.models.feature import Feature
from app.db.models.edge import Edge
from app.schemas.graph import GraphSnapshot, FeatureNode, HexCell as HexCellSchema, Edge as EdgeSchema
from app.services.layout_hex_service import plan_layout_simple, apply_layout


router = APIRouter(prefix="/projects/{project_id}/graph", tags=["graph"])


@router.get("", response_model=GraphSnapshot)
def get_graph(project_id: int, db: Session = Depends(get_db)):
    feats = db.query(Feature).filter(Feature.project_id == project_id, Feature.is_deleted == 0).all()
    edges = db.query(Edge).filter(Edge.project_id == project_id, Edge.is_deleted == 0).all()
    features = []
    for f in feats:
        tags = None
        try:
            tags = json.loads(f.tags_json) if f.tags_json else None
        except Exception:
            tags = None
        features.append(FeatureNode(
            id=f.id,
            name=f.name,
            description=f.description,
            hex=(HexCellSchema(q=f.hex_q, r=f.hex_r) if f.hex_q is not None and f.hex_r is not None else None),
            category=f.category,
            tags=tags,
            locked=f.layout_locked or 0,
        ))
    edge_list = [EdgeSchema(
        id=e.id,
        from_id=e.from_feature_id,
        to_id=e.to_feature_id,
        kind=e.kind,
        description=e.description,
        confidence=float(e.confidence) if e.confidence is not None else None,
    ) for e in edges]
    return GraphSnapshot(project_id=project_id, features=features, edges=edge_list, version=1)


@router.post("/layout/auto")
def auto_layout(project_id: int, db: Session = Depends(get_db)):
    pos = plan_layout_simple(db, project_id)
    updated = apply_layout(db, project_id, pos)
    return {"updated": updated}


class LayoutItemIn:
    def __init__(self, feature_id: int, q: int, r: int):
        self.feature_id = feature_id
        self.q = q
        self.r = r


@router.put("/layout")
def put_layout(project_id: int, items: list[dict], db: Session = Depends(get_db)):
    pos = {int(it["feature_id"]): (int(it["q"]), int(it["r"])) for it in items}
    updated = apply_layout(db, project_id, pos)
    return {"updated": updated}


