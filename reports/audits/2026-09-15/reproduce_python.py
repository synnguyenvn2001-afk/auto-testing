"""Offline audit probes. Uses synthetic data; never opens a browser or calls APIs."""
from __future__ import annotations

import importlib.util
from contextlib import redirect_stderr
from io import StringIO
import json
from pathlib import Path
import sys
import types
from unittest.mock import patch

import pandas as pd

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "tools/location-enrichment-validator"))
from validator.ground_truth import GroundTruthIndex
from validator.rules import evaluate_rules


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


results = []
# Browser APIs are import-only stubs in these probes. Calling one is a test error.
def forbidden_browser(*args, **kwargs):
    raise AssertionError("Browser use is forbidden in this offline audit")


for name in ("playwright", "playwright.sync_api", "playwright.async_api"):
    sys.modules[name] = types.ModuleType(name)
sys.modules["playwright.sync_api"].TimeoutError = TimeoutError
sys.modules["playwright.sync_api"].sync_playwright = forbidden_browser
sys.modules["playwright.async_api"].async_playwright = forbidden_browser
for name in ("Browser", "BrowserContext", "Page"):
    setattr(sys.modules["playwright.async_api"], name, object)

checker = load("audit_redirect", ROOT / "tools/facebook-redirect-checker/src/fb_redirect_checker.py")


class FakePage:
    def __init__(self, destination, fail=False):
        self.url = destination
        self.fail = fail

    def goto(self, *args, **kwargs):
        if self.fail:
            raise RuntimeError("synthetic navigation failure")

    def title(self):
        return "Facebook"

    def evaluate(self, *args):
        return ""


original = "https://www.facebook.com/groups/111/posts/222/"
with patch.object(checker, "wait_url_stable", lambda page: page.url):
    actual = checker.check_one(FakePage("https://www.facebook.com/login/"), original, 100, 0)
    assert actual["status"] == "POST_DELETED"
    results.append({"probe": "login_redirect_misclassified", "expected": "LOGIN_REDIRECT", "actual": actual["status"]})
    actual = checker.check_one(FakePage(original, fail=True), original, 100, 0)
    assert actual["status"] == "SAME_URL" and actual["check_error"]
    results.append({"probe": "navigation_failure_marked_complete", "expected": "retryable error", "actual": actual["status"], "has_error": True})

assert "final_url" not in checker.FULL_RESULT_COLUMNS
results.append({"probe": "redirect_evidence_not_exported", "final_url_in_full_result_columns": False})

# run_checker.bat inserts INPUT explicitly and then repeats the original %*.
with redirect_stderr(StringIO()):
    try:
        checker.build_parser().parse_args(["synthetic.csv", "--resume", "--workers", "10", "--headless", "synthetic.csv"])
    except SystemExit as exc:
        assert exc.code == 2
    else:
        raise AssertionError("Expected duplicate positional input to be rejected")
results.append({"probe": "drag_drop_launcher_duplicates_input", "parser_exit_code": 2})

old = {"id": "synthetic-1", "extract_location": "Ha Noi", "location": "Ha Noi", "latitude": 21.03, "longitude": 105.85, "review_status": "\u0110\u00fang"}
current = {**old, "latitude": 10.78, "longitude": 106.7}
actual = evaluate_rules(current, GroundTruthIndex(pd.DataFrame([old])))
assert actual.status == "KNOWN_GT_PASS" and not actual.needs_ai
results.append({"probe": "changed_coordinates_trusted_as_unchanged", "expected": "re-evaluate changed coordinates", "actual": actual.status, "confidence": actual.confidence})

news = load("audit_news", ROOT / "tools/landbase-news-source-counter/src/landbase_news_source_counter.py")
tables = {
    "Raw_All": pd.DataFrame([{"page": 1, "title": "A"}, {"page": 3, "title": "C"}]),
    "Page_Log": pd.DataFrame([{"page": 1, "error": ""}, {"page": 2, "error": "timeout"}, {"page": 3, "error": ""}]),
}


class FakeWorkbook:
    sheet_names = list(tables)


class FakePath:
    def exists(self):
        return True


with patch.object(news.pd, "ExcelFile", return_value=FakeWorkbook()), patch.object(news.pd, "read_excel", side_effect=lambda _xls, sheet_name: tables[sheet_name]):
    _, logs, _, last_page = news.load_existing_report(FakePath())
assert last_page == 3 and any(row["error"] == "timeout" for row in logs)
results.append({"probe": "news_resume_skips_failed_page", "failed_page": 2, "next_default_page": last_page + 1})

print(json.dumps({"confirmed": len(results), "results": results}, ensure_ascii=False, indent=2))
