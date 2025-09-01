from sqlalchemy import Column, BigInteger, Integer, String, DateTime, Text
from sqlalchemy.sql import func

from app.db.base import Base


class SessionRun(Base):
    __tablename__ = "session_runs"

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
    session_id = Column(String(128), nullable=False)
    name = Column(String(128), nullable=True)
    task_id = Column(BigInteger, nullable=True)
    params_json = Column(Text, nullable=True)
    status = Column(String(32), nullable=False)
    result_json = Column(Text, nullable=True)
    records_json = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=False)
    ended_at = Column(DateTime, nullable=True)


