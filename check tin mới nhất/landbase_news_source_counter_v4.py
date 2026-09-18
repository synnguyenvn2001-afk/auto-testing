#!/usr/bin/env python3
"""LandBase News source/date counter.

Crawls rendered search-result pages and reads source URLs directly from the DOM.
It does NOT hover or click each card.

Examples:
  # First batch: pages 1-120
  python landbase_news_source_counter_v4.py --workers 4 --max-pages 120 --output landbase_news_report.xlsx

  # Continue the same workbook automatically from page 121 to 240
  python landbase_news_source_counter_v4.py --workers 4 --resume --max-pages 240 --output landbase_news_report.xlsx

  # Or explicitly choose the next range
  python landbase_news_source_counter_v4.py --workers 4 --resume --start-page 121 --max-pages 240 --output landbase_news_report.xlsx

  # Re-export the 3 CSV summaries only; no crawling
  python landbase_news_source_counter_v4.py --export-only --output landbase_news_report.xlsx
"""

from __future__ import annotations

import argparse
import asyncio
import random
import re
import sys
import os
import time
from datetime import datetime
from dataclasses import dataclass, replace
from pathlib import Path
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

import pandas as pd
from playwright.async_api import Browser, BrowserContext, Page, async_playwright

DATE_RE = re.compile(r"^\d{2}/\d{2}/\d{4}$")
LAND_BASE_HOSTS = {"news.landbase.vn", "landbase.vn", "www.landbase.vn"}

# Common public suffixes in Vietnam so subdomains are grouped to the same source.
VN_2LEVEL_SUFFIXES = {
    "com.vn", "net.vn", "org.vn", "gov.vn", "edu.vn", "info.vn",
    "biz.vn", "name.vn", "pro.vn", "ac.vn", "int.vn", "health.vn",
}


@dataclass
class CrawlConfig:
    base_url: str
    start_page: int
    max_pages: int
    workers: int
    delay_ms: int
    jitter_ms: int
    render_wait_ms: int
    navigation_timeout_ms: int
    empty_retries: int
    empty_streak_limit: int
    headless: bool
    output: Path
    resume: bool
    overwrite: bool
    export_only: bool
    csv_retries: int
    csv_retry_delay_ms: int


def build_page_url(base_url: str, page_no: int) -> str:
    """Build a result-page URL while preserving all filters.

    LandBase treats page 1 as the base search URL in normal navigation, so page=1
    is intentionally omitted. Pages >= 2 use the explicit page=N parameter.
    """
    p = urlparse(base_url)
    query = dict(parse_qsl(p.query, keep_blank_values=True))
    if page_no <= 1:
        query.pop("page", None)
    else:
        query["page"] = str(page_no)
    return urlunparse((p.scheme, p.netloc, p.path, p.params, urlencode(query), p.fragment))


def normalize_domain(url: str | None) -> str:
    if not url:
        return "MISSING_SOURCE_LINK"
    try:
        host = (urlparse(url).hostname or "").lower().strip(".")
    except Exception:
        return "INVALID_SOURCE_URL"
    if host.startswith("www."):
        host = host[4:]
    if not host:
        return "INVALID_SOURCE_URL"

    parts = host.split(".")
    if len(parts) <= 2:
        return host
    suffix2 = ".".join(parts[-2:])
    if suffix2 in VN_2LEVEL_SUFFIXES and len(parts) >= 3:
        return ".".join(parts[-3:])
    return ".".join(parts[-2:])


