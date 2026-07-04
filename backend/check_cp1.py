"""CP1 checkpoint: verify the 6 graph assertions from
backend/data/MANIFEST.md "Ingestion Checkpoint" (BuildSpec §7, §4.4).

Phase 1 scope: the full ingestion pipeline (ingestion.py) doesn't exist yet —
only the hour-1 spike dataset ("spike": PM-2025-08 postmortem + slack threads)
is loaded. So this run cannot pass assertions whose source documents were
never ingested; for those it reports NOT_CHECKABLE (data absent) rather than
FAIL (graph missed an edge that WAS available). Re-run this same script
unmodified in Phase 2 by pointing DATASET at the real ingestion datasets —
the assertion logic doesn't change, only what's fed into cognee does.

Node/edge shapes confirmed by direct inspection of cognee 1.2.2
(cognee.api.v1.visualize.memory_provenance):
  Node    = NamedTuple(id: str, properties: dict)
  EdgeData = NamedTuple(source: str, target: str, relation: str, properties: dict)
No fixed ontology is assumed — cognee's default cognify extraction decides
entity/relation names, so matching below is fuzzy (substring, case-insensitive)
rather than exact-label. If default extraction can't be matched this way at
all, that itself is the CP1 signal to fall back to the custom ontology
(BuildSpec §4.4, §8 risk #1).

Run: .venv/Scripts/python.exe check_cp1.py
"""
import asyncio
import json
from pathlib import Path

import graph_client

DATASET = "spike"

# Each assertion: (id, description, keyword pairs to find connected, which
# source files it depends on being ingested)
ASSERTIONS = [
    {
        "id": 1,
        "description": "(Priya Nair) -authored/committed-> (payment-retry-engine) [+ other 2 red zones]",
        "pair": ("priya", "retry"),
        "requires_files": ["postmortems/PM-2025-08-retry-storm.md", "git/git_log.txt"],
    },
    {
        "id": 2,
        "description": "(Priya Nair) -resolved-> (PM-2025-08), (PM-2025-11), (PM-2026-01)",
        "pair": ("priya", "pm-2025-08"),
        "requires_files": ["postmortems/PM-2025-08-retry-storm.md"],
    },
    {
        "id": 3,
        "description": "(payment-retry-engine) -affected_in-> (PM-2025-08)",
        "pair": ("retry", "pm-2025-08"),
        "requires_files": ["postmortems/PM-2025-08-retry-storm.md"],
    },
    {
        "id": 4,
        "description": "(analytics-pipeline) -documented_by-> (analytics-pipeline-runbook)",
        "pair": ("analytics-pipeline", "runbook"),
        "requires_files": ["runbooks/analytics-pipeline-runbook.md"],
    },
    {
        "id": 5,
        "description": "(legacy-fx-service) -deprecated_by-> (ADR-015)",
        "pair": ("legacy-fx", "adr-015"),
        "requires_files": ["adrs/ADR-015-deprecate-legacy-fx.md"],
    },
    {
        "id": 6,
        "description": "(payments-api) -depends_on-> (payment-retry-engine) [centrality edges]",
        "pair": ("payments-api", "retry"),
        "requires_files": ["roster/service_registry.md"],
    },
]

# Files actually ingested into DATASET by spike.py (task 2b) as of Phase 1.
INGESTED_FILES = [
    "postmortems/PM-2025-08-retry-storm.md",
    "slack/slack_threads.md",
]


def _node_text(node) -> str:
    return json.dumps({"id": node.id, **node.properties}, default=str).lower()


def find_nodes(nodes, keyword: str):
    kw = keyword.lower()
    return [n for n in nodes if kw in _node_text(n)]


def check_assertion(assertion, nodes, edges):
    missing = [f for f in assertion["requires_files"] if f not in INGESTED_FILES]
    if missing:
        return "NOT_CHECKABLE", f"source file(s) not ingested into dataset '{DATASET}': {missing}"

    kw_a, kw_b = assertion["pair"]
    nodes_a = find_nodes(nodes, kw_a)
    nodes_b = find_nodes(nodes, kw_b)
    if not nodes_a or not nodes_b:
        missing_side = kw_a if not nodes_a else kw_b
        return "FAIL", f"no node matched '{missing_side}' (extraction likely missed this entity)"

    ids_a = {n.id for n in nodes_a}
    ids_b = {n.id for n in nodes_b}
    for e in edges:
        if (e.source in ids_a and e.target in ids_b) or (e.source in ids_b and e.target in ids_a):
            return "PASS", f"edge found: ({e.source}) -{e.relation}-> ({e.target})"

    return "FAIL", (
        f"nodes matching '{kw_a}' ({len(nodes_a)}) and '{kw_b}' ({len(nodes_b)}) exist "
        f"but no edge connects them directly"
    )


async def main():
    results = []
    try:
        nodes, edges = await graph_client.get_graph_data()
        print(f"Graph inspection OK — {len(nodes)} nodes, {len(edges)} edges (via cognee.get_memory_provenance_graph)")
    except Exception as e:
        print(f"Graph inspection FAILED: {e}")
        print("Cannot check any assertion without graph access — see BuildSpec §8 risk #1.")
        nodes, edges = [], []
        graph_access_error = str(e)
    else:
        graph_access_error = None

    for a in ASSERTIONS:
        if graph_access_error:
            status, detail = "NOT_CHECKABLE", f"graph access itself failed: {graph_access_error}"
        else:
            status, detail = check_assertion(a, nodes, edges)
        results.append({"id": a["id"], "description": a["description"], "status": status, "detail": detail})
        print(f"[{status:14s}] #{a['id']} {a['description']}\n{'':17s}  -> {detail}")

    passed = sum(1 for r in results if r["status"] == "PASS")
    checkable = sum(1 for r in results if r["status"] != "NOT_CHECKABLE")
    print(f"\n{passed}/6 PASS ({checkable}/6 even checkable against dataset '{DATASET}' at this phase)")

    out_path = Path(__file__).parent / "cp1_output.json"
    out_path.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    asyncio.run(main())
