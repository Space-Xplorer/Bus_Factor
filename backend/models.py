"""Pydantic schemas mirroring the API contract (BuildSpec §6) exactly."""
from typing import Literal, Optional

from pydantic import BaseModel

NodeType = Literal["engineer", "service"]
Status = Literal["RED", "YELLOW", "GREEN", "EXCLUDED"]
EdgeKind = Literal["touched", "covers", "depends_on", "resolved"]


class GraphNode(BaseModel):
    id: str
    label: str
    type: NodeType
    criticality: Optional[str] = None
    status: Optional[Status] = None


class GraphEdge(BaseModel):
    source: str
    target: str
    kind: EdgeKind


class GraphResponse(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]


class RiskBreakdown(BaseModel):
    exclusivity: float
    centrality: float
    doc_coverage: float


class RiskPair(BaseModel):
    engineer: str
    service: str
    score: float
    status: Status
    breakdown: RiskBreakdown


class RiskResponse(BaseModel):
    formula: str
    pairs: list[RiskPair]


class ResignRequest(BaseModel):
    engineer: str


class RedZone(BaseModel):
    service: str
    score: float
    evidence: list[str]


class Question(BaseModel):
    zone: str
    text: str
    index: int
    total: int


class ResignResponse(BaseModel):
    session_id: str
    zones: list[RedZone]
    first_question: Question


class AnswerRequest(BaseModel):
    text: str


class AnswerResponse(BaseModel):
    done: bool
    next_question: Optional[Question] = None
    captured_zones: Optional[list[str]] = None


class RiskDelta(BaseModel):
    engineer: str
    service: str
    before: dict
    after: dict


class CaptureCompleteResponse(BaseModel):
    delta: list[RiskDelta]
    memory_events: list[str]


class IngestResponse(BaseModel):
    datasets: list[str]
    node_count: int
    edge_count: int


class ErrorResponse(BaseModel):
    error: str
