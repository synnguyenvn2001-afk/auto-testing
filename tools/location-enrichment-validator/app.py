from __future__ import annotations

import os
from pathlib import Path

import pandas as pd
import streamlit as st
from dotenv import load_dotenv

from validator.ai_validator import AIValidator
from validator.exporter import export_xlsx
from validator.geocoder import GoogleGeocoder
from validator.ground_truth import GroundTruthIndex, merge_ground_truth
from validator.io_utils import canonicalize_columns, infer_column_mapping, read_table, to_csv_bytes
from validator.pipeline import run_validation

load_dotenv()
ROOT = Path(__file__).resolve().parent
SEED_PATH = ROOT / "data" / "ground_truth_seed.csv"

st.set_page_config(page_title="Location Enrichment Validator", page_icon="📍", layout="wide")
st.title("📍 Location Enrichment Validator")
st.caption("Kiểm tra dữ liệu làm giàu location bằng Rule Engine + Ground Truth + Google Geocoding + OpenAI")

with st.sidebar:
    st.header("Cấu hình")
    openai_key = st.text_input("OpenAI API key", value=os.getenv("OPENAI_API_KEY", ""), type="password")
    model = st.text_input("OpenAI model", value=os.getenv("OPENAI_MODEL", "gpt-5.6"))
    google_key = st.text_input("Google Maps API key (không bắt buộc)", value=os.getenv("GOOGLE_MAPS_API_KEY", ""), type="password")
    use_ai = st.toggle("Dùng AI", value=bool(openai_key))
    use_web_search = st.toggle("Cho AI web search ở case khó", value=False, help="Tăng khả năng xác minh địa danh nhưng có thể tăng chi phí API.")
    ai_only_suspicious = st.toggle("AI chỉ kiểm tra case nghi ngờ", value=True)
    max_ai_rows = st.number_input("Tối đa số dòng AI/geocoder", min_value=1, max_value=10000, value=100, step=10)
    batch_size = st.number_input("AI batch size", min_value=1, max_value=30, value=10, step=1)

st.subheader("1. Upload dữ liệu")
input_file = st.file_uploader("File enrichment mới (.xlsx/.csv)", type=["xlsx", "xls", "xlsm", "csv"])
gt_file = st.file_uploader("Ground truth bổ sung (không bắt buộc)", type=["xlsx", "xls", "xlsm", "csv"])

if input_file is None:
    st.info("Upload file enrichment để bắt đầu. App đã kèm 50 case ground truth cũ bạn từng đánh giá.")
    st.stop()

try:
    raw_df = read_table(input_file, input_file.name)
except Exception as exc:
    st.error(f"Không đọc được file: {exc}")
    st.stop()

st.write(f"Đã đọc **{len(raw_df):,} dòng** và **{len(raw_df.columns)} cột**.")

mapping = infer_column_mapping(raw_df)
with st.expander("Ánh xạ cột", expanded=any(v is None for k, v in mapping.items() if k in {"id", "extract_location", "location", "latitude", "longitude"})):
    options = [None] + [str(c) for c in raw_df.columns]
    labels = {
        "id": "ID",
        "extract_location": "Location bóc tách",
        "location": "Location đã làm giàu",
        "latitude": "Latitude",
        "longitude": "Longitude",
        "street_or_village": "Street/Village",
        "url": "URL",
        "description": "Description/context",
    }
    user_mapping = {}
    cols = st.columns(2)
    for i, canonical in enumerate(mapping):
        default = mapping[canonical]
        index = options.index(default) if default in options else 0
        user_mapping[canonical] = cols[i % 2].selectbox(labels[canonical], options, index=index, key=f"map_{canonical}")

try:
    df = canonicalize_columns(raw_df, user_mapping)
except Exception as exc:
    st.error(str(exc))
    st.stop()

# Ground truth seed = the user's 50 previously reviewed cases bundled with the app.
seed_df = pd.read_csv(SEED_PATH, dtype=object, encoding="utf-8-sig") if SEED_PATH.exists() else pd.DataFrame()
uploaded_gt = None
if gt_file is not None:
    try:
        uploaded_gt = read_table(gt_file, gt_file.name)
    except Exception as exc:
        st.warning(f"Không đọc được ground truth bổ sung: {exc}")
merged_gt = merge_ground_truth(seed_df, uploaded_gt)
gt_index = GroundTruthIndex(merged_gt)

c1, c2, c3 = st.columns(3)
c1.metric("Dòng dữ liệu", len(df))
c2.metric("Ground truth theo ID", len(gt_index.by_id))
c3.metric("Extract đã biết", len(gt_index.by_extract))

with st.expander("Xem dữ liệu đầu vào"):
    st.dataframe(df.head(100), use_container_width=True, hide_index=True)

st.subheader("2. Chạy kiểm tra")
if use_ai and not openai_key:
    st.warning("Bạn bật AI nhưng chưa nhập OpenAI API key. App sẽ chỉ chạy rule/geocoder.")

