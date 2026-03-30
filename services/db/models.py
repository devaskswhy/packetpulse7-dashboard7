import datetime
from typing import Optional
from sqlalchemy import String, Integer, Float, Boolean, DateTime, JSON, BigInteger
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

class Base(DeclarativeBase):
    pass

class Flow(Base):
    __tablename__ = "flows"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    flow_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    src_ip: Mapped[str] = mapped_column(String(45))
    dst_ip: Mapped[str] = mapped_column(String(45))
    src_port: Mapped[int] = mapped_column(Integer)
    dst_port: Mapped[int] = mapped_column(Integer)
    protocol: Mapped[str] = mapped_column(String(10))
    app: Mapped[str] = mapped_column(String(50))
    sni: Mapped[Optional[str]] = mapped_column(String(255))
    bytes: Mapped[int] = mapped_column(BigInteger, default=0)
    packets: Mapped[int] = mapped_column(Integer, default=0)
    first_seen: Mapped[datetime.datetime] = mapped_column(DateTime)
    last_seen: Mapped[datetime.datetime] = mapped_column(DateTime)
    blocked: Mapped[bool] = mapped_column(Boolean, default=False)
    duration_s: Mapped[float] = mapped_column(Float, default=0.0)

class Alert(Base):
    __tablename__ = "alerts"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    alert_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    type: Mapped[str] = mapped_column(String(50))
    flow_id: Mapped[Optional[str]] = mapped_column(String(64))
    src_ip: Mapped[Optional[str]] = mapped_column(String(45))
    dst_ip: Mapped[Optional[str]] = mapped_column(String(45))
    reason: Mapped[str] = mapped_column(String(255))
    severity: Mapped[str] = mapped_column(String(20))
    ts: Mapped[datetime.datetime] = mapped_column(DateTime)

class Stats(Base):
    __tablename__ = "stats"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    ts: Mapped[datetime.datetime] = mapped_column(DateTime, index=True)
    total_packets: Mapped[int] = mapped_column(BigInteger)
    total_bytes: Mapped[int] = mapped_column(BigInteger)
    blocked_count: Mapped[int] = mapped_column(Integer)
    top_apps: Mapped[dict] = mapped_column(JSON)
