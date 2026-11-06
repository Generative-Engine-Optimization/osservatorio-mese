#!/usr/bin/env python3
"""Writes js/data.js and data/ from the public pages of osservatorio.rankwit.ai (the published numbers, nothing else).

    python3 build/importa-dal-sito.py            # reuses the pages already in build/.cache
    python3 build/importa-dal-sito.py --refresh  # downloads them again

The landing does not compute presence or variations: it reads what the observatory publishes. From the pages it takes
- the category pages: regions in order, presence, variation on the month before, movement, most cited source;
- the region pages: the first 15 places, the same numbers, the place kind, how many questions, engine by engine;
- the report pages of every survey: shares by source type, «su 100 fonti», the top three regions per category.
A variation in colour on the site is beyond the oscillation between runs; without colour it is stable. The same here.

js/data.js feeds the landing and the month page. The deeper pages read one JSON file each, written in data/:
- data/categorie/<cat>.json: regions, «su 100 fonti», promotion sites engine by engine, the questions;
- data/categorie/<cat>/<regione>.json: places, engine by engine, who tells the territory, sources, direct vs OTA, questions;
- data/categorie/<cat>/<regione>/<località>.json: hotels, engine by engine, direct vs OTA, the five most cited sources;
- data/esplora.json: every category, region and place that has a page.
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
PAGES = ROOT / "data"
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


# ---------- The deeper pages: one parser per component the site draws ----------

KEYS = {"fill-dmo": "dmo", "fill-hotel": "hotel", "fill-ota": "ota", "fill-altro": "altro"}


def sections_of(page: str) -> dict[str, str]:
    """The page's sections by their anchor (le-regioni, le-localita, gli-hotel, chi-racconta-il-territorio, ...)."""
    body = page[page.find("<main"):page.find("</main>")]
    out = {}
    for part in re.split(r'(?=<section class="section)', body):
        m = re.search(r'class="sec-head" id="([^"]+)"', part)
        if m:
            out[m.group(1)] = part
    return out


def crumbs_of(page: str) -> list[list[str | None]]:
    c = re.search(r'<p class="crumbs">(.*?)</p>', page, re.S)
    if not c:
        return []
    out = []
    for m in re.finditer(r'<a href="([^"]+)">(.*?)</a>|<span>(.*?)</span>', c.group(1), re.S):
        out.append([text(m.group(2) or m.group(3)), m.group(1)])
    return out


def h1_of(page: str) -> str:
    m = re.search(r"<h1[^>]*>(.*?)</h1>", page, re.S)
    return text(m.group(1)) if m else ""


def delta_of(fragment: str) -> list:
    """[variation, status, movement, positions moved] as the site draws them; status «none» without a variation."""
    d = re.search(r'class="pm[^"]*"[^>]*>([^<]*)<', fragment)
    st, move, by = status_of(fragment)
    return [number(d.group(1)) if d else None, st, move, by]


def bars_of(fragment: str) -> list[dict]:
    """Every row of the first ranking list (<ol class="bars ...">) in the fragment."""
    m = re.search(r'<ol class="bars[^"]*">(.*?)</ol>', fragment, re.S)
    if not m:
        return []
    rows = []
    for li in re.findall(r"<li[^>]*>(.*?)</li>", m.group(1), re.S):
        r = ranking_row(li)
        r["slug"] = r["href"].rstrip("/").split("/")[-1] if r["href"] else None
        r["noHotels"] = "Hotel non misurati" in li
        rows.append(r)
    return rows


def matrices_of(fragment: str) -> dict[str, list]:
    """Tables «X, motore per motore», by the label of their first column: name, tag, presence, variation, engines."""
    out = {}
    for t in re.findall(r'<table class="plain matrix">(.*?)</table>', fragment, re.S):
        head = [text(h) for h in re.findall(r"<th[^>]*>(.*?)</th>", t, re.S)]
        if head[2:] != ENGINES:
            raise SystemExit(f"engine columns changed on the site: {head}")
        rows = []
        for tr in re.findall(r"<tr>(.*?)</tr>", t[t.find("<tbody>"):], re.S):
            cells = re.findall(r"<td[^>]*>(.*?)</td>", tr, re.S)
            b = re.search(r"<b>(.*?)</b>", cells[0], re.S)
            tag = re.search(r'class="tag[^"]*">([^<]*)<', cells[0])
            p = re.search(r"<b>([^<]*)</b>", cells[1])
            vals = [number(re.search(r'class="v">([^<]*)<', c).group(1)) for c in cells[2:]]
            rows.append([text(b.group(1) if b else cells[0]), html.unescape(tag.group(1)).strip() if tag else None,
                         number(p.group(1)) if p else None, *delta_of(cells[1]), vals])
        out[head[0]] = rows
    return out


