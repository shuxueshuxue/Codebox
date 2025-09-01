import os
from pathlib import Path
from dotenv import load_dotenv


class Settings:
    def __init__(self) -> None:
        # Load .env if present
        env_path = Path(".env")
        if env_path.exists():
            load_dotenv(dotenv_path=env_path)

        # Core
        self.APP_NAME: str = os.getenv("APP_NAME", "Codebox API")
        self.API_PREFIX: str = os.getenv("API_PREFIX", "/api/v1")

        # Database
        self.MYSQL_URI: str = os.getenv(
            "MYSQL_URI",
            "mysql+pymysql://root:jQ4fJzsV35UDNMXU3Fma4HNGxur8u2@112.115.191.209:30176/codebox",
        )

        # Workspace
        self.WORKSPACE_ROOT: str = os.getenv("WORKSPACE_ROOT", str(Path.cwd()))

        # Scan controls
        self.SCAN_IGNORE_DIRS = os.getenv(
            "SCAN_IGNORE_DIRS",
            ".git,.conda,node_modules,.venv,.polycache,.cache,.mypy_cache,.pytest_cache",
        ).split(",")
        self.SCAN_MAX_DEPTH: int = int(os.getenv("SCAN_MAX_DEPTH", "12"))
        self.SCAN_HASH: bool = os.getenv("SCAN_HASH", "false").lower() == "true"
        self.SCAN_HASH_MAX_BYTES: int = int(os.getenv("SCAN_HASH_MAX_BYTES", "1048576"))

        # PolyAgent
        self.AUTO_SERVE_SESSION_UI: bool = os.getenv("AUTO_SERVE_SESSION_UI", "false").lower() == "true"
        self.POLYCLI_CACHE: bool = os.getenv("POLYCLI_CACHE", "true").lower() == "true"

        # Server
        self.HOST: str = os.getenv("HOST", "0.0.0.0")
        self.PORT: int = int(os.getenv("PORT", "8000"))


settings = Settings()


