from __future__ import annotations

import json
from typing import Any, Callable

import pandas as pd

from .ai_validator import AIValidator
from .geocoder import GoogleGeocoder
from .ground_truth import GroundTruthIndex
from .rules import RuleResult, evaluate_rules
from .text_utils import is_zero_coordinates, to_float

ProgressFn = Callable[[int, int, str], None]


def _ai_item(row: dict[str, Any], rr: RuleResult, geocoder: GoogleGeocoder | None) -> dict[str, Any]:
    forward: list[dict[str, Any]] = []
    reverse: list[dict[str, Any]] = []
    geocoder_error = ""
    if geocoder:
        try:
            forward = geocoder.geocode(str(row.get("extract_location") or ""), limit=5)
            lat, lon = to_float(row.get("latitude")), to_float(row.get("longitude"))
            if lat is not None and lon is not None and not is_zero_coordinates(lat, lon):
                reverse = geocoder.reverse(lat, lon, limit=3)
        except Exception as exc:
            geocoder_error = str(exc)
    return {
        "id": str(row.get("id", "")),
        "extract_location": row.get("extract_location"),
        "enriched_location": row.get("location"),
        "latitude": row.get("latitude"),
        "longitude": row.get("longitude"),
        "street_or_village": row.get("street_or_village"),
        "description": row.get("description"),
        "rule_status": rr.status,
        "rule_notes": rr.notes,
        "rule_flags": rr.flags,
        "ground_truth_status": rr.gt_status,
        "ground_truth_extract_hint": rr.gt_extract_hint,
        "forward_geocode_candidates": forward,
        "reverse_geocode_candidates": reverse,
        "geocoder_error": geocoder_error,
    }


def run_validation(
    df: pd.DataFrame,
    ground_truth: GroundTruthIndex,
    ai_validator: AIValidator | None = None,
    geocoder: GoogleGeocoder | None = None,
    ai_only_suspicious: bool = True,
    max_ai_rows: int = 100,
    batch_size: int = 10,
    progress: ProgressFn | None = None,
) -> pd.DataFrame:
    records = df.to_dict(orient="records")
    rule_results: list[RuleResult] = []
    for row in records:
        rule_results.append(evaluate_rules(row, ground_truth))

    result = df.copy()
    result["rule_status"] = [r.status for r in rule_results]
    result["rule_confidence"] = [r.confidence for r in rule_results]
    result["rule_flags"] = [" | ".join(r.flags) for r in rule_results]
    result["rule_note"] = [" ".join(r.notes) for r in rule_results]
    result["street_review_note"] = [r.street_note for r in rule_results]
    result["gt_id_match"] = [r.gt_match for r in rule_results]
    result["gt_status"] = [r.gt_status for r in rule_results]
    result["gt_extract_hint"] = [r.gt_extract_hint for r in rule_results]

    result["ai_status"] = ""
    result["ai_confidence"] = None
    result["ai_reason"] = ""
    result["ai_suggested_location"] = ""
    result["ai_is_outside_hanoi"] = None
    result["ai_is_ambiguous"] = None
    result["ai_allow_zero_coordinate"] = None
    result["ai_street_assessment"] = ""
    result["geocoder_forward"] = ""
    result["geocoder_reverse"] = ""
    result["geocoder_error"] = ""

    if ai_validator:
        indices = [i for i, rr in enumerate(rule_results) if (rr.needs_ai or not ai_only_suspicious)]
        indices = indices[: max(0, int(max_ai_rows))]
        total = len(indices)
        processed = 0
        for start in range(0, total, max(1, int(batch_size))):
            batch_indices = indices[start : start + max(1, int(batch_size))]
            items = []
            for idx in batch_indices:
                item = _ai_item(records[idx], rule_results[idx], geocoder)
                items.append(item)
                result.at[result.index[idx], "geocoder_forward"] = json.dumps(item["forward_geocode_candidates"], ensure_ascii=False)
                result.at[result.index[idx], "geocoder_reverse"] = json.dumps(item["reverse_geocode_candidates"], ensure_ascii=False)
                result.at[result.index[idx], "geocoder_error"] = item["geocoder_error"]
            ai_results = ai_validator.validate_batch(items)
            for idx, ai in zip(batch_indices, ai_results):
                ix = result.index[idx]
                result.at[ix, "ai_status"] = ai.get("status", "")
                result.at[ix, "ai_confidence"] = ai.get("confidence")
                result.at[ix, "ai_reason"] = ai.get("reason", "")
                result.at[ix, "ai_suggested_location"] = ai.get("suggested_location", "")
                result.at[ix, "ai_is_outside_hanoi"] = ai.get("is_outside_hanoi")
                result.at[ix, "ai_is_ambiguous"] = ai.get("is_ambiguous")
                result.at[ix, "ai_allow_zero_coordinate"] = ai.get("allow_zero_coordinate")
                result.at[ix, "ai_street_assessment"] = ai.get("street_assessment", "")
            processed += len(batch_indices)
            if progress:
                progress(processed, total, f"AI đã kiểm tra {processed}/{total} dòng")
    elif geocoder:
        # Even without AI, collect geocoder evidence for suspicious rows so a human can review it.
        indices = [i for i, rr in enumerate(rule_results) if rr.needs_ai][: max(0, int(max_ai_rows))]
        total = len(indices)
        for pos, idx in enumerate(indices, start=1):
            item = _ai_item(records[idx], rule_results[idx], geocoder)
            ix = result.index[idx]
            result.at[ix, "geocoder_forward"] = json.dumps(item["forward_geocode_candidates"], ensure_ascii=False)
            result.at[ix, "geocoder_reverse"] = json.dumps(item["reverse_geocode_candidates"], ensure_ascii=False)
            result.at[ix, "geocoder_error"] = item["geocoder_error"]
            if progress:
                progress(pos, total, f"Geocoder đã kiểm tra {pos}/{total} dòng")

    # Final status: AI overrides only the rows AI actually evaluated.
    result["final_status"] = result["rule_status"]
    result["final_confidence"] = result["rule_confidence"]
    result["final_note"] = result["rule_note"]
    ai_mask = result["ai_status"].astype(str).str.len() > 0
    if bool(ai_mask.any()):
        result.loc[ai_mask, "final_status"] = result.loc[ai_mask, "ai_status"]
        result.loc[ai_mask, "final_confidence"] = pd.to_numeric(result.loc[ai_mask, "ai_confidence"], errors="coerce")
        result.loc[ai_mask, "final_note"] = (
            result.loc[ai_mask, "rule_note"].fillna("").astype(str)
            + " | AI: "
            + result.loc[ai_mask, "ai_reason"].fillna("").astype(str)
        ).str.strip(" |")

    # Human review columns are intentionally editable in Streamlit.
    result["human_status"] = ""
    result["human_note"] = ""
    return result