EXTRACT_JS = r"""
() => {
  const DATE = /\b\d{2}\/\d{2}\/\d{4}\b/;
  const landbaseHosts = new Set(['news.landbase.vn', 'landbase.vn', 'www.landbase.vn']);
  const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const isHttp = (href) => /^https?:\/\//i.test(href || '');
  const hostOf = (href) => {
    try { return new URL(href, location.href).hostname.toLowerCase(); }
    catch (_) { return ''; }
  };
  const isLandbase = (href) => landbaseHosts.has(hostOf(href));

  // The current LandBase DOM exposes each news result as a .post-item-bottom card.
  // The source URL is already in an <a href>; no hover is required.
  let cards = [...document.querySelectorAll('div.post-item-bottom')];
  if (!cards.length) {
    cards = [...document.querySelectorAll('div.ant-card')].filter(el => DATE.test(clean(el.innerText || el.textContent)));
  }

  const rows = [];
  const seen = new Set();

  for (const card of cards) {
    const text = clean(card.innerText || card.textContent);
    const dateMatch = text.match(DATE);
    if (!dateMatch) continue;
    const date = dateMatch[0];

    const anchors = [...card.querySelectorAll('a[href]')];
    const hrefs = anchors.map(a => a.href || a.getAttribute('href') || '').filter(isHttp);
    const externalLinks = hrefs.filter(href => !isLandbase(href));
    const internalLinks = hrefs.filter(href => isLandbase(href) && !/search-news-result/i.test(href));

    // Prefer the main article anchor shown in DevTools (a.title-new[href]).
    const titleAnchor = card.querySelector('a.title-new[href]');
    const titleHref = titleAnchor ? (titleAnchor.href || titleAnchor.getAttribute('href') || '') : '';
    const sourceUrl = (isHttp(titleHref) && !isLandbase(titleHref)) ? titleHref : (externalLinks[0] || '');
    const landbaseUrl = internalLinks[0] || '';

    let title = '';
    const titleNode = card.querySelector('.post-item-info-content [class*="title" i], h1,h2,h3,h4,h5,h6');
    if (titleNode) title = clean(titleNode.innerText || titleNode.textContent);

    if (!title || DATE.test(title)) {
      const lines = (card.innerText || card.textContent || '')
        .split(/\n+/)
        .map(clean)
        .filter(Boolean)
        .filter(x => !/^\d{2}\/\d{2}\/\d{4}$/.test(x));
      title = lines.find(x => x.length >= 12) || lines[0] || '';
    }

    const key = `${date}|${sourceUrl}|${title}`;
    if (seen.has(key)) continue;
    seen.add(key);

    rows.push({
      date,
      title,
      source_url: sourceUrl,
      landbase_url: landbaseUrl,
      external_link_count: externalLinks.length,
    });
  }

  return {
    rows,
    card_node_count: cards.length,
    body_has_date: DATE.test(document.body?.innerText || ''),
    title: document.title,
  };
}
"""

async def make_context(browser: Browser) -> BrowserContext:
    context = await browser.new_context(
        viewport={"width": 1440, "height": 1000},
        locale="vi-VN",
        user_agent=(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/151.0.0.0 Safari/537.36"
        ),
    )

    # Images/fonts/media are not needed to read href/date/title from the DOM.
    # Blocking them cuts bandwidth and makes multi-worker crawling much faster.
    async def route_handler(route):
        if route.request.resource_type in {"image", "media", "font"}:
            await route.abort()
        else:
            await route.continue_()

    await context.route("**/*", route_handler)
    return context


async def wait_for_render(page: Page, render_wait_ms: int) -> None:
    """Wait for rendered news cards rather than relying on a fixed sleep."""
    timeout = max(500, render_wait_ms)
    try:
        await page.wait_for_selector(
            "div.post-item-bottom, div.ant-card.post-item-bottom",
            state="attached",
            timeout=timeout,
        )
        # Let text/date nodes finish populating after the card shell appears.
        await page.wait_for_timeout(250)
        return
    except Exception:
        pass

    # Fallback for markup changes: wait for a visible DD/MM/YYYY string.
    deadline_checks = max(2, timeout // 250)
    for _ in range(deadline_checks):
        has_date = await page.evaluate(
            "() => /\\b\\d{2}\\/\\d{2}\\/\\d{4}\\b/.test(document.body?.innerText || '')"
        )
        if has_date:
            await page.wait_for_timeout(150)
            return
        await page.wait_for_timeout(250)


async def scrape_page(page: Page, cfg: CrawlConfig, page_no: int) -> dict[str, Any]:
    url = build_page_url(cfg.base_url, page_no)
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=cfg.navigation_timeout_ms)
        await wait_for_render(page, cfg.render_wait_ms)
        result = await page.evaluate(EXTRACT_JS)
        result["page"] = page_no
        result["url"] = url
        result["error"] = ""
        return result
    except Exception as exc:
        return {
            "page": page_no,
            "url": url,
            "rows": [],
            "card_node_count": 0,
            "body_has_date": False,
            "title": "",
            "error": f"{type(exc).__name__}: {exc}",
        }


