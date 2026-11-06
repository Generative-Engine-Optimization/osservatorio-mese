#!/usr/bin/env python3
"""Writes js/data.js from the public pages of osservatorio.rankwit.ai (the published numbers, nothing else).

    python3 build/importa-dal-sito.py            # reuses the pages already in build/.cache
    python3 build/importa-dal-sito.py --refresh  # downloads them again

The landing does not compute presence or variations: it reads what the observatory publishes. From the pages it takes
- the category pages: regions in order, presence, variation on the month before, movement, most cited source;
- the region pages: the first 15 places, the same numbers, the place kind, how many questions, engine by engine;
- the report pages of every survey: shares by source type, «su 100 fonti», the top three regions per category.
A variation in colour on the site is beyond the oscillation between runs; without colour it is stable. The same here.
"""

from __future__ import annotations

import html
import json
import re
import sys
import time
import urllib.request
from datetime import date
from pathlib import Path

SITE = "https://osservatorio.rankwit.ai"
ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "build" / ".cache"
OUT = ROOT / "js" / "data.js"
UA = "Mozilla/5.0 (RankWit osservatorio-mese prototype)"
MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre",
          "novembre", "dicembre"]
CATEGORIES = [("mare", "Mare"), ("montagna", "Montagna"), ("laghi", "Laghi"), ("borghi", "Borghi"),
              ("citta", "Città"), ("neve", "Neve"), ("regione", "La regione in generale")]
ENGINES = ["ChatGPT", "Copilot", "Gemini", "Grok", "Perplexity"]


def fetch(path: str, refresh: bool) -> str:
    f = CACHE / (path.strip("/").replace("/", "__") or "index")
    f = f.with_suffix(".html")
    if refresh or not f.exists():
        req = urllib.request.Request(SITE + path, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=60) as r:
            f.write_bytes(r.read())
        time.sleep(0.2)
    return f.read_text(encoding="utf-8")


def words(fragment: str) -> list[str]:
    fragment = re.sub(r"<script.*?</script>|<style.*?</style>|<svg.*?</svg>", " ", fragment, flags=re.S)
    return html.unescape(re.sub(r"<[^>]+>", " ", fragment)).split()


def text(fragment: str) -> str:
    return " ".join(words(fragment))


def number(s: str) -> float | None:
    s = html.unescape(s).replace("−", "-").replace("±", "").replace("%", "").replace(",", ".").replace("+", "").strip()
    if s.startswith("<"):
        return 0.5  # «<1%» on the site
    if s in ("", "-", "–", "—"):
        return None
    return float(s)


def first_list(page: str, marker: str) -> list[str]:
    i = page.find(marker)
    if i < 0:
        return []
    j = page.find("<ol", i)
    return re.findall(r"<li[^>]*>(.*?)</li>", page[j:page.find("</ol>", j)], re.S)


def status_of(li: str) -> tuple[str, str, int | None]:
    """(status of the variation, movement in the ranking, positions moved), as the site draws them."""
    pm = re.search(r'class="pm ?([^"]*)"', li)
    mv = re.search(r'class="mv mv-([a-z]+)"[^>]*>(.*?)</span>', li, re.S)
    move = mv.group(1) if mv else "none"
    by = text(mv.group(2)) if mv else ""
    if move == "new":
        st = "new"
    elif move == "none":
        st = "none"  # out of the ranking, or the first survey
    elif not pm:
        st = "none"
    else:
        st = {"mv-up": "up", "mv-down": "down"}.get(pm.group(1).strip(), "stable")
    return st, move, int(by) if by.isdigit() else None


def ranking_row(li: str) -> dict:
    rank = re.search(r'class="rank"[^>]*>(\d+)<', li)
    who = re.search(r'class="who"[^>]*>(.*?)(?:<span class="kind"|<small|</span>)', li, re.S)
    link = re.search(r'<a href="([^"]+)"', who.group(1)) if who else None
    kind = re.search(r'class="kind"[^>]*>([^<]*)<', li)
    small = re.search(r"<small[^>]*>(.*?)</small>", li, re.S)
    p = re.search(r'class="nums"[^>]*><b>([^<]*)</b>', li)
    d = re.search(r'class="pm[^"]*"[^>]*>([^<]*)<', li)
    st, move, by = status_of(li)
    return {
        "rank": int(rank.group(1)) if rank else None,
        "name": text(who.group(1)) if who else None,
        "href": link.group(1) if link else None,
        "kind": html.unescape(kind.group(1)).strip() if kind else None,
        "small": text(small.group(1)) if small else None,
        "p": number(p.group(1)) if p else None,
        "d": number(d.group(1)) if d else None,
        "status": st, "move": move, "by": by,
    }


