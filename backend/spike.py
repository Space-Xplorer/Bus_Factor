"""Hour-1 Cognee spike (BuildSpec §4.4, §7). Standalone script.

(a) initializes cognee per COGNEE_MODE
(b) adds exactly two files into dataset "spike"
(c) runs cognify
(d) runs 3 searches
(e) dumps whatever graph/node/edge inspection the SDK exposes to
    spike_output.json

Run: .venv/Scripts/python.exe spike.py
"""
import asyncio
import json
import traceback
from pathlib import Path

import graph_client
from cognee import SearchType

DATASET = "spike"
FILES = [
    Path(__file__).parent / "data" / "postmortems" / "PM-2025-08-retry-storm.md",
    Path(__file__).parent / "data" / "slack" / "slack_threads.md",
]
QUERIES = [
    "Who resolved the retry storm incident?",
    "What is the procedure for draining the retry backlog?",
    "What services did Priya Nair work on?",
]


def _jsonable(obj):
    """Best-effort conversion of SDK objects to JSON-serializable structures."""
    if isinstance(obj, (str, int, float, bool)) or obj is None:
        return obj
    if isinstance(obj, dict):
        return {str(k): _jsonable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple, set)):
        return [_jsonable(v) for v in obj]
    if hasattr(obj, "model_dump"):
        try:
            return _jsonable(obj.model_dump())
        except Exception:
            pass
    if hasattr(obj, "__dict__"):
        return {k: _jsonable(v) for k, v in vars(obj).items() if not k.startswith("_")}
    return str(obj)


async def main():
    output = {"steps": {}}

    # (b) add exactly two files into dataset "spike"
    step = "add"
    try:
        for f in FILES:
            assert f.exists(), f"missing file: {f}"
        add_results = []
        for f in FILES:
            r = await graph_client.add(str(f), dataset_name=DATASET)
            add_results.append(_jsonable(r))
        output["steps"][step] = {"status": "OK", "result": add_results}
        print(f"[{step}] OK — added {len(FILES)} files to dataset '{DATASET}'")
    except Exception as e:
        output["steps"][step] = {"status": "ERROR", "error": str(e), "traceback": traceback.format_exc()}
        print(f"[{step}] ERROR: {e}")
        _dump(output)
        return

    # (c) cognify
    step = "cognify"
    try:
        r = await graph_client.cognify(datasets=[DATASET])
        output["steps"][step] = {"status": "OK", "result": _jsonable(r)}
        print(f"[{step}] OK")
    except Exception as e:
        output["steps"][step] = {"status": "ERROR", "error": str(e), "traceback": traceback.format_exc()}
        print(f"[{step}] ERROR: {e}")
        _dump(output)
        return

    # (d) 3 searches
    step = "search"
    output["steps"][step] = {}
    for q in QUERIES:
        try:
            r = await graph_client.search(q, query_type=SearchType.GRAPH_COMPLETION, datasets=[DATASET])
            output["steps"][step][q] = {"status": "OK", "result": _jsonable(r)}
            print(f"[search] OK — {q!r}")
        except Exception as e:
            output["steps"][step][q] = {"status": "ERROR", "error": str(e), "traceback": traceback.format_exc()}
            print(f"[search] ERROR on {q!r}: {e}")

    # (e) graph/node/edge inspection
    step = "graph_inspection"
    try:
        nodes, edges = await graph_client.get_graph_data()
        output["steps"][step] = {
            "status": "OK",
            "node_count": len(nodes),
            "edge_count": len(edges),
            "nodes": _jsonable(nodes),
            "edges": _jsonable(edges),
        }
        print(f"[{step}] OK — {len(nodes)} nodes, {len(edges)} edges")
    except Exception as e:
        output["steps"][step] = {"status": "ERROR", "error": str(e), "traceback": traceback.format_exc()}
        print(f"[{step}] ERROR: {e}")

    _dump(output)


def _dump(output):
    out_path = Path(__file__).parent / "spike_output.json"
    out_path.write_text(json.dumps(output, indent=2, default=str), encoding="utf-8")
    print(f"\nWrote {out_path}")


if __name__ == "__main__":
    asyncio.run(main())
