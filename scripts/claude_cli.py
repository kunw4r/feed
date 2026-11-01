"""Claude Code CLI (`claude -p`, subscription auth) behind a tiny Anthropic-SDK lookalike.

Nothing here talks to api.anthropic.com. ANTHROPIC_API_KEY is stripped from the
child env because the CLI would otherwise prefer it over the subscription login.
"""
import json
import os
import subprocess
from types import SimpleNamespace

TIMEOUT_S = int(os.environ.get("CLAUDE_CLI_TIMEOUT", "900"))


def _model_alias(model: str) -> str:
    m = (model or "").lower()
    for alias in ("opus", "sonnet", "haiku"):
        if alias in m:
            return alias
    return model or "sonnet"


def run(prompt: str, model: str = "sonnet", system: str | None = None, schema: dict | None = None):
    """Single-turn call. Returns (text, structured_output_or_None). Raises on failure."""
    cmd = ["claude", "-p", "--model", _model_alias(model), "--output-format", "json", "--tools", ""]
    if system:
        cmd += ["--system-prompt", system]
    if schema:
        cmd += ["--json-schema", json.dumps(schema)]
    env = {k: v for k, v in os.environ.items() if k != "ANTHROPIC_API_KEY"}
    res = subprocess.run(cmd, input=prompt, capture_output=True, text=True, env=env,
                         cwd="/tmp", timeout=TIMEOUT_S)
    try:
        out = json.loads(res.stdout)
    except json.JSONDecodeError:
        raise RuntimeError(f"claude -p exit {res.returncode}: {(res.stderr or res.stdout)[:300]}")
    if res.returncode != 0 or out.get("is_error"):
        raise RuntimeError(f"claude -p error: {str(out.get('result'))[:300]}")
    return str(out.get("result") or ""), out.get("structured_output")


class _Messages:
    def create(self, model, messages, system=None, **_ignored):
        prompt = "\n\n".join(m["content"] for m in messages)
        text, _ = run(prompt, model=model, system=system)
        return SimpleNamespace(content=[SimpleNamespace(type="text", text=text)])


class Anthropic:
    """Accepts and ignores api_key so existing call sites need minimal edits."""

    def __init__(self, api_key=None):
        self.messages = _Messages()
