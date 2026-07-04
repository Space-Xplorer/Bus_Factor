"""Env config: COGNEE_MODE=cloud|local, LLM keys (BuildSpec §10 D1/D2).

Loading this module sets the underlying cognee env vars for whichever mode is
active, BEFORE cognee is imported anywhere else in the process. graph_client.py
is the only module that should import cognee.
"""
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

COGNEE_MODE = os.getenv("COGNEE_MODE", "local")  # "cloud" | "local"

# Primary: Groq via LiteLLM's "groq/" model prefix (LLM_PROVIDER=custom, no
# LLM_ENDPOINT needed — confirmed against docs.cognee.ai/setup-configuration/
# llm-providers, 2026-07-04). Fallback: Cloudflare Workers AI (see below).
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "custom")
LLM_MODEL = os.getenv("LLM_MODEL", "groq/llama-3.3-70b-versatile")
LLM_API_KEY = os.getenv("LLM_API_KEY", "")

# Cloudflare Workers AI fallback: LiteLLM's cloudflare handler reads these two
# directly from the environment, not from LLM_API_KEY. Only take effect if
# LLM_MODEL is switched to "cloudflare/@cf/...".
CLOUDFLARE_API_KEY = os.getenv("CLOUDFLARE_API_KEY", "")
CLOUDFLARE_ACCOUNT_ID = os.getenv("CLOUDFLARE_ACCOUNT_ID", "")

COGNEE_SERVICE_URL = os.getenv("COGNEE_SERVICE_URL", "")
COGNEE_API_KEY = os.getenv("COGNEE_API_KEY", "")

_BACKEND_DIR = Path(__file__).parent.resolve()
# cognee validates these as absolute paths (docs.cognee.ai/setup-configuration) —
# relative/blank values raise a pydantic ValidationError at import time. `or`
# (not just getenv's default) so a blank "KEY=" line in .env doesn't win.
DATA_ROOT_DIRECTORY = os.getenv("DATA_ROOT_DIRECTORY") or str(_BACKEND_DIR / ".cognee_data")
SYSTEM_ROOT_DIRECTORY = os.getenv("SYSTEM_ROOT_DIRECTORY") or str(_BACKEND_DIR / ".cognee_system")


def apply_cognee_env() -> None:
    """Push this config into the process env vars cognee itself reads.

    Must run before the first `import cognee` in the process (cognee reads
    its settings at import time). Called once from graph_client.py.
    """
    os.environ.setdefault("LLM_PROVIDER", LLM_PROVIDER)
    os.environ.setdefault("LLM_MODEL", LLM_MODEL)
    if LLM_API_KEY:
        os.environ.setdefault("LLM_API_KEY", LLM_API_KEY)
    if CLOUDFLARE_API_KEY:
        os.environ.setdefault("CLOUDFLARE_API_KEY", CLOUDFLARE_API_KEY)
    if CLOUDFLARE_ACCOUNT_ID:
        os.environ.setdefault("CLOUDFLARE_ACCOUNT_ID", CLOUDFLARE_ACCOUNT_ID)

    if COGNEE_MODE == "cloud":
        if COGNEE_SERVICE_URL:
            os.environ.setdefault("COGNEE_SERVICE_URL", COGNEE_SERVICE_URL)
        if COGNEE_API_KEY:
            os.environ.setdefault("COGNEE_API_KEY", COGNEE_API_KEY)
    else:
        os.environ.setdefault("DATA_ROOT_DIRECTORY", DATA_ROOT_DIRECTORY)
        os.environ.setdefault("SYSTEM_ROOT_DIRECTORY", SYSTEM_ROOT_DIRECTORY)