async def worker_loop(worker_id: int, browser: Browser, cfg: CrawlConfig, out_rows: list[dict[str, Any]], page_log: list[dict[str, Any]]) -> None:
    """Worker i crawls pages start+i, start+i+workers, ...

    In AUTO mode a single empty page never stops a worker. Client-rendered pages can
    transiently look empty, so the worker retries the same page and only stops after
    several consecutive empty pages in its stride.
    """
    context = await make_context(browser)
    page = await context.new_page()
    page_no = cfg.start_page + worker_id
    empty_streak = 0

    try:
        while True:
            if cfg.max_pages > 0 and page_no > cfg.max_pages:
                break

            result = await scrape_page(page, cfg, page_no)

            # Retry empty/error pages because the React/Next page occasionally renders
            # after our first inspection. This is especially important on page 1.
            attempts = 0
            while attempts < cfg.empty_retries and (result.get("error") or not result.get("rows")):
                attempts += 1
                reason = "error" if result.get("error") else "empty"
                print(
                    f"[worker {worker_id + 1}] page {page_no}: {reason}; retry {attempts}/{cfg.empty_retries}",
                    flush=True,
                )
                await page.wait_for_timeout(700 + attempts * 500)
                result = await scrape_page(page, cfg, page_no)

            rows = result.get("rows", [])
            has_cards = bool(rows)

            page_log.append({
                "worker": worker_id + 1,
                "page": page_no,
                "items": len(rows),
                "card_nodes": result.get("card_node_count", 0),
                "attempts": attempts + 1,
                "url": result.get("url", ""),
                "error": result.get("error", ""),
            })

            if result.get("error"):
                print(f"[worker {worker_id + 1}] page {page_no}: ERROR {result['error']}", flush=True)

            print(f"[worker {worker_id + 1}] page {page_no}: {len(rows)} cards", flush=True)

            for row in rows:
                row = dict(row)
                row["page"] = page_no
                row["worker"] = worker_id + 1
                row["source_domain"] = normalize_domain(row.get("source_url"))
                out_rows.append(row)

            if has_cards:
                empty_streak = 0
            else:
                empty_streak += 1
                if cfg.max_pages <= 0:
                    print(
                        f"[worker {worker_id + 1}] page {page_no}: empty streak "
                        f"{empty_streak}/{cfg.empty_streak_limit}; continue stride",
                        flush=True,
                    )
                    if empty_streak >= cfg.empty_streak_limit:
                        print(
                            f"[worker {worker_id + 1}] stop after {empty_streak} consecutive empty pages",
                            flush=True,
                        )
                        break

            page_no += cfg.workers
            delay = cfg.delay_ms + random.randint(0, max(0, cfg.jitter_ms))
            if delay > 0:
                await page.wait_for_timeout(delay)
    finally:
        await context.close()


def _records_from_df(df: pd.DataFrame, columns: list[str]) -> list[dict[str, Any]]:
    """Convert Excel-loaded data to plain records without NaN values."""
    if df is None or df.empty:
        return []
    out = df.copy()
    for col in columns:
        if col not in out.columns:
            out[col] = None
    out = out[columns]
    out = out.where(pd.notna(out), None)
    records = out.to_dict("records")
    for row in records:
        # Excel often loads integer-looking cells as floats.
        for key in ("page", "worker", "external_link_count"):
            value = row.get(key)
            if isinstance(value, float) and value.is_integer():
                row[key] = int(value)
    return records


def load_existing_report(output: Path) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]], int]:
    """Load the current workbook so a later crawl can continue and merge into it."""
    if not output.exists():
        raise FileNotFoundError(
            f"Cannot resume because output workbook does not exist: {output}"
        )

    raw_cols = [
        "page", "worker", "date", "title", "source_domain",
        "source_url", "landbase_url", "external_link_count",
    ]
    log_cols = ["worker", "page", "items", "card_nodes", "attempts", "url", "error"]
    history_cols = [
        "run_time", "mode", "start_page", "end_page_requested", "workers",
        "pages_attempted_this_run", "new_raw_rows", "total_raw_rows", "total_unique_news",
    ]

    try:
        xls = pd.ExcelFile(output, engine="openpyxl")
    except Exception as exc:
        raise RuntimeError(f"Cannot open existing workbook {output}: {exc}") from exc

    if "Raw_All" not in xls.sheet_names:
        raise RuntimeError(
            f"Existing workbook {output} has no Raw_All sheet, so it cannot be resumed safely."
        )

    raw_df = pd.read_excel(xls, sheet_name="Raw_All")
    log_df = pd.read_excel(xls, sheet_name="Page_Log") if "Page_Log" in xls.sheet_names else pd.DataFrame()
    history_df = pd.read_excel(xls, sheet_name="Run_History") if "Run_History" in xls.sheet_names else pd.DataFrame()

    old_rows = _records_from_df(raw_df, raw_cols)
    old_log = _records_from_df(log_df, log_cols)
    old_history = _records_from_df(history_df, history_cols)

    page_values: list[int] = []
    if not log_df.empty and "page" in log_df.columns:
        page_values.extend(
            int(v) for v in pd.to_numeric(log_df["page"], errors="coerce").dropna().tolist()
        )
    if not raw_df.empty and "page" in raw_df.columns:
        page_values.extend(
            int(v) for v in pd.to_numeric(raw_df["page"], errors="coerce").dropna().tolist()
        )
    last_page = max(page_values) if page_values else 0
    return old_rows, old_log, old_history, last_page


