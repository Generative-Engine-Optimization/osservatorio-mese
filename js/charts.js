// Small SVG line charts for the month page, drawn at the container's real width so text never scales down.
(() => {
  const O = window.OSS;

  function domain(vals) {
    const min = Math.min(...vals), max = Math.max(...vals);
    let lo = Math.floor((min - 4) / 5) * 5, hi = Math.ceil((max + 4) / 5) * 5;
    if (hi - lo < 20) {
      lo = Math.floor(((lo + hi) / 2 - 10) / 5) * 5;
      hi = lo + 20;
    }
    return [Math.max(0, lo), Math.min(100, Math.max(hi, lo + 20))];
  }

  // series: [{ name, values, color }]; draws months 0..upto. One series gets an area wash, two get a legend above.
  function lineChart(series, upto, { width = 520, height = 200, label = "" } = {}) {
    const n = upto + 1;
    const months = O.D.waves.slice(0, n).map((w) => w.month);
    const all = series.flatMap((s) => s.values.slice(0, n).filter((v) => v != null));
    const [lo, hi] = domain(all);
    const m = { l: 40, r: width < 420 ? 64 : 84, t: 14, b: 30 };
    const iw = width - m.l - m.r, ih = height - m.t - m.b;
    const x = (i) => m.l + (n === 1 ? iw / 2 : (i * iw) / (n - 1));
    const y = (v) => m.t + (1 - (v - lo) / (hi - lo)) * ih;
    const step = hi - lo <= 25 ? 5 : 10;
    let g = "";
    for (let t = lo; t <= hi; t += step) {
      g += `<line class="grid" x1="${m.l}" x2="${width - m.r}" y1="${y(t)}" y2="${y(t)}"/><text class="ylab" x="${m.l - 8}" y="${y(t) + 4}" text-anchor="end">${t}%</text>`;
    }
    months.forEach((mo, i) => { g += `<text class="xlab" x="${x(i)}" y="${height - 8}" text-anchor="${n > 1 && i === 0 ? "start" : n > 1 && i === n - 1 ? "end" : "middle"}">${O.esc(mo.slice(0, 3))}</text>`; });

    const ends = [];
    series.forEach((s) => {
      const vals = s.values.slice(0, n);
      let d = "";
      vals.forEach((v, i) => { if (v != null) d += `${d && vals[i - 1] != null ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`; });
      if (series.length === 1) {
        const idx = vals.map((v, i) => (v != null ? i : -1)).filter((i) => i >= 0);
        if (idx.length > 1) g += `<path class="area" style="fill:${s.color}" d="${d}L${x(idx[idx.length - 1])},${y(lo)}L${x(idx[0])},${y(lo)}Z"/>`;
      }
      g += `<path class="line" style="stroke:${s.color}" d="${d}"/>`;
      vals.forEach((v, i) => { if (v != null && (i === n - 1 || vals.filter((q) => q != null).length === 1)) g += `<circle class="pt" cx="${x(i)}" cy="${y(v)}" r="4.5" style="fill:${s.color}"/>`; });
      const last = vals[n - 1];
      if (last != null) ends.push({ y: y(last), text: O.pct(last), name: s.name });
    });
    ends.sort((a, b) => a.y - b.y);
    for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 16) ends[i].y = ends[i - 1].y + 16;
    ends.forEach((e) => { g += `<text class="endlab" x="${x(n - 1) + 10}" y="${e.y + 4}">${e.text}</text>`; });

    const colW = n > 1 ? iw / (n - 1) : iw;
    months.forEach((mo, i) => {
      const tip = `${O.cap(mo)}: ${series.map((s) => `${series.length > 1 ? `${s.name} ` : ""}${s.values[i] == null ? "non nominata" : O.pct(s.values[i])}`).join(" · ")}`;
      g += `<g class="col"><line class="cross" x1="${x(i)}" x2="${x(i)}" y1="${m.t}" y2="${height - m.b}"/><rect class="hit" x="${Math.max(0, x(i) - colW / 2)}" y="0" width="${colW}" height="${height}" data-tip="${O.esc(tip)}"/></g>`;
    });
    return `<svg class="chart" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${O.esc(label)}">${g}</svg>`;
  }

  function legend(series) {
    return `<div class="legend">${series.map((s) => `<span><i style="background:${s.color}"></i>${O.esc(s.name)}</span>`).join("")}</div>`;
  }

  window.OSS_CHARTS = { lineChart, legend };
})();
