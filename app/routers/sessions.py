from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import time

from polycli.orchestration import SessionMonitor
from polycli.session_registry import get_registry

from app.core.deps import get_db
from app.services.session_bridge_service import list_sessions, list_running, trigger_session


router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.get("")
def get_sessions():
    return {"sessions": list_sessions()}


@router.get("/running")
def get_running():
    return {"running": list_running()}


@router.post("/trigger")
def post_trigger(body: dict, db: Session = Depends(get_db)):
    project_id = int(body.get("project_id"))
    session_id = body.get("session_id")
    params = body.get("params", {})
    task_id = body.get("task_id")
    name = body.get("name")
    exec_id = trigger_session(db, project_id, session_id, params, task_id=task_id, name=name)
    return {"success": True, "exec_id": exec_id}


@router.get("/{exec_id}/status")
def get_status(exec_id: str):
    reg = get_registry()
    status = reg.get_session_status(exec_id)
    return status or {"error": "not found"}


@router.get("/{exec_id}/events")
def sse_events(exec_id: str):
    reg = get_registry()
    info = reg.running_sessions.get(exec_id)
    if not info or not info.get("session"):
        return {"error": "not found"}
    monitor = SessionMonitor(info["session"])

    def event_stream():
        yield "data: connected\n\n"
        # TODO: 集成 monitor.handle_sse_client 到生成器
        while True:
            time.sleep(1)
            yield ": keep-alive\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/stop")
def post_stop(body: dict):
    exec_id = body.get("exec_id")
    reg = get_registry()
    ok = reg.stop_session(exec_id)
    return {"success": ok}


@router.post("/cancel")
def post_cancel(body: dict):
    exec_id = body.get("exec_id")
    reg = get_registry()
    ok = reg.cancel_session(exec_id)
    return {"success": ok}


