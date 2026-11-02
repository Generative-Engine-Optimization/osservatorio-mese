// Writes js/data.js: deterministic EXAMPLE data for the prototype, not observatory measurements.
// Run: node build/gen-data.mjs
import { writeFileSync } from "node:fs";

const WAVES = [
  { id: "2026-07", month: "luglio", published: "1 agosto 2026" },
  { id: "2026-08", month: "agosto", published: "1 settembre 2026" },
  { id: "2026-09", month: "settembre", published: "1 ottobre 2026" },
  { id: "2026-10", month: "ottobre", published: "1 novembre 2026" },
];

const CATEGORIES = [
  { id: "italia", label: "Italia in generale", noun: "la regione in generale" },
  { id: "mare", label: "Mare", noun: "il mare" },
  { id: "montagna", label: "Montagna", noun: "la montagna" },
  { id: "laghi", label: "Laghi", noun: "i laghi" },
  { id: "borghi", label: "Borghi", noun: "i borghi" },
  { id: "citta", label: "Città", noun: "le città" },
  { id: "neve", label: "Neve", noun: "la neve" },
];

// [category, region, answers per month, [[name, base], ...]]
const GROUPS = [
  ["mare", "Puglia", 420, [["Monopoli"], ["Polignano a Mare"], ["Gallipoli"], ["Otranto", 33], ["Vieste", 27], ["Porto Cesareo", 18]]],
  ["mare", "Sardegna", 390, [["Villasimius", 58], ["San Teodoro", 47], ["Cala Gonone", 39], ["Stintino", 31], ["Porto Cervo", 24], ["Chia", 17]]],
  ["mare", "Sicilia", 360, [["Taormina"], ["San Vito Lo Capo", 43], ["Cefalù", 38], ["Favignana", 30], ["Marzamemi"]]],
  ["mare", "Campania", 330, [["Positano"], ["Amalfi"], ["Sorrento", 41], ["Procida", 33], ["Ischia", 28]]],
  ["mare", "Calabria", 210, [["Tropea", 64], ["Capo Vaticano", 36], ["Scilla"], ["Pizzo"]]],
  ["mare", "Liguria", 300, [["Portofino", 49], ["Camogli", 41], ["Sestri Levante", 35], ["Monterosso al Mare", 30]]],
  ["mare", "Toscana", 270, [["Isola d'Elba", 55], ["Castiglione della Pescaia", 37], ["Forte dei Marmi", 29]]],
  ["montagna", "Trentino-Alto Adige", 240, [["Val di Funes"], ["Ortisei"], ["Madonna di Campiglio", 38], ["San Martino di Castrozza", 27]]],
  ["montagna", "Valle d'Aosta", 150, [["Courmayeur", 57], ["Cogne", 41]]],
  ["montagna", "Veneto", 120, [["Alleghe", 46], ["Auronzo di Cadore", 33]]],
  ["laghi", "Lombardia", 330, [["Bellagio", 56], ["Sirmione"], ["Varenna", 41], ["Lovere", 18]]],
  ["laghi", "Veneto", 240, [["Malcesine", 49], ["Bardolino", 40], ["Lazise", 33]]],
  ["laghi", "Piemonte", 210, [["Stresa", 61], ["Orta San Giulio", 47]]],
  ["laghi", "Trentino-Alto Adige", 180, [["Riva del Garda", 62], ["Molveno", 38]]],
  ["laghi", "Umbria", 90, [["Castiglione del Lago", 52], ["Passignano sul Trasimeno", 35]]],
  ["borghi", "Liguria", 270, [["Manarola"], ["Vernazza"], ["Apricale", 21], ["Tellaro"]]],
  ["borghi", "Sardegna", 180, [["Castelsardo", 46], ["Posada", 24], ["Bosa"], ["Orgosolo"]]],
  ["borghi", "Puglia", 300, [["Alberobello"], ["Ostuni"], ["Locorotondo", 29], ["Cisternino", 22]]],
  ["borghi", "Lazio", 210, [["Civita di Bagnoregio"], ["Sperlonga"], ["Calcata"]]],
  ["borghi", "Marche", 150, [["Corinaldo", 34], ["Gradara"], ["Mondavio", 13]]],
  ["borghi", "Toscana", 330, [["San Gimignano", 62], ["Pienza", 51], ["Montepulciano", 45], ["Monteriggioni", 39]]],
  ["borghi", "Umbria", 150, [["Spello", 44], ["Bevagna", 37]]],
  ["citta", "Toscana", 360, [["Firenze", 88], ["Siena", 64], ["Lucca", 52], ["Pisa", 41]]],
  ["citta", "Lazio", 240, [["Roma", 91], ["Viterbo", 34]]],
  ["citta", "Veneto", 300, [["Venezia", 89], ["Verona", 66], ["Padova", 43]]],
  ["citta", "Campania", 210, [["Napoli", 84], ["Salerno", 38]]],
  ["citta", "Basilicata", 120, [["Matera", 93], ["Potenza", 21]]],
  ["citta", "Lombardia", 270, [["Milano", 79], ["Bergamo", 57], ["Mantova", 46]]],
  ["neve", "Veneto", 210, [["Cortina d'Ampezzo"], ["Arabba", 41], ["Falcade", 24]]],
  ["neve", "Trentino-Alto Adige", 360, [["Val Gardena", 61], ["Alta Badia", 54], ["Madonna di Campiglio", 49], ["Val di Fassa", 44]]],
  ["neve", "Valle d'Aosta", 210, [["Cervinia", 63], ["Courmayeur", 55], ["La Thuile", 34]]],
  ["neve", "Lombardia", 180, [["Livigno", 66], ["Bormio", 52]]],
  ["neve", "Piemonte", 150, [["Sestriere", 58], ["Bardonecchia", 47]]],
];