def slugify(name: str) -> str:
    import unicodedata
    s = unicodedata.normalize("NFD", name).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def questions_of(page: str) -> int | None:
    m = re.search(r"([\d.]+) domand[ae] · le loro keyword valgono", text(page))
    return int(m.group(1).replace(".", "")) if m else None


def engine_table(page: str) -> dict[str, list[float]]:
    # The places table only: pages with few answers have a «Motore per motore» on sources alone.
    i = page.find("Le prime dieci località: in quante risposte ogni motore")
    j = page.find('<table class="plain matrix">', i)
    if i < 0 or j < 0:
        return {}
    t = page[j:]
    t = t[:t.find("</table>")]
    head = [text(h) for h in re.findall(r"<th[^>]*>(.*?)</th>", t, re.S)]
    if head[2:] != ENGINES:
        raise SystemExit(f"engine columns changed on the site: {head}")
    out = {}
    for tr in re.findall(r"<tr>(.*?)</tr>", t[t.find("<tbody>"):], re.S):
        cells = re.findall(r"<td[^>]*>(.*?)</td>", tr, re.S)
        name = text(cells[0])
        vals = [number(re.search(r'class="v">([^<]*)<', c).group(1)) for c in cells[2:]]
        out[name] = vals
    return out


def dmo_names(page: str) -> set[str]:
    names = set()
    for t in re.findall(r'<table class="plain matrix">(.*?)</table>', page, re.S):
        head = [text(h) for h in re.findall(r"<th[^>]*>(.*?)</th>", t, re.S)]
        if head and head[0] == "Siti di promozione turistica":
            for tr in re.findall(r"<tr>(.*?)</tr>", t[t.find("<tbody>"):], re.S):
                first = re.search(r"<td[^>]*>(.*?)</td>", tr, re.S)
                b = re.search(r"<b>(.*?)</b>", first.group(1), re.S) if first else None
                if b:
                    names.add(text(b.group(1)))
    return names


def report(page: str, wid: str) -> dict:
    w = words(page)
    t = " ".join(w)
    y, m = map(int, wid.split("-"))
    out = {"id": wid, "month": MONTHS[m - 1]}
    pub = re.search(r"Rilevazione del (\d+ \w+ \d{4})", t)
    out["published"] = pub.group(1)
    stats = re.search(r"([\d.]+) domande · (\d+) motori · ([\d.]+) località", t)
    out["domande"], out["motori"], out["localita"] = (int(x.replace(".", "")) for x in stats.groups())
    shares = {}
    for key, label in [("dmo", "almeno un sito di promozione turistica"), ("hotel", "il sito di un hotel"),
                       ("ota", "un'OTA"), ("altro", "guide, media, blog")]:
        m2 = re.search(r"(\S+) delle risposte cita " + re.escape(label) + r" (\S+)", t)
        shares[key] = [number(m2.group(1)), number(m2.group(2))]
    out["shares"] = shares
    seg = t[t.find("Su 100 fonti citate"):t.find("Altre fonti,")]
    per = {}
    for key, label in [("dmo", "Siti di promozione turistica"), ("hotel", "Hotel"), ("ota", "OTA"),
                       ("altro", "Altre fonti")]:
        m2 = re.search(re.escape(label) + r" (\S+)", seg)
        per[key] = number(m2.group(1))
    out["perFonti"] = per
    # «Altre fonti» voce per voce: label, share, the most cited sites.
    block = page[page.find("Altre fonti,"):]
    block = block[:block.find("delle fonti citate qui")]
    others = []
    for li in re.findall(r"<li[^>]*>(.*?)</li>", block, re.S):
        parts = [text(x) for x in re.findall(r">([^<>]+)<", li) if text(x)]
        if len(parts) >= 2 and parts[1].endswith("%"):
            others.append([parts[0], number(parts[1]), parts[2] if len(parts) > 2 else ""])
    out["altre"] = others
    # Categoria per categoria: the first three regions with presence and most cited source.
    top = {}
    labels = {label: cid for cid, label in CATEGORIES}
    table = page[page.find("Categoria per categoria"):]
    table = table[:table.find("</table>")]
    for tr in re.findall(r"<tr>(.*?)</tr>", table, re.S):
        cells = re.findall(r"<td[^>]*>(.*?)</td>", tr, re.S)
        if not cells or text(cells[0]) not in labels:
            continue
        rows = []
        for c in cells[1:]:
            m2 = re.match(r"(.*?)<span class=\"num[^\"]*\">([^<]*)</span><span class=\"sub\">(.*?)</span>", c, re.S)
            if m2:
                rows.append([text(m2.group(1)), number(m2.group(2)), text(m2.group(3))])
        top[labels[text(cells[0])]] = rows
    out["top"] = top
    return out


