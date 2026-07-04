"""Knowledge-risk scoring: two providers, CogneeProvider and RawProvider
(BuildSpec §4.2, §3). Structure only — out of scope for Phase 1.
"""


class RawProvider:
    """Parses git_log.txt + service_registry.md + doc inventory directly."""


class CogneeProvider:
    """Reads Engineer-touched->Service, Doc-covers->Service edges via
    graph_client (cognee graph access / search)."""


def score(engineer: str, service: str) -> float:
    raise NotImplementedError


def red_zones(engineer: str) -> list[str]:
    raise NotImplementedError
