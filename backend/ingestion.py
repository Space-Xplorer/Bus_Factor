"""Dataset -> cognee add/cognify; forget legacy-fx (BuildSpec §4.1, §4.4).

Structure only — implemented in the Fri 09:00-12:00 slot (§7), after CP1.
"""


async def ingest_all():
    """Ingest each source type in backend/data/ into its named cognee dataset
    (git, postmortems, adrs, slack, runbooks, registry — §4.4), excluding
    legacy-fx-service content per ADR-015 (§8 risk #3 fallback)."""
    raise NotImplementedError


async def forget_legacy_fx():
    """Try graph_client.forget_dataset()/prune on legacy-fx nodes; fallback =
    exclude at ingestion + EXCLUDED status in risk engine (§4.4, §8 risk #3)."""
    raise NotImplementedError
