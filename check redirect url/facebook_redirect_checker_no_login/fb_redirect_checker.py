#!/usr/bin/env python3
"""Anonymous Facebook group URL redirect checker.

Reads CSV/XLSX containing a URL column, opens each Facebook group post URL in a
fresh Chromium session without logging in, records the final browser URL after
redirects settle, and reports whether the canonical URL/group changed.
"""

from __future__ import annotations

import argparse
import os
import queue
import random
import re
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Optional, Tuple
from urllib.parse import urlsplit, urlunsplit

import pandas as pd
from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright

# Enable Virtual Terminal processing for ANSI colors on Windows CMD
if os.name == "nt":
    try:
        import ctypes
        kernel32 = ctypes.windll.kernel32
        kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
    except Exception:
        os.system("")

class Colors:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    RED = "\033[91m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    MAGENTA = "\033[95m"
    CYAN = "\033[96m"
    GRAY = "\033[90m"

FB_GROUP_POST_RE = re.compile(
    r"https?://(?:www\.|m\.|mbasic\.)?facebook\.com/groups/([^/?#]+)/(?:posts|permalink)/([^/?#]+)",
    re.IGNORECASE,
)
FB_GROUP_RE = re.compile(
    r"https?://(?:www\.|m\.|mbasic\.)?facebook\.com/groups/([^/?#]+)",
    re.IGNORECASE,
)

FULL_RESULT_COLUMNS = [
    "url_changed",
    "group_changed",
    "status",
    "check_error",
]

LITE_RESULT_COLUMNS = [
    "url_changed",
    "status",
]


def parse_group_post(url: str) -> Tuple[Optional[str], Optional[str]]:
    if not url:
        return None, None
    m = FB_GROUP_POST_RE.search(url)
    if m:
        return m.group(1), m.group(2)
    m = FB_GROUP_RE.search(url)
    if m:
        return m.group(1), None
    return None, None


def canonical_url(url: str) -> str:
    """Normalize cosmetic differences while preserving the meaningful path.

    For group/post URLs, canonicalize host/query/fragment/trailing slash so that
    Facebook-added tracking parameters do not count as a meaningful change.
    """
    if not url:
        return ""
    group_id, post_id = parse_group_post(url)
    if group_id and post_id:
        return f"https://www.facebook.com/groups/{group_id}/posts/{post_id}/"
    if group_id:
        return f"https://www.facebook.com/groups/{group_id}/"

    try:
        parts = urlsplit(url.strip())
        host = parts.netloc.lower()
        if host in {"facebook.com", "m.facebook.com", "mbasic.facebook.com"}:
            host = "www.facebook.com"
        path = parts.path or "/"
        if path != "/":
            path = path.rstrip("/") + "/"
        return urlunsplit((parts.scheme.lower() or "https", host, path, "", ""))
    except Exception:
        return url.strip()


def read_input(path: Path) -> pd.DataFrame:
    suffix = path.suffix.lower()
    if suffix == ".csv":
        return pd.read_csv(path, dtype=str, keep_default_na=False, na_filter=False)
    if suffix in {".xlsx", ".xlsm"}:
        return pd.read_excel(path, dtype=str, keep_default_na=False)
    raise ValueError("Chi ho tro file .csv, .xlsx hoac .xlsm")


ILLEGAL_EXCEL_CHARS_RE = re.compile(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]")


def clean_excel_string(val: str) -> str:
    if isinstance(val, str):
        return ILLEGAL_EXCEL_CHARS_RE.sub("", val)
    return val


def write_outputs(df: pd.DataFrame, csv_path: Path, xlsx_path: Optional[Path], no_excel: bool = False) -> None:
    df.to_csv(csv_path, index=False, encoding="utf-8-sig")
    if no_excel or xlsx_path is None:
        return
    try:
        df_excel = df.copy()
        for col in df_excel.columns:
            df_excel[col] = df_excel[col].map(clean_excel_string)
        df_excel.to_excel(xlsx_path, index=False, engine="openpyxl")
    except Exception as exc:
        print(f"    [Canh bao: Khong luu duoc Excel: {exc}]", file=sys.stderr)


def wait_url_stable(page, max_wait_seconds: float = 5.0, stable_seconds: float = 1.2) -> str:
    deadline = time.monotonic() + max_wait_seconds
    last = page.url
    last_change = time.monotonic()

    while time.monotonic() < deadline:
        page.wait_for_timeout(150)
        current = page.url
        if current != last:
            last = current
            last_change = time.monotonic()
        elif time.monotonic() - last_change >= stable_seconds:
            break
    return page.url


DELETED_KEYWORDS = (
    "content isn't available",
    "content not found",
    "page not found",
    "nội dung này hiện không khả dụng",
    "không tìm thấy nội dung",
    "trang không khả dụng",
    "liên kết có thể bị hỏng",
    "page may have been removed",
    "bài viết đã bị gỡ",
    "attachment unavailable",
)


def check_is_deleted(page, original_post: Optional[str], final_post: Optional[str], final_url: str) -> bool:
    # Rule 1: Had post ID originally, but redirect lost post ID (e.g. landed on group home page or /404)
    if original_post and not final_post:
        return True

    # Rule 2: Title check
    try:
        title = (page.title() or "").lower()
        if any(kw in title for kw in ["content not found", "page not found", "không tìm thấy", "không khả dụng"]):
            return True
    except Exception:
        pass

    # Rule 3: Full body innerText check (evaluate via JS to get full rendered text after React loads)
    try:
        body_text = (page.evaluate("() => document.body ? document.body.innerText : ''") or "").lower()
        if any(kw in body_text for kw in DELETED_KEYWORDS):
            return True
    except Exception:
        pass

    return False


def check_one(page, original_url: str, timeout_ms: int) -> dict:
    original_url = (original_url or "").strip()
    original_group, original_post = parse_group_post(original_url)

    result = {
        "url_goc": original_url,
        "final_url": "",
        "url_changed": "",
        "group_id_goc": original_group or "",
        "group_id_sau": "",
        "group_changed": "",
        "post_id_goc": original_post or "",
        "post_id_sau": "",
        "post_id_same": "",
        "status": "",
        "check_error": "",
    }

    if not original_url:
        result["status"] = "EMPTY_URL"
        return result

    nav_error = ""
    try:
        page.goto(original_url, wait_until="domcontentloaded", timeout=timeout_ms)
    except PlaywrightTimeoutError as exc:
        nav_error = f"goto timeout: {exc}"
    except Exception as exc:  # keep processing remaining rows
        nav_error = f"goto error: {type(exc).__name__}: {exc}"

    try:
        final_url = wait_url_stable(page)
    except Exception as exc:
        final_url = page.url
        nav_error = (nav_error + " | " if nav_error else "") + f"settle error: {type(exc).__name__}: {exc}"

    final_group, final_post = parse_group_post(final_url)
    result["final_url"] = final_url
    result["group_id_sau"] = final_group or ""
    result["post_id_sau"] = final_post or ""

    changed = canonical_url(final_url) != canonical_url(original_url)
    result["url_changed"] = changed

    if original_group and final_group:
        result["group_changed"] = final_group != original_group
    if original_post and final_post:
        result["post_id_same"] = final_post == original_post

    is_deleted = check_is_deleted(page, original_post, final_post, final_url)

    if is_deleted:
        result["status"] = "POST_DELETED"
        result["url_changed"] = False
    elif original_group and final_group and final_group != original_group:
        result["status"] = "GROUP_CHANGED"
    elif not changed:
        result["status"] = "SAME_URL"
    elif final_group:
        result["status"] = "URL_CHANGED"
    else:
        lower = final_url.lower()
        if "/login" in lower or "/checkpoint" in lower:
            result["status"] = "LOGIN_REDIRECT"
        else:
            result["status"] = "REDIRECT_OTHER"

    result["check_error"] = nav_error
    return result


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Check redirect URL Facebook group ma khong can dang nhap.")
    p.add_argument("input_file", help="File CSV/XLSX co cot URL")
    p.add_argument("--url-column", default="url", help="Ten cot URL, mac dinh: url")
    p.add_argument("--output", default=None, help="Ten file output khong can duoi mo rong")
    p.add_argument("--timeout", type=int, default=30, help="Timeout moi URL, giay")
    p.add_argument("--delay-min", type=float, default=0.0, help="Delay toi thieu giua cac URL, giay")
    p.add_argument("--delay-max", type=float, default=0.0, help="Delay toi da giua cac URL, giay")
    p.add_argument("--workers", type=int, default=10, help="So luong worker chay song song (mac dinh: 10)")
    p.add_argument("--save-every", type=int, default=200, help="Luu checkpoint moi N URL")
    p.add_argument("--limit", type=int, default=None, help="Chi check N dong dau")
    p.add_argument("--headless", action="store_true", help="An cua so Chromium")
    p.add_argument("--resume", action="store_true", help="Tiep tuc tu output cu neu co")
    p.add_argument("--no-urls", action="store_true", help="Bo viet cot url_goc va final_url de toi uu toc do va RAM")
    p.add_argument("--no-excel", action="store_true", help="Khong xuat file Excel (khuyen dung cho >100k dong)")
    p.add_argument("--fast-mode", action="store_true", default=True, help="Chan images/css/fonts/media de tang toc load URL")
    p.add_argument("--no-fast-mode", dest="fast_mode", action="store_false", help="Tat chan resources")
    return p


def listen_for_stop_key(stop_event: threading.Event, task_queue: queue.Queue) -> None:
    """Listen for 'q', 's', or Ctrl+C on Windows console to stop processing gracefully."""
    try:
        import msvcrt
    except ImportError:
        return

    while not stop_event.is_set():
        try:
            if msvcrt.kbhit():
                ch = msvcrt.getch()
                if ch.lower() in {b"q", b"s", b"\x03"}:
                    print("\n\n" + "=" * 65)
                    print("[!] KICH HOAT LENH DUNG (Stop Key). Dang ngat va xuat file ket qua...")
                    print("=" * 65 + "\n")
                    stop_event.set()
                    while not task_queue.empty():
                        try:
                            task_queue.get_nowait()
                            task_queue.task_done()
                        except queue.Empty:
                            break
                    break
        except Exception:
            pass
        time.sleep(0.1)


def run_worker(
    worker_id: int,
    task_queue: queue.Queue,
    stop_event: threading.Event,
    df: pd.DataFrame,
    df_lock: threading.Lock,
    stats_counter: dict[str, int],
    total_indices: int,
    csv_out: Path,
    xlsx_out: Optional[Path],
    args: argparse.Namespace,
    result_columns: list[str],
) -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=args.headless)
        context = browser.new_context(
            viewport={"width": 1280, "height": 900},
            locale="en-US",
        )
        page = context.new_page()

        if args.fast_mode:
            def block_resources(route):
                if route.request.resource_type in {"image", "stylesheet", "font", "media"}:
                    route.abort()
                else:
                    route.continue_()
            page.route("**/*", block_resources)

        while not stop_event.is_set():
            try:
                pos, idx = task_queue.get_nowait()
            except queue.Empty:
                break

            url = str(df.at[idx, args.url_column]).strip()
            result = check_one(page, url, args.timeout * 1000)

            with df_lock:
                for key in result_columns:
                    if key in result:
                        val = result[key]
                        df.at[idx, key] = str(val) if val is not None else ""

                stats_counter["checked"] += 1
                if result["status"] == "POST_DELETED":
                    stats_counter["deleted"] += 1
                elif result["url_changed"] is True:
                    stats_counter["changed"] += 1
                else:
                    stats_counter["unchanged"] += 1

                curr_checked = stats_counter["checked"]
                curr_changed = stats_counter["changed"]
                curr_deleted = stats_counter["deleted"]
                curr_unchanged = stats_counter["unchanged"]
                pct = (curr_checked / total_indices * 100) if total_indices > 0 else 100.0

                if result["status"] == "POST_DELETED":
                    status_fmt = f"{Colors.YELLOW}{Colors.BOLD}POST_DELETED (ĐÃ XÓA){Colors.RESET}"
                elif result["url_changed"]:
                    status_fmt = f"{Colors.RED}{Colors.BOLD}{result['status']} (ĐÃ ĐỔI){Colors.RESET}"
                else:
                    status_fmt = f"{Colors.GREEN}{result['status']} (KHÔNG ĐỔI){Colors.RESET}"

                print(
                    f"[{Colors.CYAN}Worker-{worker_id}{Colors.RESET}]"
                    f"[{Colors.BOLD}{curr_checked}/{total_indices}{Colors.RESET} | {pct:.1f}%] "
                    f"[{Colors.RED}{Colors.BOLD}Đã đổi: {curr_changed}{Colors.RESET} | "
                    f"{Colors.YELLOW}{Colors.BOLD}Đã xóa: {curr_deleted}{Colors.RESET} | "
                    f"{Colors.GREEN}{Colors.BOLD}Không đổi: {curr_unchanged}{Colors.RESET}] "
                    f"-> {status_fmt}"
                )
                if result["final_url"] and not args.no_urls:
                    arrow = " -> "
                    print(f"    {url}{arrow}{result['final_url']}")

                if args.save_every > 0 and curr_checked % args.save_every == 0:
                    write_outputs(df, csv_out, xlsx_out, no_excel=args.no_excel)
                    print(f"    {Colors.GRAY}[checkpoint saved: {curr_checked}/{total_indices} ({pct:.1f}%)]{Colors.RESET}")

            task_queue.task_done()
            if stop_event.is_set():
                break
            if args.delay_max > 0:
                time.sleep(random.uniform(args.delay_min, args.delay_max))

        context.close()
        browser.close()