def main() -> None:
    refresh = "--refresh" in sys.argv
    CACHE.mkdir(parents=True, exist_ok=True)
    sitemap = fetch("/sitemap.xml", refresh)
    urls = [u.replace(SITE, "") for u in re.findall(r"<loc>([^<]+)</loc>", sitemap)]
    cat_pages = [u for u in urls if re.fullmatch(r"/it/categorie/[^/]+", u)]
    reg_pages = [u for u in urls if re.fullmatch(r"/it/categorie/[^/]+/[^/]+", u)]
    rep_pages = sorted(u for u in urls if re.fullmatch(r"/it/report/\d{4}-\d{2}", u))

    regions, region_names, questions, dmos = [], {}, {}, set()
    for cid, _ in CATEGORIES:
        page = fetch(f"/it/categorie/{cid}", refresh)
        questions[cid] = questions_of(page)
        dmos |= dmo_names(page)
        for r in map(ranking_row, first_list(page, "Le regioni in ordine")):
            slug = r["href"].rstrip("/").split("/")[-1] if r["href"] else slugify(r["name"])
            region_names[slug] = r["name"]
            src = re.match(r"Fonte più citata: (.+) · (\S+)$", r["small"] or "")
            regions.append([cid, slug, r["rank"], r["p"], r["d"], r["status"], r["move"], r["by"],
                            src.group(1) if src else None, number(src.group(2)) if src else None])
    missing = set(f"/it/categorie/{c}" for c, _ in CATEGORIES) - set(cat_pages)
    if missing:
        raise SystemExit(f"category pages not in the sitemap: {missing}")

    places, engines = [], {}
    for u in reg_pages:
        cid, slug = u.split("/")[-2:]
        page = fetch(u, refresh)
        questions[f"{cid}/{slug}"] = questions_of(page)
        dmos |= dmo_names(page)
        eng = engine_table(page)
        for r in map(ranking_row, first_list(page, "01</")):
            places.append([cid, slug, r["name"], r["kind"], r["rank"], r["p"], r["d"], r["status"], r["move"], r["by"]])
            if r["name"] in eng:
                engines[f"{cid}/{slug}/{r['name']}"] = eng[r["name"]]

    reports = [report(fetch(u, refresh), u.split("/")[-1]) for u in rep_pages]
    if not reports:
        raise SystemExit("no report pages in the sitemap")
    now = reports[-1]
    if now["published"] not in fetch("/it/categorie/mare", False):
        raise SystemExit("the category pages are not on the latest survey")

    photos = json.loads((ROOT / "build" / "foto.json").read_text(encoding="utf-8"))
    out = {
        "source": {"site": SITE, "fetched": date.today().isoformat()},
        "categories": [{"id": c, "label": label} for c, label in CATEGORIES],
        "engines": ENGINES,
        "reports": reports,
        "regionNames": region_names,
        "questions": questions,
        "dmos": sorted(dmos),
        "regions": regions,
        "places": places,
        "placeEngines": engines,
        "photos": photos,
    }
    OUT.write_text(
        "// Generated by build/importa-dal-sito.py from the public pages of osservatorio.rankwit.ai. Do not edit.\n"
        f"window.OSS_DATA = {json.dumps(out, ensure_ascii=False, separators=(',', ':'))};\n",
        encoding="utf-8",
    )
    print(f"{now['published']}: {len(regions)} region rows, {len(places)} place rows, {len(engines)} with engines, "
          f"{len(reports)} reports, {len(dmos)} promotion sites")


if __name__ == "__main__":
    main()
