(() => {
  const O = window.OSS;
  const { esc, pct, cap, at, At, NOW, PREV, NEXT } = O;
  const params = new URLSearchParams(location.search);
  const W = O.wave();
  const month = NOW.month;
  const prevMonth = PREV.month;

  O.initChrome();
  O.renderTicker(document.getElementById("ticker"));
  O.wireMonthLinks();
  document.title = `Cosa è cambiato ${at(month)} · Il mese dell'AI · prototipo`;

  // Only the latest survey has an issue here; the earlier ones open the observatory's report page.
  const asked = params.get("m");
  const older = O.REP.find((r) => r.id === asked && r.id !== NOW.id);
  if (older) {
    document.getElementById("older-note").hidden = false;
    document.getElementById("older-note").innerHTML = `Il numero di ${esc(older.month)} non c'è in questo prototipo: <a href="${O.SITE}/it/report/${older.id}">apri il report di ${esc(older.month)} sul sito</a>. Qui sotto, ${esc(month)}.`;
  }
  const switchLinks = [...O.REP].reverse().map((r) => r.id === NOW.id
    ? `<a class="tab" href="${O.monthHref()}" aria-current="page">${esc(cap(r.month))} · questo numero</a>`
    : `<a class="tab" href="${O.SITE}/it/report/${r.id}" target="_blank" rel="noopener">${esc(cap(r.month))} · report</a>`);
  switchLinks.unshift(`<span class="tab is-soon">${esc(cap(NEXT.month))} · esce il ${esc(NEXT.published)}</span>`);
  document.getElementById("issue-switch").innerHTML = switchLinks.join("");
  document.getElementById("mast-kicker").textContent = `Il mese dell'AI · Rilevazione del ${NOW.published}`;
  document.getElementById("mast-title").innerHTML = `Cosa è cambiato <em>${esc(at(month))}</em>`;
  document.getElementById("mast-dek").textContent =
    `Nelle ${W.rankings} classifiche per regione, ${O.thousands(W.comparable.length)} località si possono confrontare con ${prevMonth}: ${W.up.length} salgono e ${W.down.length} scendono oltre l'oscillazione normale, le altre ${O.thousands(W.stable.length)} restano stabili. ${W.entered.length} entrano in classifica.`;

  document.getElementById("brief").innerHTML = W.stories.map((s, i) => `
    <li><a href="#${s.type}"><span class="n">0${i + 1}</span><span><span class="k">${esc(s.kicker)}</span><span class="t">${esc(s.title)}</span></span></a></li>`).join("");
  document.getElementById("month-board").innerHTML = `<div class="board-head"><span>Il mese in numeri</span><span>${esc(cap(month))} su ${esc(prevMonth)}</span></div>${O.breadthHTML(W)}`;

  function watchText(s) {
    const what = { salita: "se il nuovo livello tiene o era un mese particolare", discesa: "se il calo tiene o era un mese particolare", sorpresa: "se resta in classifica", primo: "se l'ordine regge", fonte: "se il sorpasso regge" }[s.type];
    return `<p class="story-next"><b>Da guardare ${esc(at(NEXT.month))}:</b> ${esc(what)}. Il prossimo numero esce il ${esc(NEXT.published)}.</p>`;
  }

  const factsHTML = (items) => `<dl class="facts">${items.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join("")}</dl>`;
  const pageLink = (href, label) => `<a ${O.linkAttrs(href)}>${esc(label)}</a>`;

  function dataBlock(s) {
    if (s.type === "salita" || s.type === "discesa" || s.type === "sorpresa") {
      const p = s.place;
      const facts = [
        ["Posizione", `${O.ordinal(p.rank)}${p.prevRank && p.prevRank !== p.rank ? ` <span class="was">era ${O.ordinal(p.prevRank)}</span>` : ""}`],
        ["Base", `${p.nq} ${p.nq === 1 ? "domanda" : "domande"}, cinque assistenti`],
        ["Classifica", pageLink(p.href, `${O.context(p.cat, p.region)}`)],
      ];
      return `<div class="story-data"><div class="figure"><strong>${pct(p.now)}</strong>${O.deltaHTML(p)}<span class="figure-sub">delle risposte · <a href="${esc(p.href)}">${esc(O.context(p.cat, p.region))}</a></span></div>${factsHTML(facts)}</div>`;
    }
    if (s.type === "primo" && s.kind === "regione") {
      const before = O.topIn(PREV, s.cat);
      const now = O.regionTable(s.cat).slice(0, 3);
      const col = (label, rows) => `<div class="podium"><span class="podium-h">${esc(cap(label))}</span><ol>${rows.map(([name, v]) => `<li class="${name === s.now.region ? "hl" : name === s.before[0] ? "hl2" : ""}"><a href="${esc(O.regionHrefByName(s.cat, name))}">${esc(name)}</a><b>${pct(v)}</b></li>`).join("")}</ol></div>`;
      return `<div class="story-data podiums">${col(prevMonth, before.map((r) => [r[0], r[1]]))}<span class="podium-arrow arrow" aria-hidden="true">→</span>${col(month, now.map((r) => [r.region, r.now]))}</div>`;
    }
    if (s.type === "primo") {
      return `<div class="story-data">${factsHTML([[s.now.name, `${pct(s.now.now)} ${O.deltaHTML(s.now)}`], [s.before.name, `${pct(s.before.now)} ${O.deltaHTML(s.before)}`], ["Base", `${s.now.nq} domande`]])}</div>`;
    }
    if (s.type === "fonte") {
      return `<div class="story-data">${factsHTML([
        [s.next.name, s.next.share != null ? `${pct(s.next.share)} <span class="was">delle risposte</span>` : "prima fonte"],
        [cap(prevMonth), esc(s.prior)],
        ["Categoria", pageLink(O.regionHrefByName(s.cat, s.region), `${O.cats[s.cat].label} · ${s.region}`)],
      ])}</div>`;
    }
    return "";
  }

  // Where to go from a story: the place's page with its hotels, the ranking it moves in.
  function storyLinks(s) {
    const links = [];
    const p = s.place ?? (s.type === "primo" && s.kind !== "regione" ? s.now : null);
    if (p?.placeSlug) links.push([p.page, `${p.name}: gli hotel e le fonti`]);
    if (p) links.push([p.href, `La classifica: ${O.context(p.cat, p.region)}`]);
    if (s.type === "primo" && s.kind === "regione") {
      links.push([O.regionHref(s.cat, s.now.slug), `${O.cats[s.cat].label} · ${s.now.region}: le località`]);
      links.push([O.catHref(s.cat), `${O.cats[s.cat].label}: tutte le regioni`]);
    }
    if (s.type === "fonte") links.push([`${O.regionHrefByName(s.cat, s.region)}#chi-racconta`, `${O.context(s.cat, s.region)}: chi racconta il territorio`]);
    if (!links.length) return "";
    return `<ul class="story-links">${links.map(([href, label]) => `<li><a href="${esc(href)}">${esc(label)} <span class="arrow">→</span></a></li>`).join("")}</ul>`;
  }

  function mediaHTML(s) {
    const name = O.storyPhotoName(s);
    const ph = name && O.photo(name);
    const label = s.place?.name ?? s.now?.region ?? s.now?.name ?? s.region;
    if (!ph) return `<div class="story-media story-media-empty"><span>${esc(label)}</span></div>`;
    const caption = name !== label ? `<span>${esc(name)}</span> · ` : "";
    return `<figure class="story-media"><img src="img/${esc(ph.file)}" alt="${esc(name)}"${ph.pos ? ` style="object-position:${esc(ph.pos)}"` : ""} loading="lazy"><figcaption>${caption}${O.creditHTML(name)}</figcaption></figure>`;
  }

  function chartHTML(s) {
    if (s.type === "fonte") {
      return `<div class="story-chart"><span class="chart-h">La fonte più citata, mese per mese</span>
        <ol class="timeline">${s.history.map((h, i) => `<li class="${h.source && O.isDmo(h.source) ? "is-dmo" : ""}${i === s.history.length - 1 ? " is-now" : ""}"><span class="tl-m">${esc(h.month)}</span><span class="tl-s">${h.source ? `<i></i>${esc(h.source)}` : `<span class="tl-none">fuori dalle prime tre</span>`}</span></li>`).join("")}</ol>
        <p class="tl-note">Pallino viola: sito di promozione turistica. Dai report di ogni rilevazione, finché la regione è fra le prime tre della categoria.</p></div>`;
    }
    const p = s.place ?? (s.type === "primo" && s.kind !== "regione" ? s.now : null);
    if (!p?.engines) return "";
    return `<div class="story-chart"><span class="chart-h">Motore per motore, ${esc(month)}</span>${O.enginesHTML(p)}</div>`;
  }

  document.getElementById("stories").innerHTML = W.stories.map((s, i) => `
    <article class="story story-${s.type}${i % 2 ? " flip" : ""}" id="${s.type}">
      <div class="wrap story-grid">
        ${mediaHTML(s)}
        <div class="story-text">
          <p class="story-kicker"><span class="story-n">0${i + 1}</span>${esc(s.kicker)}</p>
          <h2>${esc(s.title)}</h2>
          ${dataBlock(s)}
          ${chartHTML(s)}
          ${s.lines.map((l) => `<p>${esc(l)}</p>`).join("")}
          ${storyLinks(s)}
          ${watchText(s)}
        </div>
      </div>
    </article>`).join("");

  const catFilter = document.getElementById("cat-filter");
  const showStable = document.getElementById("show-stable");
  const table = document.getElementById("all-table");
  let cat = O.cats[params.get("cat")] ? params.get("cat") : "";
  document.getElementById("all-title").textContent = `Località per località, ${month}`;
  document.getElementById("all-sub").textContent = `Le prime 15 località di ogni classifica, come le pubblica l'osservatorio. Variazioni in punti rispetto ${at(prevMonth)}. Di base vedi solo chi si muove oltre l'oscillazione e chi entra. Guarda anche quante domande ci sono dietro: con una o due, una sola risposta sposta molti punti.`;
  catFilter.innerHTML = [["", "Tutte"], ...O.CAT_ORDER.map((id) => [id, O.cats[id].label])]
    .map(([id, label]) => `<button class="tab" type="button" data-cat="${id}" aria-pressed="${id === cat}">${esc(label)}</button>`).join("");
  catFilter.addEventListener("click", (ev) => {
    const b = ev.target.closest(".tab");
    if (!b) return;
    cat = b.dataset.cat;
    catFilter.querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-pressed", String(t === b)));
    renderTable();
  });
  showStable.addEventListener("change", renderTable);

  const ORDER = { new: 0, up: 1, stable: 1, down: 1 };
  function renderTable() {
    const inCat = W.rows.filter((r) => !cat || r.cat === cat);
    const rows = inCat.filter((r) => showStable.checked || r.status !== "stable")
      .sort((a, b) => ORDER[a.status] - ORDER[b.status] || (a.status === "new" ? b.now - a.now : (b.delta ?? 0) - (a.delta ?? 0)));
    const nStable = inCat.filter((r) => r.status === "stable").length;
    table.innerHTML = `
      <div class="arow arow-head" aria-hidden="true"><span>Località</span><span class="num prev">Domande</span><span class="num">${esc(cap(month))}</span><span>Var.</span><span class="h-pos">Posizione</span></div>
      ${rows.map((r) => `
        <div class="arow">
          <div><a class="name" href="${esc(r.page)}">${esc(r.name)}</a><a class="ctx" href="${esc(r.href)}">${esc(O.context(r.cat, r.region))}</a></div>
          <span class="num prev">${r.nq || "–"}</span>
          <span class="num strong">${pct(r.now)}</span>
          <span>${O.deltaHTML(r)}</span>
          <span class="pos-cell">${O.ordinal(r.rank)} ${O.rankMoveHTML(r)}</span>
        </div>`).join("") || `<p class="empty">Nessun movimento oltre l'oscillazione in questa categoria.</p>`}
      <div class="table-foot"><span>${O.thousands(rows.length)} ${rows.length === 1 ? "riga" : "righe"}${showStable.checked ? "" : ` · ${O.thousands(nStable)} stabili nascoste`}</span><span>Posizione: fra le località della stessa categoria e regione</span></div>`;
  }
  renderTable();

  document.getElementById("issue-nav").innerHTML = `
    <a class="card issue-link" href="${O.SITE}/it/report/${PREV.id}" target="_blank" rel="noopener"><span class="mono"><span class="arrow">←</span> ${esc(cap(prevMonth))} · rilevazione del ${esc(PREV.published)}</span><b>Il report di ${esc(prevMonth)} sul sito</b></a>
    <div class="card issue-link right is-soon"><span class="mono">${esc(cap(NEXT.month))}</span><b>Esce il ${esc(NEXT.published)}</b></div>`;

  const same = NOW.domande === PREV.domande && NOW.localita === PREV.localita;
  document.getElementById("context-note").textContent = `${At(month)} le domande sono ${O.thousands(NOW.domande)} e riguardano ${NOW.localita} località${same ? `, come ${at(prevMonth)}` : ""}. Le poniamo più volte a ${O.D.engines.join(", ").replace(/, ([^,]*)$/, " e $1")}. Il ± confronta ${month} e ${prevMonth} solo sulle domande comuni ai due mesi.`;

  O.renderCredits(document.getElementById("credits"));

  if (location.hash) {
    const target = document.getElementById(location.hash.slice(1));
    if (target) setTimeout(() => target.scrollIntoView({ behavior: "instant", block: "start" }), 60);
  }
})();