def main() -> int:
    args = build_parser().parse_args()
    input_path = Path(args.input_file).expanduser().resolve()
    if not input_path.exists():
        print(f"{Colors.RED}Khong tim thay file: {input_path}{Colors.RESET}", file=sys.stderr)
        return 2

    try:
        df = read_input(input_path)
    except Exception as exc:
        print(f"{Colors.RED}Khong doc duoc file: {exc}{Colors.RESET}", file=sys.stderr)
        return 2

    if args.url_column not in df.columns:
        print(f"{Colors.RED}Khong co cot '{args.url_column}'. Cot hien co: {', '.join(map(str, df.columns))}{Colors.RESET}", file=sys.stderr)
        return 2

    result_columns = LITE_RESULT_COLUMNS if args.no_urls else FULL_RESULT_COLUMNS

    # Auto-optimize settings for large datasets
    if len(df) > 100000:
        if not args.no_excel:
            print(f"{Colors.YELLOW}[Auto-Optimize] File > 100.000 dong: Tu dong tat xuat Excel (--no-excel) de tranh vi pham gioi han/RAM.{Colors.RESET}")
            args.no_excel = True
        if args.save_every == 10:
            args.save_every = 5000
            print(f"{Colors.YELLOW}[Auto-Optimize] File > 100.000 dong: Dieu chinh save-every = 5000 de giam I/O dia.{Colors.RESET}")

    for col in df.columns:
        df[col] = df[col].astype(str)
    for col in result_columns:
        if col not in df.columns:
            df[col] = ""

    output_base = Path(args.output).expanduser().resolve() if args.output else input_path.with_name(input_path.stem + "_redirect_checked")
    if output_base.suffix.lower() in {".csv", ".xlsx"}:
        output_base = output_base.with_suffix("")
    csv_out = output_base.with_suffix(".csv")
    xlsx_out = output_base.with_suffix(".xlsx") if not args.no_excel else None

    if args.resume and csv_out.exists():
        old = pd.read_csv(csv_out, dtype=str, keep_default_na=False, na_filter=False)
        if len(old) == len(df) and args.url_column in old.columns:
            same_url = old[args.url_column].astype(str) == df[args.url_column].astype(str)
            for col in result_columns:
                if col in old.columns:
                    df.loc[same_url, col] = old.loc[same_url, col].astype(str)
            print(f"{Colors.CYAN}Resume tu: {csv_out}{Colors.RESET}")

    indices = list(range(len(df)))
    if args.limit is not None:
        indices = indices[: max(args.limit, 0)]

    completed = {"SAME_URL", "GROUP_CHANGED", "URL_CHANGED", "LOGIN_REDIRECT", "REDIRECT_OTHER", "EMPTY_URL", "POST_DELETED"}

    print(f"{Colors.BOLD}Input:{Colors.RESET} {input_path}")
    print(f"{Colors.BOLD}Rows:{Colors.RESET} {len(df)}")
    print(f"{Colors.BOLD}Mode:{Colors.RESET} anonymous | FastMode(ResourceBlock)={'ON' if args.fast_mode else 'OFF'} | LiteOutput(NoURLs)={'ON' if args.no_urls else 'OFF'}")
    print(f"{Colors.BOLD}Workers:{Colors.RESET} {max(1, args.workers)}")
    print(f"{Colors.BOLD}Output CSV:{Colors.RESET}  {csv_out}")
    if not args.no_excel:
        print(f"{Colors.BOLD}Output Excel:{Colors.RESET} {xlsx_out}")
    else:
        print(f"{Colors.BOLD}Output Excel:{Colors.RESET} (TAT - --no-excel)")

    task_queue = queue.Queue()
    skipped = 0
    init_changed = 0
    init_deleted = 0
    init_unchanged = 0

    for pos, idx in enumerate(indices, start=1):
        old_status = str(df.at[idx, "status"]).strip()
        if args.resume and old_status in completed:
            skipped += 1
            if old_status == "POST_DELETED":
                init_deleted += 1
            elif str(df.at[idx, "url_changed"]).lower() == "true":
                init_changed += 1
            else:
                init_unchanged += 1
            print(f"[{pos}/{len(indices)}] {Colors.GRAY}SKIP {old_status}{Colors.RESET}")
            continue
        task_queue.put((pos, idx))

    total_to_process = task_queue.qsize()
    if total_to_process > 0:
        stop_event = threading.Event()

        listener_thread = threading.Thread(
            target=listen_for_stop_key,
            args=(stop_event, task_queue),
            daemon=True,
        )
        listener_thread.start()

        print("\n" + "=" * 65)
        print(f"{Colors.YELLOW}{Colors.BOLD}>>> PHIM TAT: Nhan 'q', 's' hoac Ctrl+C bat ky luc nao de DUNG & XUAT FILE <<<{Colors.RESET}")
        print("=" * 65 + "\n")

        num_workers = min(max(1, args.workers), total_to_process)
        df_lock = threading.Lock()
        stats_counter = {
            "checked": skipped,
            "changed": init_changed,
            "deleted": init_deleted,
            "unchanged": init_unchanged,
        }

        try:
            with ThreadPoolExecutor(max_workers=num_workers) as executor:
                futures = [
                    executor.submit(
                        run_worker,
                        w_id,
                        task_queue,
                        stop_event,
                        df,
                        df_lock,
                        stats_counter,
                        len(indices),
                        csv_out,
                        xlsx_out,
                        args,
                        result_columns,
                    )
                    for w_id in range(1, num_workers + 1)
                ]
                for future in futures:
                    future.result()
        except KeyboardInterrupt:
            print(f"\n\n{Colors.RED}[!] Nhan lenh ngat (Ctrl+C). Dang hoan tat va xuat file ket qua...{Colors.RESET}")
            stop_event.set()
            while not task_queue.empty():
                try:
                    task_queue.get_nowait()
                    task_queue.task_done()
                except queue.Empty:
                    break

        write_outputs(df, csv_out, xlsx_out, no_excel=args.no_excel)

    counts = df.loc[indices, "status"].value_counts(dropna=False).to_dict()
    deleted_count = counts.get("POST_DELETED", 0)
    changed_count = sum(str(v).lower() == "true" for v in df.loc[indices, "url_changed"].tolist())
    total = len(indices)
    unchanged_count = total - changed_count - deleted_count

    print(f"\n{Colors.BOLD}=================== KẾT QUẢ KIỂM TRA ==================={Colors.RESET}")
    if stop_event.is_set() if total_to_process > 0 else False:
        print(f"{Colors.YELLOW}[!] DỪNG SỚM THEO YÊU CẦU NGUỜI DÙNG{Colors.RESET}")

    pct_changed = (changed_count / total * 100) if total > 0 else 0
    pct_deleted = (deleted_count / total * 100) if total > 0 else 0
    pct_unchanged = (unchanged_count / total * 100) if total > 0 else 0

    print(f"{Colors.RED}{Colors.BOLD}URL ĐÃ ĐỔI    : {changed_count}/{total} ({pct_changed:.1f}%){Colors.RESET}")
    print(f"{Colors.YELLOW}{Colors.BOLD}BÀI VIẾT ĐÃ XÓA: {deleted_count}/{total} ({pct_deleted:.1f}%){Colors.RESET}")
    print(f"{Colors.GREEN}{Colors.BOLD}URL KHÔNG ĐỔI : {unchanged_count}/{total} ({pct_unchanged:.1f}%){Colors.RESET}")
    print(f"\n{Colors.CYAN}{Colors.BOLD}Chi tiết trạng thái:{Colors.RESET}")
    for status, count in counts.items():
        st_color = Colors.YELLOW if status == "POST_DELETED" else (Colors.RED if "CHANGED" in str(status) or "REDIRECT" in str(status) else Colors.GREEN)
        print(f"  - {st_color}{status or '(blank)'}{Colors.RESET}: {count}")
    print(f"\nDa luu CSV:   {csv_out}")
    if not args.no_excel:
        print(f"Da luu Excel: {xlsx_out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
