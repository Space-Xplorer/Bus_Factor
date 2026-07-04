"""Thin wrapper: ALL cognee calls live here only (BuildSpec §4.4).

This is the one file that changes to swap cloud <-> local (D1, Risk #2).
Everything else in the backend imports from graph_client, never from cognee
directly.

SDK surface CONFIRMED by direct inspection (inspect.signature) against the
installed cognee==1.2.2 package on 2026-07-04 (see spike_output.json for the
live run this was checked against):

  cognee.add(data, dataset_name='main_dataset', node_set=None,
             incremental_loading=True, ...)
  cognee.cognify(datasets=None, ...)
  cognee.search(query_text, query_type=SearchType.GRAPH_COMPLETION,
                datasets=None, top_k=15, ...) -> List[SearchResult]
  cognee.forget(*, data_id=None, dataset=None, dataset_id=None,
                everything=False, memory_only=False) -> dict
  cognee.datasets.list_datasets() / .list_data(dataset_id) / .delete_data(...)
      / .delete_all() / .discover_datasets() / .empty_dataset(...)
      / .get_status(...) / .has_data(...)
  cognee.prune.prune_data() / cognee.prune.prune_system(graph=, vector=,
      metadata=, cache=)   -- GLOBAL reset, not dataset-scoped
  cognee.get_memory_provenance_graph(include_memory=False, ...)
      -> (nodes: List[Node], edges: List[EdgeData])   -- real top-level graph
      inspection API, no need for the internal get_graph_engine() accessor.
  cognee.visualize_graph(destination_file_path=None, dataset='main_dataset')
      -> writes an HTML visualization, returns the file path.

This means BuildSpec §8 risk #3 ("forget() API not surfaced/limited") does
NOT trigger for dataset-level forget — cognee.forget(dataset=...) is real.
Whether it prunes ALL nodes belonging to a specific SERVICE (e.g.
legacy-fx-service) rather than an entire dataset is still open; the
screenplay data is ingested with one dataset per source type (§4.4), not one
per service, so a targeted forget of just legacy-fx-service still likely
needs the ingestion-exclusion fallback. Confirm this at CP1 (Phase 2).
"""
import config

config.apply_cognee_env()

import cognee  # noqa: E402  (must import after apply_cognee_env)
from cognee import SearchType  # noqa: E402


async def add(data, dataset_name: str):
    return await cognee.add(data, dataset_name=dataset_name)


async def cognify(datasets: list[str]):
    return await cognee.cognify(datasets=datasets)


async def search(query_text: str, query_type: SearchType = SearchType.GRAPH_COMPLETION, datasets=None):
    kwargs = {"query_text": query_text, "query_type": query_type}
    if datasets:
        kwargs["datasets"] = datasets
    return await cognee.search(**kwargs)


async def list_datasets():
    return await cognee.datasets.list_datasets()


async def forget_dataset(dataset_name: str) -> dict:
    """Confirmed real: cognee.forget(dataset=...) (see module docstring)."""
    return await cognee.forget(dataset=dataset_name)


async def get_graph_data():
    """Confirmed real top-level API: cognee.get_memory_provenance_graph()."""
    return await cognee.get_memory_provenance_graph()
