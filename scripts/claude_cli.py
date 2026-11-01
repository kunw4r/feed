"""Claude Code CLI (`claude -p`, subscription auth) behind a tiny Anthropic-SDK lookalike.
Engine: BRAINFEED_ENGINE=claude (default) | zcode (local ZCode CLI, Mac only). If the chosen
engine fails and the other is installed, it falls back to it. No engine ever hits an API.

Nothing here talks to api.anthropic.com. ANTHROPIC_API_KEY is stripped from the
child env because the CLI would otherwise prefer it over the subscription login.
"""
import json
import os
import shutil
import subprocess
from types import SimpleNamespace

TIMEOUT_S = int(os.environ.get("CLAUDE_CLI_TIMEOUT", "900"))


def _model_alias(model: str) -> str:
    m = (model or "").lower()
    for alias in ("opus", "sonnet", "haiku"):
        if alias in m:
            return alias
    return model or "sonnet"


def _claude(prompt, model, system, schema):
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


def _zcode(prompt, model, system, schema):
    full = (system + "\n\n" if system else "") + prompt
    if schema:
        full += "\n\nReturn ONLY one JSON object matching this JSON Schema, no prose:\n" + json.dumps(schema)
    res = subprocess.run(["zcode", "-p", full, "--cwd", "/tmp", "--mode", "yolo"],
                         capture_output=True, text=True, timeout=TIMEOUT_S)
    out = res.stdout
    if res.returncode != 0 or not out.strip():
        raise RuntimeError(f"zcode exit {res.returncode}: {(res.stderr or out)[-300:]}")
    structured = None
    if schema:
        i, j = out.find("{"), out.rfind("}")
        if i == -1 or j <= i:
            raise RuntimeError("zcode returned no JSON object")
        structured = json.loads(out[i:j + 1])
    return out.strip(), structured


def run(prompt: str, model: str = "sonnet", system: str | None = None, schema: dict | None = None):
    """Single-turn call. Returns (text, structured_output_or_None). Raises if every engine fails."""
    first = os.environ.get("BRAINFEED_ENGINE", "claude").lower()
    engines = [first] + [e for e in ("claude", "zcode") if e != first]
    engines = [e for e in engines if shutil.which("zcode" if e == "zcode" else "claude")]
    if not engines:
        raise RuntimeError("neither `claude` nor `zcode` CLI is installed")
    last = None
    for e in engines:
        try:
            return (_zcode if e == "zcode" else _claude)(prompt, model, system, schema)
        except (RuntimeError, subprocess.TimeoutExpired, json.JSONDecodeError) as ex:
            last = ex
            print(f"  ! {e} engine failed ({type(ex).__name__}: {str(ex)[:120]})")
    raise RuntimeError(f"all engines failed: {last}")


class _Messages:
    def create(self, model, messages, system=None, **_ignored):
        prompt = "\n\n".join(m["content"] for m in messages)
        text, _ = run(prompt, model=model, system=system)
        return SimpleNamespace(content=[SimpleNamespace(type="text", text=text)])


class Anthropic:
    """Accepts and ignores api_key so existing call sites need minimal edits."""

    def __init__(self, api_key=None):
        self.messages = _Messages()