def csv_summary_paths(output: Path) -> dict[str, Path]:
    stem = output.with_suffix("")
    return {
        "By_Source": stem.with_name(stem.name + "_by_source.csv"),
        "By_Date": stem.with_name(stem.name + "_by_date.csv"),
        "By_Source_Date": stem.with_name(stem.name + "_by_source_date.csv"),
    }


def write_csv_with_retry(
    df: pd.DataFrame,
    target: Path,
    retries: int,
    retry_delay_ms: int,
) -> tuple[bool, Path]:
    """Atomically replace one CSV, retrying Windows file-lock errors.

    The new CSV is first written to a temporary file. If Excel keeps the target
    CSV locked, we retry os.replace(). If it is still locked after all retries,
    the fresh data is preserved as a timestamped *_pending_*.csv instead of
    crashing the whole run.
    """
    target.parent.mkdir(parents=True, exist_ok=True)
    tmp = target.with_name(target.stem + ".tmp" + target.suffix)
    if tmp.exists():
        try:
            tmp.unlink()
        except OSError:
            tmp = target.with_name(
                target.stem + f".tmp_{os.getpid()}_{int(time.time())}" + target.suffix
            )

    df.to_csv(tmp, index=False, encoding="utf-8-sig")

    for attempt in range(retries + 1):
        try:
            os.replace(tmp, target)
            print(f"[OK] CSV updated  : {target}", flush=True)
            return True, target
        except PermissionError:
            if attempt < retries:
                print(
                    f"[WARNING] CSV locked: {target} | retry {attempt + 1}/{retries} "
                    f"after {retry_delay_ms} ms",
                    flush=True,
                )
                time.sleep(max(0, retry_delay_ms) / 1000)
                continue

            stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            pending = target.with_name(target.stem + f"_pending_{stamp}" + target.suffix)
            try:
                os.replace(tmp, pending)
            except PermissionError:
                # Extremely unlikely, but do not overwrite another pending file.
                pending = target.with_name(
                    target.stem + f"_pending_{stamp}_{os.getpid()}" + target.suffix
                )
                os.replace(tmp, pending)

            print(
                f"[WARNING] Could not replace locked CSV: {target}\n"
                f"          Latest data saved safely as: {pending}\n"
                f"          Close the CSV in Excel, then run --export-only to refresh it.",
                flush=True,
            )
            return False, pending


def export_summary_csvs(
    source_summary: pd.DataFrame,
    date_summary: pd.DataFrame,
    source_date_summary: pd.DataFrame,
    output: Path,
    retries: int,
    retry_delay_ms: int,
) -> dict[str, tuple[bool, Path]]:
    paths = csv_summary_paths(output)
    results = {
        "By_Source": write_csv_with_retry(source_summary, paths["By_Source"], retries, retry_delay_ms),
        "By_Date": write_csv_with_retry(date_summary, paths["By_Date"], retries, retry_delay_ms),
        "By_Source_Date": write_csv_with_retry(source_date_summary, paths["By_Source_Date"], retries, retry_delay_ms),
    }
    return results


def export_csvs_from_workbook(
    output: Path,
    retries: int,
    retry_delay_ms: int,
) -> dict[str, tuple[bool, Path]]:
    """Rebuild the 3 CSV files from an existing workbook without crawling."""
    if not output.exists():
        raise FileNotFoundError(f"Workbook does not exist: {output}")

    try:
        xls = pd.ExcelFile(output, engine="openpyxl")
    except Exception as exc:
        raise RuntimeError(f"Cannot open workbook {output}: {exc}") from exc

    required = ["By_Source", "By_Date", "By_Source_Date"]
    missing = [name for name in required if name not in xls.sheet_names]
    if missing:
        raise RuntimeError(
            f"Workbook {output} is missing required summary sheet(s): {', '.join(missing)}"
        )

    source_summary = pd.read_excel(xls, sheet_name="By_Source")
    date_summary = pd.read_excel(xls, sheet_name="By_Date")
    source_date_summary = pd.read_excel(xls, sheet_name="By_Source_Date")

    print(f"Export-only: rebuilding CSV summaries from {output}")
    results = export_summary_csvs(
        source_summary,
        date_summary,
        source_date_summary,
        output,
        retries,
        retry_delay_ms,
    )
    ok_count = sum(1 for ok, _ in results.values() if ok)
    print(f"CSV export result: {ok_count}/3 target files updated.")
    if ok_count < 3:
        print("Locked targets were not fatal; fresh data is preserved in *_pending_*.csv files.")
    return results


