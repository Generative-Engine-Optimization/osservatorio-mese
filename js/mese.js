(() => {
  const O = window.OSS;
  const C = window.OSS_CHARTS;
  const { esc, pct, fmt, cap, at } = O;
  const params = new URLSearchParams(location.search);
  let w = O.D.waves.findIndex((x) => x.id === params.get("m"));
  if (w < 1) w = O.latest;
  const W = O.wave(w);
  const month = W.wave.month;
  const prevMonth = W.prevWave.month;
  const isLatest = w === O.latest;
  const NEXT_PUBLISHED = "1 dicembre 2026";
  const WORDS = { 2: "due", 3: "tre", 4: "quattro", 5: "cinque", 6: "sei", 7: "sette", 8: "otto", 9: "nove" };

  O.initChrome();
  O.renderTicker(document.getElementById("ticker"), w);
  O.wireMonthLinks(w);
  O.renderCredits(document.getElementById("credits"));
  document.title = `Cosa è cambiato ${at(month)} · Il mese dell'AI · prototipo`;

  const switchLinks = [];
  for (let i = 1; i <= O.latest; i++) {
    switchLinks.push(`<a class="tab" href="${O.monthHref(i)}"${i === w ? ' aria-current="page"' : ""}>N. ${i} · ${esc(cap(O.D.waves[i].month))}</a>`);
  }
  switchLinks.push(`<span class="tab is-soon">N. ${O.latest + 1} · in uscita il ${NEXT_PUBLISHED}</span>`);
  document.getElementById("issue-switch").innerHTML = switchLinks.join("");
  document.getElementById("mast-kicker").textContent = `Il mese dell'AI · Numero ${w} · Rilevazione del ${W.wave.published}`;
  document.getElementById("mast-title").innerHTML = `Cosa è cambiato <em>${esc(at(month))}</em>`;
  const e = W.entered.length;
  document.getElementById("mast-dek").textContent =
    `Su ${W.comparable.length} località confrontabili con ${prevMonth}, ${W.up.length} salgono e ${W.down.length} scendono. Le altre ${W.stable.length} restano dentro l'oscillazione normale.` +
    (e ? ` ${e === 1 ? "Una località entra" : `${cap(WORDS[e] ?? String(e))} località entrano`} in classifica.` : "");

  document.getElementById("brief").innerHTML = W.stories.map((s, i) => `
    <li><a href="#${s.type}"><span class="n">0${i + 1}</span><span><span class="k">${esc(s.kicker)}</span><span class="t">${esc(s.title)}</span></span></a></li>`).join("");
  document.getElementById("month-board").innerHTML = `<div class="board-head"><span>Il mese in numeri</span><span>${esc(cap(month))} su ${esc(prevMonth)}</span></div>${O.breadthHTML(W)}`;

  const ordinal = (n) => `${n}°`;
  const later = (from) => O.D.waves.slice(from + 1).map((wv, k) => ({ wv, i: from + 1 + k }));

  function afterText(s) {
    const next = later(w);
    if (!next.length) {
      const nm = at(W.nextMonth);
      const what = { salita: "se il nuovo livello tiene o era un mese particolare", discesa: "se il calo tiene o era un mese particolare", sorpresa: "se resta in classifica", primo: "se l'ordine regge", fonte: "se il sorpasso regge" }[s.type];
      return `<p class="story-next"><b>Da guardare ${esc(nm)}:</b> ${esc(what)}.</p>`;
    }
    if (s.place) {
      const p = s.place;
      const parts = next.map(({ wv, i }) => `${at(wv.month)} ${p.series[i] == null ? "non nominata" : `${pct(p.series[i])} (${O.signed(Math.round((p.series[i] - p.now) * 10) / 10)})`}`);
      const holds = next.every(({ i }) => p.series[i] != null && Math.abs(p.series[i] - p.now) <= p.osc);
      return `<p class="story-next"><b>Com'è andata dopo:</b> ${esc(cap(parts.join(", ")))}. ${holds ? "Il livello tiene." : "Il livello non è rimasto quello."}</p>`;
    }
    if (s.type === "primo") {
      const list = O.groups.get(`${s.cat}/${s.region}`);
      const leaders = next.map(({ i }) => [...list].filter((p) => p.series[i] != null).sort((a, b) => b.series[i] - a.series[i])[0].name);
      const same = leaders.every((n) => n === s.now.name);
      return `<p class="story-next"><b>Com'è andata dopo:</b> ${same ? `${esc(s.now.name)} resta prima anche ${esc(next.map(({ wv }) => at(wv.month)).join(" e "))}.` : esc(next.map(({ wv }, k) => `${at(wv.month)} prima ${leaders[k]}`).join(", ")) + "."}</p>`;
    }
    if (s.type === "fonte") {
      const tops = next.map(({ i }) => O.topSource(s.row, i).name);
      const same = tops.every((n) => n === s.next.name);
      return `<p class="story-next"><b>Com'è andata dopo:</b> ${same ? `${esc(s.next.name)} resta la prima fonte anche ${esc(next.map(({ wv }) => at(wv.month)).join(" e "))}.` : esc(next.map(({ wv }, k) => `${at(wv.month)} prima ${tops[k]}`).join(", ")) + "."}</p>`;
    }
    return "";
  }

  function factsHTML(items) {
    return `<dl class="facts">${items.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join("")}</dl>`;
  }

  function dataBlock(s) {
    if (s.type === "salita" || s.type === "discesa" || s.type === "sorpresa") {
      const p = s.place;
      const facts = [
        ["Posizione", `${ordinal(p.rank)}${p.prevRank && p.prevRank !== p.rank ? ` <span class="was">era ${ordinal(p.prevRank)}</span>` : ""}`],
        ["Base", `${p.answers} risposte al mese`],
        [s.type === "sorpresa" ? "Prima" : "Oscillazione", s.type === "sorpresa" ? `mai nominata da ${esc(O.D.waves[0].month)}` : `${fmt(p.osc)} punti`],
      ];
      return `<div class="story-data"><div class="figure"><strong>${pct(p.now)}</strong>${O.deltaHTML(p)}<span class="figure-sub">delle risposte · ${esc(O.context(p.cat, p.region))}</span></div>${factsHTML(facts)}</div>`;
    }
    if (s.type === "primo") {
      const list = O.groups.get(`${s.cat}/${s.region}`);
      const col = (i, label) => {
        const top = [...list].filter((p) => p.series[i] != null).sort((a, b) => b.series[i] - a.series[i]).slice(0, 3);
        return `<div class="podium"><span class="podium-h">${esc(cap(label))}</span><ol>${top.map((p) => `<li class="${p.name === s.now.name ? "hl" : p.name === s.before.name ? "hl2" : ""}"><span>${esc(p.name)}</span><b>${pct(p.series[i])}</b></li>`).join("")}</ol></div>`;
      };
      return `<div class="story-data podiums">${col(w - 1, prevMonth)}<span class="podium-arrow arrow" aria-hidden="true">→</span>${col(w, month)}</div>`;
    }
    if (s.type === "fonte") {
      const d = (src) => Math.round((src.series[w] - src.series[w - 1]) * 10) / 10;
      return `<div class="story-data">${factsHTML([
        [s.next.name, `${pct(s.next.series[w])} <span class="was">${O.signed(d(s.next))} punti</span>`],
        [s.prior.name, `${pct(s.prior.series[w])} <span class="was">${O.signed(d(s.prior))} punti</span>`],
        ["Categoria", `${esc(O.cats[s.cat].label)} · ${esc(s.region)}`],
      ])}</div>`;
    }
    return "";
  }

  function mediaHTML(s) {
    if (s.type === "fonte") {
      return `<div class="story-media chart-media"><div class="chart-card"><span class="chart-h">Fonti più citate, ${esc(O.cats[s.cat].label.toLowerCase())} ${esc(O.prep(s.region))}</span><div data-chart="fonte"></div></div></div>`;
    }
    const name = s.place ? s.place.name : s.now.name;
    const ph = O.photo(name);
    if (!ph) return `<div class="story-media story-media-empty"><span>${esc(name)}</span></div>`;
    return `<figure class="story-media"><img src="img/${esc(ph.file)}" alt="${esc(name)}" loading="lazy"><figcaption>${O.creditHTML(name)}</figcaption></figure>`;
  }

  document.getElementById("stories").innerHTML = W.stories.map((s, i) => `
    <article class="story story-${s.type}${i % 2 ? " flip" : ""}" id="${s.type}">
      <div class="wrap story-grid">
        ${mediaHTML(s)}
        <div class="story-text">
          <p class="story-kicker"><span class="story-n">0${i + 1}</span>${esc(s.kicker)}</p>
          <h2>${esc(s.title)}</h2>
          ${dataBlock(s)}
          ${s.place ? `<div class="story-chart"><span class="chart-h">Presenza nelle risposte, mese per mese</span><div data-chart="place" data-i="${i}"></div></div>` : ""}
          ${s.lines.map((l) => `<p>${esc(l)}</p>`).join("")}
          ${afterText(s)}
        </div>
      </div>
    </article>`).join("");

  function drawCharts() {
    document.querySelectorAll("[data-chart]").forEach((el) => {
      const width = Math.max(260, Math.floor(el.clientWidth));
      if (el.dataset.chart === "fonte") {
        const s = W.stories.find((x) => x.type === "fonte");
        const series = [
          { name: s.next.name, values: s.next.series, color: "var(--series-a)" },
          { name: s.prior.name, values: s.prior.series, color: "var(--series-b)" },
        ];
        el.innerHTML = C.legend(series) + C.lineChart(series, w, { width, height: 240, label: `${s.next.name} e ${s.prior.name}, presenza come fonte da ${O.D.waves[0].month} a ${month}` });
      } else {
        const p = W.stories[Number(el.dataset.i)].place;
        el.innerHTML = C.lineChart([{ name: p.name, values: p.series, color: "var(--accent)" }], w, { width, height: 170, label: `${p.name}, presenza da ${O.D.waves[0].month} a ${month}` });
      }
    });
  }
  drawCharts();
  let rt;
  addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(drawCharts, 150); });

  const catFilter = document.getElementById("cat-filter");
  const showStable = document.getElementById("show-stable");
  const table = document.getElementById("all-table");
  let cat = O.cats[params.get("cat")] ? params.get("cat") : "";
  document.getElementById("all-title").textContent = `Località per località, ${month}`;
  document.getElementById("all-sub").textContent = `Variazioni in punti rispetto ${at(prevMonth)}. Di base vedi solo chi si muove oltre l'oscillazione, chi entra e chi esce.`;
  catFilter.innerHTML = [["", "Tutte"], ...O.D.categories.filter((c) => c.id !== "italia").map((c) => [c.id, c.label])]
    .map(([id, label]) => `<button class="tab" type="button" data-cat="${id}" aria-pressed="${id === cat}">${esc(label)}</button>`).join("");
  catFilter.addEventListener("click", (ev) => {
    const b = ev.target.closest(".tab");
    if (!b) return;
    cat = b.dataset.cat;
    catFilter.querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-pressed", String(t === b)));
    renderTable();
  });
  showStable.addEventListener("change", renderTable);

  const ORDER = { new: 0, up: 1, stable: 1, down: 1, out: 2 };
  function renderTable() {
    const inCat = W.rows.filter((r) => r.status !== "first" && (!cat || r.cat === cat));
    const rows = inCat.filter((r) => showStable.checked || r.status !== "stable")
      .sort((a, b) => ORDER[a.status] - ORDER[b.status] || (a.status === "new" ? b.now - a.now : (b.delta ?? 0) - (a.delta ?? 0)));
    const nStable = inCat.filter((r) => r.status === "stable").length;
    table.innerHTML = `
      <div class="arow arow-head" aria-hidden="true"><span>Località</span><span class="num prev">${esc(cap(prevMonth))}</span><span class="num">${esc(cap(month))}</span><span>Var.</span><span class="h-pos">Posizione</span><span class="h-spark">4 mesi</span></div>
      ${rows.map((r) => `
        <div class="arow">
          <div><span class="name">${esc(r.name)}</span><span class="ctx">${esc(O.context(r.cat, r.region))}</span></div>
          <span class="num prev">${r.prev == null ? "–" : pct(r.prev)}</span>
          <span class="num strong">${r.now == null ? "–" : pct(r.now)}</span>
          <span>${O.deltaHTML(r)}</span>
          <span class="pos-cell">${r.rank ? `${ordinal(r.rank)} ` : ""}${r.status === "out" ? "" : O.rankMoveHTML(r)}</span>
          <span class="spark-cell">${O.sparkline(r.series, w, r.status)}</span>
        </div>`).join("") || `<p class="empty">Nessun movimento oltre l'oscillazione in questa categoria.</p>`}
      <div class="table-foot"><span>${rows.length} ${rows.length === 1 ? "riga" : "righe"}${showStable.checked ? "" : ` · ${nStable} stabili nascoste`}</span><span>Posizione: ${esc("fra le località della stessa categoria e regione")}</span></div>`;
  }
  renderTable();

  const prev = w > 1 ? O.wave(w - 1) : null;
  const next = w < O.latest ? O.wave(w + 1) : null;
  document.getElementById("issue-nav").innerHTML = `
    ${prev ? `<a class="card issue-link" href="${O.monthHref(w - 1)}"><span class="mono"><span class="arrow">←</span> N. ${w - 1} · ${esc(cap(prev.wave.month))}</span><b>${esc(prev.stories[0].title)}</b></a>` : `<span></span>`}
    ${next ? `<a class="card issue-link right" href="${O.monthHref(w + 1)}"><span class="mono">N. ${w + 1} · ${esc(cap(next.wave.month))} <span class="arrow">→</span></span><b>${esc(next.stories[0].title)}</b></a>` : `<div class="card issue-link right is-soon"><span class="mono">N. ${w + 1} · ${esc(cap(W.nextMonth))}</span><b>Esce il ${NEXT_PUBLISHED}</b></div>`}`;

  if (location.hash) {
    const target = document.getElementById(location.hash.slice(1));
    if (target) setTimeout(() => target.scrollIntoView({ behavior: "instant", block: "start" }), 60);
  }
})();
