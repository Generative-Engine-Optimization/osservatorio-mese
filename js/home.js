(() => {
  const O = window.OSS;
  const { esc, pct, fmt, cap } = O;
  const w = O.latest;
  const W = O.wave(w);
  const month = W.wave.month;
  const prevMonth = W.prevWave.month;
  const href = (hash = "") => O.monthHref(w, hash);

  O.initChrome();
  O.renderTicker(document.getElementById("ticker"), w);
  O.wireMonthLinks(w);
  O.renderCredits(document.getElementById("credits"));

  document.getElementById("hero-kicker").textContent = `Osservatorio mensile · Rilevazione del ${W.wave.published}`;
  document.getElementById("hero-cta").innerHTML = `Cosa è cambiato ${esc(O.at(month))} <span class="arrow">→</span>`;

  document.getElementById("board").innerHTML = `
    <div class="board-head"><span>Il mese in breve</span><span>${esc(cap(month))} su ${esc(prevMonth)}</span></div>
    ${O.breadthHTML(W)}
    <p class="board-note">Stabile: la variazione resta dentro l'oscillazione che vediamo fra le risposte dello stesso mese.</p>`;

  const featureCard = (story, lead) => {
    const p = story.place;
    const ph = O.photo(p.name);
    const kind = story.type === "salita" ? "up" : story.type === "discesa" ? "down" : "new";
    const big = story.type === "sorpresa"
      ? `<strong class="new">${pct(p.now)}</strong><span>delle risposte, la prima volta</span>`
      : `<strong class="${kind}">${kind === "up" ? "▲" : "▼"} ${fmt(Math.abs(p.delta))}</strong><span>punti · dal ${pct(p.prev)} al ${pct(p.now)}</span>`;
    return `
      <article class="feature${lead ? " feature-lead" : ""}">
        ${ph ? `<img src="img/${esc(ph.file)}" alt="" loading="${lead ? "eager" : "lazy"}">` : ""}
        <span class="chip chip-top chip-${kind}"><i></i>${esc(story.kicker)}</span>
        ${O.creditHTML(p.name)}
        <div class="feature-body">
          <h3><a class="stretched" href="${href(`#${story.type}`)}">${esc(p.name)}</a></h3>
          <p class="ctx">${esc(O.context(p.cat, p.region))}</p>
          <p class="big">${big}</p>
        </div>
      </article>`;
  };
  const pick = (t) => W.stories.find((s) => s.type === t);
  document.getElementById("features").innerHTML = ["salita", "discesa", "sorpresa"].map((t, i) => pick(t) && featureCard(pick(t), i === 0)).join("");

  document.getElementById("movers-title").textContent = `Chi si muove ${O.at(month)}`;
  document.getElementById("movers-sub").textContent = `Variazioni in punti rispetto ${O.at(prevMonth)}. In lista solo chi esce dall'oscillazione normale: le altre ${W.stable.length} località confrontabili sono stabili.`;
  const moverRow = (r) => `
    <a class="mrow" href="${O.monthHref(w, "#tutti", r.cat)}">
      <div><span class="name">${esc(r.name)}</span><span class="ctx">${esc(O.context(r.cat, r.region))}</span></div>
      <div class="spark-cell">${O.sparkline(r.series, w, r.status)}</div>
      <span class="val">${pct(r.now)}</span>
      ${O.deltaHTML(r)}
    </a>`;
  document.getElementById("movers").innerHTML = `
    <div class="card"><h3><i style="background:var(--up)"></i>Salgono di più</h3>${W.up.slice(0, 6).map(moverRow).join("")}</div>
    <div class="card"><h3><i style="background:var(--down)"></i>Scendono di più</h3>${W.down.slice(0, 6).map(moverRow).join("")}</div>`;
  const entries = [];
  if (W.entered.length) entries.push(`<span>Entrano in classifica:</span>${W.entered.map((r) => `<span class="pill"><span class="move-new">•</span><b>${esc(r.name)}</b> ${pct(r.now)} <span class="mono" style="font-size:12px;color:var(--ink-muted)">${esc(O.context(r.cat, r.region))}</span></span>`).join("")}`);
  if (W.exited.length) entries.push(`<span style="margin-left:8px">Escono:</span>${W.exited.map((r) => `<span class="pill"><b>${esc(r.name)}</b> <span class="mono" style="font-size:12px;color:var(--ink-muted)">${esc(O.context(r.cat, r.region))}</span></span>`).join("")}`);
  document.getElementById("entries").innerHTML = entries.join("");

  const tabs = document.getElementById("tabs");
  const panel = document.getElementById("rank-panel");
  const OF = { italia: "sull'Italia in generale", mare: "sul mare", montagna: "sulla montagna", laghi: "sui laghi", borghi: "sui borghi", citta: "sulle città", neve: "sulla neve" };
  document.getElementById("rank-sub").textContent = `Ogni categoria ha le sue domande e la sua classifica. Accanto al numero: la posizione rispetto ${O.at(prevMonth)} e l'andamento degli ultimi quattro mesi.`;
  let current = "italia";
  let expanded = false;
  function renderTable() {
    const rows = O.regionTable(current, w);
    const shown = expanded ? rows : rows.slice(0, 10);
    panel.innerHTML = `
      <div class="rrow rrow-head" aria-hidden="true"><span>#</span><span class="h-move">Pos.</span><span>Regione</span><span>Presenza</span><span>Var.</span><span class="h-spark">4 mesi</span><span class="src">Fonte più citata</span></div>
      ${shown.map((r) => `
        <div class="rrow">
          <span class="pos">${r.rank}</span>
          <span class="move-cell">${O.rankMoveHTML(r)}</span>
          <span class="region">${esc(r.region)}</span>
          <span class="bar"><span class="bar-track"><span class="bar-fill" style="width:${r.now}%"></span></span><span class="bar-val">${pct(r.now)}</span></span>
          <span>${O.deltaHTML(r)}</span>
          <span class="spark-cell">${O.sparkline(r.series, w, r.status)}</span>
          <span class="src">${esc(r.source.name)}<small>${pct(r.source.series[w])} delle risposte</small></span>
        </div>`).join("")}
      <div class="table-foot">
        <span>Presenza: su 100 risposte alle domande ${OF[current]}${current === "italia" ? "" : " in Italia"}, in quante l'AI nomina almeno una località della regione.</span>
        ${rows.length > 10 ? `<button type="button" id="more">${expanded ? "Mostra le prime 10" : `Mostra tutte le ${rows.length} regioni`}</button>` : ""}
      </div>`;
    panel.querySelector("#more")?.addEventListener("click", () => { expanded = !expanded; renderTable(); });
  }
  tabs.innerHTML = O.D.categories.map((c) => `<button class="tab" type="button" role="tab" id="tab-${c.id}" aria-controls="rank-panel" aria-selected="${c.id === current}" data-cat="${c.id}">${esc(c.label)}</button>`).join("");
  tabs.addEventListener("click", (e) => {
    const b = e.target.closest(".tab");
    if (!b) return;
    current = b.dataset.cat;
    expanded = false;
    tabs.querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-selected", String(t === b)));
    panel.setAttribute("aria-labelledby", b.id);
    renderTable();
  });
  panel.setAttribute("aria-labelledby", "tab-italia");
  renderTable();

  const issues = [];
  for (let i = O.latest; i >= 1; i--) {
    const iw = O.wave(i);
    const lead = iw.stories[0];
    const ph = lead && O.photo(lead.place.name);
    issues.push(`
      <a class="card issue${i === O.latest ? " is-current" : ""}" href="${O.monthHref(i)}">
        <div class="issue-img">${ph ? `<img src="img/${esc(ph.file)}" alt="" loading="lazy">` : ""}<span class="chip">N. ${i}${i === O.latest ? " · ultimo" : ""}</span></div>
        <div class="issue-body">
          <span class="issue-meta">${esc(cap(iw.wave.month))} 2026 · rilevazione del ${esc(iw.wave.published)}</span>
          <h3>${esc(lead.title)}</h3>
          <p>${iw.stories.slice(1, 3).map((s) => esc(s.title)).join(". ")}.</p>
          <span class="more">Leggi il numero <span class="arrow">→</span></span>
        </div>
      </a>`);
  }
  document.getElementById("issues").innerHTML = issues.join("");

  const ex = W.stories.find((s) => s.type === "salita")?.place;
  const st = W.stable[0];
  document.getElementById("rules").innerHTML = [
    ["01", "Le stesse domande, ogni mese", "Un mese si confronta con il precedente solo sulle domande presenti in tutti e due. Una domanda nuova non sposta niente."],
    ["02", "Punti, non percentuali", "Se una località passa dal 2% al 4% delle risposte scriviamo +2 punti, non +100%. Così una piccola variazione resta piccola.",
      `<span class="delta delta-up">▲ 2,0</span><span>non</span><span class="delta delta-stable" style="text-decoration:line-through">+100%</span>`],
    ["03", "Stabile vuol dire stabile", "Le stesse domande fatte più volte nello stesso mese danno risposte un po' diverse. Se la variazione resta dentro questa oscillazione, niente verde e niente rosso.",
      ex && st ? `${O.deltaHTML(st)}<span>stabile</span>${O.deltaHTML(ex)}<span>sale</span>` : ""],
    ["04", "Cosa cambia, non perché", "Registriamo cosa risponde l'AI, non il motivo. Se cambia il modello di un assistente lo scriviamo, perché sposta tutti insieme."],
  ].map(([n, h, p, extra]) => `<div class="card rule"><span class="n">${n}</span><h3>${h}</h3><p>${p}</p>${extra ? `<div class="example">${extra}</div>` : ""}</div>`).join("");
})();
