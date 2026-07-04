"""Interview agent: zone detection, question gen, capture (BuildSpec §4.3).
Structure only — out of scope for Phase 1.
"""


async def start_session(engineer: str):
    raise NotImplementedError


async def submit_answer(session_id: str, text: str):
    raise NotImplementedError


async def complete_capture(session_id: str):
    raise NotImplementedError
