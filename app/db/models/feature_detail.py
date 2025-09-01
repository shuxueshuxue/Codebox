from sqlalchemy import Column, BigInteger, Integer, String, DateTime, Text
from sqlalchemy.sql import func

from app.db.base import Base


class FeatureDetail(Base):
    __tablename__ = "feature_details"

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
    feature_id = Column(BigInteger, nullable=False)
    files_json = Column(Text, nullable=True)
    file_deps_json = Column(Text, nullable=True)
    llm_notes_json = Column(Text, nullable=True)
    extras_json = Column(Text, nullable=True)