def mix_of(fragment: str) -> dict | None:
    """«Su 100 fonti citate»: share by source type, then «altre fonti» item by item with the most cited sites."""
    m = re.search(r'<div class="mix">(.*?)<aside class="callout"', fragment, re.S)
    if not m:
        return None
    block = m.group(1)
    legend = block[:block.find('<div class="clusters">')] if '<div class="clusters">' in block else block
    shares = {}
    for sw, val in re.findall(r'<li><span class="swatch ([a-z-]+)"></span>[^<]*<b>([^<]*)</b></li>', legend):
        shares[KEYS[sw]] = number(val)
    others = []
    for li in re.findall(r'<li><span class="name">(.*?)</li>', block, re.S):
        name = re.match(r"(.*?)</span>", li, re.S).group(1)
        val = re.search(r"<b>([^<]*)</b>", li).group(1)
        sites = re.search(r"<small>(.*?)</small>", li, re.S)
        others.append([text(name), number(val), text(sites.group(1)) if sites else ""])
    return {"shares": shares, "others": others}


def stats_of(fragment: str) -> dict:
    """Share of answers that cite at least one site of each type, with the variation."""
    out = {}
    for sw, value, label in re.findall(
            r'<div class="stat[^"]*"><div class="key"><span class="swatch ([a-z-]+)"></span>.*?</div>'
            r'<div class="value">([^<]*)</div><div class="label">(.*?)</div></div>', fragment, re.S):
        d = re.search(r'class="pm ?([^"]*)"[^>]*>([^<]*)<', label)
        status = {"mv-up": "up", "mv-down": "down"}.get(d.group(1).strip(), "stable") if d else "none"
        out[KEYS[sw]] = [number(value), number(d.group(2)) if d else None, status,
                         text(re.sub(r'<span class="pm.*?</span>', "", label))]
    return out


def direct_of(fragment: str) -> dict | None:
    """«Sito diretto contro OTA»: out of 100 citations between hotel sites and OTAs."""
    m = re.search(r'<div class="mix direct">(.*?)</ul>', fragment, re.S)
    if not m:
        return None
    return {KEYS[sw]: number(v) for sw, v in
            re.findall(r'<li><span class="swatch ([a-z-]+)"></span>[^<]*<b>([^<]*)</b></li>', m.group(1))}


def engine_pairs_of(fragment: str) -> list:
    """Engine by engine: share of answers citing a promotion site, and a hotel site."""
    m = re.search(r'<div class="engines">(.*?)</div>', fragment, re.S)
    if not m:
        return []
    out = []
    for name, pair in re.findall(r'<span class="eng">(.*?)</span><span class="pair">(.*?</span></span>)</span>',
                                 m.group(1), re.S):
        vals = re.findall(r"<span>([^<]*)</span>", pair)
        out.append([text(name), *(number(v) for v in vals[:2])])
    return out


def questions_block(fragment: str) -> dict | None:
    """The questions asked every month, with the Google search behind each one and the top three answers."""
    note = re.search(r"([\d.]+) domand[ae] · le loro keyword valgono ([\d.]+) ricerche", text(fragment))
    if not note:
        return None
    items = []
    for lang, art in re.findall(r'<article class="q" data-q data-lang="([a-z]*)">(.*?)</article>', fragment, re.S):
        tags = [text(t) for t in re.findall(r'<span class="tag">(.*?)</span>', art, re.S)]
        q = re.search(r'<p class="text"[^>]*>(.*?)</p>', art, re.S)
        kw = re.search(r'<p class="kw">Ricerca: <b>(.*?)</b> · <b>([\d.]+)</b>', art, re.S)
        top = [[text(n), number(v)] for n, v in
               re.findall(r'<li><span class="i">\d+</span><span>(.*?)</span><span class="v">([^<]*)</span></li>', art, re.S)]
        cites = dict((k, number(v)) for k, v in re.findall(r"</span>(Siti di promozione turistica|Hotel) <b>([^<]*)</b>", art))
        items.append({
            "lang": lang, "tags": tags, "q": text(q.group(1)) if q else "",
            "kw": text(kw.group(1)) if kw else None, "vol": int(kw.group(2).replace(".", "")) if kw else None,
            "top": top, "dmo": cites.get("Siti di promozione turistica"), "hotel": cites.get("Hotel"),
        })
    return {"n": int(note.group(1).replace(".", "")), "vol": int(note.group(2).replace(".", "")), "items": items}