// Hand-set series for the places the monthly stories are about (null = not named that month).
const OVERRIDES = {
  "mare/Monopoli": [52.4, 53.0, 52.1, 52.9],
  "mare/Polignano a Mare": [40.9, 42.3, 41.8, 48.2],
  "mare/Gallipoli": [45.6, 44.9, 45.2, 44.6],
  "mare/Taormina": [58.0, 57.2, 51.1, 50.4],
  "mare/Marzamemi": [null, 7.7, 8.0, 9.4],
  "mare/Positano": [61.0, 54.8, 55.3, 55.0],
  "mare/Amalfi": [49.8, 50.6, 50.1, 50.9],
  "mare/Scilla": [null, null, 14.2, 15.0],
  "mare/Pizzo": [null, null, null, 9.0],
  "montagna/Val di Funes": [44.0, 46.0, 52.3, 52.0],
  "montagna/Ortisei": [50.1, 49.5, 48.8, 49.6],
  "laghi/Sirmione": [44.0, 45.1, 51.6, 51.0],
  "borghi/Manarola": [38.5, 38.0, 37.4, 36.4],
  "borghi/Vernazza": [33.0, 34.1, 35.2, 40.2],
  "borghi/Tellaro": [5.2, null, null, null],
  "borghi/Bosa": [null, null, null, 18.5],
  "borghi/Orgosolo": [8.1, 7.4, 6.2, null],
  "borghi/Alberobello": [38.1, 44.9, 45.6, 46.0],
  "borghi/Ostuni": [35.6, 36.2, 35.4, 36.0],
  "borghi/Civita di Bagnoregio": [41.0, 47.2, 47.0, 47.5],
  "borghi/Sperlonga": [45.0, 44.1, 44.8, 44.0],
  "borghi/Calcata": [null, null, 6.0, 7.1],
  "borghi/Gradara": [null, 16.4, 17.1, 16.8],
  "neve/Cortina d'Ampezzo": [72.4, 71.0, 70.6, 63.9],
};

const REGION_BASES = {
  italia: [["Toscana", 82], ["Veneto", 74], ["Campania", 68], ["Lazio", 63], ["Sicilia", 59], ["Puglia", 55], ["Lombardia", 52], ["Trentino-Alto Adige", 49], ["Liguria", 44], ["Emilia-Romagna", 40], ["Sardegna", 33], ["Umbria", 27], ["Piemonte", 25], ["Basilicata", 21], ["Valle d'Aosta", 15], ["Abruzzo", 14], ["Calabria", 12], ["Marche", 11], ["Friuli-Venezia Giulia", 7], ["Molise", 3]],
  mare: [["Sardegna", 66], ["Puglia", 61], ["Sicilia", 57], ["Campania", 49], ["Calabria", 38], ["Liguria", 35], ["Toscana", 30], ["Emilia-Romagna", 22], ["Marche", 15], ["Abruzzo", 11], ["Lazio", 10], ["Basilicata", 5]],
  montagna: [["Trentino-Alto Adige", 81], ["Valle d'Aosta", 52], ["Veneto", 47], ["Lombardia", 30], ["Piemonte", 24], ["Abruzzo", 16], ["Friuli-Venezia Giulia", 9]],
  laghi: [["Lombardia", 84], ["Veneto", 58], ["Piemonte", 51], ["Trentino-Alto Adige", 33], ["Umbria", 21], ["Lazio", 17], ["Friuli-Venezia Giulia", 6]],
  borghi: [["Toscana", 62], ["Liguria", 48], ["Puglia", 45], ["Umbria", 39], ["Lazio", 33], ["Campania", 29], ["Marche", 24], ["Sardegna", 19], ["Sicilia", 18], ["Piemonte", 15], ["Abruzzo", 12], ["Basilicata", 9]],
  citta: [["Toscana", 96], ["Lazio", 88], ["Veneto", 83], ["Lombardia", 70], ["Campania", 64], ["Sicilia", 47], ["Emilia-Romagna", 41], ["Puglia", 33], ["Basilicata", 30], ["Piemonte", 26], ["Liguria", 20], ["Umbria", 14]],
  neve: [["Trentino-Alto Adige", 85], ["Valle d'Aosta", 63], ["Veneto", 55], ["Lombardia", 48], ["Piemonte", 39], ["Abruzzo", 17], ["Friuli-Venezia Giulia", 12], ["Emilia-Romagna", 8]],
};

