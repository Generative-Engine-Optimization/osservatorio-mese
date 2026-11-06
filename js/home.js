(() => {
  const O = window.OSS;
  const { esc, pct, fmt, cap, at, NOW, PREV } = O;
  const W = O.wave();
  const month = NOW.month;
  const prevMonth = PREV.month;

  O.initChrome();
  O.renderTicker(document.getElementById("ticker"));
  O.wireMonthLinks();

  document.getElementById("hero-kicker").textContent = `Osservatorio mensile · Rilevazione del ${NOW.published}`;
  document.getElementById("hero-cta").innerHTML = `Cosa è cambiato ${esc(at(month))} <span class="arrow">→</span>`;

  document.getElementById("board").innerHTML = `
    <div class="board-head"><span>Il mese in breve</span><span>${esc(cap(month))} su ${esc(prevMonth)}</span></div>
    ${O.breadthHTML(W)}
    <p class="board-note">Stabile: la variazione resta dentro l'oscillazione che vediamo fra le risposte dello stesso mese. Numeri presi da osservatorio.rankwit.ai.</p>`;

  // The three cards on top: the change at the top, the biggest rise, the biggest fall.
  const featureCard = (story, lead) => {
    const name = O.storyPhotoName(story);
    const ph = name && O.photo(name);
    const kind = story.type === "discesa" ? "down" : story.type === "sorpresa" ? "new" : "up";
    let title, ctx, big;
    if (story.type === "primo" && story.kind === "regione") {
      title = story.now.region;
      ctx = `${O.cats[story.cat].label} · prima regione in Italia`;
      big = `<strong class="up">${pct(story.now.now)}</strong><span>delle risposte · ${esc(at(prevMonth))} prima era ${esc(O.withArt(story.before[0]))}</span>`;
    } else {
      const p = story.place ?? story.now;
      title = p.name;
      ctx = O.context(p.cat, p.region);
      big = story.type === "sorpresa"
        ? `<strong class="new">${pct(p.now)}</strong><span>delle risposte, la prima volta in classifica</span>`
        : `<strong class="${kind}">${kind === "up" ? "▲" : "▼"} ${fmt(Math.abs(p.delta))}</strong><span>punti · ora al ${pct(p.now)} delle risposte</span>`;
    }
    return `
      <article class="feature${lead ? " feature-lead" : ""}${ph ? "" : " feature-type"}">
        ${ph ? `<img src="img/${esc(ph.file)}" alt=""${ph.pos ? ` style="object-position:${esc(ph.pos)}"` : ""} loading="${lead ? "eager" : "lazy"}">` : `<span class="feature-word" aria-hidden="true">${esc(title)}</span>`}
        <span class="chip chip-top chip-${kind}"><i></i>${esc(story.kicker)}</span>
        ${ph ? O.creditHTML(name) : ""}
        <div class="feature-body">
          <h3><a class="stretched" href="${O.monthHref(`#${story.type}`)}">${esc(title)}</a></h3>
          <p class="ctx">${esc(ctx)}</p>
          <p class="big">${big}</p>
        </div>
      </article>`;
  };
  const pick = (t) => W.stories.find((s) => s.type === t);
  document.getElementById("features").innerHTML = ["primo", "salita", "discesa"].map((t, i) => pick(t) && featureCard(pick(t), i === 0)).join("");

  document.getElementById("learn-title").textContent = `Da sapere ${at(month)}`;
  document.getElementById("learn").innerHTML = O.learnings().map((l) => `
    <article class="card learn">
      <span class="learn-k">${esc(l.kicker)}</span>
      <strong class="learn-big">${esc(l.big)}</strong>
      <h3>${esc(l.title)}</h3>
      <p>${esc(l.text)}</p>
      <a class="learn-base" href="${esc(l.href)}" target="_blank" rel="noopener">Base: ${esc(l.base)} <span class="arrow">→</span></a>
    </article>`).join("");

  document.getElementById("movers-title").textContent = `Chi si muove ${at(month)}`;
  document.getElementById("movers-sub").textContent = `Variazioni in punti rispetto ${at(prevMonth)}, solo oltre l'oscillazione normale e solo nelle classifiche con almeno ${O.WORDS[O.MIN_Q]} domande: con meno, una sola risposta sposta troppi punti. Tutte le altre sono nella pagina del mese.`;
  const moverRow = (r) => `
    <a class="mrow" href="${O.monthHref("#tutti", r.cat)}">
      <div><span class="name">${esc(r.name)}</span><span class="ctx">${esc(O.context(r.cat, r.region))}</span></div>
      <span class="pos-cell">${O.ordinal(r.rank)} ${O.rankMoveHTML(r)}</span>
      <span class="val">${pct(r.now)}</span>
      ${O.deltaHTML(r)}
    </a>`;
  document.getElementById("movers").innerHTML = `
    <div class="card"><h3><i style="background:var(--up)"></i>Salgono di più</h3>${W.solidUp.slice(0, 6).map(moverRow).join("")}</div>
    <div class="card"><h3><i style="background:var(--down)"></i>Scendono di più</h3>${W.solidDown.slice(0, 6).map(moverRow).join("")}</div>`;
  const entered = W.entered.filter((r) => r.nq >= 2).slice(0, 8);
  document.getElementById("entries").innerHTML = entered.length
    ? `<span>Entrano in classifica:</span>${entered.map((r) => `<span class="pill"><span class="move-new">•</span><b>${esc(r.name)}</b> ${pct(r.now)} <span class="mono" style="font-size:12px;color:var(--ink-muted)">${esc(O.context(r.cat, r.region))}</span></span>`).join("")}<a class="pill pill-more" href="${O.monthHref("#tutti")}">tutte le ${W.entered.length} <span class="arrow">→</span></a>`
    : "";

  const tabs = document.getElementById("tabs");
  const panel = document.getElementById("rank-panel");
  document.getElementById("rank-sub").textContent = `Ogni categoria ha le sue domande e la sua classifica. Accanto al numero: la variazione e la posizione rispetto ${at(prevMonth)}, e la fonte che l'AI cita di più quando risponde su quella regione.`;
  let current = "regione";
  let expanded = false;
  function renderTable() {
    const rows = O.regionTable(current);
    const shown = expanded ? rows : rows.slice(0, 10);
    panel.innerHTML = `
      <div class="rrow rrow-head" aria-hidden="true"><span>#</span><span class="h-move">Pos.</span><span>Regione</span><span>Presenza</span><span>Var.</span><span class="src">Fonte più citata</span></div>
      ${shown.map((r) => `
        <div class="rrow">
          <span class="pos">${r.status === "none" ? "–" : r.rank}</span>
          <span class="move-cell">${O.rankMoveHTML(r)}</span>
          <a class="region" href="${esc(r.href)}" target="_blank" rel="noopener">${esc(r.region)}</a>
          <span class="bar"><span class="bar-track"><span class="bar-fill" style="width:${r.now}%"></span></span><span class="bar-val">${pct(r.now)}</span></span>
          <span>${O.deltaHTML(r)}</span>
          <span class="src">${r.source ? `${esc(r.source.name)}<small>${pct(r.source.share)} delle risposte</small>` : "–"}</span>
        </div>`).join("")}
      <div class="table-foot">
        <span>Presenza: su 100 risposte alle domande ${esc(O.aboutItaly(current))}, in quante l'AI nomina almeno una località della regione. <a href="${esc(O.catPage(current))}" target="_blank" rel="noopener">La classifica sul sito</a></span>
        ${rows.length > 10 ? `<button type="button" id="more">${expanded ? "Mostra le prime 10" : `Mostra tutte le ${rows.length} regioni`}</button>` : ""}
      </div>`;
    panel.querySelector("#more")?.addEventListener("click", () => { expanded = !expanded; renderTable(); });
  }
  tabs.innerHTML = O.CAT_ORDER.map((id) => O.cats[id]).map((c) => `<button class="tab" type="button" role="tab" id="tab-${c.id}" aria-controls="rank-panel" aria-selected="${c.id === current}" data-cat="${c.id}">${esc(c.label)}</button>`).join("");
  tabs.addEventListener("click", (e) => {
    const b = e.target.closest(".tab");
    if (!b) return;
    current = b.dataset.cat;
    expanded = false;
    tabs.querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-selected", String(t === b)));
    panel.setAttribute("aria-labelledby", b.id);
    renderTable();
  });
  panel.setAttribute("aria-labelledby", `tab-${current}`);
  renderTable();

  // Every survey: this month's issue here, the earlier ones on the observatory's report pages.
  const lead = W.stories[0];
  const leadPhoto = lead && O.storyPhotoName(lead);
  const issues = [...O.REP].reverse().map((rep, k) => {
    const isNow = k === 0;
    const first = (cat) => O.topIn(rep, cat)[0];
    const lines = ["mare", "borghi", "neve"].map((c) => first(c) && `${O.cats[c].label}: prima ${first(c)[0]}, ${pct(first(c)[1])}`).filter(Boolean);
    const ph = isNow && leadPhoto && O.photo(leadPhoto);
    return `
      <a class="card issue${isNow ? " is-current" : ""}" href="${isNow ? O.monthHref() : `${O.SITE}/it/report/${rep.id}`}"${isNow ? "" : ' target="_blank" rel="noopener"'}>
        <div class="issue-img${ph ? "" : " issue-img-type"}">${ph ? `<img src="img/${esc(ph.file)}" alt="" loading="lazy">` : `<span class="issue-word" aria-hidden="true">${esc(cap(rep.month))}</span>`}<span class="chip">${isNow ? "Questo mese" : "Report"}</span></div>
        <div class="issue-body">
          <span class="issue-meta">${esc(cap(rep.month))} 2026 · rilevazione del ${esc(rep.published)}</span>
          <h3>${isNow && lead ? esc(lead.title) : esc(lines[0] ?? "")}</h3>
          <p>${isNow ? esc(W.stories.slice(1, 3).map((s) => s.title).join(". ")) + "." : esc(lines.slice(1).join(". ")) + "."}</p>
          <span class="more">${isNow ? "Leggi il numero" : "Il report sul sito"} <span class="arrow">→</span></span>
        </div>
      </a>`;
  });
  document.getElementById("issues").innerHTML = issues.join("");

  const ex = W.solidUp[0];
  const st = W.solidStable.find((r) => r.delta && Math.abs(r.delta) >= 3) ?? W.solidStable[0];
  document.getElementById("rules").innerHTML = [
    ["01", "Le stesse domande, ogni mese", "Un mese si confronta con il precedente solo sulle domande presenti in tutti e due. Una domanda nuova non sposta niente."],
    ["02", "Punti, non percentuali", "Se una località passa dal 2% al 4% delle risposte scriviamo +2 punti, non +100%. Così una piccola variazione resta piccola.",
      `<span class="delta delta-up">▲ 2</span><span>non</span><span class="delta delta-stable" style="text-decoration:line-through">+100%</span>`],
    ["03", "Stabile vuol dire stabile", "Le stesse domande fatte più volte nello stesso mese danno risposte un po' diverse. Se la variazione resta dentro questa oscillazione, niente verde e niente rosso.",
      ex && st ? `${O.deltaHTML(st)}<span>stabile</span>${O.deltaHTML(ex)}<span>sale</span>` : ""],
    ["04", "Cosa cambia, non perché", "Registriamo cosa risponde l'AI, non il motivo. Se cambia il modello di un assistente lo scriviamo, perché sposta tutti insieme."],
  ].map(([n, h, p, extra]) => `<div class="card rule"><span class="n">${n}</span><h3>${h}</h3><p>${p}</p>${extra ? `<div class="example">${extra}</div>` : ""}</div>`).join("");

  O.renderCredits(document.getElementById("credits"));
})();
