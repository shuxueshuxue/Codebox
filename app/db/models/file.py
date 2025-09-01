from sqlalchemy import Column, BigInteger, Integer, String, DateTime
from sqlalchemy.sql import func

from app.db.base import Base


class File(Base):
    __tablename__ = "files"

    id = Column(BigInteger, primary_key=True, nullable=False)
    str_id = Column(String(44), nullable=True)
    is_deleted = Column(Integer, nullable=False, default=0)
    create_user_id = Column(BigInteger, nullable=False)
    create_time = Column(DateTime, nullable=False, server_default=func.now())
    update_user_id = Column(BigInteger, nullable=True)
    update_time = Column(DateTime, nullable=True, server_default=func.now(), onupdate=func.now())
    data_user_id = Column(BigInteger, nullable=True)
    data_dept_id = Column(BigInteger, nullable=True)

    project_id = Column(BigInteger, nullable=False)
    path = Column(String(1024), nullable=False)
    is_dir = Column(Integer, nullable=False, default=0)
    size_bytes = Column(BigInteger, nullable=True)
    hash_sha256 = Column(String(64), nullable=True)
    lang = Column(String(32), nullable=True)
    parent_path = Column(String(1024), nullable=True)
    last_scanned_time = Column(DateTime, nullable=True)


