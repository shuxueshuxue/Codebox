from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.db.models.file import File
from app.schemas.file import FileOut
from app.services.file_scan_service import scan_workspace, infer_deps, scan_one_level


router = APIRouter(prefix="/projects/{project_id}/files", tags=["files"])


@router.post("/scan")
def scan_files(project_id: int, db: Session = Depends(get_db)):
    count = scan_workspace(db, project_id)
    return {"scanned": count}


@router.get("")
def list_files(
    project_id: int,
    parent: str | None = None,
    only_dirs: bool = False,
    limit: int = 200,
    offset: int = 0,
    refresh: bool = True,
    db: Session = Depends(get_db),
):
    # 可选：仅刷新当前层级，避免全量扫描
    if refresh:
        scan_one_level(db, project_id, parent)
    q = db.query(File).filter(File.project_id == project_id, File.is_deleted == 0)
    if parent is None:
        q = q.filter(File.parent_path == None)  # noqa: E711
    else:
        q = q.filter(File.parent_path == parent)
    if only_dirs:
        q = q.filter(File.is_dir == 1)
    rows = q.order_by(File.is_dir.desc(), File.path.asc()).limit(limit).offset(offset).all()
    return [FileOut.from_orm(r).dict() for r in rows]


@router.post("/infer-deps")
def post_infer_deps(project_id: int, body: dict, db: Session = Depends(get_db)):
    paths = body.get("paths")
    deps = infer_deps(db, project_id, paths)
    return {"deps": deps}


@router.get("/tree")
def get_file_tree(project_id: int, db: Session = Depends(get_db)):
    rows = db.query(File).filter(File.project_id == project_id, File.is_deleted == 0).all()
    # 构造 parent -> children 映射
    by_parent: dict[str | None, list[File]] = {}
    for r in rows:
        by_parent.setdefault(r.parent_path, []).append(r)
    for arr in by_parent.values():
        arr.sort(key=lambda x: (0 if x.is_dir else 1, x.path))

    def build_node(f: File) -> dict:
        name = f.path.split("/")[-1] if f.path else f.path
        node = {"id": f.path, "name": name}
        if f.is_dir:
            kids = by_parent.get(f.path, [])
            if kids:
                node["children"] = [build_node(k) for k in kids]
        return node

    roots = by_parent.get(None, [])
    tree = [build_node(r) for r in roots]
    return {"tree": tree}


