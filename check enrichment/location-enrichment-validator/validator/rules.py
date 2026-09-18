from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .ground_truth import GroundTruthIndex
from .text_utils import (
    canonical_street_name,
    contains_explicit_outside_hanoi,
    contains_hanoi_context,
    has_explicit_street_signal,
    has_nonzero_coordinates,
    is_nullish,
    is_zero_coordinates,
    normalize_text,
    potential_bare_street,
    street_mentioned_in_location,
)

PASS_STATUSES = {"PASS", "PASS_NULL", "PASS_OUTSIDE_HANOI", "PASS_AMBIGUOUS_0", "KNOWN_GT_PASS"}
ERROR_STATUSES = {"WRONG_LOCATION", "WRONG_PROVINCE", "WRONG_STREET", "REGRESSION"}
REVIEW_STATUSES = {"NEED_REVIEW", "MISSING_STREET", "POTENTIAL_REGRESSION", "KNOWN_BAD_REPEATED"}


@dataclass
class RuleResult:
    status: str = "NEED_REVIEW"
    confidence: float = 0.5
    notes: list[str] = field(default_factory=list)
    flags: list[str] = field(default_factory=list)
    needs_ai: bool = True
    gt_match: bool = False
    gt_status: str = ""
    gt_extract_hint: str = ""
    street_note: str = ""

    def add(self, note: str, flag: str | None = None) -> None:
        if note and note not in self.notes:
            self.notes.append(note)
        if flag and flag not in self.flags:
            self.flags.append(flag)


def _gt_is_pass(status: str) -> bool:
    s = normalize_text(status)
    return s.startswith("dung")


def _gt_is_wrong(status: str) -> bool:
    return normalize_text(status).startswith("sai location") or normalize_text(status).startswith("sai")


def _same_location(a: Any, b: Any) -> bool:
    na, nb = normalize_text(a), normalize_text(b)
    return bool(na and nb and na == nb)