def row_out(r: dict, kind: bool = True) -> list:
    """A ranking row for the JSON files: [rank, name, kind, presence, variation, status, movement, positions, slug]."""
    return [r["rank"], r["name"], r["kind"] if kind else None, r["p"], r["d"], r["status"], r["move"], r["by"], r["slug"]]


def grab(pattern: str, s: str) -> str:
    m = re.search(pattern, s, re.S)
    return m.group(1) if m else ""


def category_json(cid: str, label: str, page: str, region_pages: set[str]) -> dict:
    s = sections_of(page)
    first = s.get("le-regioni", "")
    outside = re.search(r"Fuori classifica: (.*?)\. Nella base", text(first))
    who = s.get("chi-racconta-il-territorio", "")
    regions = []
    for r in bars_of(first):
        src = re.match(r"Fonte più citata: (.+) · (\S+)$", r["small"] or "")
        regions.append([r["rank"], r["name"], r["slug"], r["p"], r["d"], r["status"], r["move"], r["by"],
                        src.group(1) if src else None, number(src.group(2)) if src else None,
                        f"{cid}/{r['slug']}" in region_pages])
    return {
        "cat": cid, "label": label, "title": h1_of(page),
        "regions": regions,
        "outside": [x.strip() for x in outside.group(1).split(",")] if outside else [],
        "mix": mix_of(who),
        "dmoEngines": matrices_of(who).get("Siti di promozione turistica", []),
        "questions": questions_block(s.get("le-domande", "")),
    }


def region_json(cid: str, label: str, slug: str, page: str, place_slugs: set[str]) -> dict:
    """place_slugs: the places of this category and region that have a page in the sitemap."""
    s = sections_of(page)
    first = s.get("le-localita", "")
    who = s.get("chi-racconta-il-territorio", "")
    src = s.get("le-fonti", "")
    shortcuts = [[text(n), h.rstrip("/").split("/")[-1]] for h, n in
                 re.findall(r'<a href="([^"]+)">(.*?)</a>', grab(r'<p class="shortcuts">(.*?)</p>', first), re.S)]
    by_name = {n: sl for n, sl in shortcuts}
    places = bars_of(first)
    for r in places:
        # A place can have its hotel page even when its row in the list has no link: the shortcuts list it.
        r["slug"] = r["slug"] or by_name.get(r["name"])
        if r["slug"] not in place_slugs:
            r["slug"] = None
    ota_block = src[src.find("Per confronto: le OTA"):] if "Per confronto: le OTA" in src else ""
    crumbs = crumbs_of(page)
    return {
        "cat": cid, "label": label, "slug": slug, "region": crumbs[-1][0] if crumbs else slug,
        "places": [row_out(r) for r in places],
        "hotelPlaces": shortcuts,
        "placeEngines": matrices_of(first).get("Località", []),
        "mix": mix_of(who),
        "dmoEngines": matrices_of(who).get("Siti di promozione turistica", []),
        "stats": stats_of(src),
        "direct": direct_of(src),
        "enginePairs": engine_pairs_of(src),
        "otas": [row_out(r, kind=False) for r in bars_of(ota_block)],
        "questions": questions_block(s.get("le-domande", "")),
    }


def place_json(cid: str, label: str, region_slug: str, slug: str, page: str, region: dict) -> dict:
    s = sections_of(page)
    first = s.get("gli-hotel", "")
    who = s.get("chi-racconta-il-territorio", "")
    note = text(grab(r'<p class="no-hotels">(.*?)</p>', first))
    hq = re.search(r"(\d+) domand[ae] sugli hotel di .*?([\d.]+) ricerche l'anno", note)
    name = h1_of(page)
    row = next((p for p in region["places"] if p[8] == slug), None)
    top5 = who[who.find("fonti più citate"):] if "fonti più citate" in who else ""
    return {
        "cat": cid, "label": label, "region": region["region"], "regionSlug": region_slug, "slug": slug, "name": name,
        "inRegion": row, "regionQuestions": region["questions"]["n"] if region.get("questions") else None,
        "hotels": [row_out(r, kind=False) for r in bars_of(first)],
        "hotelQuestions": int(hq.group(1)) if hq else None, "hotelVolume": int(hq.group(2).replace(".", "")) if hq else None,
        "hotelNote": None if hq else note or None,
        "hotelEngines": matrices_of(first).get("Hotel", []),
        "direct": direct_of(who),
        "sources": [[r["rank"], r["name"], r["kind"], r["p"]] for r in bars_of(top5)],
        "questions": questions_block(s.get("le-domande", "")),
    }