def make_report(
    rows: list[dict[str, Any]],
    page_log: list[dict[str, Any]],
    output: Path,
    run_history: list[dict[str, Any]] | None = None,
    csv_retries: int = 5,
    csv_retry_delay_ms: int = 1000,
) -> tuple[int, int]:
    raw_cols = [
        "page", "worker", "date", "date_iso", "title", "source_domain",
        "source_url", "landbase_url", "external_link_count",
    ]

    if rows:
        df = pd.DataFrame(rows)
    else:
        df = pd.DataFrame(columns=raw_cols)

    for col in ("page", "worker", "date", "title", "source_domain", "source_url", "landbase_url", "external_link_count"):
        if col not in df.columns:
            df[col] = pd.Series(dtype="object")

    # Remove exact crawl-row repeats caused by an overlapping resumed range.
    # This keeps Raw_All clean while still allowing the same article to appear on
    # different pages and be marked as a news duplicate later.
    crawl_key = (
        df["page"].fillna("").astype(str) + "|" +
        df["date"].fillna("").astype(str) + "|" +
        df["source_url"].fillna("").astype(str) + "|" +
        df["title"].fillna("").astype(str)
    )
    df["_crawl_key"] = crawl_key
    df = df.drop_duplicates("_crawl_key", keep="last").drop(columns=["_crawl_key"]).reset_index(drop=True)

    parsed = pd.to_datetime(df["date"], format="%d/%m/%Y", errors="coerce")
    df["date_iso"] = parsed.dt.strftime("%Y-%m-%d")

    # A stable key for duplicate detection. Missing-source items fall back to title/date.
    df["news_key"] = df.apply(
        lambda r: r.get("source_url") or f"{r.get('date','')}|{r.get('title','')}", axis=1
    )
    df["is_duplicate"] = df.duplicated("news_key", keep="first")

    unique_df = df.loc[~df["is_duplicate"]].copy()

    if not unique_df.empty:
        source_summary = (
            unique_df.groupby("source_domain", dropna=False)
            .agg(
                news_count=("news_key", "count"),
                first_date=("date_iso", "min"),
                last_date=("date_iso", "max"),
            )
            .reset_index()
            .sort_values(["news_count", "source_domain"], ascending=[False, True])
        )
        total = int(source_summary["news_count"].sum())
        source_summary["percent"] = (source_summary["news_count"] / total * 100).round(2) if total else 0

        date_summary = (
            unique_df.groupby(["date_iso", "date"], dropna=False)
            .agg(news_count=("news_key", "count"))
            .reset_index()
            .sort_values("date_iso", ascending=False)
        )

        source_date_summary = (
            unique_df.groupby(["date_iso", "date", "source_domain"], dropna=False)
            .agg(news_count=("news_key", "count"))
            .reset_index()
            .sort_values(["date_iso", "news_count", "source_domain"], ascending=[False, False, True])
        )
    else:
        source_summary = pd.DataFrame(columns=["source_domain", "news_count", "first_date", "last_date", "percent"])
        date_summary = pd.DataFrame(columns=["date_iso", "date", "news_count"])
        source_date_summary = pd.DataFrame(columns=["date_iso", "date", "source_domain", "news_count"])

    if page_log:
        log_df = pd.DataFrame(page_log)
        for col in ["worker", "page", "items", "card_nodes", "attempts", "url", "error"]:
            if col not in log_df.columns:
                log_df[col] = ""
        # One current status row per page. If a page was intentionally rerun,
        # the newest result replaces the older Page_Log row.
        log_df = log_df.drop_duplicates("page", keep="last").sort_values(["page", "worker"])
    else:
        log_df = pd.DataFrame(
            columns=["worker", "page", "items", "card_nodes", "attempts", "url", "error"]
        )

    meta = pd.DataFrame([
        {"metric": "raw_rows", "value": len(df)},
        {"metric": "unique_news", "value": len(unique_df)},
        {"metric": "duplicate_rows", "value": int(df["is_duplicate"].sum()) if len(df) else 0},
        {"metric": "pages_attempted", "value": int(log_df["page"].nunique()) if not log_df.empty else 0},
        {"metric": "first_page_attempted", "value": int(pd.to_numeric(log_df["page"], errors="coerce").min()) if not log_df.empty else ""},
        {"metric": "last_page_attempted", "value": int(pd.to_numeric(log_df["page"], errors="coerce").max()) if not log_df.empty else ""},
        {"metric": "pages_with_errors", "value": int((log_df["error"].fillna("") != "").sum()) if not log_df.empty else 0},
    ])

    history_df = pd.DataFrame(run_history or [], columns=[
        "run_time", "mode", "start_page", "end_page_requested", "workers",
        "pages_attempted_this_run", "new_raw_rows", "total_raw_rows", "total_unique_news",
    ])

    output.parent.mkdir(parents=True, exist_ok=True)
    tmp_output = output.with_name(output.stem + ".tmp" + output.suffix)
    if tmp_output.exists():
        tmp_output.unlink()

    with pd.ExcelWriter(tmp_output, engine="openpyxl") as writer:
        meta.to_excel(writer, sheet_name="Summary", index=False)
        source_summary.to_excel(writer, sheet_name="By_Source", index=False)
        date_summary.to_excel(writer, sheet_name="By_Date", index=False)
        source_date_summary.to_excel(writer, sheet_name="By_Source_Date", index=False)
        unique_df.to_excel(writer, sheet_name="Raw_Unique", index=False)
        df.to_excel(writer, sheet_name="Raw_All", index=False)
        log_df.to_excel(writer, sheet_name="Page_Log", index=False)
        history_df.to_excel(writer, sheet_name="Run_History", index=False)

        for ws in writer.book.worksheets:
            ws.freeze_panes = "A2"
            ws.auto_filter.ref = ws.dimensions
            for col in ws.columns:
                max_len = 0
                col_letter = col[0].column_letter
                for cell in col[:200]:
                    value = "" if cell.value is None else str(cell.value)
                    max_len = max(max_len, min(len(value), 80))
                ws.column_dimensions[col_letter].width = max(10, min(max_len + 2, 55))

    try:
        os.replace(tmp_output, output)
    except PermissionError as exc:
        pending = output.with_name(output.stem + "_pending" + output.suffix)
        if pending.exists():
            pending.unlink()
        os.replace(tmp_output, pending)
        raise PermissionError(
            f"Cannot update {output} because it is probably open in Excel. "
            f"The merged result was saved safely as {pending}. Close Excel and rerun with --resume."
        ) from exc

    print(f"[OK] Excel updated: {output}", flush=True)
    export_summary_csvs(
        source_summary,
        date_summary,
        source_date_summary,
        output,
        csv_retries,
        csv_retry_delay_ms,
    )
    return len(df), len(unique_df)

