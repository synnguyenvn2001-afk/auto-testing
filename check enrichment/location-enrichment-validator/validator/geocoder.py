from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import requests


@dataclass
class GeocodeCandidate:
    formatted_address: str
    lat: float | None
    lng: float | None
    types: list[str]
    province: str = ""
    locality: str = ""
    partial_match: bool = False

    def to_dict(self) -> dict[str, Any]:
        return {
            "formatted_address": self.formatted_address,
            "lat": self.lat,
            "lng": self.lng,
            "types": self.types,
            "province": self.province,
            "locality": self.locality,
            "partial_match": self.partial_match,
        }


class GoogleGeocoder:
    """Small Google Geocoding API v3 client with an in-process cache."""

    BASE = "https://maps.googleapis.com/maps/api/geocode/json"

    def __init__(self, api_key: str, timeout: int = 15):
        self.api_key = api_key.strip()
        self.timeout = timeout
        self.cache: dict[tuple, list[dict[str, Any]]] = {}

    @staticmethod
    def _components(result: dict[str, Any]) -> tuple[str, str]:
        province = ""
        locality = ""
        for comp in result.get("address_components", []):
            types = set(comp.get("types", []))
            if "administrative_area_level_1" in types:
                province = comp.get("long_name", "")
            if "locality" in types or "administrative_area_level_2" in types:
                locality = locality or comp.get("long_name", "")
        return province, locality

    def geocode(self, query: str, limit: int = 5) -> list[dict[str, Any]]:
        key = ("forward", query, limit)
        if key in self.cache:
            return self.cache[key]
        if not self.api_key or not query.strip():
            return []
        resp = requests.get(
            self.BASE,
            params={"address": query, "key": self.api_key, "language": "vi", "region": "vn"},
            timeout=self.timeout,
        )
        resp.raise_for_status()
        data = resp.json()
        if data.get("status") not in {"OK", "ZERO_RESULTS"}:
            raise RuntimeError(f"Google Geocoding: {data.get('status')} - {data.get('error_message', '')}")
        out = []
        for result in data.get("results", [])[:limit]:
            loc = result.get("geometry", {}).get("location", {})
            province, locality = self._components(result)
            out.append(
                GeocodeCandidate(
                    formatted_address=result.get("formatted_address", ""),
                    lat=loc.get("lat"),
                    lng=loc.get("lng"),
                    types=result.get("types", []),
                    province=province,
                    locality=locality,
                    partial_match=bool(result.get("partial_match", False)),
                ).to_dict()
            )
        self.cache[key] = out
        return out

    def reverse(self, lat: float, lng: float, limit: int = 3) -> list[dict[str, Any]]:
        key = ("reverse", round(float(lat), 7), round(float(lng), 7), limit)
        if key in self.cache:
            return self.cache[key]
        if not self.api_key:
            return []
        resp = requests.get(
            self.BASE,
            params={"latlng": f"{lat},{lng}", "key": self.api_key, "language": "vi"},
            timeout=self.timeout,
        )
        resp.raise_for_status()
        data = resp.json()
        if data.get("status") not in {"OK", "ZERO_RESULTS"}:
            raise RuntimeError(f"Google reverse geocoding: {data.get('status')} - {data.get('error_message', '')}")
        out = []
        for result in data.get("results", [])[:limit]:
            loc = result.get("geometry", {}).get("location", {})
            province, locality = self._components(result)
            out.append(
                GeocodeCandidate(
                    formatted_address=result.get("formatted_address", ""),
                    lat=loc.get("lat"),
                    lng=loc.get("lng"),
                    types=result.get("types", []),
                    province=province,
                    locality=locality,
                    partial_match=bool(result.get("partial_match", False)),
                ).to_dict()
            )
        self.cache[key] = out
        return out
