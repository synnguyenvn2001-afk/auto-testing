from __future__ import annotations

from io import BytesIO
from pathlib import Path
from typing import BinaryIO

import pandas as pd

REQUIRED_BASE = ["id", "extract_location", "location", "latitude", "longitude"]
OPTIONAL_COLUMNS = ["street_or_village", "url", "description"]

ALIASES = {
    "id": {"id", "listing_id", "record_id"},
    "extract_location": {"extract_location", "extracted_location", "location_extract", "raw_location"},
    "location": {"location", "enriched_location", "location_enriched"},
    "latitude": {"latitude", "lat"},
    "longitude": {"longitude", "long", "lon", "lng"},
    "street_or_village": {"street_or_village", "street", "road", "street_name"},
    "url": {"url", "link", "source_url"},
    "description": {"description", "content", "post_content", "text"},
}


def read_table(source: str | Path | BinaryIO, filename: str | None = None) -> pd.DataFrame:
    name = filename or (str(source) if isinstance(source, (str, Path)) else "upload.xlsx")
    suffix = Path(name).suffix.lower()
    if suffix in {".xlsx", ".xlsm", ".xls"}:
        return pd.read_excel(source, dtype=object)
    if suffix == ".csv":
        try:
            return pd.read_csv(source, dtype=object, encoding="utf-8-sig")
        except UnicodeDecodeError:
            if hasattr(source, "seek"):
                source.seek(0)
            return pd.read_csv(source, dtype=object, encoding="cp1258")
    raise ValueError("Chỉ hỗ trợ .xlsx, .xls, .xlsm hoặc .csv")


def infer_column_mapping(df: pd.DataFrame) -> dict[str, str | None]:
    lowered = {str(c).strip().lower(): str(c) for c in df.columns}
    mapping: dict[str, str | None] = {}
    for canonical, aliases in ALIASES.items():
        found = next((lowered[a] for a in aliases if a in lowered), None)
        mapping[canonical] = found
    return mapping


def canonicalize_columns(df: pd.DataFrame, mapping: dict[str, str | None]) -> pd.DataFrame:
    out = df.copy()
    rename = {actual: canonical for canonical, actual in mapping.items() if actual}
    out = out.rename(columns=rename)
    missing = [c for c in REQUIRED_BASE if c not in out.columns]
    if missing:
        raise ValueError(f"Thiếu cột bắt buộc: {', '.join(missing)}")
    for c in OPTIONAL_COLUMNS:
        if c not in out.columns:
            out[c] = None
    out["id"] = out["id"].astype(str).str.strip()
    return out


def to_csv_bytes(df: pd.DataFrame) -> bytes:
    return df.to_csv(index=False).encode("utf-8-sig")
