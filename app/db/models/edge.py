from sqlalchemy import Column, BigInteger, Integer, String, DateTime, Text, Numeric
from sqlalchemy.sql import func

from app.db.base import Base


class Edge(Base):
    __tablename__ = "edges"

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
    from_feature_id = Column(BigInteger, nullable=False)
    to_feature_id = Column(BigInteger, nullable=False)
    kind = Column(String(24), nullable=False)
    description = Column(Text, nullable=True)
    confidence = Column(Numeric(5, 4), nullable=True)