run = st.button("▶ Bắt đầu kiểm tra", type="primary", use_container_width=True)
if run:
    ai = AIValidator(openai_key, model=model, use_web_search=use_web_search) if (use_ai and openai_key) else None
    geocoder = GoogleGeocoder(google_key) if google_key else None
    bar = st.progress(0, text="Đang chạy rule engine...")

    def progress(done: int, total: int, text: str):
        pct = 1.0 if total <= 0 else min(1.0, done / total)
        bar.progress(pct, text=text)

    try:
        reviewed = run_validation(
            df=df,
            ground_truth=gt_index,
            ai_validator=ai,
            geocoder=geocoder,
            ai_only_suspicious=ai_only_suspicious,
            max_ai_rows=int(max_ai_rows),
            batch_size=int(batch_size),
            progress=progress,
        )
    except Exception as exc:
        st.exception(exc)
        st.stop()
    bar.progress(1.0, text="Hoàn tất")
    st.session_state["reviewed"] = reviewed

if "reviewed" not in st.session_state:
    st.stop()

reviewed = st.session_state["reviewed"]
st.subheader("3. Kết quả")
counts = reviewed["final_status"].value_counts()
metric_cols = st.columns(5)
metric_cols[0].metric("Tổng", len(reviewed))
metric_cols[1].metric("Pass", int(sum(counts.get(s, 0) for s in ["PASS", "PASS_NULL", "PASS_OUTSIDE_HANOI", "PASS_AMBIGUOUS_0", "KNOWN_GT_PASS"])))
metric_cols[2].metric("Sai", int(sum(counts.get(s, 0) for s in ["WRONG_LOCATION", "WRONG_PROVINCE", "WRONG_STREET", "REGRESSION", "KNOWN_BAD_REPEATED"])))
metric_cols[3].metric("Thiếu đường", int(counts.get("MISSING_STREET", 0)))
metric_cols[4].metric("Cần review", int(counts.get("NEED_REVIEW", 0) + counts.get("POTENTIAL_REGRESSION", 0)))

status_options = sorted(reviewed["final_status"].dropna().astype(str).unique().tolist())
selected = st.multiselect("Lọc status", status_options, default=status_options)
show = reviewed[reviewed["final_status"].isin(selected)] if selected else reviewed.iloc[0:0]

important_cols = [
    "id", "extract_location", "location", "latitude", "longitude", "street_or_village",
    "final_status", "final_confidence", "final_note", "street_review_note",
    "gt_id_match", "gt_status", "gt_extract_hint", "ai_suggested_location", "url",
]
important_cols = [c for c in important_cols if c in show.columns]
st.dataframe(show[important_cols], use_container_width=True, hide_index=True, height=520)

st.subheader("4. Human review")
st.caption("Bạn có thể sửa 2 cột human_status/human_note. Sau đó tải ground truth mới để dùng ở lần sau.")
edit_cols = [c for c in ["id", "extract_location", "location", "final_status", "human_status", "human_note"] if c in reviewed.columns]
edited = st.data_editor(
    reviewed[edit_cols],
    use_container_width=True,
    hide_index=True,
    disabled=[c for c in edit_cols if c not in {"human_status", "human_note"}],
    column_config={
        "human_status": st.column_config.SelectboxColumn(
            "human_status",
            options=["", "Đúng", "Đúng - Ngoài Hà Nội", "Đúng - Location null", "Đúng - Mơ hồ/0,0 hợp lệ", "Sai Location - Trong Hà Nội", "Sai Location - Ngoài Hà Nội", "Thiếu đường", "Cần kiểm tra"],
        )
    },
    key="human_editor",
)

# Apply edits back for downloads.
final_df = reviewed.copy()
final_df["human_status"] = edited["human_status"].values
final_df["human_note"] = edited["human_note"].values

human_rows = final_df[final_df["human_status"].astype(str).str.strip() != ""].copy()
if not human_rows.empty:
    gt_new = human_rows[[c for c in ["id", "extract_location", "location", "latitude", "longitude", "street_or_village", "url", "human_status", "human_note"] if c in human_rows.columns]].copy()
    gt_new = gt_new.rename(columns={"human_status": "review_status", "human_note": "review_note"})
    merged_download = merge_ground_truth(merged_gt, gt_new)
else:
    merged_download = merged_gt

st.subheader("5. Export")
d1, d2, d3 = st.columns(3)
d1.download_button(
    "⬇ Tải kết quả Excel",
    data=export_xlsx(final_df),
    file_name="location_validation_result.xlsx",
    mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    use_container_width=True,
)
d2.download_button(
    "⬇ Tải kết quả CSV",
    data=to_csv_bytes(final_df),
    file_name="location_validation_result.csv",
    mime="text/csv",
    use_container_width=True,
)
d3.download_button(
    "⬇ Tải Ground Truth đã gộp",
    data=to_csv_bytes(merged_download),
    file_name="ground_truth_updated.csv",
    mime="text/csv",
    use_container_width=True,
)
