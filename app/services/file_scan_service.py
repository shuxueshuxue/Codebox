import hashlib
import os
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict
import re
import ast

from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models.file import File
from app.utils.id_gen import generate_id


LANG_EXT = {
    ".py": "python",
    ".ts": "ts",
    ".tsx": "ts",
    ".js": "js",
    ".jsx": "js",
    ".md": "md",
    ".json": "json",
}


def _sha256_of_file(path: Path) -> Optional[str]:
    try:
        h = hashlib.sha256()
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                h.update(chunk)
        return h.hexdigest()
    except Exception:
        return None


def scan_workspace(db: Session, project_id: int, root: Optional[str] = None) -> int:
    root_dir = Path(root or settings.WORKSPACE_ROOT)
    now = datetime.utcnow()

    existing = {
        (r.path, int(r.is_dir)): r
        for r in db.query(File).filter(File.project_id == project_id, File.is_deleted == 0).all()
    }

    def upsert_file(path: str, is_dir: int, **fields):
        key = (path, is_dir)
        row = existing.get(key)
        if row is None:
            row = File(
                id=generate_id(),
                str_id=None,
                is_deleted=0,
                create_user_id=0,
                project_id=project_id,
                path=path,
                is_dir=is_dir,
            )
            existing[key] = row
            db.add(row)
        for k, v in fields.items():
            setattr(row, k, v)

    count = 0
    for dirpath, dirnames, filenames in os.walk(root_dir):
        rel_dir = os.path.relpath(dirpath, root_dir).replace("\\", "/")
        rel_dir = "." if rel_dir == "." else rel_dir

        # 1) 忽略大目录
        dirnames[:] = [d for d in dirnames if d not in settings.SCAN_IGNORE_DIRS]

        # 2) 限制深度
        depth = 0 if rel_dir == "." else rel_dir.count("/") + 1
        if depth >= settings.SCAN_MAX_DEPTH:
            dirnames[:] = []

        if rel_dir != ".":
            parent = os.path.dirname(rel_dir).replace("\\", "/") if rel_dir else None
            upsert_file(
                rel_dir,
                1,
                size_bytes=None,
                hash_sha256=None,
                lang=None,
                parent_path=parent if parent else None,
                last_scanned_time=now,
            )
            count += 1

        for name in filenames:
            full_path = Path(dirpath) / name
            rel_path = os.path.relpath(full_path, root_dir).replace("\\", "/")
            try:
                st = full_path.stat()
                size = st.st_size
                mtime = st.st_mtime
            except Exception:
                size = None
                mtime = None

            ext = full_path.suffix.lower()
            lang = LANG_EXT.get(ext)
            parent = os.path.dirname(rel_path).replace("\\", "/") if "/" in rel_path else None

            # 3) 增量：如果未变化则仅更新时间戳
            row = existing.get((rel_path, 0))
            unchanged = False
            if row is not None and size is not None and mtime is not None and row.size_bytes == size and row.last_scanned_time:
                try:
                    unchanged = mtime <= row.last_scanned_time.timestamp()
                except Exception:
                    unchanged = False

            hashv = None
            if not unchanged:
                # 4) 条件哈希
                if settings.SCAN_HASH and size is not None and size <= settings.SCAN_HASH_MAX_BYTES:
                    hashv = _sha256_of_file(full_path)

            upsert_file(
                rel_path,
                0,
                size_bytes=size,
                hash_sha256=hashv if hashv else (row.hash_sha256 if row else None),
                lang=lang,
                parent_path=parent if parent else None,
                last_scanned_time=now,
            )
            count += 1

    db.commit()
    return count


