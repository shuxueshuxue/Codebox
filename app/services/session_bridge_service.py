import json
from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from polycli.session_registry import get_registry

from app.db.models.session_run import SessionRun
from app.utils.id_gen import generate_id


def list_sessions() -> Dict[str, Any]:
    reg = get_registry()
    result = {}
    for sid, info in reg.registered_sessions.items():
        result[sid] = {
            "name": info.get("name"),
            "description": info.get("description"),
            "category": info.get("category"),
            "params": list(info.get("params", {}).keys()),
        }
    return result


def list_running() -> Dict[str, Any]:
    reg = get_registry()
    out = {}
    for exec_id, info in reg.running_sessions.items():
        out[exec_id] = {
            "status": info.get("status"),
            "params": info.get("params"),
            "start_time": info.get("start_time"),
        }
    return out


def trigger_session(db: Session, project_id: int, session_id: str, params: Dict[str, Any], task_id: Optional[int] = None, name: Optional[str] = None) -> str:
    reg = get_registry()
    exec_id = reg.trigger_session(session_id, params)

    # 预存 run 记录
    run = SessionRun(
        id=generate_id(),
        str_id=None,
        is_deleted=0,
        create_user_id=0,
        create_time=datetime.utcnow(),
        update_user_id=None,
        update_time=datetime.utcnow(),
        data_user_id=None,
        data_dept_id=None,
        project_id=project_id,
        session_id=session_id,
        name=name,
        task_id=task_id,
        params_json=json.dumps(params, ensure_ascii=False),
        status="running",
        result_json=None,
        records_json=None,
        started_at=datetime.utcnow(),
        ended_at=None,
    )
    db.add(run)
    db.commit()
    return exec_id


def update_run_status(db: Session, exec_id: str, status: str, result: Any = None, records: Any = None) -> None:
    # 简化：按 exec_id 暂无字段，真实生产应在 registry 回调/轮询时写入。
    # 这里仅提供接口位，API 层可在轮询到结束后写入匹配 run。
    pass