def parse_args() -> CrawlConfig:
    ap = argparse.ArgumentParser(
        description="Count LandBase News items by original source and by day using multi-worker pagination."
    )
    ap.add_argument(
        "--url",
        default="https://news.landbase.vn/news/search-news-result?typeSearchTag=0",
        help="Search-result URL. page=N is added/replaced automatically.",
    )
    ap.add_argument(
        "--start-page", type=int, default=None,
        help="First page. Default: 1 for a new run; existing last page + 1 with --resume.",
    )
    ap.add_argument(
        "--max-pages",
        type=int,
        default=0,
        help="Absolute last page number. Example: --max-pages 240. 0 = AUTO mode.",
    )
    ap.add_argument(
        "--workers",
        type=int,
        default=4,
        help="Number of parallel workers. From the resolved start page, worker i visits start+i, start+i+W...",
    )
    ap.add_argument(
        "--resume", action="store_true",
        help="Merge new pages into the existing --output workbook. If --start-page is omitted, continue at last_page+1.",
    )
    ap.add_argument(
        "--overwrite", action="store_true",
        help="Allow replacing an existing workbook with a fresh run. Cannot be combined with --resume.",
    )
    ap.add_argument(
        "--export-only", action="store_true",
        help="Do not crawl. Rebuild the 3 CSV summary files from the existing workbook.",
    )
    ap.add_argument(
        "--csv-retries", type=int, default=5,
        help="Retries when a CSV is locked by Excel (default: 5)",
    )
    ap.add_argument(
        "--csv-retry-delay-ms", type=int, default=1000,
        help="Delay between CSV lock retries in milliseconds (default: 1000)",
    )
    ap.add_argument("--delay-ms", type=int, default=250, help="Base delay between pages per worker")
    ap.add_argument("--jitter-ms", type=int, default=250, help="Random extra delay between pages")
    ap.add_argument(
        "--render-wait-ms",
        type=int,
        default=1200,
        help="Max short wait for client-side cards after DOMContentLoaded",
    )
    ap.add_argument("--timeout-ms", type=int, default=20000, help="Navigation timeout")
    ap.add_argument(
        "--empty-retries", type=int, default=2,
        help="Retries for a page that renders empty/error before moving on (default: 2)",
    )
    ap.add_argument(
        "--empty-streak", type=int, default=3,
        help="AUTO mode stops a worker only after this many consecutive empty stride pages (default: 3)",
    )
    ap.add_argument("--headed", action="store_true", help="Show browser windows for debugging")
    ap.add_argument("--output", default="landbase_news_report.xlsx", help="Output xlsx path")
    ns = ap.parse_args()

    if ns.start_page is not None and ns.start_page < 1:
        ap.error("--start-page must be >= 1")
    if ns.max_pages < 0:
        ap.error("--max-pages must be >= 0")
    if ns.workers < 1 or ns.workers > 16:
        ap.error("--workers must be between 1 and 16")
    if ns.delay_ms < 0 or ns.jitter_ms < 0 or ns.render_wait_ms < 0 or ns.timeout_ms < 1000:
        ap.error("delay/wait values must be non-negative and timeout >= 1000")
    if ns.empty_retries < 0 or ns.empty_retries > 10:
        ap.error("--empty-retries must be between 0 and 10")
    if ns.empty_streak < 1 or ns.empty_streak > 10:
        ap.error("--empty-streak must be between 1 and 10")
    if ns.resume and ns.overwrite:
        ap.error("--resume and --overwrite cannot be used together")
    if ns.export_only and ns.overwrite:
        ap.error("--export-only and --overwrite cannot be used together")
    if ns.csv_retries < 0 or ns.csv_retries > 60:
        ap.error("--csv-retries must be between 0 and 60")
    if ns.csv_retry_delay_ms < 0 or ns.csv_retry_delay_ms > 60000:
        ap.error("--csv-retry-delay-ms must be between 0 and 60000")

    output = Path(ns.output)
    if ns.export_only and not output.exists():
        ap.error(f"--export-only requires an existing workbook: {output}")
    if output.exists() and not ns.resume and not ns.overwrite and not ns.export_only:
        ap.error(
            f"Output already exists: {output}. Use --resume to continue it, --export-only to refresh CSVs, or --overwrite to start fresh."
        )

    return CrawlConfig(
        base_url=ns.url,
        start_page=ns.start_page or 1,
        max_pages=ns.max_pages,
        workers=ns.workers,
        delay_ms=ns.delay_ms,
        jitter_ms=ns.jitter_ms,
        render_wait_ms=ns.render_wait_ms,
        navigation_timeout_ms=ns.timeout_ms,
        empty_retries=ns.empty_retries,
        empty_streak_limit=ns.empty_streak,
        headless=not ns.headed,
        output=output,
        resume=ns.resume,
        overwrite=ns.overwrite,
        export_only=ns.export_only,
        csv_retries=ns.csv_retries,
        csv_retry_delay_ms=ns.csv_retry_delay_ms,
    )


