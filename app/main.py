from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.core.config import settings
from app.db.base import Base
from app.db.session import engine

from app.routers.projects import router as projects_router
from app.routers.features import router as features_router
from app.routers.edges import router as edges_router
from app.routers.files import router as files_router
from app.routers.graph import router as graph_router
from app.routers.sessions import router as sessions_router
from app.routers.agents import router as agents_router
from app.routers.tasks import router as tasks_router
import app.sessions  # 导入以注册所有 @session_def


def create_app() -> FastAPI:
    # 创建表（不含迁移；假设已用建表SQL初始化）
    try:
        Base.metadata.create_all(bind=engine)
    except Exception:
        pass

    app = FastAPI(title=settings.APP_NAME)
    app.add_middleware(GZipMiddleware, minimum_size=1024)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    api = FastAPI()
    api.include_router(projects_router)
    api.include_router(features_router)
    api.include_router(edges_router)
    api.include_router(files_router)
    api.include_router(graph_router)
    api.include_router(sessions_router)
    api.include_router(agents_router)
    api.include_router(tasks_router)

    app.mount(settings.API_PREFIX, api)
    return app


app = create_app()


