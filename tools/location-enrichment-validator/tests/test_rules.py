import pandas as pd

from validator.ground_truth import GroundTruthIndex
from validator.rules import evaluate_rules


def gt_empty():
    return GroundTruthIndex(pd.DataFrame())


def test_null_zero_is_pass():
    r = evaluate_rules({"id":"1", "extract_location":None, "location":None, "latitude":0, "longitude":0, "street_or_village":None}, gt_empty())
    assert r.status == "PASS_NULL"


def test_outside_hanoi_zero_is_pass():
    r = evaluate_rules({"id":"1", "extract_location":"Bãi Cháy, Quảng Ninh", "location":"Bãi Cháy", "latitude":0, "longitude":0, "street_or_village":None}, gt_empty())
    assert r.status == "PASS_OUTSIDE_HANOI"


def test_center_not_literal_street():
    r = evaluate_rules({"id":"1", "extract_location":"TRUNG TÂM MỸ ĐÌNH", "location":"Đường Trung Tâm, Xã Phúc Thịnh, Thành phố Hà Nội", "latitude":21, "longitude":105.8, "street_or_village":"Đường Trung Tâm"}, gt_empty())
    assert r.status == "WRONG_STREET"


def test_explicit_street_missing():
    r = evaluate_rules({"id":"1", "extract_location":"Tam Trinh, Hoàng Mai", "location":"Phường Hoàng Mai, Thành phố Hà Nội", "latitude":20.98, "longitude":105.86, "street_or_village":"Đường Tam Trinh"}, gt_empty())
    assert r.status == "MISSING_STREET"


def test_hanoi_zero_needs_review():
    r = evaluate_rules({"id":"1", "extract_location":"Linh Đàm, Hoàng Mai", "location":"Linh Đàm", "latitude":0, "longitude":0, "street_or_village":None}, gt_empty())
    assert r.status in {"NEED_REVIEW", "POTENTIAL_REGRESSION"}


def test_explicit_outside_to_hanoi_is_wrong_province():
    r = evaluate_rules({"id":"1", "extract_location":"SORA BAY HẠ LONG, Hoàng Quốc Việt", "location":"Đường Hoàng Quốc Việt, Hà Nội", "latitude":21, "longitude":105.8, "street_or_village":"Đường Hoàng Quốc Việt"}, gt_empty())
    assert r.status == "WRONG_PROVINCE"


def test_ambiguous_name_zero_is_not_auto_wrong():
    r = evaluate_rules({"id":"1", "extract_location":"Vinh Hung", "location":"Vinh Hung", "latitude":0, "longitude":0, "street_or_village":None}, gt_empty())
    assert r.status == "NEED_REVIEW"


def test_bare_street_with_area_context_is_flagged():
    r = evaluate_rules({"id":"1", "extract_location":"Trường Chinh - Đống Đa", "location":"Phường Đống Đa, Thành phố Hà Nội", "latitude":21.0, "longitude":105.82, "street_or_village":None}, gt_empty())
    assert r.status == "MISSING_STREET"
