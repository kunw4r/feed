"""Tests for edition balancing and thread-link guarding (no network, no API calls).

Run: python -m pytest scripts/test_selection.py   (or: python scripts/test_selection.py)
"""

import os
import sys
import unittest
from pathlib import Path

os.environ.setdefault("ANTHROPIC_API_KEY", "test")  # module builds a client at import; never called here
sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_feed as bf  # noqa: E402


def make(items_spec):
    """items_spec: list of (source, region, category) -> (items, picks) in editor order."""
    items = [{"source": src, "title": f"t{i}", "summary": "", "url": f"u{i}", "image": None} for i, (src, _, _) in enumerate(items_spec)]
    picks = [{"index": i, "also": [], "region_code": r, "category": c} for i, (_, r, c) in enumerate(items_spec)]
    return items, picks


class BalanceTests(unittest.TestCase):
    def test_outlet_cap(self):
        items, picks = make([("The Guardian", "EUROPE", "HEALTH")] * 6 + [("BBC News", "ASIA", "HEALTH")] * 4)
        chosen = bf.balance(picks, items, [])
        guardian = sum(items[p["index"]]["source"] == "The Guardian" for p in chosen)
        self.assertLessEqual(guardian, 2)  # ceil(0.2 * 10)

    def test_politics_cap(self):
        spec = [("S%d" % i, "EUROPE", "POLITICS_POLICY") for i in range(8)] + [("T%d" % i, "ASIA", "HEALTH") for i in range(2)]
        items, picks = make(spec)
        chosen = bf.balance(picks, items, [])
        politics = sum(p["category"] == "POLITICS_POLICY" for p in chosen)
        self.assertLessEqual(politics, 4)  # ceil(0.35 * 10)

    def test_existing_counts_toward_caps(self):
        existing = [{"sources": [{"name": "The Guardian"}], "category": "HEALTH", "region_code": "EUROPE"}] * 2
        items, picks = make([("The Guardian", "EUROPE", "HEALTH"), ("BBC News", "ASIA", "HEALTH")])
        chosen = bf.balance(picks, items, existing)
        self.assertEqual([items[p["index"]]["source"] for p in chosen], ["BBC News"])

    def test_thin_region_overrides_caps(self):
        items, picks = make([("The Guardian", "OCEANIA", "POLITICS_POLICY")] * 5)
        chosen = bf.balance(picks, items, [], needs={"OCEANIA": 3})
        self.assertGreaterEqual(len(chosen), 3)

    def test_keeps_editor_order_and_limit(self):
        items, picks = make([("A", "EUROPE", "HEALTH"), ("B", "ASIA", "HEALTH"), ("C", "AMERICAS", "HEALTH"), ("D", "ADF", "HEALTH"), ("E", "ASIA", "HEALTH")])
        chosen = bf.balance(picks, items, [], limit=3)
        self.assertEqual([p["index"] for p in chosen], [0, 1, 2])

    def test_oceania_minimum_is_five(self):
        self.assertEqual(bf.REGION_MINIMUMS["OCEANIA"], 5)


class ThreadGuardTests(unittest.TestCase):
    iran_a = {"simplified_title": "Iran blames US for failed peace deal", "quick_summary": "Tehran says Washington wrecked talks"}
    iran_b = {"simplified_title": "Trump hints at new Iran strikes", "quick_summary": "The US may strike again"}
    stocks = {"simplified_title": "AI tech stocks slump worldwide", "quick_summary": "Chip makers fell sharply"}

    def test_same_subject_confident(self):
        self.assertTrue(bf.thread_link_ok(self.iran_a, self.iran_b, 0.9))

    def test_low_confidence_rejected(self):
        self.assertFalse(bf.thread_link_ok(self.iran_a, self.iran_b, 0.5))

    def test_no_shared_name_rejected(self):
        self.assertFalse(bf.thread_link_ok(self.iran_a, self.stocks, 0.95))


if __name__ == "__main__":
    unittest.main()