def write_json(path: Path, obj: dict) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    data = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
    path.write_text(data + "\n", encoding="utf-8")
    return len(data)


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
    loc_pages = [u for u in urls if re.fullmatch(r"/it/categorie/[^/]+/[^/]+/[^/]+", u)]
    rep_pages = sorted(u for u in urls if re.fullmatch(r"/it/report/\d{4}-\d{2}", u))
    labels = dict(CATEGORIES)
    region_pages = {u.split("/", 3)[3] for u in reg_pages}
    place_slugs: dict[str, set[str]] = {}
    for u in loc_pages:
        cid, reg, sl = u.split("/")[-3:]
        place_slugs.setdefault(f"{cid}/{reg}", set()).add(sl)

    regions, region_names, questions, dmos = [], {}, {}, set()
    written = 0
    for cid, label in CATEGORIES:
        page = fetch(f"/it/categorie/{cid}", refresh)
        questions[cid] = questions_of(page)
        dmos |= dmo_names(page)
        for r in map(ranking_row, first_list(page, "Le regioni in ordine")):
            slug = r["href"].rstrip("/").split("/")[-1] if r["href"] else slugify(r["name"])
            region_names[slug] = r["name"]
            src = re.match(r"Fonte più citata: (.+) · (\S+)$", r["small"] or "")
            regions.append([cid, slug, r["rank"], r["p"], r["d"], r["status"], r["move"], r["by"],
                            src.group(1) if src else None, number(src.group(2)) if src else None,
                            1 if f"{cid}/{slug}" in region_pages else 0])
        written += write_json(PAGES / "categorie" / f"{cid}.json", category_json(cid, label, page, region_pages))
    missing = set(f"/it/categorie/{c}" for c, _ in CATEGORIES) - set(cat_pages)
    if missing:
        raise SystemExit(f"category pages not in the sitemap: {missing}")

    places, engines, region_data = [], {}, {}
    for u in reg_pages:
        cid, slug = u.split("/")[-2:]
        page = fetch(u, refresh)
        questions[f"{cid}/{slug}"] = questions_of(page)
        dmos |= dmo_names(page)
        eng = engine_table(page)
        rj = region_json(cid, labels[cid], slug, page, place_slugs.get(f"{cid}/{slug}", set()))
        region_data[f"{cid}/{slug}"] = rj
        written += write_json(PAGES / "categorie" / cid / f"{slug}.json", rj)
        for rank, name, kind, p, d, st, move, by, pslug in rj["places"]:
            # The slug of the place's own page, only when it has one (the hotels are measured there).
            places.append([cid, slug, name, kind, rank, p, d, st, move, by] + ([pslug] if pslug else []))
            if name in eng:
                engines[f"{cid}/{slug}/{name}"] = eng[name]

    atlas: dict[str, dict[str, list]] = {}
    for u in loc_pages:
        cid, reg, sl = u.split("/")[-3:]
        page = fetch(u, refresh)
        pj = place_json(cid, labels[cid], reg, sl, page, region_data[f"{cid}/{reg}"])
        written += write_json(PAGES / "categorie" / cid / reg / f"{sl}.json", pj)
        atlas.setdefault(reg, {}).setdefault(cid, []).append([pj["name"], sl])

    reports = [report(fetch(u, refresh), u.split("/")[-1]) for u in rep_pages]
    if not reports:
        raise SystemExit("no report pages in the sitemap")
    now = reports[-1]
    if now["published"] not in fetch("/it/categorie/mare", False):
        raise SystemExit("the category pages are not on the latest survey")

    # Explore: every category, region and place that has a page, in the site's order (regions by name).
    names = {**region_names, **{rj["slug"]: rj["region"] for rj in region_data.values()}}
    explore = {
        "categories": [{"id": c, "label": label,
                        "regions": sorted(r.split("/")[1] for r in region_pages if r.startswith(c + "/")),
                        "places": sum(len(v.get(c, [])) for v in atlas.values())} for c, label in CATEGORIES],
        "regions": [{"slug": reg, "name": names.get(reg, reg),
                     "cats": [c for c, _ in CATEGORIES if f"{c}/{reg}" in region_pages],
                     "places": {c: sorted(v, key=lambda x: x[0].lower()) for c, v in atlas.get(reg, {}).items()}}
                    for reg in sorted({r.split("/")[1] for r in region_pages}, key=lambda x: names.get(x, x))],
    }
    written += write_json(PAGES / "esplora.json", explore)

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
          f"{len(reports)} reports, {len(dmos)} promotion sites; {len(cat_pages)} + {len(reg_pages)} + {len(loc_pages)} "
          f"page files in data/ ({written // 1024} KB)")


if __name__ == "__main__":
    main()