def infer_deps(db: Session, project_id: int, paths: Optional[List[str]] = None) -> List[Dict]:
    """最小可用的静态依赖推断：Python/TS/JS 简单 import/require 扫描。
    返回: [ {"src","dst","dep_type","inferred_by","confidence"}, ... ]
    """
    root_dir = Path(settings.WORKSPACE_ROOT)
    # 收集候选文件
    q = db.query(File).filter(File.project_id == project_id, File.is_deleted == 0, File.is_dir == 0)
    if paths:
        norm = {p.replace("\\", "/") for p in paths}
        q = q.filter(File.path.in_(list(norm)))
    files = q.all()

    # 建索引以便路径解析
    all_files = db.query(File).filter(File.project_id == project_id, File.is_deleted == 0, File.is_dir == 0).all()
    file_set = {f.path for f in all_files}

    deps: List[Dict] = []

    # JS/TS import 解析
    import_re = re.compile(r"^\s*import\s+.*?from\s+['\"](.*?)['\"];?", re.MULTILINE)
    require_re = re.compile(r"require\(['\"](.*?)['\"]\)")

    def resolve_module_to_path(src_path: str, mod: str, lang: str) -> Optional[str]:
        # 仅解析本地相对路径
        if mod.startswith("."):
            src_parent = os.path.dirname(src_path)
            rel = os.path.normpath(os.path.join(src_parent, mod)).replace("\\", "/")
            candidates = []
            if lang in ("js", "ts"):
                for ext in (".ts", ".tsx", ".js", ".jsx", ".d.ts"):
                    candidates.append(rel + ext)
                candidates.append(rel + "/index.ts")
                candidates.append(rel + "/index.js")
            elif lang == "python":
                candidates.append(rel + ".py")
                candidates.append(rel + "/__init__.py")
            for c in candidates:
                if c in file_set:
                    return c
        else:
            # python 包形式 a.b.c -> a/b/c.py 或 __init__.py
            if lang == "python":
                as_path = mod.replace(".", "/")
                for c in (as_path + ".py", as_path + "/__init__.py"):
                    if c in file_set:
                        return c
        return None

    for f in files:
        src = f.path
        full_path = root_dir / src
        lang = f.lang or Path(src).suffix.lower().lstrip(".")
        try:
            text = full_path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue

        if lang == "python":
            try:
                tree = ast.parse(text)
            except Exception:
                tree = None
            if tree:
                for node in ast.walk(tree):
                    if isinstance(node, ast.Import):
                        for n in node.names:
                            dst = resolve_module_to_path(src, n.name, "python")
                            if dst:
                                deps.append({
                                    "src": src,
                                    "dst": dst,
                                    "dep_type": "import",
                                    "inferred_by": "static",
                                    "confidence": 0.9,
                                })
                    elif isinstance(node, ast.ImportFrom):
                        mod = node.module or ""
                        # 相对 from ... import ... 不处理级数，作为同目录近似
                        if node.level and not mod:
                            mod = "."
                        dst = resolve_module_to_path(src, mod, "python")
                        if dst:
                            deps.append({
                                "src": src,
                                "dst": dst,
                                "dep_type": "import",
                                "inferred_by": "static",
                                "confidence": 0.85,
                            })
        elif lang in ("ts", "js"):
            for m in import_re.findall(text) + require_re.findall(text):
                dst = resolve_module_to_path(src, m, "ts")
                if dst:
                    deps.append({
                        "src": src,
                        "dst": dst,
                        "dep_type": "import",
                        "inferred_by": "static",
                        "confidence": 0.85,
                    })

    return deps


def scan_one_level(db: Session, project_id: int, parent: Optional[str], root: Optional[str] = None) -> int:
    """只刷新指定 parent 目录的直接子项（不递归）。
    parent=None 表示工作区根目录的第一层。
    返回更新/插入条目数量。
    """
    root_dir = Path(root or settings.WORKSPACE_ROOT)
    if parent and (parent.startswith("../") or parent.startswith("..\\")):
        # 简单防御，避免越界
        return 0

    base_path = root_dir if parent is None else (root_dir / parent)
    if not base_path.exists() or not base_path.is_dir():
        return 0

    # 现有索引
    existing = {
        (r.path, int(r.is_dir)): r
        for r in db.query(File).filter(File.project_id == project_id, File.is_deleted == 0).all()
    }

    def upsert_file(path: str, is_dir: int, **fields):
        key = (path, is_dir)
        row = existing.get(key)
        if row is None:
            row = File(
                id=generate_id(),
                str_id=None,
                is_deleted=0,
                create_user_id=0,
                project_id=project_id,
                path=path,
                is_dir=is_dir,
            )
            existing[key] = row
            db.add(row)
        for k, v in fields.items():
            setattr(row, k, v)

    now = datetime.utcnow()
    changed = 0

    try:
        with os.scandir(base_path) as it:
            for entry in it:
                name = entry.name
                # 忽略大目录名
                if entry.is_dir(follow_symlinks=False) and name in settings.SCAN_IGNORE_DIRS:
                    continue

                rel_path = (Path(parent) / name).as_posix() if parent else name
                try:
                    st = entry.stat()
                    size = None if entry.is_dir() else st.st_size
                    mtime = st.st_mtime
                except Exception:
                    size = None
                    mtime = None

                if entry.is_dir(follow_symlinks=False):
                    upsert_file(
                        rel_path,
                        1,
                        size_bytes=None,
                        hash_sha256=None,
                        lang=None,
                        parent_path=parent,
                        last_scanned_time=now,
                    )
                    changed += 1
                else:
                    ext = Path(name).suffix.lower()
                    lang = LANG_EXT.get(ext)
                    row = existing.get((rel_path, 0))
                    unchanged = False
                    if row is not None and size is not None and mtime is not None and row.size_bytes == size and row.last_scanned_time:
                        try:
                            unchanged = mtime <= row.last_scanned_time.timestamp()
                        except Exception:
                            unchanged = False
                    hashv = None
                    if not unchanged and settings.SCAN_HASH and size is not None and size <= settings.SCAN_HASH_MAX_BYTES:
                        try:
                            hashv = _sha256_of_file(Path(entry.path))
                        except Exception:
                            hashv = None

                    upsert_file(
                        rel_path,
                        0,
                        size_bytes=size,
                        hash_sha256=hashv if hashv else (row.hash_sha256 if row else None),
                        lang=lang,
                        parent_path=parent,
                        last_scanned_time=now,
                    )
                    changed += 1
    except Exception:
        pass

    db.commit()
    return changed


