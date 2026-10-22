// Home: a price chart under the intro, with the things I work on flagged on it.
// It is drawn once and stays still; hovering a flag just highlights it.
// The project list further down is built from data.js.
setupPage("home");

(() => {
  // --- the project list ---
  const list = document.getElementById("projects");
  list.innerHTML = PROJECTS.map((p) =>
    `<li><a href="project.html?p=${p.slug}"><i>${p.year}</i><b>${p.name}</b><span>${p.text.split(". ")[0]}.</span></a></li>`
  ).join("");

  // --- the chart ---
  const canvas = document.getElementById("home-canvas");
  const BOLD = ["QUANT RESEARCH", "AI AGENTS", "BACKTESTING", "OPTIONS PRICING", "RISK", "AUTOMATION"];
  const FAINT = ["LOOK-AHEAD BIAS", "MONTE CARLO", "KTH", "FINANCIAL MATHS"];
  const INK = "#0b0b0b", PAPER = "#e6e6e3", GREY = "#8a8a86", ACCENT = "#ff8a1f";
  const SANS = (wt, px) => `${wt} ${px}px Archivo, "Helvetica Neue", Arial, sans-serif`;
  const MONO = (wt, px) => `${wt} ${px}px "IBM Plex Mono", ui-monospace, Menlo, monospace`;

  // a mean-reverting walk, seeded so the chart is the same on every visit
  let seed = 20260;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const N = 180;
  let level = 0;
  const pts = Array.from({ length: N }, () => (level = level * 0.985 + gauss() * 0.9));

  const order = [];
  for (let i = 0; i < Math.max(BOLD.length, FAINT.length); i++) {
    if (BOLD[i]) order.push({ t: BOLD[i], bold: true });
    if (FAINT[i]) order.push({ t: FAINT[i], bold: false });
  }
  const flags = order.map((k, j) => ({ ...k, i: Math.round((j + 0.5) * (N / order.length)), up: j % 2 === 0, len: k.bold ? 46 : 30 }));

  let hot = null;
  function draw() {
    const { ctx, w, h } = fitCanvas(canvas);
    ctx.clearRect(0, 0, w, h);
    const right = w - 56, mid = h * 0.5;
    const dx = right / (N - 1);
    const lo = Math.min(...pts), hi = Math.max(...pts);
    const X = (i) => i * dx;
    const Y = (i) => mid - ((pts[i] - (lo + hi) / 2) / (hi - lo)) * h * 0.5;
    const price = (y) => (100 * Math.exp(((mid - y) / (h * 0.5)) * (hi - lo) * 0.01)).toFixed(2);

    ctx.font = MONO(400, 9);
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    for (let g = -1; g <= 1; g++) {
      const y = mid - g * h * 0.3;
      ctx.fillStyle = "rgba(11,11,11,0.07)";
      ctx.fillRect(0, Math.round(y), right, 1);
      ctx.fillStyle = GREY;
      ctx.fillText(price(y), right + 8, y);
    }

    ctx.beginPath();
    pts.forEach((_, i) => (i ? ctx.lineTo(X(i), Y(i)) : ctx.moveTo(X(i), Y(i))));
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = ACCENT;
    ctx.fillRect(X(N - 1) - 3, Y(N - 1) - 3, 6, 6);

    for (const f of flags) {
      const x = X(f.i), y = Y(f.i), on = f === hot;
      const ty = y + (f.up ? -1 : 1) * f.len;
      ctx.strokeStyle = on ? ACCENT : f.bold ? "rgba(11,11,11,0.6)" : "rgba(11,11,11,0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + 0.5, y); ctx.lineTo(x + 0.5, ty); ctx.stroke();
      ctx.fillStyle = on ? ACCENT : INK;
      ctx.fillRect(x - 2.5, y - 2.5, 5, 5);
      ctx.font = f.bold ? SANS(700, 12) : MONO(400, 10);
      ctx.textBaseline = f.up ? "bottom" : "top";
      const tw = ctx.measureText(f.t).width;
      const lx = Math.min(x + 5, right - tw);
      const ly = ty + (f.up ? -3 : 3);
      ctx.fillStyle = PAPER;
      ctx.fillRect(lx - 2, f.up ? ly - 15 : ly - 1, tw + 4, 16);
      ctx.fillStyle = on || f.bold ? INK : GREY;
      ctx.fillText(f.t, lx, ly);
    }
    // keep the flag positions so hovering can find them
    flags.forEach((f) => { f.x = X(f.i); });
  }

  canvas.addEventListener("pointermove", (e) => {
    const x = e.clientX - canvas.getBoundingClientRect().left;
    let best = null, bd = 40;
    for (const f of flags) { const d = Math.abs(f.x - x); if (d < bd) { bd = d; best = f; } }
    if (best !== hot) { hot = best; draw(); }
  });
  canvas.addEventListener("pointerleave", () => { if (hot) { hot = null; draw(); } });
  window.addEventListener("resize", draw);
  document.fonts.ready.then(draw);
})();