const SOURCES = {
  italia: { name: "Italia.it", type: "altro" },
  tripadvisor: { name: "Tripadvisor", type: "ota" },
  booking: { name: "Booking.com", type: "ota" },
  lonely: { name: "Lonely Planet", type: "altro" },
  toscana: { name: "Visit Tuscany", type: "dmo" },
  lombardia: { name: "in-Lombardia", type: "dmo" },
  trentino: { name: "Visit Trentino", type: "dmo" },
  vda: { name: "Lovevda", type: "dmo" },
  er: { name: "Emilia-Romagna Turismo", type: "dmo" },
  sardegna: { name: "Sardegna Turismo", type: "dmo" },
  calabria: { name: "Calabria Straordinaria", type: "dmo" },
};
const DMO_BY_REGION = {
  Toscana: "toscana", Lombardia: "lombardia", "Trentino-Alto Adige": "trentino", "Valle d'Aosta": "vda",
  "Emilia-Romagna": "er", Sardegna: "sardegna", Calabria: "calabria",
};

// Source series where the most cited source changes: [category/region, [key, series], [key, series]].
const SOURCE_SWITCHES = {
  "borghi/Toscana": [["tripadvisor", [38.2, 33.5, 32.9, 33.4]], ["toscana", [31.0, 36.8, 37.5, 37.1]]],
  "montagna/Valle d'Aosta": [["tripadvisor", [36.4, 35.9, 31.2, 31.8]], ["vda", [29.5, 30.8, 35.6, 35.2]]],
  "mare/Sardegna": [["tripadvisor", [34.1, 33.6, 32.4, 29.0]], ["sardegna", [24.9, 25.8, 27.1, 31.3]]],
};

function makeRng(seed) {
  let s = seed >>> 0;
  const next = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 2 ** 32; };
  const gauss = () => { let u = 0; for (let i = 0; i < 6; i++) u += next(); return (u - 3) / Math.sqrt(0.5); };
  return { next, gauss };
}
const r1 = (x) => Math.round(x * 10) / 10;
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const oscFor = (p, answers) => r1(clamp((64 * Math.sqrt((p / 100) * (1 - p / 100))) / Math.sqrt(answers), 1.2, 4));

function walk(rng, base, osc) {
  const out = [base];
  for (let i = 1; i < WAVES.length; i++) {
    const move = rng.next() < 0.12
      ? (rng.next() < 0.5 ? -1 : 1) * Math.min(5.4, osc + 0.3 + rng.next() * 2.2)
      : rng.gauss() * osc * 0.4;
    out.push(r1(clamp(out[i - 1] + move, 1, 97)));
  }
  return out;
}

function generate(seed) {
  const rng = makeRng(seed);
  const places = [];
  for (const [cat, region, answers, list] of GROUPS) {
    for (const [name, base] of list) {
      const key = `${cat}/${name}`;
      const fixed = OVERRIDES[key];
      const meanBase = fixed ? fixed.filter((v) => v != null).reduce((a, b) => a + b, 0) / fixed.filter((v) => v != null).length : base;
      const osc = oscFor(meanBase, answers);
      const series = fixed ?? walk(rng, base, osc);
      places.push([name, cat, region, series, osc, answers]);
    }
  }
  const regions = [];
  for (const [cat, list] of Object.entries(REGION_BASES)) {
    for (const [region, base] of list) {
      const series = walk(rng, base, 1.4).map((v) => r1(clamp(v, 1, 99)));
      const sw = SOURCE_SWITCHES[`${cat}/${region}`];
      let sources;
      if (sw) {
        sources = sw.map(([k, s]) => [k, s]);
      } else {
        const topKey = DMO_BY_REGION[region] && rng.next() < 0.7 ? DMO_BY_REGION[region] : rng.next() < 0.6 ? "italia" : "tripadvisor";
        const secondKey = topKey === "tripadvisor" ? "italia" : rng.next() < 0.5 ? "tripadvisor" : "booking";
        const topBase = 34 + rng.next() * 12;
        const gap = 7 + rng.next() * 8;
        sources = [
          [topKey, walk(rng, r1(topBase), 1.2)],
          [secondKey, walk(rng, r1(topBase - gap), 1.2)],
        ];
      }
      regions.push([cat, region, series, 1.4, sources]);
    }
  }
  return { places, regions };
}

