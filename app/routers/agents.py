from fastapi import APIRouter
import shutil
import subprocess


router = APIRouter(prefix="/agents", tags=["agents"])


@router.get("/health")
def agents_health():
    qwen = shutil.which("qwen") or shutil.which("qwen-code")
    ok = qwen is not None
    version = None
    if ok:
        try:
            out = subprocess.check_output([qwen, "--version"], stderr=subprocess.STDOUT, text=True, timeout=5)
            version = out.strip()
        except Exception:
            version = "unknown"
    return {"qwen_code_cli": ok, "version": version}