def evaluate_rules(row: dict[str, Any], gt: GroundTruthIndex) -> RuleResult:
    r = RuleResult()
    extract = row.get("extract_location")
    location = row.get("location")
    lat = row.get("latitude")
    lon = row.get("longitude")
    street = row.get("street_or_village")

    zero = is_zero_coordinates(lat, lon)
    null_extract = is_nullish(extract)
    null_loc = is_nullish(location)

    # Ground truth exact-ID comparison is the strongest deterministic signal.
    old = gt.exact_id(row.get("id"))
    if old:
        r.gt_match = True
        r.gt_status = str(old.get("review_status", ""))
        old_same = _same_location(location, old.get("location"))
        old_zero = is_zero_coordinates(old.get("latitude"), old.get("longitude"))

        if _gt_is_wrong(r.gt_status) and old_same:
            r.status = "KNOWN_BAD_REPEATED"
            r.confidence = 0.97
            r.add("ID này từng được người dùng đánh giá sai và location hiện tại chưa thay đổi.", "GT_KNOWN_BAD")
            r.needs_ai = False
        elif _gt_is_pass(r.gt_status) and old_same and zero == old_zero:
            r.status = "KNOWN_GT_PASS"
            r.confidence = 0.99
            r.add("Trùng ID và dữ liệu location/tọa độ không thay đổi so với case người dùng đã duyệt đúng.", "GT_PASS")
            r.needs_ai = False
        elif _gt_is_pass(r.gt_status) and (not old_zero) and zero:
            r.status = "POTENTIAL_REGRESSION"
            r.confidence = 0.8
            r.add("Bản cũ từng được duyệt đúng và có tọa độ; bản mới về 0,0. Cần kiểm tra tính mơ hồ trước khi kết luận regression.", "GT_COORD_REGRESSION")
            r.needs_ai = True
        elif _gt_is_wrong(r.gt_status) and not old_same:
            r.add("Case cũ từng sai nhưng enrichment đã thay đổi; cần đánh giá lại thay vì giữ kết luận cũ.", "GT_CHANGED_AFTER_BAD")

    # Exact/fuzzy repeated extract is a hint only, never an automatic final verdict.
    hint = gt.extract_hint(extract)
    if hint:
        examples = hint["examples"]
        statuses = sorted({str(x.get("review_status", "")) for x in examples})
        r.gt_extract_hint = f"{hint['match_type']} {hint['score']}%: {' | '.join(statuses)}"
        if not r.gt_match:
            r.add("Có extract_location giống/gần giống case đã review; dùng làm hint, không tự áp kết luận.", "GT_EXTRACT_HINT")

    # Explicit province/city conflict is a strong error signal.
    source_outside = contains_explicit_outside_hanoi(extract)
    source_hanoi = contains_hanoi_context(extract)
    enriched_outside = contains_explicit_outside_hanoi(location)
    enriched_hanoi = contains_hanoi_context(location)
    if source_outside and enriched_hanoi:
        r.status = "WRONG_PROVINCE"
        r.confidence = 0.96
        r.add("extract_location có tín hiệu ngoài Hà Nội nhưng enrichment lại gắn vào Hà Nội.", "PROVINCE_CONFLICT_OUTSIDE_TO_HANOI")
        r.needs_ai = False
    elif source_hanoi and enriched_outside:
        r.status = "WRONG_PROVINCE"
        r.confidence = 0.94
        r.add("extract_location có context Hà Nội nhưng enrichment lại gắn sang tỉnh/thành khác.", "PROVINCE_CONFLICT_HANOI_TO_OUTSIDE")
        r.needs_ai = False

    # NULL enrichment + 0,0 is accepted per agreed rule.
    if null_loc and zero:
        r.status = "PASS_NULL"
        r.confidence = max(r.confidence, 0.98)
        r.add("location NULL và lat/long = 0 được chấp nhận.", "NULL_ZERO_OK")
        r.needs_ai = False
        return r

    # Clearly outside Hanoi + 0,0 is accepted per agreed rule.
    if zero and contains_explicit_outside_hanoi(extract, location):
        r.status = "PASS_OUTSIDE_HANOI"
        r.confidence = max(r.confidence, 0.93)
        r.add("Có tín hiệu tỉnh/thành ngoài Hà Nội và lat/long = 0; theo rule hiện tại được chấp nhận.", "OUTSIDE_ZERO_OK")
        r.needs_ai = False

    # Strong Hanoi context + 0,0 should be reviewed, unless exact GT already authoritatively passed it.
    if zero and contains_hanoi_context(extract, location) and r.status not in {"KNOWN_GT_PASS", "PASS_NULL"}:
        if not contains_explicit_outside_hanoi(extract, location):
            r.status = "POTENTIAL_REGRESSION" if r.gt_match else "NEED_REVIEW"
            r.confidence = max(r.confidence, 0.78)
            r.add("Có context Hà Nội nhưng tọa độ = 0,0; cần xác minh có phải địa danh mơ hồ hay enrichment bị mất tọa độ.", "HANOI_ZERO")
            r.needs_ai = True

    # Explicit extracted road/street exists but final location lost it.
    if has_explicit_street_signal(street) and not street_mentioned_in_location(street, location):
        road = canonical_street_name(street)
        r.street_note = f"Có đường đã bóc tách ({street}) nhưng location chưa gắn được đường."
        r.add(r.street_note, "MISSING_STREET")
        if r.status in PASS_STATUSES or r.status == "NEED_REVIEW":
            r.status = "MISSING_STREET"
        r.confidence = max(r.confidence, 0.9)
        r.needs_ai = True

    # Detect bare street names like 'Trường Chinh, Đống Đa' that street_or_village may miss.
    bare = potential_bare_street(extract, location)
    if bare:
        r.street_note = f"Có khả năng '{bare}' là tên đường nhưng enrichment chỉ giữ cấp khu vực."
        r.add(r.street_note, "POTENTIAL_MISSING_STREET")
        if r.status in PASS_STATUSES or r.status == "NEED_REVIEW":
            r.status = "MISSING_STREET"
        r.confidence = max(r.confidence, 0.72)
        r.needs_ai = True

    # Generic 'trung tâm' being turned into a literal road is a known failure pattern.
    n_extract = normalize_text(extract)
    n_loc = normalize_text(location)
    if "trung tam" in n_extract and "duong trung tam" in n_loc and "duong trung tam" not in n_extract:
        r.status = "WRONG_STREET"
        r.confidence = 0.97
        r.add("Pattern lỗi đã biết: cụm mô tả 'trung tâm' bị hiểu thành tên 'Đường Trung Tâm'.", "GENERIC_CENTER_AS_STREET")
        r.needs_ai = False

    # If no rule found anything and coords are valid, keep AI optional rather than auto-pass.
    if not r.notes and has_nonzero_coordinates(lat, lon):
        r.status = "NEED_REVIEW"
        r.confidence = 0.45
        r.add("Không phát hiện lỗi rule-based; AI/geocoder có thể xác minh location và tọa độ.", "NO_RULE_ERROR")
        r.needs_ai = True

    return r
