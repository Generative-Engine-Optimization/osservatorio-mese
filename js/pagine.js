// The deeper pages: category, category × region, place with its hotels, and the explore page. One template per level
// (categoria.html, regione.html, localita.html, esplora.html), the page in the address, one JSON file each in data/,
// written by build/importa-dal-sito.py from the public pages of osservatorio.rankwit.ai. Nothing here recomputes a
// number: presence, variation, stable or not, position, shares and searches are the ones the observatory publishes.
(() => {
  const O = window.OSS;
  const { D, esc, pct, fmt, cap, at, NOW, PREV, thousands } = O;
  const level = document.body.dataset.level;
  const params = new URLSearchParams(location.search);
  const main = document.getElementById("page");
  const ENGINES = D.engines;

  O.initChrome();
  O.renderTicker(document.getElementById("ticker"));
  O.wireMonthLinks();

  // ---------- Small pieces ----------

  const row = ([rank, name, kind, now, delta, status, move, by, slug]) => ({ rank, name, kind, now, delta, status, move, by, slug });
  const mxRow = ([name, tag, now, delta, status, move, by, engines]) => ({ name, tag, now, delta, status, move, by, engines });
  const plural = (n, one, many) => `${thousands(n)} ${n === 1 ? one : many}`;
  const domande = (n) => plural(n, "domanda", "domande");
  // «11 su 100», «meno di 1 su 100»: the published share, read as fonti out of 100.
  const of100 = (v) => (v == null ? "–" : v > 0 && v < 1 ? "meno di 1" : fmt(v, 0));
  const lc = (s) => s.charAt(0).toLowerCase() + s.slice(1);
  const ucFirst = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const siteUrl = (path) => `${O.SITE}/it/categorie/${path}`;
  const photoOf = (names) => names.find((n) => O.photo(n)) ?? null;

  function crumbsHTML(items) {
    return `<nav class="crumbs" aria-label="Sei qui"><ol>${items.map(([label, href]) => `<li>${href ? `<a href="${esc(href)}">${esc(label)}</a>` : `<span aria-current="page">${esc(label)}</span>`}</li>`).join("")}</ol></nav>`;
  }

  function headHTML({ crumbs, kicker, title, dek, facts = [], photo = null, tabs = "", site = null }) {
    const ph = photo && O.photo(photo);
    return `
      <header class="page-head">
        <div class="wrap">
          ${crumbsHTML(crumbs)}
          <div class="page-head-grid${ph ? " has-photo" : ""}">
            <div class="page-head-text">
              <p class="kicker">${kicker}</p>
              <h1 class="page-title">${esc(title)}</h1>
              <p class="page-dek">${dek}</p>
              ${facts.length ? `<dl class="page-facts">${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join("")}</dl>` : ""}
              ${site ? `<a class="site-link" href="${esc(site)}" target="_blank" rel="noopener">La stessa pagina su osservatorio.rankwit.ai <span class="arrow">↗</span></a>` : ""}
            </div>
            ${ph ? `<figure class="page-photo">${O.photoImgHTML(photo)}<figcaption>${photo !== title ? `${esc(photo)} · ` : ""}${O.creditHTML(photo)}</figcaption></figure>` : ""}
          </div>
          ${tabs}
        </div>
      </header>`;
  }

  function tocHTML(items) {
    return `<nav class="page-toc" aria-label="In questa pagina"><div class="wrap"><ol>${items.map(([id, label], i) => `<li><a href="#${id}"><span>0${i + 1}</span>${esc(label)}</a></li>`).join("")}</ol></div></nav>`;
  }

  function sectionHTML({ id, n, label, title, sub = "", more = "", body }) {
    return `
      <section class="section deep" id="${id}">
        <div class="wrap">
          <div class="section-head">
            <div>
              <span class="section-num">0${n} · ${esc(label)}</span>
              <h2>${esc(title)}</h2>
              ${sub ? `<p>${sub}</p>` : ""}
            </div>
            ${more}
          </div>
          ${body}
        </div>
      </section>`;
  }

  const baseHTML = (text) => `<p class="base-note"><span class="base-k">Base</span> ${text}</p>`;

  // Rankings in the landing's table style: position, movement, name, presence bar, variation, one last column.
  function rankingHTML({ head, rows, last = null, foot = "", id = (r) => null, nameCell = (r) => esc(r.name) }) {
    return `
      <div class="card rank-table">
        <div class="rrow rrow-head${last ? "" : " no-last"}" aria-hidden="true"><span>#</span><span class="h-move">Pos.</span><span>${esc(head)}</span><span>Presenza</span><span>Var.</span>${last ? `<span class="src">${esc(last.head)}</span>` : ""}</div>
        ${rows.map((r) => `
          <div class="rrow${last ? "" : " no-last"}"${id(r) ? ` id="${id(r)}"` : ""}>
            <span class="pos">${r.rank ?? "–"}</span>
            <span class="move-cell">${O.rankMoveHTML(r)}</span>
            <span class="name-cell">${nameCell(r)}</span>
            <span class="bar"><span class="bar-track"><span class="bar-fill" style="width:${Math.min(r.now ?? 0, 100)}%"></span></span><span class="bar-val">${pct(r.now)}</span></span>
            <span>${O.deltaHTML(r)}</span>
            ${last ? `<span class="src">${last.cell(r)}</span>` : ""}
          </div>`).join("")}
        ${foot ? `<div class="table-foot">${foot}</div>` : ""}
      </div>`;
  }

  // «X, motore per motore»: one row per name, the presence over all engines, then each engine.
  function matrixHTML({ head, rows, label, link = () => null }) {
    if (!rows.length) return "";
    return `
      <div class="mx-wrap" tabindex="0" role="region" aria-label="${esc(label)}">
        <table class="mx">
          <thead><tr><th scope="col">${esc(head)}</th><th scope="col" class="num">Tutti</th>${ENGINES.map((e) => `<th scope="col" class="num">${esc(e)}</th>`).join("")}</tr></thead>
          <tbody>${rows.map((r) => {
            const href = link(r);
            return `<tr>
              <th scope="row">${href ? `<a href="${esc(href)}">${esc(r.name)}</a>` : esc(r.name)}${r.tag ? `<small>${esc(r.tag)}</small>` : ""}</th>
              <td class="num all"><b>${pct(r.now)}</b>${O.deltaHTML(r, { compact: true })}</td>
              ${r.engines.map((v) => `<td class="num"><span class="mx-cell${v ? "" : " zero"}"><span class="mx-v">${pct(v)}</span><span class="mx-track"><span class="mx-bar" style="width:${Math.min(v ?? 0, 100)}%"></span></span></span></td>`).join("")}
            </tr>`;
          }).join("")}</tbody>
        </table>
      </div>`;
  }

  const MIX = [["dmo", "Siti di promozione turistica"], ["hotel", "Hotel"], ["ota", "OTA"], ["altro", "Altre fonti"]];

  function mixHTML(mix, where) {
    if (!mix) return "";
    const s = mix.shares;
    const max = Math.max(...mix.others.map((o) => o[1] ?? 0), 1);
    return `
      <div class="mix-grid">
        <div class="card mix-card">
          <p class="mix-h">Su 100 fonti citate ${esc(where)}</p>
          <div class="mix-bar" role="img" aria-label="${esc(MIX.map(([k, l]) => `${l} ${pct(s[k])}`).join(", "))}">
            ${MIX.map(([k, l]) => `<span class="m-${k}" style="flex:${s[k] ?? 0}" data-tip="${esc(`${l}: ${pct(s[k])}`)}"></span>`).join("")}
          </div>
          <ul class="mix-legend">${MIX.map(([k, l]) => `<li><i class="m-${k}"></i><span>${esc(l)}</span><b>${pct(s[k])}</b></li>`).join("")}</ul>
          <p class="mix-say"><strong>${of100(s.dmo)} su 100</strong> sono siti di promozione turistica, <strong>${of100(s.ota)}</strong> OTA, <strong>${of100(s.hotel)}</strong> siti di hotel. Il resto sono altre fonti: giornali, portali privati, mappe, blog.</p>
        </div>
        <div class="card others-card">
          <p class="mix-h">Altre fonti, ${pct(s.altro)}: di cui</p>
          <ul class="others">${mix.others.map(([name, v, sites]) => `
            <li>
              <span class="o-name">${esc(name)}</span>
              <span class="o-track"><span style="width:${((v ?? 0) / max) * 100}%"></span></span>
              <b>${pct(v)}</b>
              ${sites ? `<small>${esc(sites)}</small>` : ""}
            </li>`).join("")}
          </ul>
          <p class="o-note">Voce per voce sul totale delle fonti citate: la somma fa la quota delle altre fonti. Accanto, i siti più citati.</p>
        </div>
      </div>`;
  }

  function directHTML(direct) {
    if (!direct) return "";
    return `
      <div class="card direct-card">
        <p class="mix-h">Sito diretto contro OTA</p>
        <div class="mix-bar" role="img" aria-label="Sito dell'hotel ${pct(direct.hotel)}, OTA ${pct(direct.ota)}">
          <span class="m-hotel" style="flex:${direct.hotel ?? 0}" data-tip="Sito dell'hotel: ${pct(direct.hotel)}"></span><span class="m-ota" style="flex:${direct.ota ?? 0}" data-tip="OTA: ${pct(direct.ota)}"></span>
        </div>
        <ul class="mix-legend"><li><i class="m-hotel"></i><span>Sito dell'hotel</span><b>${pct(direct.hotel)}</b></li><li><i class="m-ota"></i><span>OTA</span><b>${pct(direct.ota)}</b></li></ul>
        <p class="o-note">Su 100 citazioni fra siti di hotel e OTA, quante vanno al sito dell'hotel e quante a un intermediario (Booking, Expedia, Tripadvisor, Google Hotels). Siti di promozione turistica e altre fonti non contano.</p>
      </div>`;
  }

  function statsHTML(stats) {
    const order = [["dmo", "Siti di promozione turistica"], ["hotel", "Hotel"], ["ota", "OTA"], ["altro", "Altre fonti"]];
    return `<div class="stats4">${order.filter(([k]) => stats[k]).map(([k, label]) => {
      const [v, d, status, text] = stats[k];
      return `<div class="card stat${k === "ota" || k === "altro" ? " stat-ctx" : ""}">
        <span class="stat-k"><i class="m-${k}"></i>${esc(label)}</span>
        <strong>${pct(v)}</strong>
        <p>${esc(text)}</p>
        ${d != null ? O.deltaHTML({ status, delta: d }) : ""}
      </div>`;
    }).join("")}</div>`;
  }

  function pairsHTML(pairs) {
    if (!pairs.length) return "";
    return `
      <div class="card pairs-card">
        <p class="mix-h">Motore per motore</p>
        <div class="legend"><span><i class="m-dmo"></i>Cita un sito di promozione turistica</span><span><i class="m-hotel"></i>Cita il sito di un hotel</span></div>
        <div class="pairs">${pairs.map(([name, dmo, hotel]) => `
          <div class="pair">
            <span class="eng-name">${esc(name)}</span>
            <span class="pair-bars">
              <span class="pb"><span class="eng-track"><span class="eng-fill m-dmo" style="width:${dmo ?? 0}%"></span></span><b>${pct(dmo)}</b></span>
              <span class="pb"><span class="eng-track"><span class="eng-fill m-hotel" style="width:${hotel ?? 0}%"></span></span><b>${pct(hotel)}</b></span>
            </span>
          </div>`).join("")}
        </div>
      </div>`;
  }

  function miniRankHTML(rows, { head, kindCol = false }) {
    return `<ol class="mini-rank" aria-label="${esc(head)}">${rows.map((r) => `
      <li>
        <span class="mr-pos">${r.rank}</span>
        <span class="mr-name">${esc(r.name)}${kindCol && r.kind ? `<small>${esc(r.kind)}</small>` : ""}</span>
        <span class="mr-track"><span style="width:${Math.min(r.now ?? 0, 100)}%"></span></span>
        <b class="mr-val">${pct(r.now)}</b>
        ${r.status && r.status !== "none" ? O.deltaHTML(r, { compact: true }) : '<span class="mr-empty"></span>'}
      </li>`).join("")}</ol>`;
  }

  // The questions asked every month, each with the Google search behind it.
  function questionsHTML(q, { linkName = () => null, empty = "Nessuna domanda in questa rilevazione." } = {}) {
    if (!q || !q.items.length) return `<p class="empty-note">${esc(empty)}</p>`;
    const langs = new Set(q.items.map((x) => x.lang));
    const visible = 6;
    return `
      <div class="q-block" data-q-block>
        <div class="q-tools">
          <p class="q-note"><b>${domande(q.n)}</b> · le loro parole chiave valgono <b>${thousands(q.vol)}</b> ricerche l'anno su Google</p>
          ${langs.size > 1 ? `<div class="tabs" role="group" aria-label="Lingua delle domande"><button class="tab" type="button" data-lang="" aria-pressed="true">Tutte</button><button class="tab" type="button" data-lang="it" aria-pressed="false">In italiano</button><button class="tab" type="button" data-lang="en" aria-pressed="false">In inglese</button></div>` : ""}
        </div>
        <div class="q-grid">${q.items.map((x, i) => `
          <article class="card q" data-lang="${esc(x.lang)}"${i >= visible ? " hidden" : ""}>
            <div class="q-tags"><span class="q-lang">${esc(x.lang.toUpperCase())}</span>${x.tags.map((t) => `<span class="q-tag">${esc(t)}</span>`).join("")}</div>
            <p class="q-text" lang="${esc(x.lang)}">${esc(ucFirst(x.q))}</p>
            ${x.kw ? `<p class="q-kw">Ricerca: <b>${esc(x.kw)}</b> · ${thousands(x.vol)} l'anno su Google</p>` : ""}
            ${x.top.length ? `<ol class="q-top">${x.top.map(([name, v]) => {
              const href = linkName(name);
              return `<li><span>${href ? `<a href="${esc(href)}">${esc(name)}</a>` : esc(name)}</span><b>${pct(v)}</b></li>`;
            }).join("")}</ol>` : `<p class="q-none">Nessun nome ricorre nelle risposte.</p>`}
            <p class="q-cites"><span><i class="m-dmo"></i>Cita un sito di promozione <b>${pct(x.dmo)}</b></span><span><i class="m-hotel"></i>Cita il sito di un hotel <b>${pct(x.hotel)}</b></span></p>
          </article>`).join("")}
        </div>
        ${q.items.length > visible ? `<button class="btn-more" type="button" data-q-more>Mostra tutte le ${domande(q.items.length)}</button>` : ""}
      </div>`;
  }

  function wireQuestions(root) {
    root.querySelectorAll("[data-q-block]").forEach((block) => {
      const cards = [...block.querySelectorAll(".q")];
      const more = block.querySelector("[data-q-more]");
      let lang = "", all = false;
      const apply = () => {
        let shown = 0;
        cards.forEach((c) => {
          const ok = !lang || c.dataset.lang === lang;
          c.hidden = !ok || (!all && shown >= 6);
          if (ok) shown += 1;
        });
        if (more) more.hidden = all || shown <= 6;
      };
      block.querySelectorAll(".tab[data-lang]").forEach((b) => b.addEventListener("click", () => {
        lang = b.dataset.lang;
        block.querySelectorAll(".tab[data-lang]").forEach((t) => t.setAttribute("aria-pressed", String(t === b)));
        apply();
      }));
      more?.addEventListener("click", () => { all = true; apply(); });
      apply();
    });
  }

  function catTabsHTML(current, hrefOf, available = O.CAT_ORDER, label = "Categorie") {
    return `<nav class="page-tabs" aria-label="${esc(label)}">${O.CAT_ORDER.filter((c) => available.includes(c)).map((c) => `<a class="tab" href="${esc(hrefOf(c))}"${c === current ? ' aria-current="page"' : ""}>${esc(O.cats[c].label)}</a>`).join("")}</nav>`;
  }

  async function load(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`${path}: ${res.status}`);
    return res.json();
  }

  function notFound(what) {
    document.title = "Pagina non trovata · Osservatorio AI";
    main.innerHTML = headHTML({
      crumbs: [["Italia", "index.html"], ["Esplora", "esplora.html"], ["Pagina non trovata", null]],
      kicker: "Pagina non trovata",
      title: "Questa pagina non c'è",
      dek: `${esc(what)} Da Esplora puoi aprire tutte le categorie, le regioni e le località.`,
    }) + `<div class="wrap deep-404"><a class="btn btn-primary" href="esplora.html">Vai a Esplora <span class="arrow">→</span></a></div>`;
  }

  function finish(title) {
    document.title = `${title} · Osservatorio AI`;
    wireQuestions(main);
    O.renderCredits(document.getElementById("credits"));
    if (location.hash) {
      const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) {
        target.classList.add("is-target");
        setTimeout(() => target.scrollIntoView({ behavior: "instant", block: "center" }), 60);
      }
    }
  }

  const kickerNow = (what) => `${esc(what)} · Rilevazione del ${esc(NOW.published)}`;
  const varNote = `Variazioni in punti rispetto ${esc(at(PREV.month))}. Senza colore vuol dire stabile: la variazione resta dentro l'oscillazione che vediamo fra le risposte dello stesso mese.`;

  // ---------- Category: the regions in Italy ----------

  async function renderCategory() {
    const cat = params.get("c");
    if (!O.cats[cat]) return notFound("La categoria indicata nell'indirizzo non esiste.");
    const c = await load(`data/categorie/${cat}.json`);
    const label = O.cats[cat].label;
    const rows = c.regions.map(([rank, name, slug, now, delta, status, move, by, source, share, page]) =>
      ({ rank, name, slug, now, delta, status, move, by, source, share, page }));
    const nq = c.questions?.n ?? D.questions[cat];
    const first = rows[0];
    // The photo: the first place with a photo, going down the regions in order.
    const photo = photoOf(rows.flatMap((r) => (O.groups.get(`${cat}/${r.slug}`) ?? []).map((p) => p.name)));
    const where = cat === "regione" ? "sulle regioni in generale" : `${O.ON_CAT[cat]} in Italia`;
    main.innerHTML = headHTML({
      crumbs: [["Italia", "index.html"], [label, null]],
      kicker: kickerNow("Classifica delle regioni"),
      title: label,
      dek: `In quante risposte alle domande ${esc(where)} l'AI nomina almeno una località di ogni regione, quali fonti cita e quali domande facciamo. ${cap(domande(nq))}, poste più volte a cinque assistenti AI.`,
      facts: [
        ["Prima regione", `<a href="${esc(O.regionHref(cat, first.slug))}">${esc(first.name)}</a> <span class="was">${pct(first.now)} delle risposte</span>`],
        ["Regioni in classifica", `${rows.length}`],
        ["Domande", `${thousands(nq)}${c.questions ? ` <span class="was">${thousands(c.questions.vol)} ricerche l'anno su Google</span>` : ""}`],
      ],
      photo,
      tabs: catTabsHTML(cat, O.catHref),
      site: siteUrl(cat),
    }) + tocHTML([["regioni", "Le regioni"], ["chi-racconta", "Chi racconta"], ["domande", "Le domande"]])
    + sectionHTML({
      id: "regioni", n: 1, label: "Le regioni",
      title: `${label}: le regioni che l'AI nomina di più`,
      sub: `Su 100 risposte alle domande ${esc(where)}, in quante l'AI nomina almeno una località della regione. ${varNote}`,
      body: rankingHTML({
        head: "Regione", rows,
        nameCell: (r) => `<a class="region" href="${esc(O.regionHref(cat, r.slug))}">${esc(r.name)}</a>`,
        last: { head: "Fonte più citata", cell: (r) => (r.source ? `${esc(r.source)}<small>${pct(r.share)} delle risposte</small>` : "–") },
        foot: `<span>${baseHTML(`${domande(nq)} ${esc(where)}, poste più volte a ${ENGINES.join(", ").replace(/, ([^,]*)$/, " e $1")}.`)}</span>`,
      }) + (c.outside.length ? `<p class="outside-note"><b>Fuori classifica:</b> ${esc(c.outside.join(", "))}. Nella base dell'osservatorio non ci sono località di questa categoria in queste regioni, quindi non facciamo domande su di loro. Una domanda entra solo se la sua ricerca supera le 1.000 l'anno su Google.</p>` : ""),
    })
    + sectionHTML({
      id: "chi-racconta", n: 2, label: "Chi racconta il territorio",
      title: cat === "regione" ? "Chi racconta le regioni" : `Chi racconta ${lc(label) === "città" ? "le città" : `${{ mare: "il mare", montagna: "la montagna", laghi: "i laghi", borghi: "i borghi", neve: "la neve" }[cat]}`} in Italia`,
      sub: `Solo le domande ${esc(where)}: da dove prende le informazioni l'AI quando risponde. Ogni citazione che va a un intermediario è una citazione che non arriva a chi il territorio lo governa.`,
      body: mixHTML(c.mix, esc(where)) + (c.dmoEngines.length ? `
        <h3 class="sub-h">I siti di promozione turistica, motore per motore</h3>
        <p class="sub-p">In quante risposte l'AI cita come fonte ciascun sito di promozione turistica: tutti i motori insieme, poi uno per uno.</p>
        ${matrixHTML({ head: "Sito di promozione", rows: c.dmoEngines.map(mxRow), label: "Siti di promozione turistica, motore per motore" })}
        ${baseHTML(`${domande(nq)} ${esc(where)}.`)}` : ""),
    })
    + sectionHTML({
      id: "domande", n: 3, label: "Le domande",
      title: "Le domande che facciamo ogni mese",
      sub: "Ognuna nasce da una ricerca vera su Google. Sotto ciascuna, le regioni che l'AI nomina di più e in quante risposte cita un sito di promozione turistica o il sito di un hotel.",
      more: `<a class="link-more" href="${esc(siteUrl(cat))}#le-risposte" target="_blank" rel="noopener">Le risposte per intero, sul sito <span class="arrow">↗</span></a>`,
      body: questionsHTML(c.questions, { linkName: (name) => (O.regionSlugs[name] ? O.regionHref(cat, O.regionSlugs[name]) : null) }),
    });
    finish(label);
  }

  // ---------- Category × region: the places ----------

  async function renderRegion() {
    const cat = params.get("c"), slug = params.get("r");
    if (!O.cats[cat] || !O.hasRegionPage(cat, slug)) return notFound("Questa combinazione di categoria e regione non ha una pagina nell'osservatorio.");
    const r = await load(`data/categorie/${cat}/${slug}.json`);
    const label = O.cats[cat].label;
    const region = r.region;
    const places = r.places.map(row);
    const nq = r.questions?.n ?? D.questions[`${cat}/${slug}`] ?? 0;
    const inCat = O.regionTable(cat);
    const me = inCat.find((x) => x.slug === slug);
    const about = O.about(cat, region);
    const photo = photoOf(places.map((p) => p.name));
    const placeLink = (name) => {
      const p = places.find((x) => x.name === name);
      const hp = r.hotelPlaces.find(([n]) => n === name);
      const ps = p?.slug ?? hp?.[1];
      return ps ? O.placeHref(cat, slug, name, ps) : p ? `#${O.anchorId(name)}` : null;
    };
    const others = r.hotelPlaces.filter(([name, s]) => !places.some((p) => p.slug === s));
    const available = O.CAT_ORDER.filter((c) => O.hasRegionPage(c, slug));
    const title = cat === "regione" ? `${region} in generale` : `${label} · ${region}`;

    const head = headHTML({
      crumbs: [["Italia", "index.html"], [label, O.catHref(cat)], [region, null]],
      kicker: kickerNow(cat === "regione" ? "La regione in generale" : label),
      title: region,
      dek: `Le località che l'AI nomina di più nelle risposte alle domande ${esc(about)}, chi racconta il territorio e quali fonti cita.`,
      facts: [
        me ? [cat === "regione" ? "Fra le regioni" : `${label}, fra le regioni`, `${O.ordinal(me.rank)} su ${inCat.length} <span class="was">${pct(me.now)} delle risposte alle domande ${esc(O.aboutItaly(cat))}</span>`] : null,
        me ? ["Variazione", `${O.deltaHTML(me)} <span class="was">rispetto ${esc(at(PREV.month))}</span>`] : null,
        ["Domande", `${thousands(nq)}${r.questions ? ` <span class="was">${thousands(r.questions.vol)} ricerche l'anno su Google</span>` : ""}`],
      ].filter(Boolean),
      photo,
      tabs: catTabsHTML(cat, (c) => O.regionHref(c, slug), available, `${region}: le categorie`),
      site: siteUrl(`${cat}/${slug}`),
    });

    const placesBody = places.length ? rankingHTML({
      head: "Località", rows: places,
      id: (p) => O.anchorId(p.name),
      nameCell: (p) => `${p.slug ? `<a class="region" href="${esc(O.placeHref(cat, slug, p.name, p.slug))}">${esc(p.name)}</a>` : `<span class="region">${esc(p.name)}</span>`}${p.kind ? `<small class="kind">${esc(p.kind)}</small>` : ""}`,
      last: { head: "Hotel", cell: (p) => (p.slug ? `<a class="hotel-link" href="${esc(O.placeHref(cat, slug, p.name, p.slug))}">Gli hotel <span class="arrow">→</span></a>` : `<span class="muted">non misurati</span>`) },
      foot: `<span>${baseHTML(`${domande(nq)} ${esc(about)}, poste più volte a cinque assistenti AI. A pari presenza viene prima la località che l'AI nomina più spesso per prima.`)}</span>`,
    }) : `<p class="empty-note">Non ci sono domande di confronto ${esc(about)}.</p>`;

    main.innerHTML = head + tocHTML([["localita", "Le località"], ["chi-racconta", "Chi racconta"], ["fonti", "Le fonti"], ["domande", "Le domande"]])
    + sectionHTML({
      id: "localita", n: 1, label: "Le località",
      title: `Le località più nominate ${O.prep(region)}`,
      sub: `In quante risposte l'AI propone ogni località come meta. I luoghi citati solo come riferimento («vicino a Firenze») non contano. ${varNote} Le località con «Gli hotel» hanno una pagina con gli hotel che l'AI raccomanda.`,
      body: placesBody
        + (others.length ? `<p class="also"><span>Hotel misurati anche a</span>${others.map(([name, s]) => `<a class="pill pill-link" href="${esc(O.placeHref(cat, slug, name, s))}">${esc(name)}</a>`).join("")}</p>` : "")
        + (r.placeEngines.length ? `
          <h3 class="sub-h">Motore per motore</h3>
          <p class="sub-p">Le prime dieci località: in quante risposte ogni assistente le propone. Ogni percentuale va letta da sola: una risposta nomina di solito più località, quindi la somma supera 100.</p>
          ${matrixHTML({ head: "Località", rows: r.placeEngines.map(mxRow), label: "Le prime dieci località, motore per motore", link: (x) => placeLink(x.name) })}
          ${baseHTML(`${domande(nq)} ${esc(about)}.`)}` : ""),
    })
    + sectionHTML({
      id: "chi-racconta", n: 2, label: "Chi racconta il territorio",
      title: "Chi racconta questo territorio",
      sub: `Ogni volta che l'AI risponde ${esc(cat === "regione" ? O.onRegion(region) : `${O.ON_CAT[cat]} ${O.prep(region)}`)} cita delle fonti. Se cita un intermediario invece del sito ufficiale, il territorio lo racconta chi ci guadagna sopra.`,
      body: mixHTML(r.mix, "qui") + (r.dmoEngines.length ? `
        <h3 class="sub-h">Sito per sito, motore per motore</h3>
        <p class="sub-p">In quante risposte l'AI cita come fonte un sito di promozione turistica, sulle domande della categoria nella regione tranne quelle sugli hotel. La prima riga è il sito che copre di più la regione.</p>
        ${matrixHTML({ head: "Sito di promozione", rows: r.dmoEngines.map(mxRow), label: "Siti di promozione turistica, motore per motore" })}` : `<p class="empty-note">Nessun sito di promozione turistica citato in queste risposte.</p>`),
    })
    + sectionHTML({
      id: "fonti", n: 3, label: "Le fonti",
      title: "In quante risposte compaiono siti di promozione e hotel",
      sub: `Sulle domande della categoria nella regione, tranne quelle sugli hotel: la quota di risposte che cita almeno un sito di promozione turistica, il sito di un hotel, un'OTA, altre fonti. ${varNote}`,
      body: statsHTML(r.stats) + `
        <div class="fonti-grid">
          ${directHTML(r.direct)}
          ${pairsHTML(r.enginePairs)}
          ${r.otas.length ? `<div class="card otas-card"><p class="mix-h">Per confronto: le OTA più citate</p>${miniRankHTML(r.otas.map(row), { head: "Le OTA più citate" })}<p class="o-note">In quante risposte compare ciascuna. Gli intermediari che l'AI cita invece dei siti di promozione turistica e degli hotel.</p></div>` : ""}
        </div>`,
    })
    + sectionHTML({
      id: "domande", n: 4, label: "Le domande",
      title: "Le domande che facciamo ogni mese",
      sub: "Ognuna nasce da una ricerca vera su Google. Sotto ciascuna, le località che l'AI nomina di più e in quante risposte cita un sito di promozione turistica o il sito di un hotel.",
      more: `<a class="link-more" href="${esc(siteUrl(`${cat}/${slug}`))}#le-risposte" target="_blank" rel="noopener">Le risposte per intero, sul sito <span class="arrow">↗</span></a>`,
      body: questionsHTML(r.questions, { linkName: placeLink }),
    });
    finish(title);
  }

  // ---------- Place: the hotels ----------

  async function renderPlace() {
    const cat = params.get("c"), slug = params.get("r"), ps = params.get("l");
    if (!O.cats[cat] || !O.hasRegionPage(cat, slug) || !/^[a-z0-9-]+$/.test(ps ?? "")) return notFound("Questa località non ha una pagina nell'osservatorio.");
    let p;
    try {
      p = await load(`data/categorie/${cat}/${slug}/${ps}.json`);
    } catch {
      return notFound("Questa località non ha una pagina nell'osservatorio.");
    }
    const label = O.cats[cat].label;
    const me = p.inRegion ? row(p.inRegion) : null;
    const hotels = p.hotels.map(row);
    const hq = p.hotelQuestions;
    const hotelBase = hq != null
      ? `${domande(hq)} sugli hotel di ${esc(p.name)}, quelle che la gente cerca davvero su Google: ${thousands(p.hotelVolume)} ricerche l'anno. Le poniamo più volte ogni mese a ognuno dei cinque assistenti.`
      : esc(p.hotelNote ?? "");
    const direct = p.direct;

    main.innerHTML = headHTML({
      crumbs: [["Italia", "index.html"], [label, O.catHref(cat)], [p.region, O.regionHref(cat, slug)], [p.name, null]],
      kicker: kickerNow(cat === "regione" ? `${p.region} in generale` : `${label} · ${p.region}`),
      title: p.name,
      dek: "Gli hotel che l'AI raccomanda nelle domande su questa località, e le fonti che cita quando risponde.",
      facts: [
        me ? [cap(O.AMONG[cat](p.region)), `${O.ordinal(me.rank)} ${O.deltaHTML(me)} <span class="was">${pct(me.now)} delle risposte</span>`] : [cap(O.AMONG[cat](p.region)), `oltre le prime 15 <span class="was"><a href="${esc(O.regionHref(cat, slug))}">la classifica</a></span>`],
        hq != null ? ["Domande sugli hotel", `${thousands(hq)} <span class="was">${thousands(p.hotelVolume)} ricerche l'anno su Google</span>`] : null,
        direct ? ["Sito diretto contro OTA", `${pct(direct.hotel)} <span class="was">contro ${pct(direct.ota)} alle OTA</span>`] : null,
      ].filter(Boolean),
      photo: O.photo(p.name) ? p.name : null,
      site: siteUrl(`${cat}/${slug}/${ps}`),
    }) + tocHTML([["hotel", "Gli hotel"], ["chi-racconta", "Chi racconta"], ["domande", "Le domande"]])
    + sectionHTML({
      id: "hotel", n: 1, label: "Gli hotel",
      title: "Gli hotel che l'AI raccomanda",
      sub: `I primi dieci hotel per presenza: in quante risposte ognuno viene nominato. Nomi diversi della stessa struttura sono raggruppati. ${varNote}`,
      body: (hotels.length ? rankingHTML({ head: "Hotel", rows: hotels, foot: `<span>${baseHTML(hotelBase)}</span>` }) : `<p class="empty-note">Nessun hotel ricorre nelle risposte di questa rilevazione.</p>`)
        + (p.hotelEngines.length ? `
          <h3 class="sub-h">Motore per motore</h3>
          <p class="sub-p">Gli stessi hotel: in quante risposte ogni assistente li nomina. Ogni percentuale va letta da sola: una risposta nomina di solito più hotel, quindi la somma supera 100.</p>
          ${matrixHTML({ head: "Hotel", rows: p.hotelEngines.map(mxRow), label: "Gli hotel, motore per motore" })}` : ""),
    })
    + sectionHTML({
      id: "chi-racconta", n: 2, label: "Chi racconta il territorio",
      title: `Chi racconta ${p.name}`,
      sub: `Le fonti che l'AI cita quando risponde alle domande su ${esc(p.name)}.`,
      body: `<div class="fonti-grid two">
        ${directHTML(direct)}
        ${p.sources.length ? `<div class="card otas-card"><p class="mix-h">Le cinque fonti più citate</p>${miniRankHTML(p.sources.map(([rank, name, kind, now]) => ({ rank, name, kind, now, status: "none" })), { head: "Le cinque fonti più citate", kindCol: true })}<p class="o-note">In quante risposte su ${esc(p.name)} compare ciascuna.${p.questions ? ` Base: ${domande(p.questions.n)}.` : ""}</p></div>` : ""}
      </div>`,
    })
    + sectionHTML({
      id: "domande", n: 3, label: "Le domande",
      title: "Le domande che facciamo ogni mese",
      sub: "Ognuna nasce da una ricerca vera su Google. Sotto ciascuna, gli hotel che l'AI nomina di più e in quante risposte cita un sito di promozione turistica o il sito di un hotel.",
      more: `<a class="link-more" href="${esc(siteUrl(`${cat}/${slug}/${ps}`))}#le-risposte" target="_blank" rel="noopener">Le risposte per intero, sul sito <span class="arrow">↗</span></a>`,
      body: questionsHTML(p.questions),
    })
    + `<div class="wrap back-row"><a class="link-more" href="${esc(O.regionHref(cat, slug))}"><span class="arrow">←</span> ${esc(cat === "regione" ? `${p.region} in generale` : `${label} · ${p.region}`)}: tutte le località</a></div>`;
    finish(`${p.name} · ${label}`);
  }

  // ---------- Explore: everything that has a page ----------

  async function renderExplore() {
    const e = await load("data/esplora.json");
    const nPlaces = e.categories.reduce((a, c) => a + c.places, 0);
    const cats = O.CAT_ORDER.map((id) => e.categories.find((c) => c.id === id)).filter(Boolean);
    main.innerHTML = headHTML({
      crumbs: [["Italia", "index.html"], ["Esplora", null]],
      kicker: kickerNow("Esplora"),
      title: "Tutte le categorie, le regioni e le località",
      dek: `${cats.length - 1} categorie più la regione in generale, ${e.regions.length} regioni, ${thousands(nPlaces)} località con gli hotel misurati: tutto quello che si può aprire nell'osservatorio, in una pagina.`,
      site: `${O.SITE}/it/esplora`,
    }) + tocHTML([["categorie", "Le categorie"], ["regioni", "Le regioni"], ["localita", "Le località"]])
    + sectionHTML({
      id: "categorie", n: 1, label: "Le categorie",
      title: "Le categorie",
      sub: "Ogni categoria apre la classifica delle regioni in Italia, con le fonti e le domande.",
      body: `<ul class="cat-cards">${cats.map((c) => {
        const top = O.regionTable(c.id)[0];
        return `<li><a class="card cat-card" href="${esc(O.catHref(c.id))}">
          <span class="cc-name">${esc(O.cats[c.id].label)}</span>
          <span class="cc-meta">${plural(c.regions.length, "regione", "regioni")}${c.places ? ` · ${plural(c.places, "località", "località")} con gli hotel` : ""}</span>
          ${top ? `<span class="cc-top">Prima: <b>${esc(top.region)}</b> ${pct(top.now)}</span>` : ""}
          <span class="arrow" aria-hidden="true">→</span>
        </a></li>`;
      }).join("")}</ul>`,
    })
    + sectionHTML({
      id: "regioni", n: 2, label: "Le regioni",
      title: "Le regioni",
      sub: "Scegli una regione per scendere alle sue categorie e alle sue località, qui sotto.",
      body: `<ul class="region-chips">${e.regions.map((r) => {
        const n = Object.values(r.places).reduce((a, v) => a + v.length, 0);
        return `<li><a class="pill pill-link" href="#${esc(r.slug)}"><b>${esc(r.name)}</b><span>${plural(r.cats.length, "categoria", "categorie")} · ${plural(n, "località", "località")}</span></a></li>`;
      }).join("")}</ul>`,
    })
    + sectionHTML({
      id: "localita", n: 3, label: "Le località",
      title: "Le località, regione per regione",
      sub: "Il nome della regione apre la sua pagina generale, la categoria apre la classifica delle località in quella regione, la località apre la classifica dei suoi hotel. Sono elencate le località di cui l'osservatorio misura gli hotel.",
      more: `<label class="search"><span class="sr-only">Cerca una località</span><input type="search" id="find" placeholder="Cerca una località o una regione" autocomplete="off"></label>`,
      body: `<p class="find-note" id="find-note" aria-live="polite"></p><div class="atlas">${e.regions.map((r) => `
        <section class="card atlas-region" id="${esc(r.slug)}" aria-labelledby="${esc(r.slug)}-h" data-region="${esc(r.name.toLowerCase())}">
          <h3 id="${esc(r.slug)}-h">${O.hasRegionPage("regione", r.slug) ? `<a href="${esc(O.regionHref("regione", r.slug))}">${esc(r.name)}</a>` : esc(r.name)}</h3>
          <dl>${O.CAT_ORDER.filter((c) => c !== "regione" && r.cats.includes(c)).map((c) => `
            <div class="atlas-cat">
              <dt><a href="${esc(O.regionHref(c, r.slug))}">${esc(O.cats[c].label)}</a></dt>
              <dd>${(r.places[c] ?? []).length
                ? `<ul>${r.places[c].map(([name, s]) => `<li data-name="${esc(name.toLowerCase())}"><a href="${esc(O.placeHref(c, r.slug, name, s))}">${esc(name)}</a></li>`).join("")}</ul>`
                : `<span class="none">Hotel non misurati in nessuna località</span>`}</dd>
            </div>`).join("")}
          </dl>
        </section>`).join("")}
      </div>`,
    });
    const input = document.getElementById("find");
    const note = document.getElementById("find-note");
    const norm = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    input.addEventListener("input", () => {
      const q = norm(input.value);
      let hits = 0;
      main.querySelectorAll(".atlas-region").forEach((sec) => {
        const regionHit = !q || norm(sec.dataset.region).includes(q);
        let any = false;
        sec.querySelectorAll("li[data-name]").forEach((li) => {
          const ok = regionHit || norm(li.dataset.name).includes(q);
          li.hidden = !ok;
          if (ok) { any = true; if (q && !regionHit) hits += 1; }
        });
        sec.querySelectorAll(".atlas-cat").forEach((d) => {
          d.hidden = !!q && !regionHit && !d.querySelector("li[data-name]:not([hidden])");
        });
        sec.hidden = !!q && !regionHit && !any;
        if (q && regionHit) hits += sec.querySelectorAll("li[data-name]").length;
      });
      note.textContent = q ? (hits ? `${plural(hits, "località trovata", "località trovate")}.` : "Nessuna località con questo nome. Prova con la regione.") : "";
    });
    finish("Esplora");
  }

  const run = { categoria: renderCategory, regione: renderRegion, localita: renderPlace, esplora: renderExplore }[level];
  run().catch((err) => {
    console.warn(err);
    notFound("Non riesco a leggere i dati di questa pagina.");
  });
})();
