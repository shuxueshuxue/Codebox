from typing import Dict, List, Tuple
from sqlalchemy.orm import Session

from app.db.models.feature import Feature
from app.db.models.edge import Edge as EdgeModel


def _axial_from_grid(col: int, row: int) -> Tuple[int, int]:
    q = col - (row // 2)
    r = row
    return q, r


def plan_layout_simple(db: Session, project_id: int) -> Dict[int, Tuple[int, int]]:
    """
    简单布局：
    - 以入度为0的节点为第0层，BFS分层；
    - 每层横向排列；
    - 映射到六边形轴坐标；
    - 已锁定布局的节点不动。
    返回: {feature_id: (q, r)}
    """
    # 取节点与边
    features: List[Feature] = (
        db.query(Feature).filter(Feature.project_id == project_id, Feature.is_deleted == 0).all()
    )
    edges: List[EdgeModel] = (
        db.query(EdgeModel).filter(EdgeModel.project_id == project_id, EdgeModel.is_deleted == 0).all()
    )

    id_to_feature = {f.id: f for f in features}
    indeg = {f.id: 0 for f in features}
    out_adj: Dict[int, List[int]] = {f.id: [] for f in features}
    for e in edges:
        if e.from_feature_id in id_to_feature and e.to_feature_id in id_to_feature:
            indeg[e.to_feature_id] = indeg.get(e.to_feature_id, 0) + 1
            out_adj[e.from_feature_id].append(e.to_feature_id)

    # Kahn 简化分层
    from collections import deque
    q = deque([fid for fid, d in indeg.items() if d == 0])
    layers: List[List[int]] = []
    visited = set()
    while q:
        layer_size = len(q)
        layer = []
        for _ in range(layer_size):
            u = q.popleft()
            if u in visited:
                continue
            visited.add(u)
            layer.append(u)
            for v in out_adj.get(u, []):
                indeg[v] -= 1
                if indeg[v] == 0:
                    q.append(v)
        if layer:
            layers.append(layer)

    # 补充未访问（环或孤立）
    remaining = [f.id for f in features if f.id not in visited]
    if remaining:
        layers.append(remaining)

    # 放置：行=层，列=索引；锁定的保持不动
    taken = {(f.hex_q, f.hex_r) for f in features if f.layout_locked and f.hex_q is not None and f.hex_r is not None}
    pos: Dict[int, Tuple[int, int]] = {}

    for row, layer in enumerate(layers):
        for col, fid in enumerate(layer):
            feat = id_to_feature[fid]
            if feat.layout_locked and feat.hex_q is not None and feat.hex_r is not None:
                pos[fid] = (feat.hex_q, feat.hex_r)
                continue
            q_ax, r_ax = _axial_from_grid(col, row)
            # 冲突简单线性探测：向右移动
            shift = 0
            while (q_ax + shift, r_ax) in taken:
                shift += 1
            q_final, r_final = q_ax + shift, r_ax
            taken.add((q_final, r_final))
            pos[fid] = (q_final, r_final)

    return pos


def apply_layout(db: Session, project_id: int, positions: Dict[int, Tuple[int, int]]) -> int:
    updated = 0
    for fid, (q_ax, r_ax) in positions.items():
        db.query(Feature).filter(Feature.id == fid, Feature.project_id == project_id).update({
            Feature.hex_q: q_ax,
            Feature.hex_r: r_ax,
        })
        updated += 1
    db.commit()
    return updated