// The stories must be the ones the data picks: check before writing.
function validate({ places, regions }) {
  const problems = [];
  const groups = new Map();
  for (const p of places) {
    const k = `${p[1]}/${p[2]}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(p);
  }
  const expectedLeaderChange = { 1: "borghi/Lazio", 2: "montagna/Trentino-Alto Adige", 3: "borghi/Liguria" };
  for (let w = 1; w < WAVES.length; w++) {
    for (const [k, list] of groups) {
      const leader = (i) => list.filter((p) => p[3][i] != null).sort((a, b) => b[3][i] - a[3][i])[0]?.[0];
      if (leader(w) !== leader(w - 1) && expectedLeaderChange[w] !== k) problems.push(`leader change w${w} ${k}`);
    }
    const moves = places.filter((p) => !OVERRIDES[`${p[1]}/${p[0]}`] && p[3][w] != null && p[3][w - 1] != null)
      .map((p) => Math.abs(p[3][w] - p[3][w - 1]));
    if (Math.max(...moves) >= 5.9) problems.push(`random move too large w${w}`);
    for (const r of regions) {
      if (SOURCE_SWITCHES[`${r[0]}/${r[1]}`]) continue;
      const [a, b] = r[4];
      if ((a[1][w] >= b[1][w]) !== (a[1][w - 1] >= b[1][w - 1])) problems.push(`source switch w${w} ${r[0]}/${r[1]}`);
    }
  }
  return problems;
}

let seed = 20261026;
let data;
for (let tries = 0; tries < 5000; tries++) {
  data = generate(seed);
  const problems = validate(data);
  if (!problems.length) break;
  if (tries === 4999) throw new Error(problems.join("; "));
  seed++;
}

const photos = {
  "Polignano a Mare": { file: "polignano.jpg", author: "ParisTaras", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Polignano_a_mare_-Lama_Monachile.jpg" },
  "Cortina d'Ampezzo": { file: "cortina.jpg", author: "kallerna", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Faloria_Cortina_d%27Ampezzo_10.jpg" },
  Bosa: { file: "bosa.jpg", author: "Zsuzsanna Tóth", license: "CC0", url: "https://commons.wikimedia.org/wiki/File:Bosa-2298388_960_720.jpg" },
  Vernazza: { file: "vernazza.jpg", author: "utente Flickr 150594450@N07", license: "CC BY 2.0", url: "https://commons.wikimedia.org/wiki/File:Vernazza_and_the_sea,_Cinque_Terre,_Italy.jpg" },
  Sirmione: { file: "sirmione.jpg", author: "Arne Müseler", license: "CC BY-SA 3.0 DE", url: "https://commons.wikimedia.org/wiki/File:Italy_-_Sirmione.jpg" },
  Taormina: { file: "taormina.jpg", author: "Carsten Steger", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Aerial_image_of_the_coast_of_Taormina_(view_from_the_southeast).jpg" },
  Scilla: { file: "scilla.jpg", author: "Benjamin Smith", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Scilla_-_Vista_da_via_Cristoforo_Colombo_-_6.jpg" },
  "Val di Funes": { file: "funes.jpg", author: "Wolfgang Moroder", license: "CC BY-SA 3.0", url: "https://commons.wikimedia.org/wiki/File:Die_Geislerspitzen_und_Sankt_Magdalena.jpg" },
  Alberobello: { file: "alberobello.jpg", author: "Benjamin Smith", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Alberobello_-_Trulli_del_Rione_Monti_-_07.jpg" },
  Positano: { file: "positano.jpg", author: "Luca Aless", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Positano_veduta_003.jpg" },
  "Civita di Bagnoregio": { file: "civita.jpg", author: "New2022", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Civita_(Bagnoregio)_-_Panorama.jpg" },
  Gradara: { file: "gradara.jpg", author: "Toni Pecoraro", license: "Pubblico dominio", url: "https://commons.wikimedia.org/wiki/File:Gradara_II.jpg" },
};

const out = {
  example: true,
  seed,
  waves: WAVES,
  categories: CATEGORIES,
  sources: SOURCES,
  places: data.places,
  regions: data.regions,
  photos,
};
writeFileSync(
  new URL("../js/data.js", import.meta.url),
  "// Generated by build/gen-data.mjs. EXAMPLE data for the prototype: not observatory measurements.\n" +
    `window.OSS_DATA = ${JSON.stringify(out)};\n`,
);
console.log(`seed ${seed}: ${data.places.length} places, ${data.regions.length} region rows`);
