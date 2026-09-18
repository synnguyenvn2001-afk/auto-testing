from __future__ import annotations

from pathlib import Path
from typing import Any

import pandas as pd
from rapidfuzz import fuzz, process

from .text_utils import normalize_text


class GroundTruthIndex:
    def __init__(self, df: pd.DataFrame | None = None):
        self.df = (df.copy() if df is not None else pd.DataFrame()).fillna("")
        self.by_id: dict[str, dict[str, Any]] = {}
        self.by_extract: dict[str, list[dict[str, Any]]] = {}
        if not self.df.empty:
            for _, row in self.df.iterrows():
                d = row.to_dict()
                rid = str(d.get("id", "")).strip()
                if rid:
                    self.by_id[rid] = d
                key = normalize_text(d.get("extract_location", ""))
                if key:
                    self.by_extract.setdefault(key, []).append(d)
        self.extract_keys = list(self.by_extract.keys())

    @classmethod
    def from_csv(cls, path: str | Path) -> "GroundTruthIndex":
        p = Path(path)
        if not p.exists():
            return cls()
        return cls(pd.read_csv(p, dtype=object, encoding="utf-8-sig"))

    def exact_id(self, record_id: Any) -> dict[str, Any] | None:
        return self.by_id.get(str(record_id).strip())

    def extract_hint(self, extract_location: Any, fuzzy_threshold: int = 96) -> dict[str, Any] | None:
        key = normalize_text(extract_location)
        if not key:
            return None
        exact = self.by_extract.get(key)
        if exact:
            statuses = {str(x.get("review_status", "")) for x in exact}
            return {
                "match_type": "exact_extract",
                "score": 100,
                "examples": exact[:3],
                "consistent": len(statuses) == 1,
            }
        if not self.extract_keys:
            return None
        best = process.extractOne(key, self.extract_keys, scorer=fuzz.ratio)
        if not best or best[1] < fuzzy_threshold:
            return None
        matched = self.by_extract[best[0]]
        return {
            "match_type": "fuzzy_extract",
            "score": int(best[1]),
            "examples": matched[:3],
            "consistent": len({str(x.get("review_status", "")) for x in matched}) == 1,
        }


def merge_ground_truth(seed: pd.DataFrame, uploaded: pd.DataFrame | None) -> pd.DataFrame:
    if uploaded is None or uploaded.empty:
        return seed.copy()
    combined = pd.concat([seed, uploaded], ignore_index=True, sort=False)
    if "id" in combined.columns:
        combined["id"] = combined["id"].astype(str).str.strip()
        combined = combined.drop_duplicates(subset=["id"], keep="last")
    return combined