async def async_main(cfg: CrawlConfig) -> int:
    if cfg.export_only:
        print("LandBase News source counter")
        print("Mode     : EXPORT ONLY (no crawling)")
        print(f"Workbook : {cfg.output}")
        print(f"CSV retry: {cfg.csv_retries} x {cfg.csv_retry_delay_ms} ms")
        export_csvs_from_workbook(
            cfg.output, cfg.csv_retries, cfg.csv_retry_delay_ms
        )
        return 0

    out_rows: list[dict[str, Any]] = []
    page_log: list[dict[str, Any]] = []
    existing_rows: list[dict[str, Any]] = []
    existing_log: list[dict[str, Any]] = []
    run_history: list[dict[str, Any]] = []
    last_existing_page = 0

    explicit_start = any(arg == "--start-page" or arg.startswith("--start-page=") for arg in sys.argv[1:])

    if cfg.resume:
        existing_rows, existing_log, run_history, last_existing_page = load_existing_report(cfg.output)
        effective_start = cfg.start_page if explicit_start else last_existing_page + 1
        cfg = replace(cfg, start_page=effective_start)

        if cfg.max_pages > 0 and cfg.start_page > cfg.max_pages:
            print("LandBase News source counter")
            print(f"Resume   : {cfg.output}")
            print(f"Existing : through page {last_existing_page}")
            print(f"Requested: through page {cfg.max_pages}")
            print("Nothing to crawl: the workbook already reaches or passes the requested max page.")
            print("Refreshing the 3 CSV summaries from the existing workbook instead...")
            export_csvs_from_workbook(
                cfg.output, cfg.csv_retries, cfg.csv_retry_delay_ms
            )
            return 0

    print("LandBase News source counter")
    print(f"URL      : {cfg.base_url}")
    print(f"Workers  : {cfg.workers}")
    print(f"Stride   : {cfg.workers} pages")
    print(f"Range    : {cfg.start_page} -> {'AUTO' if cfg.max_pages == 0 else cfg.max_pages}")
    print(f"Empty retry/streak: {cfg.empty_retries} / {cfg.empty_streak_limit}")
    print(f"CSV lock retry: {cfg.csv_retries} x {cfg.csv_retry_delay_ms} ms")
    print(f"Output   : {cfg.output}")
    if cfg.resume:
        print(f"Resume   : YES | existing last page = {last_existing_page}")
        print(f"Existing : {len(existing_rows)} raw rows")
    else:
        print("Resume   : NO")

    run_started = datetime.now().astimezone().isoformat(timespec="seconds")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=cfg.headless)
        try:
            tasks = [
                asyncio.create_task(worker_loop(i, browser, cfg, out_rows, page_log))
                for i in range(cfg.workers)
            ]
            await asyncio.gather(*tasks)
        finally:
            await browser.close()

    merged_rows = existing_rows + out_rows
    merged_log = existing_log + page_log

    # Determine totals before writing Run_History. make_report will apply the same
    # exact-row dedupe and news-key dedupe, so calculate those values equivalently.
    preview_df = pd.DataFrame(merged_rows)
    if preview_df.empty:
        total_raw_preview = 0
        total_unique_preview = 0
    else:
        for col in ("page", "date", "source_url", "title"):
            if col not in preview_df.columns:
                preview_df[col] = ""
        preview_df["_crawl_key"] = (
            preview_df["page"].fillna("").astype(str) + "|" +
            preview_df["date"].fillna("").astype(str) + "|" +
            preview_df["source_url"].fillna("").astype(str) + "|" +
            preview_df["title"].fillna("").astype(str)
        )
        preview_df = preview_df.drop_duplicates("_crawl_key", keep="last")
        total_raw_preview = len(preview_df)
        preview_df["news_key"] = preview_df.apply(
            lambda r: r.get("source_url") or f"{r.get('date','')}|{r.get('title','')}", axis=1
        )
        total_unique_preview = int(preview_df["news_key"].nunique(dropna=False))

    run_history.append({
        "run_time": run_started,
        "mode": "resume" if cfg.resume else "new",
        "start_page": cfg.start_page,
        "end_page_requested": "AUTO" if cfg.max_pages == 0 else cfg.max_pages,
        "workers": cfg.workers,
        "pages_attempted_this_run": len({int(x.get("page")) for x in page_log if x.get("page") is not None}),
        "new_raw_rows": len(out_rows),
        "total_raw_rows": total_raw_preview,
        "total_unique_news": total_unique_preview,
    })

    total_raw, total_unique = make_report(
        merged_rows,
        merged_log,
        cfg.output,
        run_history,
        csv_retries=cfg.csv_retries,
        csv_retry_delay_ms=cfg.csv_retry_delay_ms,
    )

    print("\nDone")
    print(f"New raw cards : {len(out_rows)}")
    print(f"Total raw     : {total_raw}")
    print(f"Total unique  : {total_unique}")
    if page_log:
        print(f"This run pages: {min(x['page'] for x in page_log)} -> {max(x['page'] for x in page_log)}")
    print(f"Workbook      : {cfg.output.resolve()}")
    return 0


def main() -> int:
    cfg = parse_args()
    try:
        return asyncio.run(async_main(cfg))
    except KeyboardInterrupt:
        print("\nStopped by user.", file=sys.stderr)
        return 130
    except Exception as exc:
        print(f"Fatal error: {type(exc).__name__}: {exc}", file=sys.stderr)
        print("If Chromium is missing, run: playwright install chromium", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
