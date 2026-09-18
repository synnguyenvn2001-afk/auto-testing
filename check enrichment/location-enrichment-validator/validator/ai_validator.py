from __future__ import annotations

import json
from typing import Any

ALLOWED_STATUSES = [
    "PASS",
    "PASS_NULL",
    "PASS_OUTSIDE_HANOI",
    "PASS_AMBIGUOUS_0",
    "WRONG_LOCATION",
    "WRONG_PROVINCE",
    "WRONG_STREET",
    "MISSING_STREET",
    "REGRESSION",
    "NEED_REVIEW",
]

SCHEMA = {
    "type": "json_schema",
    "name": "location_validation_batch",
    "strict": True,
    "schema": {
        "type": "object",
        "properties": {
            "results": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"},
                        "status": {"type": "string", "enum": ALLOWED_STATUSES},
                        "confidence": {"type": "number", "minimum": 0, "maximum": 1},
                        "reason": {"type": "string"},
                        "is_outside_hanoi": {"type": "boolean"},
                        "is_ambiguous": {"type": "boolean"},
                        "allow_zero_coordinate": {"type": "boolean"},
                        "suggested_location": {"type": "string"},
                        "street_assessment": {
                            "type": "string",
                            "enum": ["OK", "MISSING_STREET", "WRONG_STREET", "NOT_APPLICABLE", "UNCERTAIN"],
                        },
                    },
                    "required": [
                        "id", "status", "confidence", "reason", "is_outside_hanoi", "is_ambiguous",
                        "allow_zero_coordinate", "suggested_location", "street_assessment"
                    ],
                    "additionalProperties": False,
                },
            }
        },
        "required": ["results"],
        "additionalProperties": False,
    },
}

SYSTEM_INSTRUCTIONS = """Bạn là QA validator cho dữ liệu location bất động sản Việt Nam.
Mục tiêu: đánh giá output enrichment có được hỗ trợ bởi extract_location/context hay không, không đoán địa điểm chỉ vì tên giống nhau.

Quy tắc bắt buộc:
1) location NULL + lat/long 0 được chấp nhận.
2) Nếu địa điểm rõ ràng ngoài Hà Nội, lat/long 0 được chấp nhận. Không ép geocode về Hà Nội.
3) Nếu tên địa danh/đường trùng y hệt ở nhiều tỉnh/thành và context không đủ phân biệt, 0,0 có thể là lựa chọn đúng: PASS_AMBIGUOUS_0.
4) Nếu có context Hà Nội đủ mạnh và địa điểm tương đối đặc trưng nhưng bản mới trả 0,0, cân nhắc REGRESSION hoặc NEED_REVIEW.
5) Nếu extract có tên đường/phố/ngõ nhưng enriched location chỉ giữ phường/xã/khu vực, dùng MISSING_STREET. Không tự kết luận sai tỉnh nếu chỉ thiếu cấp đường.
6) Tên đường phổ biến có thể trùng ở nhiều tỉnh. Phải dùng quận/phường/tỉnh/dự án/context để khóa địa điểm.
7) Từ mô tả như 'trung tâm' không phải mặc định là tên 'Đường Trung Tâm'.
8) Cho phép người dùng dùng đơn vị hành chính cũ; khác DVHC mới không tự động là lỗi nếu vẫn chỉ cùng địa điểm thực tế.
9) Không chọn một POI/đường quá cụ thể từ input mơ hồ nếu không có bằng chứng.
10) Ground truth theo ID là bằng chứng mạnh. Nhưng nếu enrichment mới đã thay đổi, phải đánh giá lại thay vì giữ lỗi cũ máy móc.
11) Ground-truth match theo extract_location chỉ là hint, vì ID mới có thể là bài đăng khác.
12) Nếu forward/reverse geocoder mâu thuẫn rõ tỉnh/thành với enriched location, ưu tiên đánh WRONG_PROVINCE/WRONG_LOCATION khi context đầu vào ủng hộ.

Trả lý do ngắn, cụ thể bằng tiếng Việt. Confidence chỉ cao (>0.9) khi có bằng chứng rõ; case trùng tên/mơ hồ phải giảm confidence.
"""


class AIValidator:
    def __init__(self, api_key: str, model: str = "gpt-5.6", use_web_search: bool = False):
        from openai import OpenAI
        self.client = OpenAI(api_key=api_key)
        self.model = model
        self.use_web_search = use_web_search

    def validate_batch(self, items: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not items:
            return []
        payload = json.dumps(items, ensure_ascii=False, default=str)
        kwargs: dict[str, Any] = {
            "model": self.model,
            "instructions": SYSTEM_INSTRUCTIONS,
            "input": "Hãy kiểm tra batch dữ liệu sau. Mỗi input phải có đúng một result cùng id:\n" + payload,
            "text": {"format": SCHEMA},
        }
        if self.use_web_search:
            kwargs["tools"] = [{"type": "web_search"}]
        try:
            response = self.client.responses.create(**kwargs)
            parsed = json.loads(response.output_text)
            results = parsed.get("results", [])
            by_id = {str(x.get("id")): x for x in results}
            ordered = []
            for item in items:
                rid = str(item.get("id"))
                if rid in by_id:
                    ordered.append(by_id[rid])
                else:
                    ordered.append(self._fallback(rid, "AI không trả kết quả cho ID này."))
            return ordered
        except Exception as exc:
            # If web-search + structured output is unavailable for a model/account,
            # retry once without web search before degrading to NEED_REVIEW.
            if self.use_web_search:
                try:
                    kwargs.pop("tools", None)
                    response = self.client.responses.create(**kwargs)
                    parsed = json.loads(response.output_text)
                    results = parsed.get("results", [])
                    by_id = {str(x.get("id")): x for x in results}
                    return [by_id.get(str(i.get("id")), self._fallback(str(i.get("id")), "AI thiếu result.")) for i in items]
                except Exception:
                    pass
            return [self._fallback(str(i.get("id")), f"Lỗi AI: {exc}") for i in items]

    @staticmethod
    def _fallback(record_id: str, reason: str) -> dict[str, Any]:
        return {
            "id": record_id,
            "status": "NEED_REVIEW",
            "confidence": 0.0,
            "reason": reason,
            "is_outside_hanoi": False,
            "is_ambiguous": True,
            "allow_zero_coordinate": False,
            "suggested_location": "",
            "street_assessment": "UNCERTAIN",
        }
