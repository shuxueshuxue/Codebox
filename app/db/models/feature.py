from sqlalchemy import Column, BigInteger, Integer, String, DateTime, Text
from sqlalchemy.sql import func

from app.db.base import Base


class Feature(Base):
    __tablename__ = "features"

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
    category = Column(String(64), nullable=True)
    tags_json = Column(Text, nullable=True)
    hex_q = Column(Integer, nullable=True)
    hex_r = Column(Integer, nullable=True)
    layout_locked = Column(Integer, nullable=False, default=0)
    generated_by_run_id = Column(String(64), nullable=True)


