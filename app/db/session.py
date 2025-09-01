from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings


engine = create_engine(settings.MYSQL_URI, pool_pre_ping=True, pool_recycle=3600)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


