from sqlalchemy import Column, BigInteger, Integer, String, DateTime, Text
from sqlalchemy.sql import func

from app.db.base import Base


class Task(Base):
    __tablename__ = "tasks"

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
    name = Column(String(128), nullable=False)
    description = Column(Text, nullable=True)
    session_id = Column(String(128), nullable=False)
    agent_ids_json = Column(Text, nullable=False)
    feature_ids_json = Column(Text, nullable=False)
    params_json = Column(Text, nullable=True)
    status = Column(String(32), nullable=False, default="active")


