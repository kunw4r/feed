import json
import logging
import time
from typing import Optional

import anthropic

from backend.config.settings import ANTHROPIC_API_KEY

logger = logging.getLogger(__name__)

_client: Optional[anthropic.Anthropic] = None


def get_client() -> anthropic.Anthropic:
    """Return a shared Anthropic client instance."""
    global _client
    if _client is None:
        if not ANTHROPIC_API_KEY:
            raise RuntimeError(
                "ANTHROPIC_API_KEY is not set. "
                "Add it to backend/.env or export it as an environment variable."
            )
        _client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    return _client


def call_llm(
    system_prompt: str,
    user_message: str,
    model: str = "claude-haiku-4-5-20251001",
    max_tokens: int = 4096,
    temperature: float = 0.0,
    agent_name: str = "agent",
) -> str:
    """Call the Anthropic API and return the text response.

    Logs the agent name, model, input length, output length, and elapsed time.
    Returns an empty string on failure rather than raising.
    """
    client = get_client()
    start = time.time()
    input_len = len(user_message)

    try:
        response = client.messages.create(
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
        )
        text = response.content[0].text
        elapsed = time.time() - start

        logger.info(
            "[%s] model=%s input=%d chars, output=%d chars (%.1fs)",
            agent_name,
            model,
            input_len,
            len(text),
            elapsed,
        )
        return text

    except Exception as e:
        elapsed = time.time() - start
        logger.error(
            "[%s] LLM call failed after %.1fs: %s",
            agent_name,
            elapsed,
            e,
        )
        return ""


def parse_json_response(text: str, agent_name: str = "agent") -> Optional[list | dict]:
    """Try to extract JSON from an LLM response.

    Handles responses that may have markdown fences or extra text around the JSON.
    """
    if not text:
        return None

    # Strip markdown code fences if present
    cleaned = text.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        # Remove first line (```json) and last line (```)
        lines = [l for l in lines if not l.strip().startswith("```")]
        cleaned = "\n".join(lines).strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Try to find JSON array or object within the text
        for start_char, end_char in [("[", "]"), ("{", "}")]:
            start_idx = cleaned.find(start_char)
            end_idx = cleaned.rfind(end_char)
            if start_idx != -1 and end_idx > start_idx:
                try:
                    return json.loads(cleaned[start_idx : end_idx + 1])
                except json.JSONDecodeError:
                    continue

        logger.warning("[%s] Could not parse JSON from response: %s...", agent_name, text[:200])
        return None
