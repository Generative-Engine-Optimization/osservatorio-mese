// Shared model and UI pieces for the landing and the month page. The numbers come from js/data.js, which copies what
// osservatorio.rankwit.ai publishes: presence, variation on the month before and whether it is beyond the oscillation.
// Nothing here recomputes a presence or a variation; it only picks, sorts and words them.
(() => {
  const D = window.OSS_DATA;
  const SITE = D.source.site;
  const MINUS = "−";
  // Highlights (ticker, movers, stories) only from rankings with at least this many questions: with fewer, one answer
  // moves many points. The full table on the month page shows everything, with the number of questions.
  const MIN_Q = 4;

  const REP = D.reports;
  const NOW = REP[REP.length - 1];
  const PREV = REP[REP.length - 2];
  const NEXT = { month: "novembre", published: "1 dicembre 2026" };

  const thousands = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const fmt = (n, d = 1) => n.toLocaleString("it-IT", { maximumFractionDigits: d });
  const pct = (n) => (n == null ? "–" : n > 0 && n < 1 ? "<1%" : `${fmt(n, 0)}%`);
  // «nel 49%» but «nell'80%», «all'11%», «l'8%»: the article follows how the number is read.
  const vowelNum = (v) => { const n = Math.round(v); return v < 1 || n === 1 || n === 11 || String(n)[0] === "8"; };
  const pNel = (v) => (vowelNum(v) ? "nell'" : "nel ") + pct(v);
  const pAl = (v) => (vowelNum(v) ? "all'" : "al ") + pct(v);
  const pIl = (v) => (vowelNum(v) ? "l'" : "il ") + pct(v);
  const signed = (n) => (n > 0 ? "+" : n < 0 ? MINUS : "±") + fmt(Math.abs(n));
  const points = (n) => `${fmt(Math.abs(n))} ${Math.abs(n) === 1 ? "punto" : "punti"}`;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const at = (m) => (/^a/.test(m) ? "ad " : "a ") + m;
  const At = (m) => cap(at(m));
  const ordinal = (n) => `${n}°`;
  const WORDS = { 1: "una", 2: "due", 3: "tre", 4: "quattro", 5: "cinque", 6: "sei", 7: "sette", 8: "otto", 9: "nove", 10: "dieci" };

  const cats = Object.fromEntries(D.categories.map((c) => [c.id, c]));
  const CAT_ORDER = ["regione", "mare", "montagna", "laghi", "borghi", "citta", "neve"];
  const regionName = (slug) => D.regionNames[slug] ?? slug;

  const IN = { Lazio: "nel Lazio", Marche: "nelle Marche", Molise: "in Molise" };
  const prep = (region) => IN[region] ?? `in ${region}`;
  const ON_REGION = {
    Lazio: "sul Lazio", Piemonte: "sul Piemonte", Veneto: "sul Veneto", Molise: "sul Molise", "Trentino-Alto Adige": "sul Trentino-Alto Adige",
    "Friuli-Venezia Giulia": "sul Friuli-Venezia Giulia", Marche: "sulle Marche", Abruzzo: "sull'Abruzzo", "Emilia-Romagna": "sull'Emilia-Romagna",
  };
  const onRegion = (r) => ON_REGION[r] ?? `sulla ${r}`;
  const ofRegion = (r) => onRegion(r).replace(/^su/, "de");
  const ART = {
    Lazio: "il Lazio", Piemonte: "il Piemonte", Veneto: "il Veneto", Molise: "il Molise", "Trentino-Alto Adige": "il Trentino-Alto Adige",
    "Friuli-Venezia Giulia": "il Friuli-Venezia Giulia", Marche: "le Marche", Abruzzo: "l'Abruzzo", "Emilia-Romagna": "l'Emilia-Romagna",
  };
  const withArt = (r) => ART[r] ?? `la ${r}`;
  const ON_CAT = { mare: "sul mare", montagna: "sulla montagna", laghi: "sui laghi", borghi: "sui borghi", citta: "sulle città", neve: "sulla neve" };
  // «nelle risposte alle domande …»
  const about = (cat, region) => (cat === "regione" ? `${onRegion(region)} in generale` : `${ON_CAT[cat]} ${prep(region)}`);
  const aboutItaly = (cat) => (cat === "regione" ? "sull'Italia in generale" : `${ON_CAT[cat]} in Italia`);
  const AMONG = {
    regione: (r) => `fra le località più nominate ${prep(r)}`,
    mare: (r) => `fra le località di mare ${prep(r)}`,
    montagna: (r) => `fra le località di montagna ${prep(r)}`,
    laghi: (r) => `fra i laghi ${prep(r)}`,
    borghi: (r) => `fra i borghi ${prep(r)}`,
    citta: (r) => `fra le città ${prep(r)}`,
    neve: (r) => `fra le località sciistiche ${prep(r)}`,
  };
  const context = (cat, region) => (cat === "regione" ? `${region} in generale` : `${cats[cat].label} · ${region}`);
  const catPage = (cat, slug) => `${SITE}/it/categorie/${cat}${slug ? `/${slug}` : ""}`;
  const isDmo = (name) => D.dmos.includes(name);

  // The pages inside the prototype: one template per level, the page in the address (one JSON file each in data/).
  const regionSlugs = Object.fromEntries(Object.entries(D.regionNames).map(([slug, name]) => [name, slug]));
  const regionPages = new Set(D.regions.filter((r) => r[10]).map((r) => `${r[0]}/${r[1]}`));
  const anchorId = (name) => `l-${String(name).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
  const catHref = (cat) => `categoria.html?c=${cat}`;
  const hasRegionPage = (cat, slug) => regionPages.has(`${cat}/${slug}`);
  // A region without its own page in a category (none in the sitemap) opens the category's ranking.
  const regionHref = (cat, slug) => (hasRegionPage(cat, slug) ? `regione.html?c=${cat}&r=${slug}` : catHref(cat));
  const regionHrefByName = (cat, name) => regionHref(cat, regionSlugs[name] ?? "");
  // A place with its hotels measured has its own page; the others open their row in the region's ranking.
  const placeHref = (cat, slug, place, placeSlug) => (placeSlug ? `localita.html?c=${cat}&r=${slug}&l=${placeSlug}` : `${regionHref(cat, slug)}#${anchorId(place)}`);
  const isExternal = (href) => /^https?:/.test(href);
  const linkAttrs = (href) => `href="${String(href).replace(/"/g, "&quot;")}"${isExternal(href) ? ' target="_blank" rel="noopener"' : ""}`;

  function prevRankOf(rank, move, by) {
    if (move === "up") return rank + by;
    if (move === "down") return rank - by;
    if (move === "flat") return rank;
    return null;
  }

  const places = D.places.map(([cat, slug, name, kind, rank, now, delta, status, move, by, placeSlug]) => {
    const group = `${cat}/${slug}`;
    return {
      id: `${cat}-${slug}-${name}`, cat, slug, region: regionName(slug), name, kind, rank, now, delta, status, move, by,
      prevRank: prevRankOf(rank, move, by), group, nq: D.questions[group] ?? 0,
      engines: D.placeEngines[`${group}/${name}`] ?? null, href: regionHref(cat, slug), site: catPage(cat, slug),
      placeSlug: placeSlug ?? null, page: placeHref(cat, slug, name, placeSlug),
    };
  });
  const groups = new Map();
  for (const p of places) {
    if (!groups.has(p.group)) groups.set(p.group, []);
    groups.get(p.group).push(p);
  }

  const regionRows = D.regions.map(([cat, slug, rank, now, delta, status, move, by, source, sourceShare]) => ({
    cat, slug, region: regionName(slug), rank, now, delta, status, move, by, prevRank: prevRankOf(rank, move, by),
    source: source ? { name: source, share: sourceShare, dmo: isDmo(source) } : null, href: regionHref(cat, slug),
  }));
  const regionTable = (cat) => regionRows.filter((r) => r.cat === cat).sort((a, b) => a.rank - b.rank);

  // The top three of a category in a past survey, from its report page.
  const topIn = (rep, cat) => rep.top[cat] ?? [];

  function engineSpread(p) {
    if (!p.engines) return null;
    const list = D.engines.map((name, i) => ({ name, v: p.engines[i] })).filter((e) => e.v != null);
    const hi = list.reduce((a, b) => (b.v > a.v ? b : a));
    const lo = list.reduce((a, b) => (b.v < a.v ? b : a));
    return { hi, lo, gap: hi.v - lo.v };
  }

  // A probable reason for a movement, read in the same month's numbers: who moves the other way in the same ranking,
  // whether the whole ranking moves, how much the engines disagree, how many questions are behind it. A hypothesis,
  // never a verified cause: the page says so next to it.
  function whyLines(r) {
    const up = r.status === "up";
    const list = groups.get(r.group) ?? [];
    const comp = list.filter((x) => ["up", "down", "stable"].includes(x.status));
    const same = comp.filter((x) => x.status === r.status).length;
    const other = comp.filter((x) => x.status === (up ? "down" : "up")).length;
    const lines = [];
    if (same >= 4 && same >= 3 * Math.max(other, 1) - 1) {
      lines.push(up
        ? `Non sale da sola: in questa classifica salgono ${same} località su ${comp.length}. Probabilmente a ${NOW.month} le risposte nominano più luoghi di prima, e ${r.name} è fra quelle che ne approfittano di più.`
        : `Non scende da sola: in questa classifica scendono ${same} località su ${comp.length}. Probabilmente a ${NOW.month} le risposte si concentrano su meno luoghi.`);
    } else {
      const opp = list.filter((x) => x !== r && x.status === (up ? "down" : "up") && Math.abs(x.delta) >= 3).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 2);
      if (opp.length) {
        const names = opp.map((x) => `${x.name} (${signed(x.delta)})`).join(" e ");
        lines.push(up
          ? `Nella stessa classifica ${opp.length === 1 ? "scende" : "scendono"} ${names}: è probabile che le risposte abbiano dato a ${r.name} parte dello spazio tolto ${opp.length === 1 ? "a lei" : "a loro"}.`
          : `Nella stessa classifica ${opp.length === 1 ? "sale" : "salgono"} ${names}: è probabile che le risposte abbiano spostato spazio da ${r.name} verso ${opp.length === 1 ? "di lei" : "di loro"}.`);
      }
    }
    if (!up && r.rank === 1) lines.push("Resta comunque prima: perde terreno, ma nessuna la supera.");
    const sp = engineSpread(r);
    if (sp && sp.gap >= 40) {
      lines.push(`Gli assistenti la vedono in modo molto diverso: ${sp.hi.name} la propone ${pNel(sp.hi.v)} delle risposte, ${sp.lo.name} ${pNel(sp.lo.v)}. Quando uno di loro cambia idea, la media si muove di molto.`);
    } else if (r.nq <= 5) {
      lines.push(`Dietro questa classifica ci sono ${WORDS[r.nq] ?? r.nq} domande: poche risposte in più o in meno bastano a spostare molti punti.`);
    }
    return lines;
  }

  function storyTexts(type, s) {
    const month = NOW.month, prevMonth = PREV.month;
    if (type === "salita" || type === "discesa") {
      const p = s.place;
      const up = type === "salita";
      const lines = [`${At(month)} ${p.name} compare ${pNel(p.now)} delle risposte alle domande ${about(p.cat, p.region)}: ${points(p.delta)} ${up ? "in più" : "in meno"} rispetto ${at(prevMonth)}.`];
      if (p.prevRank && p.prevRank !== p.rank) lines.push(`Passa dal ${ordinal(p.prevRank)} al ${ordinal(p.rank)} posto ${AMONG[p.cat](p.region)}.`);
      else lines.push(`Resta al ${ordinal(p.rank)} posto ${AMONG[p.cat](p.region)}.`);
      lines.push(`La variazione supera l'oscillazione che misuriamo fra le risposte dello stesso mese: per questo la contiamo come un movimento. Dietro questa classifica ci sono ${WORDS[p.nq] ?? p.nq} domande, poste più volte a cinque assistenti AI.`);
      const sp = engineSpread(p);
      if (sp && sp.gap >= 25) lines.push(`Gli assistenti non la vedono allo stesso modo: ${sp.hi.name} la propone ${pNel(sp.hi.v)} delle risposte, ${sp.lo.name} ${pNel(sp.lo.v)}.`);
      return { title: `${p.name} ${up ? "sale" : "scende"} di ${points(p.delta)}`, lines };
    }
    if (type === "sorpresa") {
      const p = s.place;
      return {
        title: `${p.name} entra in classifica`,
        lines: [
          `${At(prevMonth)} ${p.name} non era in classifica ${AMONG[p.cat](p.region)}. ${At(month)} compare ${pNel(p.now)} delle risposte alle domande ${about(p.cat, p.region)} ed entra al ${ordinal(p.rank)} posto.`,
          `È la località nuova con la presenza più alta fra le classifiche con almeno ${WORDS[MIN_Q]} domande. Qui le domande sono ${WORDS[p.nq] ?? p.nq}.`,
        ],
      };
    }
    if (type === "primo" && s.kind === "regione") {
      const { now, before, beforeNow, second } = s;
      const lines = [
        `Cambia la prima regione nelle risposte alle domande ${aboutItaly(s.cat)}. ${At(month)} l'AI nomina almeno una località ${ofRegion(now.region)} ${pNel(now.now)} delle risposte: ${points(now.delta)} in più rispetto ${at(prevMonth)}.`,
        `${At(prevMonth)} la prima era ${withArt(before[0])}, con ${pIl(before[1])}${s.tie ? `, a pari presenza con ${withArt(s.tie[0])}` : ""}.${beforeNow ? ` Ora è al ${ordinal(beforeNow.rank)} posto, con ${pIl(beforeNow.now)}.` : ""}${second && second !== beforeNow ? ` Al secondo posto c'è ${withArt(second.region)}, con ${pIl(second.now)}.` : ""}`,
        `La salita ${ofRegion(now.region).replace(/^de/, "de")} supera l'oscillazione dello stesso mese: non è un pari merito, è un sorpasso.`,
      ];
      if (now.source) lines.push(`Alle domande ${about(s.cat, now.region)}, la fonte che l'AI cita di più è ${now.source.name}: compare ${pNel(now.source.share)} delle risposte.`);
      return { title: `${cats[s.cat].label}: ${withArt(now.region)} passa al primo posto`, lines };
    }
    if (type === "primo") {
      const { now, before } = s;
      return {
        title: `${context(s.cat, now.region)}: ${now.name} passa davanti a ${before.name}`,
        lines: [
          `Cambia il primo nome ${AMONG[s.cat](now.region)}. ${At(month)} ${now.name} compare ${pNel(now.now)} delle risposte, ${before.name} ${pNel(before.now)}.`,
          `${now.name} sale di ${points(now.delta)}, oltre l'oscillazione dello stesso mese.`,
        ],
      };
    }
    if (type === "fonte") {
      const { region, next, prior, history, others } = s;
      const kind = (name) => (isDmo(name) ? `${name}, un sito di promozione turistica` : name);
      const lines = [
        `Alle domande ${about(s.cat, region)}, la fonte che l'AI cita più spesso adesso è ${kind(next.name)}: compare ${pNel(next.share)} delle risposte.`,
      ];
      const sameBefore = history.slice(0, -1).filter((h) => h.source);
      if (sameBefore.length && sameBefore.every((h) => h.source === prior)) {
        lines.push(`Da ${sameBefore[0].month} a ${sameBefore[sameBefore.length - 1].month} la prima fonte era sempre ${prior}.`);
      } else {
        lines.push(`${At(PREV.month)} la prima fonte era ${prior}.`);
      }
      if (others.length) lines.push(`Succede anche ${others.map((o) => `nelle domande ${about(o.cat, o.region)}, dove passa prima ${o.next}`).join(", e ")}.`);
      return { title: `${cats[s.cat].label} ${prep(region)}: ${next.name} diventa la fonte più citata`, lines };
    }
    return { title: "", lines: [] };
  }

  const STORY_KINDS = [
    { type: "primo", kicker: "Cambia il primo" },
    { type: "salita", kicker: "La salita più grande" },
    { type: "discesa", kicker: "La discesa più grande" },
    { type: "sorpresa", kicker: "La sorpresa" },
    { type: "fonte", kicker: "Cambia la fonte" },
  ];

  function pickLeader() {
    for (const cat of CAT_ORDER) {
      const first = regionTable(cat)[0];
      if (!first || first.move !== "up") continue;
      const before = topIn(PREV, cat)[0];
      if (!before || before[0] === first.region) continue;
      const rows = regionTable(cat);
      const runner = topIn(PREV, cat)[1];
      const tie = runner && runner[1] === before[1] ? runner : null;
      return { kind: "regione", cat, now: first, before, tie, beforeNow: rows.find((r) => r.region === before[0]), second: rows[1] };
    }
    for (const list of groups.values()) {
      const a = list.find((p) => p.rank === 1 && p.move === "up");
      if (!a || a.nq < MIN_Q) continue;
      const b = list.filter((p) => p !== a && p.prevRank != null && p.prevRank < a.prevRank).sort((x, y) => x.prevRank - y.prevRank)[0];
      if (b) return { kind: "posto", cat: a.cat, now: a, before: b };
    }
    return null;
  }

  function sourceSwitches() {
    const out = [];
    for (const cat of CAT_ORDER) {
      for (const [region, , source] of topIn(NOW, cat)) {
        const before = topIn(PREV, cat).find((r) => r[0] === region);
        if (!before || before[2] === source) continue;
        const row = regionRows.find((r) => r.cat === cat && r.region === region);
        const history = REP.map((rep) => ({ month: rep.month, source: topIn(rep, cat).find((r) => r[0] === region)?.[2] ?? null }));
        out.push({ cat, region, prior: before[2], next: { name: source, share: row?.source?.name === source ? row.source.share : null }, presence: row?.now ?? 0, history });
      }
    }
    return out.sort((a, b) => isDmo(b.next.name) - isDmo(a.next.name) || b.presence - a.presence);
  }

  function computeWave() {
    const rows = places.filter((p) => p.status !== "none");
    const comparable = rows.filter((r) => ["up", "down", "stable"].includes(r.status));
    const up = comparable.filter((r) => r.status === "up").sort((a, b) => b.delta - a.delta);
    const down = comparable.filter((r) => r.status === "down").sort((a, b) => a.delta - b.delta);
    const stable = comparable.filter((r) => r.status === "stable");
    const entered = rows.filter((r) => r.status === "new").sort((a, b) => b.now - a.now || b.nq - a.nq);
    const solid = (list) => list.filter((r) => r.nq >= MIN_Q);
    const leaders = [...groups.values()].map((list) => list.find((p) => p.rank === 1 && p.move === "up")).filter(Boolean);
    const switches = sourceSwitches();
    const leader = pickLeader();
    const fonte = switches[0] && { ...switches[0], others: switches.slice(1, 3).filter((o) => isDmo(o.next.name)).map((o) => ({ cat: o.cat, region: o.region, next: o.next.name })) };
    const picks = {
      primo: leader,
      salita: solid(up)[0] && { place: solid(up)[0] },
      discesa: solid(down)[0] && { place: solid(down)[0] },
      sorpresa: (solid(entered)[0] ?? entered[0]) && { place: solid(entered)[0] ?? entered[0] },
      fonte,
    };
    const stories = STORY_KINDS.filter((k) => picks[k.type]).map((k) => ({ ...k, ...picks[k.type], ...storyTexts(k.type, picks[k.type]) }));
    return {
      wave: NOW, prevWave: PREV, next: NEXT, rows, comparable, up, down, stable, entered, leaders, switches, stories,
      solidUp: solid(up), solidDown: solid(down), solidStable: solid(stable), solidEntered: solid(entered),
      rankings: groups.size,
    };
  }
  let cached;
  const wave = () => (cached ??= computeWave());

  // Four things to know, each one a published number with its base.
  function learnings() {
    const out = [];
    const papers = NOW.altre.find((a) => a[0] === "Giornali e riviste");
    if (papers && papers[1] > NOW.perFonti.dmo) {
      out.push({
        kicker: "Chi racconta l'Italia",
        photo: "Edicola",
        big: `${fmt(papers[1], 0)} su 100`,
        title: "L'AI cita più i giornali che i siti del turismo",
        text: `Su 100 fonti citate nelle risposte ${at(NOW.month)}, ${fmt(papers[1], 0)} sono giornali e riviste, ${fmt(NOW.perFonti.dmo, 0)} siti di promozione turistica e ${fmt(NOW.perFonti.ota, 0)} OTA. I più citati fra i giornali: ${papers[2].split(" · ").join(", ")}.`,
        base: `Tutte le fonti citate nella rilevazione del ${NOW.published}`,
        href: `${SITE}/it/report/${NOW.id}`,
      });
    }
    const general = regionTable("regione").filter((r) => r.source);
    const italia = general.filter((r) => r.source.name === "Italia.it");
    const own = general.filter((r) => r.source.dmo);
    if (italia.length) {
      out.push({
        kicker: "La fonte più citata",
        photo: "Val d'Orcia",
        big: `${italia.length} su ${general.length}`,
        title: `Per ${WORDS[italia.length] ?? italia.length} regioni su ${general.length} parla Italia.it`,
        text: `Quando l'AI risponde su una regione in generale, in ${italia.length} regioni su ${general.length} la fonte che cita di più è Italia.it, il portale nazionale. Il sito di promozione della regione è primo in ${WORDS[own.length] ?? own.length}: ${own.map((r) => r.region).join(", ").replace(/, ([^,]*)$/, " e $1")}.`,
        base: "Le domande sulle regioni in generale, regione per regione",
        href: catHref("regione"),
      });
    }
    const ota = NOW.shares.ota, hotel = NOW.shares.hotel;
    if (ota[1] != null) {
      out.push({
        kicker: "OTA e hotel",
        photo: "Hotel",
        big: `${signed(ota[1])} punti`,
        title: ota[1] < 0 ? "Meno OTA nelle risposte" : "Più OTA nelle risposte",
        text: `${At(NOW.month)} ${pIl(ota[0])} delle risposte cita almeno un'OTA, ${points(ota[1])} ${ota[1] < 0 ? "in meno" : "in più"} rispetto ${at(PREV.month)}. Il sito di un hotel compare ${pNel(hotel[0])} delle risposte (${signed(hotel[1])} punti): su 100 fonti citate, ${fmt(NOW.perFonti.hotel, 0)} è il sito di un hotel.`,
        base: `Tutte le risposte della rilevazione del ${NOW.published}, confrontate con ${PREV.month} sulle domande comuni`,
        href: `${SITE}/it/report/${NOW.id}`,
      });
    }
    const spread = places.filter((p) => p.engines && p.nq >= MIN_Q && p.now >= 30)
      .map((p) => ({ p, sp: engineSpread(p) })).sort((a, b) => b.sp.gap - a.sp.gap)[0];
    if (spread) {
      const { p, sp } = spread;
      out.push({
        kicker: "Cinque assistenti",
        photo: p.name,
        big: `${pct(sp.hi.v)} e ${pct(sp.lo.v)}`,
        title: "Stessa domanda, risposte diverse",
        text: `Alle domande ${about(p.cat, p.region)}, ${sp.hi.name} propone ${p.name} ${pNel(sp.hi.v)} delle risposte, ${sp.lo.name} ${pNel(sp.lo.v)}. Le domande sono le stesse: cambia solo l'assistente.`,
        base: `${cap(WORDS[p.nq] ?? String(p.nq))} domande ${about(p.cat, p.region)}, motore per motore`,
        href: p.href,
      });
    }
    return out;
  }

  function deltaHTML(r, { compact = false } = {}) {
    if (r.status === "new") return `<span class="delta delta-new" title="Entra in classifica questo mese">• ${compact ? "nuova" : "entra"}</span>`;
    if (r.delta == null) return `<span class="delta delta-stable">–</span>`;
    const cls = r.status === "up" ? "delta-up" : r.status === "down" ? "delta-down" : "delta-stable";
    const glyph = r.status === "up" ? "▲ " : r.status === "down" ? "▼ " : "";
    const value = r.status === "stable" ? signed(r.delta) : fmt(Math.abs(r.delta));
    const title = r.status === "stable" ? `Stabile: ${signed(r.delta)} punti, dentro l'oscillazione dello stesso mese` : `${signed(r.delta)} punti rispetto ${at(PREV.month)}`;
    return `<span class="delta ${cls}" title="${esc(title)}">${glyph}${value}</span>`;
  }

  function rankMoveHTML(r) {
    if (r.status === "new") return `<span class="move move-new" title="Entra in classifica">•</span>`;
    if (r.move === "up") return `<span class="move move-up" title="Sale di ${r.by} ${r.by === 1 ? "posizione" : "posizioni"}">▲${r.by}</span>`;
    if (r.move === "down") return `<span class="move move-down" title="Scende di ${r.by} ${r.by === 1 ? "posizione" : "posizioni"}">▼${r.by}</span>`;
    if (r.move === "flat") return `<span class="move move-same" title="Stessa posizione, o un cambio dentro l'oscillazione">–</span>`;
    return "";
  }

  // A small bar per engine, for a place: drawn with the place's own numbers, nothing else.
  function enginesHTML(p) {
    if (!p.engines) return "";
    return `<div class="engines" role="img" aria-label="${esc(`${p.name}, presenza nelle risposte di ogni assistente`)}">${D.engines.map((name, i) => {
      const v = p.engines[i];
      return `<div class="eng"><span class="eng-name">${esc(name)}</span><span class="eng-track"><span class="eng-fill" style="width:${v ?? 0}%"></span></span><span class="eng-val">${pct(v)}</span></div>`;
    }).join("")}</div>`;
  }

  const photo = (name) => D.photos[name] ?? null;
  const used = new Set();
  function creditHTML(name) {
    const p = photo(name);
    if (!p) return "";
    used.add(name);
    return `<a class="credit" href="${esc(p.url)}" target="_blank" rel="noopener">Foto ${esc(p.author)} · ${esc(p.license)}</a>`;
  }
  // The place whose photo stands for a story: the place itself, or the first of the region in that category.
  function storyPhotoName(s) {
    if (s.place) return s.place.name;
    if (s.type === "primo" && s.kind === "regione") return groups.get(`${s.cat}/${s.now.slug}`)?.[0]?.name ?? null;
    if (s.type === "primo") return s.now.name;
    if (s.type === "fonte") {
      const row = regionRows.find((r) => r.cat === s.cat && r.region === s.region);
      return row ? groups.get(`${s.cat}/${row.slug}`)?.[0]?.name ?? null : null;
    }
    return null;
  }

  // A small square photo for lists; the thumbnail sits in img/t/ with the same file name.
  function thumbHTML(name) {
    const p = photo(name);
    if (!p) return `<span class="thumb thumb-empty" aria-hidden="true"></span>`;
    used.add(name);
    return `<img class="thumb" src="img/t/${esc(p.file)}" alt=""${p.pos ? ` style="object-position:${esc(p.pos)}"` : ""} loading="lazy">`;
  }
  function photoImgHTML(name, cls = "") {
    const p = photo(name);
    if (!p) return "";
    used.add(name);
    return `<img${cls ? ` class="${cls}"` : ""} src="img/${esc(p.file)}" alt=""${p.pos ? ` style="object-position:${esc(p.pos)}"` : ""} loading="lazy">`;
  }

  function tickerItems() {
    const W = wave();
    const movers = [...W.solidUp, ...W.solidDown].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 16);
    const steady = [...W.solidStable].sort((a, b) => b.now - a.now).slice(0, 6);
    const entered = W.solidEntered;
    const items = [];
    const pool = [...movers];
    let si = 0, ei = 0;
    while (pool.length) {
      items.push(pool.shift());
      if (items.length % 3 === 0 && si < steady.length) items.push(steady[si++]);
      if (items.length % 5 === 0 && ei < entered.length) items.push(entered[ei++]);
    }
    while (ei < entered.length) items.push(entered[ei++]);
    const regions = regionTable("regione").filter((r) => r.status === "up" || r.status === "down");
    return { items, regions };
  }

  // Every name in the ticker opens its page; the second copy of the track is only there for the loop.
  function tickerItemHTML(r, region = false, copy = false) {
    const name = region ? r.region : r.name;
    const ctx = region ? "La regione in generale" : context(r.cat, r.region);
    const href = region ? r.href : r.page;
    return `<li class="tk tk-${r.status}"><a class="tk-name" href="${esc(href)}"${copy ? ' tabindex="-1"' : ""}>${esc(name)}</a><span class="tk-ctx">${esc(ctx)}</span><span class="tk-val">${pct(r.now)}</span>${deltaHTML(r, { compact: true })}</li>`;
  }

  function renderTicker(el) {
    const { items, regions } = tickerItems();
    const body = (copy) => items.map((r) => tickerItemHTML(r, false, copy)).join("") + regions.map((r) => tickerItemHTML(r, true, copy)).join("");
    el.innerHTML = `
      <div class="ticker-label"><span class="ticker-live"></span><span>${esc(cap(NOW.month))}<br><small>su ${esc(PREV.month)}</small></span></div>
      <div class="ticker-window" tabindex="0" aria-label="Movimenti di ${esc(NOW.month)} rispetto a ${esc(PREV.month)}">
        <ul class="ticker-track">${body(false)}</ul><ul class="ticker-track" aria-hidden="true">${body(true)}</ul>
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

  const LOGO = `<svg viewBox="0 0 1533 220" fill="currentColor" role="img" aria-label="Rankwit"><path d="M127.27 157.73L114.55 185.78L99.4199 219.12H99.4099L84.2798 185.78L28.3398 62.46H58.5999L99.4099 152.42L112.13 124.4L127.27 157.73Z"/><path d="M279.09 0L207.02 158.86L191.88 125.51L248.83 0H279.09Z"/><path d="M179.68 152.42L194.81 185.77L179.68 219.12H179.67L164.55 185.77L139.55 130.67L124.41 97.32L139.55 63.96L156.21 27.23H12.35L0 0H198.83L186.47 27.23L154.68 97.32L179.68 152.42Z"/><path d="M478.81 196.85L435.63 197.1L397.68 128.85H364.88V197.05H323.7V18.4497L405.65 18.4097C417.14 18.4097 428.04 19.6197 438.51 23.6297C452.95 29.0097 463.53 39.8097 467.8 54.5997C475.05 82.6597 466.72 113.07 437.48 123.66L478.81 196.84V196.85ZM426.04 88.7097C429.47 81.5697 429.23 73.4497 426.29 66.5097C422.7 60.2197 416.56 57.7797 409.41 56.7797L364.89 56.7097V98.5997L408.6 98.4397C415.79 97.3397 422.26 95.4897 426.04 88.7097Z"/><path d="M1100.1 18.5499L1123.46 18.4399L1081.21 197.06L1048.15 197.04L1015.14 41.2899L982.13 197.06L949.3 197.04L907.08 18.5099L930.41 18.4999L966.05 173.45L999.08 18.4599L1031.65 18.3999L1064.51 174.09L1100.1 18.5499Z"/><path d="M861.93 131.44L902.39 196.98L855.15 197.09L816.82 132.29L815.24 134.83L815.28 197.05L773.89 197.06V18.4297L815.28 18.4097L815.25 128.94L816.82 131.59L856.01 68.8997H900.93L861.93 131.44Z"/><path d="M483.27 160.8C482.72 146.1 488.73 133.45 501.56 126.7C520.15 116.92 544.16 117.75 565.65 120.58C566.3 114.84 565.39 108.32 560.7 104.24C556.16 100.29 550.16 99.4198 544.09 98.4998C526.64 97.9598 509.82 100.63 493 106.19L502.52 69.9598C520.16 65.1898 538.01 63.3198 556.14 64.2498C564.96 64.9598 573.19 66.3298 581.25 69.6798C592.65 74.4098 600.71 83.5497 604.32 95.3497C605.84 101.52 607.01 107.67 607.02 114.3L607.07 194.45C583.930 198.84 561.06 201.43 537.61 200.58C526.97 200.19 516.98 198.45 507.41 194.85C492.550 189.47 483.89 176.86 483.28 160.81L483.27 160.8ZM565.9 168.71L565.82 144.03C555.47 142.56 545.77 141.91 536.22 143.92C529.59 145.86 525.43 150.16 525.72 156.65C526.39 171.86 549.73 170.74 565.9 168.7V168.71Z"/><path d="M710.02 116.32C709.61 107.34 704.42 101.75 696.04 100.59C687.85 99.4599 679.47 100.24 670.68 101.880V197.05H629.26V69.8499C648.13 66.7599 666.72 64.2399 685.82 63.2399C698.24 62.5899 710.09 63.9099 721.51 67.7799C742.44 75.3399 750.78 91.1999 751.47 113.11V197.04H710.06L710.02 116.31V116.32Z"/><path d="M1451.03 143.29L1370.47 143.22L1349.89 197.09L1327.57 196.95L1397.26 18.5197L1423.71 18.4097L1494.13 196.92L1471.7 197.08L1451.05 143.29H1451.03ZM1443.7 124.23L1410.51 40.1897L1377.43 124.32L1443.7 124.23Z"/><path d="M1274.71 176.45V197.09L1243.69 196.92C1229.66 196.85 1214.14 193.08 1208.2 180.3C1205.48 174.44 1204.08 167.84 1204.07 161.14L1204.01 94.6296H1180.52L1180.43 74.4796L1204.03 74.4496V33.6996L1226.05 33.6196L1226.09 74.4296L1274.46 74.4696V94.6296H1226.07L1226.16 154.51C1226.17 161.470 1229.11 167.44 1234.02 171.78C1238.69 174.44 1243.97 176.25 1249.51 176.29L1274.71 176.44V176.45Z"/><path d="M1532.88 196.97L1511.33 197.09V18.4697L1532.88 18.4797V196.97Z"/><path d="M1160.85 196.87L1139.12 197.11V74.48H1160.84L1160.85 196.87Z"/><path d="M1157.5 36.1097C1162.52 39.0197 1163.52 44.7898 1161.78 49.8198C1160.23 54.2898 1155.21 56.6998 1149.83 56.6898C1144.75 56.6898 1139.84 54.5198 1138.16 50.3898C1136.14 45.4298 1136.91 39.6697 1141.42 36.5997C1146.05 33.4397 1152.36 33.1297 1157.51 36.1097H1157.5Z"/></svg>`;

  function initChrome() {
    document.querySelectorAll("[data-logo]").forEach((el) => { el.innerHTML = LOGO; });
    document.querySelectorAll("[data-published]").forEach((el) => { el.textContent = NOW.published; });
    document.querySelectorAll("[data-fetched]").forEach((el) => {
      el.textContent = new Date(`${D.source.fetched}T12:00:00`).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
    });
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
  }

  const monthHref = (hash = "", cat = "") => `mese.html?m=${NOW.id}${cat ? `&cat=${cat}` : ""}${hash}`;
  function wireMonthLinks() {
    document.querySelectorAll("[data-month-link]").forEach((a) => { a.href = monthHref(a.dataset.monthLink || ""); });
  }

  // Credits for the photos this page actually shows.
  function renderCredits(el) {
    const names = [...used];
    el.closest("#crediti")?.toggleAttribute("hidden", !names.length);
    el.innerHTML = names.map((name) => {
      const p = D.photos[name];
      return `<li>${esc(name)}: <a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.author)}</a>, ${esc(p.license)}, Wikimedia Commons</li>`;
    }).join("");
  }

  function breadthHTML(W) {
    const n = W.comparable.length, u = W.up.length, s = W.stable.length, d = W.down.length;
    return `
      <p class="board-title">Nelle ${W.rankings} classifiche per regione, ${thousands(n)} località confrontabili con ${esc(PREV.month)}</p>
      <div class="breadth" role="img" aria-label="${u} salgono, ${s} stabili, ${d} scendono">
        <span class="b-up" style="flex:${u}" data-tip="${u} salgono"></span><span class="b-stable" style="flex:${s}" data-tip="${thousands(s)} stabili"></span><span class="b-down" style="flex:${d}" data-tip="${d} scendono"></span>
      </div>
      <dl class="breadth-legend">
        <div class="k-up"><dt>salgono</dt><dd>${u}</dd></div>
        <div class="k-stable"><dt>stabili</dt><dd>${thousands(s)}</dd></div>
        <div class="k-down"><dt>scendono</dt><dd>${d}</dd></div>
      </dl>
      <div class="board-foot"><span><b>${W.entered.length}</b> ${W.entered.length === 1 ? "entra" : "entrano"} in classifica</span><span><b>${W.leaders.length}</b> ${W.leaders.length === 1 ? "cambio" : "cambi"} al primo posto</span><span><b>${W.switches.length}</b> ${W.switches.length === 1 ? "cambio" : "cambi"} di fonte fra le prime tre regioni</span></div>`;
  }

  window.OSS = {
    D, SITE, MIN_Q, NOW, PREV, NEXT, REP, whyLines, cats, CAT_ORDER, places, groups, regionRows, regionTable, wave, learnings, context, prep, about, aboutItaly,
    fmt, pct, pNel, pAl, pIl, signed, points, thousands, esc, cap, at, At, ordinal, WORDS, withArt, deltaHTML, rankMoveHTML, enginesHTML, photo, creditHTML, storyPhotoName, thumbHTML, photoImgHTML,
    renderTicker, initChrome, monthHref, wireMonthLinks, renderCredits, breadthHTML, catPage, isDmo, topIn,
    catHref, regionHref, regionHrefByName, placeHref, hasRegionPage, anchorId, regionSlugs, linkAttrs, isExternal, regionName,
    ofRegion, onRegion, AMONG, ON_CAT,
  };
})();
