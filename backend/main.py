"""FastAPI app, CORS open for localhost (BuildSpec §4.1, §6).

Phase 1 scope only: routes exist with the correct request/response shapes so
the frontend contract is locked, but handlers are not implemented yet (risk
engine, interview agent, ingestion pipeline are later phases).
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import models

app = FastAPI(title="BusFactor API")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://localhost(:\d+)?",
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/graph", response_model=models.GraphResponse)
async def get_graph():
    raise NotImplementedError("ingestion.py / graph_client.py not wired up yet (Phase 1)")


@app.get("/api/risk", response_model=models.RiskResponse)
async def get_risk():
    raise NotImplementedError("risk_engine.py not implemented yet (Phase 1)")


@app.post("/api/resign", response_model=models.ResignResponse)
async def resign(req: models.ResignRequest):
    raise NotImplementedError("interview.py not implemented yet (Phase 1)")


@app.post("/api/interview/{session_id}/answer", response_model=models.AnswerResponse)
async def interview_answer(session_id: str, req: models.AnswerRequest):
    raise NotImplementedError("interview.py not implemented yet (Phase 1)")


@app.post("/api/capture/{session_id}/complete", response_model=models.CaptureCompleteResponse)
async def capture_complete(session_id: str):
    raise NotImplementedError("interview.py not implemented yet (Phase 1)")


@app.post("/api/ingest", response_model=models.IngestResponse)
async def ingest():
    raise NotImplementedError("ingestion.py not implemented yet (Phase 1)")
