// Shared model and UI pieces for the landing and the month page. Every number shown is computed here from js/data.js.
(() => {
  const D = window.OSS_DATA;
  const MINUS = "−";
  const NEXT_MONTH = { ottobre: "novembre" };

  const r1 = (x) => Math.round(x * 10) / 10;
  const fmt = (n, d = 1) => n.toLocaleString("it-IT", { minimumFractionDigits: d, maximumFractionDigits: d });
  const pct = (n) => `${fmt(n)}%`;
  const signed = (n) => (n > 0 ? "+" : n < 0 ? MINUS : "±") + fmt(Math.abs(n));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const at = (m) => (m.startsWith("a") ? "ad " : "a ") + m;
  const At = (m) => cap(at(m));

  const cats = Object.fromEntries(D.categories.map((c) => [c.id, c]));
  const PREP = { Lazio: "nel Lazio", Marche: "nelle Marche" };
  const prep = (region) => PREP[region] ?? `in ${region}`;
  const QUESTION = {
    mare: (r) => `dove andare al mare ${prep(r)}`,
    montagna: (r) => `dove andare in montagna ${prep(r)}`,
    laghi: (r) => `dove andare al lago ${prep(r)}`,
    borghi: (r) => `quali borghi visitare ${prep(r)}`,
    citta: (r) => `quali città visitare ${prep(r)}`,
    neve: (r) => `dove sciare ${prep(r)}`,
  };
  const AMONG = {
    mare: (r) => `fra le località di mare ${prep(r)}`,
    montagna: (r) => `fra le località di montagna ${prep(r)}`,
    laghi: (r) => `fra le località di lago ${prep(r)}`,
    borghi: (r) => `fra i borghi ${prep(r)}`,
    citta: (r) => `fra le città ${prep(r)}`,
    neve: (r) => `fra le località sciistiche ${prep(r)}`,
  };
  const OF_CAT = { italia: "della regione", mare: "del mare", montagna: "della montagna", laghi: "dei laghi", borghi: "dei borghi", citta: "delle città", neve: "della neve" };
  const SOURCE_KIND = { dmo: "un sito di promozione turistica", ota: "un'OTA", altro: "una fonte di altro tipo" };
  const context = (cat, region) => `${cats[cat].label} · ${region}`;

  const places = D.places.map(([name, cat, region, series, osc, answers]) => ({
    id: `${cat}-${slug(region)}-${slug(name)}`, name, cat, region, series, osc, answers, group: `${cat}/${region}`,
  }));
  const groups = new Map();
  for (const p of places) {
    if (!groups.has(p.group)) groups.set(p.group, []);
    groups.get(p.group).push(p);
  }
  const ranked = (list, w) => list.filter((p) => p.series[w] != null).sort((a, b) => b.series[w] - a.series[w]);
  const rankOf = (p, w) => {
    if (w < 0 || p.series[w] == null) return null;
    return ranked(groups.get(p.group), w).indexOf(p) + 1;
  };

  function statusOf(now, prev, osc, w) {
    if (now == null && prev == null) return null;
    if (now == null) return "out";
    if (prev == null) return w === 0 ? "first" : "new";
    return Math.abs(r1(now - prev)) <= osc ? "stable" : now > prev ? "up" : "down";
  }

  function placeAt(p, w) {
    const now = p.series[w];
    const prev = w > 0 ? p.series[w - 1] : null;
    return {
      ...p, w, now, prev,
      delta: now != null && prev != null ? r1(now - prev) : null,
      status: statusOf(now, prev, p.osc, w),
      rank: rankOf(p, w),
      prevRank: rankOf(p, w - 1),
    };
  }

  const regionRows = D.regions.map(([cat, region, series, osc, sources]) => ({
    cat, region, series, osc,
    sources: sources.map(([key, s]) => ({ key, ...D.sources[key], series: s })),
  }));
  const topSource = (row, w) => [...row.sources].sort((a, b) => b.series[w] - a.series[w])[0];

  function regionTable(cat, w) {
    const rows = regionRows.filter((r) => r.cat === cat);
    const order = (i) => [...rows].sort((a, b) => b.series[i] - a.series[i]);
    const now = order(w);
    const before = w > 0 ? order(w - 1) : null;
    return now.map((r, i) => ({
      ...r, w,
      now: r.series[w],
      prev: w > 0 ? r.series[w - 1] : null,
      delta: w > 0 ? r1(r.series[w] - r.series[w - 1]) : null,
      status: w > 0 ? statusOf(r.series[w], r.series[w - 1], r.osc, w) : "first",
      rank: i + 1,
      prevRank: before ? before.indexOf(r) + 1 : null,
      source: topSource(r, w),
    }));
  }

  function storyTexts(type, s, wave) {
    const W = D.waves;
    const month = W[wave].month;
    const prevMonth = W[wave - 1].month;
    const p = s.place;
    if (type === "salita" || type === "discesa") {
      const up = type === "salita";
      const lines = [`${At(month)} ${p.name} compare nel ${pct(p.now)} delle risposte quando si chiede all'AI ${QUESTION[p.cat](p.region)}. ${At(prevMonth)} era al ${pct(p.prev)}.`];
      if (p.rank === 1 && !up) {
        const second = ranked(groups.get(p.group), wave)[1];
        lines.push(`Resta al primo posto ${AMONG[p.cat](p.region)}: la seconda, ${second.name}, è al ${pct(second.series[wave])}.`);
      } else if (p.prevRank !== p.rank) {
        const passed = ranked(groups.get(p.group), wave - 1)[p.rank - 1];
        lines.push(`Passa dal ${p.prevRank}° al ${p.rank}° posto ${AMONG[p.cat](p.region)}${up && passed ? `, davanti a ${passed.name}` : ""}.`);
      } else {
        lines.push(`Resta al ${p.rank}° posto ${AMONG[p.cat](p.region)}.`);
      }
      lines.push(`${up ? "Guadagna" : "Perde"} ${fmt(Math.abs(p.delta))} punti: più dell'oscillazione che misuriamo fra le risposte dello stesso mese, che qui è di ${fmt(p.osc)} punti. Per questo lo contiamo come un movimento.`);
      return { title: `${p.name} ${up ? "sale" : "scende"} di ${fmt(Math.abs(p.delta))} punti`, lines };
    }
    if (type === "sorpresa") {
      const never = p.series.slice(0, wave).every((v) => v == null);
      const lines = [
        `${At(prevMonth)}, quando si chiedeva all'AI ${QUESTION[p.cat](p.region)}, nessuna risposta nominava ${p.name}. ${At(month)} compare nel ${pct(p.now)} delle risposte ed entra in classifica al ${p.rank}° posto ${AMONG[p.cat](p.region)}.`,
      ];
      if (never) lines.push(`Non era mai comparsa da quando seguiamo queste domande, cioè da ${W[0].month}.`);
      return { title: `${p.name} entra in classifica`, lines };
    }
    if (type === "primo") {
      const gap = r1(s.now.now - s.before.now);
      const osc = Math.max(s.now.osc, s.before.osc);
      return {
        title: `${cats[s.cat].label} ${prep(s.region)}: ${s.now.name} passa davanti a ${s.before.name}`,
        lines: [
          `Cambia il primo nome ${AMONG[s.cat](s.region)}. ${At(month)} ${s.now.name} compare nel ${pct(s.now.now)} delle risposte, ${s.before.name} nel ${pct(s.before.now)}.`,
          `${At(prevMonth)} la prima era ${s.before.name}, con il ${pct(s.before.prev)}. ${s.now.name} era al ${s.now.prevRank}° posto, con il ${pct(s.now.prev)}.`,
          gap <= osc
            ? `Il distacco è di ${fmt(gap)} punti, dentro l'oscillazione dello stesso mese: di fatto le due sono alla pari.`
            : `Il distacco è di ${fmt(gap)} punti, più dell'oscillazione dello stesso mese (${fmt(osc)} punti).`,
        ],
      };
    }
    if (type === "fonte") {
      const a = s.next, b = s.prior;
      const firstDmo = a.type === "dmo" && s.row.sources.every((src) => src.type !== "dmo" || D.waves.slice(0, wave).every((_, i) => topSource(s.row, i).key !== src.key));
      const lines = [
        `Quando l'AI parla ${OF_CAT[s.cat]} ${prep(s.region)}, la fonte che cita più spesso adesso è ${a.name}, ${SOURCE_KIND[a.type]}: compare nel ${pct(a.series[wave])} delle risposte. ${At(prevMonth)} la prima era ${b.name}, ${SOURCE_KIND[b.type]}, che passa al ${pct(b.series[wave])}.`,
      ];
      if (firstDmo) lines.push(`È la prima volta da ${W[0].month} che qui la prima fonte è un sito di promozione turistica.`);
      return { title: `${cats[s.cat].label} ${prep(s.region)}: ${a.name} diventa la fonte più citata`, lines };
    }
    return { title: "", lines: [] };
  }

  const STORY_KINDS = [
    { type: "salita", kicker: "La salita più grande" },
    { type: "discesa", kicker: "La discesa più grande" },
    { type: "sorpresa", kicker: "La sorpresa" },
    { type: "primo", kicker: "Cambia il primo" },
    { type: "fonte", kicker: "Cambia la fonte" },
  ];

  function wave(w) {
    const rows = places.map((p) => placeAt(p, w)).filter((r) => r.status);
    const comparable = rows.filter((r) => ["up", "down", "stable"].includes(r.status));
    const up = comparable.filter((r) => r.status === "up").sort((a, b) => b.delta - a.delta);
    const down = comparable.filter((r) => r.status === "down").sort((a, b) => a.delta - b.delta);
    const stable = comparable.filter((r) => r.status === "stable");
    const entered = rows.filter((r) => r.status === "new").sort((a, b) => b.now - a.now);
    const exited = rows.filter((r) => r.status === "out");
    const leaders = [];
    if (w > 0) {
      for (const list of groups.values()) {
        const a = ranked(list, w)[0], b = ranked(list, w - 1)[0];
        if (a && b && a !== b) leaders.push({ cat: a.cat, region: a.region, now: placeAt(a, w), before: placeAt(b, w) });
      }
    }
    const sourceSwitches = w > 0 ? regionRows
      .filter((r) => topSource(r, w).key !== topSource(r, w - 1).key)
      .map((r) => ({ cat: r.cat, region: r.region, row: r, next: topSource(r, w), prior: topSource(r, w - 1) })) : [];
    const picks = { salita: up[0] && { place: up[0] }, discesa: down[0] && { place: down[0] }, sorpresa: entered[0] && { place: entered[0] }, primo: leaders[0], fonte: sourceSwitches[0] };
    const stories = w > 0 ? STORY_KINDS.filter((k) => picks[k.type]).map((k) => ({ ...k, ...picks[k.type], ...storyTexts(k.type, picks[k.type], w) })) : [];
    return { w, wave: D.waves[w], prevWave: D.waves[w - 1], nextMonth: D.waves[w + 1]?.month ?? NEXT_MONTH[D.waves[w].month], rows, comparable, up, down, stable, entered, exited, leaders, sourceSwitches, stories };
  }

  const status = {
    arrow: (s) => ({ up: "▲", down: "▼", new: "•", out: "×" })[s] ?? "",
    label: (s) => ({ up: "sale", down: "scende", stable: "stabile", new: "entra", out: "esce", first: "" })[s] ?? "",
  };

  function deltaHTML(r, { compact = false } = {}) {
    if (r.status === "new") return `<span class="delta delta-new" title="Entra in classifica questo mese">• ${compact ? "nuova" : "entra"}</span>`;
    if (r.status === "out") return `<span class="delta delta-out">esce</span>`;
    if (r.delta == null) return "";
    const cls = r.status === "up" ? "delta-up" : r.status === "down" ? "delta-down" : "delta-stable";
    const glyph = r.status === "up" ? "▲ " : r.status === "down" ? "▼ " : "";
    const value = r.status === "stable" ? signed(r.delta) : fmt(Math.abs(r.delta));
    const title = r.status === "stable" ? `Stabile: ${signed(r.delta)} punti, dentro l'oscillazione di ${fmt(r.osc)}` : `${signed(r.delta)} punti rispetto al mese prima`;
    return `<span class="delta ${cls}" title="${esc(title)}">${glyph}${value}</span>`;
  }

  function rankMoveHTML(r) {
    if (r.status === "new" || r.prevRank == null) return `<span class="move move-new" title="Entra in classifica">•</span>`;
    const d = r.prevRank - r.rank;
    if (d > 0) return `<span class="move move-up" title="Sale di ${d} ${d === 1 ? "posizione" : "posizioni"}">▲${d}</span>`;
    if (d < 0) return `<span class="move move-down" title="Scende di ${-d} ${d === -1 ? "posizione" : "posizioni"}">▼${-d}</span>`;
    return `<span class="move move-same" title="Stessa posizione">–</span>`;
  }

  // Fixed minimum span, so a stable series reads flat instead of being stretched to fill the box.
  function sparkline(series, upto, st, { width = 88, height = 28, span = 14 } = {}) {
    const vals = series.slice(0, upto + 1);
    const known = vals.filter((v) => v != null);
    if (!known.length) return "";
    const mid = (Math.max(...known) + Math.min(...known)) / 2;
    const half = Math.max(span, Math.max(...known) - Math.min(...known) + 4) / 2;
    const pad = 5;
    const x = (i) => pad + (i * (width - 2 * pad)) / (D.waves.length - 1);
    const y = (v) => pad + (1 - (v - (mid - half)) / (2 * half)) * (height - 2 * pad);
    let d = "";
    vals.forEach((v, i) => {
      if (v == null) return;
      d += `${d && vals[i - 1] != null ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
    });
    const last = vals.length - 1;
    const hits = vals.map((v, i) => `<rect class="hit" x="${(x(i) - (width - 2 * pad) / 6).toFixed(1)}" y="0" width="${((width - 2 * pad) / 3).toFixed(1)}" height="${height}" data-tip="${esc(cap(D.waves[i].month))}: ${v == null ? "non nominata" : pct(v)}"/>`).join("");
    const dot = vals[last] != null ? `<circle class="spark-dot spark-${st}" cx="${x(last).toFixed(1)}" cy="${y(vals[last]).toFixed(1)}" r="4"/>` : "";
    return `<svg class="spark" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Andamento da ${D.waves[0].month} a ${D.waves[last].month}"><path d="${d}"/>${dot}${hits}</svg>`;
  }

  function photo(name) {
    return D.photos[name] ?? null;
  }

  function creditHTML(name) {
    const p = photo(name);
    if (!p) return "";
    return `<a class="credit" href="${esc(p.url)}" target="_blank" rel="noopener">Foto ${esc(p.author)} · ${esc(p.license)}</a>`;
  }

  function tickerItems(w) {
    const wv = wave(w);
    const movers = [...wv.up, ...wv.down].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 16);
    const steady = [...wv.stable].sort((a, b) => b.now - a.now).slice(0, 6);
    const items = [];
    const pool = [...movers];
    let si = 0, ei = 0;
    while (pool.length) {
      items.push(pool.shift());
      if (items.length % 3 === 0 && si < steady.length) items.push(steady[si++]);
      if (items.length % 5 === 0 && ei < wv.entered.length) items.push(wv.entered[ei++]);
    }
    while (ei < wv.entered.length) items.push(wv.entered[ei++]);
    const regions = regionTable("italia", w).filter((r) => r.status !== "stable").slice(0, 4);
    return { items, regions };
  }

  function tickerItemHTML(r, region = false) {
    const name = region ? r.region : r.name;
    const ctx = region ? "Italia in generale" : context(r.cat, r.region);
    return `<li class="tk tk-${r.status}"><span class="tk-name">${esc(name)}</span><span class="tk-ctx">${esc(ctx)}</span><span class="tk-val">${pct(r.now)}</span>${deltaHTML(r, { compact: true })}</li>`;
  }

  function renderTicker(el, w) {
    const { items, regions } = tickerItems(w);
    const wv = D.waves[w];
    const prev = D.waves[w - 1];
    const lead = `<li class="tk tk-flag"><span>Dati di esempio</span></li>`;
    const body = lead + items.map((r) => tickerItemHTML(r)).join("") + regions.map((r) => tickerItemHTML(r, true)).join("");
    el.innerHTML = `
      <div class="ticker-label"><span class="ticker-live"></span><span>${esc(cap(wv.month))}<br><small>su ${esc(prev.month)}</small></span></div>
      <div class="ticker-window" tabindex="0" aria-label="Movimenti di ${esc(wv.month)} rispetto a ${esc(prev.month)}, dati di esempio">
        <ul class="ticker-track">${body}</ul><ul class="ticker-track" aria-hidden="true">${body}</ul>
      </div>
      <button class="ticker-toggle" type="button" aria-pressed="false" aria-label="Ferma lo scorrimento"><span aria-hidden="true">❚❚</span></button>`;
    const btn = el.querySelector(".ticker-toggle");
    btn.addEventListener("click", () => {
      const paused = el.classList.toggle("is-paused");
      btn.setAttribute("aria-pressed", String(paused));
      btn.setAttribute("aria-label", paused ? "Riprendi lo scorrimento" : "Ferma lo scorrimento");
      btn.innerHTML = `<span aria-hidden="true">${paused ? "▶" : "❚❚"}</span>`;
    });
  }

  const LOGO = `<svg viewBox="0 0 1533 220" fill="currentColor" role="img" aria-label="Rankwit"><path d="M127.27 157.73L114.55 185.78L99.4199 219.12H99.4099L84.2798 185.78L28.3398 62.46H58.5999L99.4099 152.42L112.13 124.4L127.27 157.73Z"/><path d="M279.09 0L207.02 158.86L191.88 125.51L248.83 0H279.09Z"/><path d="M179.68 152.42L194.81 185.77L179.68 219.12H179.67L164.55 185.77L139.55 130.67L124.41 97.32L139.55 63.96L156.21 27.23H12.35L0 0H198.83L186.47 27.23L154.68 97.32L179.68 152.42Z"/><path d="M478.81 196.85L435.63 197.1L397.68 128.85H364.88V197.05H323.7V18.4497L405.65 18.4097C417.14 18.4097 428.04 19.6197 438.51 23.6297C452.95 29.0097 463.53 39.8097 467.8 54.5997C475.05 82.6597 466.72 113.07 437.48 123.66L478.81 196.84V196.85ZM426.04 88.7097C429.47 81.5697 429.23 73.4497 426.29 66.5097C422.7 60.2197 416.56 57.7797 409.41 56.7797L364.89 56.7097V98.5997L408.6 98.4397C415.79 97.3397 422.26 95.4897 426.04 88.7097Z"/><path d="M1100.1 18.5499L1123.46 18.4399L1081.21 197.06L1048.15 197.04L1015.14 41.2899L982.13 197.06L949.3 197.04L907.08 18.5099L930.41 18.4999L966.05 173.45L999.08 18.4599L1031.65 18.3999L1064.51 174.09L1100.1 18.5499Z"/><path d="M861.93 131.44L902.39 196.98L855.15 197.09L816.82 132.29L815.24 134.83L815.28 197.05L773.89 197.06V18.4297L815.28 18.4097L815.25 128.94L816.82 131.59L856.01 68.8997H900.93L861.93 131.44Z"/><path d="M483.27 160.8C482.72 146.1 488.73 133.45 501.56 126.7C520.15 116.92 544.16 117.75 565.65 120.58C566.3 114.84 565.39 108.32 560.7 104.24C556.16 100.29 550.16 99.4198 544.09 98.4998C526.64 97.9598 509.82 100.63 493 106.19L502.52 69.9598C520.16 65.1898 538.01 63.3198 556.14 64.2498C564.96 64.9598 573.19 66.3298 581.25 69.6798C592.65 74.4098 600.71 83.5497 604.32 95.3497C605.84 101.52 607.01 107.67 607.02 114.3L607.07 194.45C583.93 198.84 561.06 201.43 537.61 200.58C526.97 200.19 516.98 198.45 507.41 194.85C492.550 189.47 483.89 176.86 483.28 160.81L483.27 160.8ZM565.9 168.71L565.82 144.03C555.47 142.56 545.77 141.91 536.22 143.92C529.59 145.86 525.43 150.16 525.72 156.65C526.39 171.86 549.73 170.74 565.9 168.7V168.71Z"/><path d="M710.02 116.32C709.61 107.34 704.42 101.75 696.04 100.59C687.85 99.4599 679.47 100.24 670.68 101.880V197.05H629.26V69.8499C648.13 66.7599 666.72 64.2399 685.82 63.2399C698.24 62.5899 710.09 63.9099 721.51 67.7799C742.44 75.3399 750.78 91.1999 751.47 113.11V197.04H710.06L710.02 116.31V116.32Z"/><path d="M1451.03 143.29L1370.47 143.22L1349.89 197.09L1327.57 196.95L1397.26 18.5197L1423.71 18.4097L1494.13 196.92L1471.7 197.08L1451.05 143.29H1451.03ZM1443.7 124.23L1410.51 40.1897L1377.43 124.32L1443.7 124.23Z"/><path d="M1274.71 176.45V197.09L1243.69 196.92C1229.66 196.85 1214.14 193.08 1208.2 180.3C1205.48 174.44 1204.08 167.84 1204.07 161.14L1204.01 94.6296H1180.52L1180.43 74.4796L1204.03 74.4496V33.6996L1226.05 33.6196L1226.09 74.4296L1274.46 74.4696V94.6296H1226.07L1226.16 154.51C1226.17 161.470 1229.11 167.44 1234.02 171.78C1238.69 174.44 1243.97 176.25 1249.51 176.29L1274.71 176.44V176.45Z"/><path d="M1532.88 196.97L1511.33 197.09V18.4697L1532.88 18.4797V196.97Z"/><path d="M1160.85 196.87L1139.12 197.11V74.48H1160.84L1160.85 196.87Z"/><path d="M1157.5 36.1097C1162.52 39.0197 1163.52 44.7898 1161.78 49.8198C1160.23 54.2898 1155.21 56.6998 1149.83 56.6898C1144.75 56.6898 1139.84 54.5198 1138.16 50.3898C1136.14 45.4298 1136.91 39.6697 1141.42 36.5997C1146.05 33.4397 1152.36 33.1297 1157.51 36.1097H1157.5Z"/></svg>`;

  function initChrome() {
    document.querySelectorAll("[data-logo]").forEach((el) => { el.innerHTML = LOGO; });
    const tip = document.createElement("div");
    tip.className = "tip";
    tip.setAttribute("role", "status");
    document.body.append(tip);
    document.addEventListener("pointerover", (e) => {
      const t = e.target.closest("[data-tip]");
      if (!t) return;
      tip.textContent = t.getAttribute("data-tip");
      tip.classList.add("is-on");
    });
    document.addEventListener("pointermove", (e) => {
      if (!tip.classList.contains("is-on")) return;
      tip.style.transform = `translate(${Math.min(e.clientX + 14, innerWidth - tip.offsetWidth - 8)}px, ${e.clientY - 38}px)`;
    });
    document.addEventListener("pointerout", (e) => {
      if (e.target.closest("[data-tip]")) tip.classList.remove("is-on");
    });
    document.querySelectorAll("form[data-stub]").forEach((f) => f.addEventListener("submit", (e) => {
      e.preventDefault();
      const note = f.querySelector(".form-note");
      if (note) note.textContent = "Nel prototipo il modulo non invia niente. Qui andrà l'iscrizione al bollettino del mese.";
    }));
  }

  const monthHref = (w, hash = "", cat = "") => `mese.html?m=${D.waves[w].id}${cat ? `&cat=${cat}` : ""}${hash}`;

  function wireMonthLinks(w) {
    document.querySelectorAll("[data-month-link]").forEach((a) => { a.href = monthHref(w, a.dataset.monthLink || ""); });
  }

  function renderCredits(el) {
    el.innerHTML = Object.entries(D.photos).map(([name, p]) =>
      `<li>${esc(name)}: <a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.author)}</a>, ${esc(p.license)}, Wikimedia Commons</li>`).join("");
  }

  function breadthHTML(W) {
    const n = W.comparable.length, u = W.up.length, s = W.stable.length, d = W.down.length;
    return `
      <p class="board-title">Su ${n} località confrontabili con ${esc(W.prevWave.month)}</p>
      <div class="breadth" role="img" aria-label="${u} salgono, ${s} stabili, ${d} scendono">
        <span class="b-up" style="flex:${u}" data-tip="${u} salgono"></span><span class="b-stable" style="flex:${s}" data-tip="${s} stabili"></span><span class="b-down" style="flex:${d}" data-tip="${d} scendono"></span>
      </div>
      <dl class="breadth-legend">
        <div class="k-up"><dt>salgono</dt><dd>${u}</dd></div>
        <div class="k-stable"><dt>stabili</dt><dd>${s}</dd></div>
        <div class="k-down"><dt>scendono</dt><dd>${d}</dd></div>
      </dl>
      <div class="board-foot"><span><b>${W.entered.length}</b> ${W.entered.length === 1 ? "entra" : "entrano"} in classifica</span><span><b>${W.exited.length}</b> ${W.exited.length === 1 ? "esce" : "escono"}</span><span><b>${W.leaders.length}</b> ${W.leaders.length === 1 ? "cambio" : "cambi"} al primo posto</span></div>`;
  }

  window.OSS = {
    D, cats, places, groups, regionRows, wave, regionTable, placeAt, topSource, context, prep,
    fmt, pct, signed, esc, cap, at, status, deltaHTML, rankMoveHTML, sparkline, photo, creditHTML,
    renderTicker, initChrome, monthHref, wireMonthLinks, renderCredits, breadthHTML, latest: D.waves.length - 1,
  };
})();
