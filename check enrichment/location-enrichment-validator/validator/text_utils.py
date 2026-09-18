from __future__ import annotations

import math
import re
import unicodedata
from typing import Any

NULL_WORDS = {"", "null", "none", "nan", "n/a", "na", "nil"}

# Includes current and many pre-2025 province/city names because real estate posts
# often use historical administrative names.
OUTSIDE_HANOI_TERMS = {
    "tp ho chi minh", "thanh pho ho chi minh", "ho chi minh", "sai gon", "thu duc",
    "da nang", "hai phong", "hue", "can tho", "sam son", "viet tri", "nha trang", "da lat", "quy nhon", "buon ma thuot",
    "quang ninh", "ha long", "bac ninh", "hung yen", "ninh binh", "thanh hoa", "nghe an", "ha tinh",
    "quang tri", "quang ngai", "gia lai", "dak lak", "dak nong", "khanh hoa", "lam dong",
    "dong nai", "tay ninh", "vinh long", "dong thap", "ca mau", "an giang", "tuyen quang",
    "cao bang", "lang son", "thai nguyen", "phu tho", "lao cai", "dien bien", "lai chau", "son la",
    # Historical / merged provincial names still common in listing text
    "bac giang", "hai duong", "ha nam", "nam dinh", "thai binh", "vinh phuc", "hoa binh",
    "quang binh", "quang nam", "binh dinh", "phu yen", "ninh thuan", "binh thuan",
    "kon tum", "binh duong", "ba ria", "vung tau", "long an", "tien giang", "ben tre",
    "tra vinh", "soc trang", "bac lieu", "kien giang", "hau giang", "binh phuoc",
}

HANOI_CONTEXT_TERMS = {
    "ha noi", "dong da", "cau giay", "hoang mai", "hai ba trung", "ha dong", "hoan kiem",
    "long bien", "tay ho", "thanh xuan", "ba dinh", "nam tu liem", "bac tu liem", "gia lam",
    "dong anh", "soc son", "thanh tri", "hoai duc", "dan phuong", "quoc oai", "thach that",
    "chuong my", "thanh oai", "thuong tin", "phu xuyen", "me linh", "son tay", "ba vi",
}

STREET_PREFIX_RE = re.compile(
    r"\b(đường|duong|phố|pho|ngõ|ngo|ngách|ngach|hẻm|hem|đại\s*lộ|dai\s*lo|"
    r"quốc\s*lộ|quoc\s*lo|tỉnh\s*lộ|tinh\s*lo|cao\s*tốc|cao\s*toc|"
    r"ql\s*\d+[a-z]?|tl\s*\d+[a-z]?|đt\s*\d+[a-z]?|dt\s*\d+[a-z]?)\b",
    re.IGNORECASE,
)

GENERIC_FIRST_SEGMENTS = {
    "trung tam", "gan", "doi dien", "mat pho", "mat duong", "khu vuc", "khu do thi", "kdt",
    "can ho", "chung cu", "ccmn", "nha", "dat", "lo dat", "du an", "ven ho", "gan cho",
}


def strip_accents(text: str) -> str:
    # Vietnamese đ/Đ does not decompose under NFD, so handle it explicitly.
    text = text.replace("đ", "d").replace("Đ", "D")
    text = unicodedata.normalize("NFD", text)
    return "".join(ch for ch in text if unicodedata.category(ch) != "Mn")


def normalize_text(value: Any) -> str:
    if is_nullish(value):
        return ""
    text = strip_accents(str(value)).lower().strip()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def is_nullish(value: Any) -> bool:
    if value is None:
        return True
    try:
        if isinstance(value, float) and math.isnan(value):
            return True
    except TypeError:
        pass
    return str(value).strip().lower() in NULL_WORDS


def to_float(value: Any) -> float | None:
    if is_nullish(value):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def is_zero_coordinates(lat: Any, lon: Any) -> bool:
    lat_f, lon_f = to_float(lat), to_float(lon)
    if lat_f is None or lon_f is None:
        return True
    return abs(lat_f) < 1e-12 and abs(lon_f) < 1e-12


def has_nonzero_coordinates(lat: Any, lon: Any) -> bool:
    return not is_zero_coordinates(lat, lon)


def contains_hanoi_context(*values: Any) -> bool:
    text = " ".join(normalize_text(v) for v in values if not is_nullish(v))
    return any(term in text for term in HANOI_CONTEXT_TERMS)


def contains_explicit_outside_hanoi(*values: Any) -> bool:
    text = " ".join(normalize_text(v) for v in values if not is_nullish(v))
    # Explicit Hanoi wins over broad names that might also appear in project names.
    if "ha noi" in text:
        return False
    return any(term in text for term in OUTSIDE_HANOI_TERMS)


def has_explicit_street_signal(value: Any) -> bool:
    if is_nullish(value):
        return False
    return bool(STREET_PREFIX_RE.search(str(value)))


def canonical_street_name(value: Any) -> str:
    """Remove road-type prefixes so 'Phố Xã Đàn' can match 'Xã Đàn'."""
    n = normalize_text(value)
    n = re.sub(r"^(duong|pho|ngo|ngach|hem|dai lo|quoc lo|tinh lo|cao toc)\s+", "", n)
    return n.strip()


def street_mentioned_in_location(street_value: Any, location: Any) -> bool:
    street = canonical_street_name(street_value)
    loc = normalize_text(location)
    if not street or not loc:
        return False
    # Long street name exact containment is strongest.
    if street in loc:
        return True
    # For numbered roads, keep the number/token comparison strict.
    tokens = [t for t in street.split() if len(t) > 1]
    if len(tokens) >= 2:
        overlap = sum(t in loc.split() for t in tokens) / len(tokens)
        return overlap >= 0.8
    return False


def potential_bare_street(extract_location: Any, enriched_location: Any) -> str:
    """Return a likely bare street segment omitted by enrichment, else ''.

    This is deliberately conservative: it only fires when a short first segment is
    followed by a known Hanoi area context. AI/geocoder can decide ambiguous cases.
    """
    if is_nullish(extract_location):
        return ""
    raw = str(extract_location).strip()
    parts = [p.strip() for p in re.split(r"[,;|]|\s[-–—]\s", raw) if p.strip()]
    if len(parts) < 2:
        return ""
    first = normalize_text(parts[0])
    rest = normalize_text(" ".join(parts[1:]))
    if not first or len(first.split()) > 5 or first in GENERIC_FIRST_SEGMENTS:
        return ""
    if not any(area in rest for area in HANOI_CONTEXT_TERMS):
        return ""
    if first in normalize_text(enriched_location):
        return ""
    # Avoid classifying project labels as streets.
    project_words = {"vinhomes", "ecohome", "geleximco", "times city", "royal city", "kdt", "chung cu"}
    if any(w in first for w in project_words):
        return ""
    return parts[0]
