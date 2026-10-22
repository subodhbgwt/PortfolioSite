// Home: a price chart under the intro, with the things I work on flagged on it.
// The tape ticks along on its own, sliding smoothly between ticks. Over the
// chart a crosshair reads off the price. The project list further down is
// built from data.js.
setupPage("home");

(() => {
  // --- the project list ---
  const list = document.getElementById("projects");
  list.innerHTML = PROJECTS.map((p) =>
    `<li><a href="project.html?p=${p.slug}"><i>${p.year}</i><b>${p.name}</b><span>${p.text.split(". ")[0]}.</span></a></li>`
  ).join("");

  // --- the chart ---
  const canvas = document.getElementById("home-canvas");
  const WORDS = ["QUANT RESEARCH", "AI AGENTS", "BACKTESTING", "OPTIONS PRICING", "RISK", "AUTOMATION"];
  const INK = "#ececea", BG = "#090909", GREY = "#6f6f6c", ACCENT = "#ff8a1f";
  const SANS = (wt, px) => `${wt} ${px}px Archivo, "Helvetica Neue", Arial, sans-serif`;
  const MONO = (wt, px) => `${wt} ${px}px "IBM Plex Mono", ui-monospace, Menlo, monospace`;

  // a mean-reverting walk, seeded so the chart looks the same on every visit
  let seed = 20260;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const N = 180;
  let level = 0;
  const next = () => (level = level * 0.985 + gauss() * 0.9);
  const pts = Array.from({ length: N }, next);

  const flags = WORDS.map((t, j) => ({ t, i: Math.round((j + 0.5) * (N / WORDS.length)), up: j % 2 === 0, len: 46 }));

  let mouseX = null; // over the chart, for the crosshair
  let shift = 0;     // how far the tape has slid towards the next tick, 0 to 1
  function draw() {
    const { ctx, w, h } = fitCanvas(canvas);
    ctx.clearRect(0, 0, w, h);
    const right = w - 56, mid = h * 0.5;
    const dx = right / (N - 1);
    const X = (i) => (i - shift) * dx;
    // fixed scale, so the line moves inside the chart rather than the chart rescaling
    // the line stays inside the chart even on a big swing
    const Y = (i) => Math.max(8, Math.min(h - 8, mid - pts[i] * h * 0.028));
    const price = (y) => (100 * Math.exp(((mid - y) / (h * 0.028)) * 0.01)).toFixed(2);

    ctx.font = MONO(400, 9);
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    for (let g = -1; g <= 1; g++) {
      const y = mid - g * h * 0.3;
      ctx.fillStyle = "rgba(236,236,234,0.08)";
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

    // flags, and which one the crosshair is on
    let hot = null, bd = 30;
    if (mouseX !== null) for (const f of flags) { const d = Math.abs(X(f.i) - mouseX); if (d < bd) { bd = d; hot = f; } }
    for (const f of flags) {
      const x = X(f.i), y = Y(f.i), on = f === hot;
      // a flag whose label would run off the top or bottom points the other way
      const up = f.up ? y - f.len - 20 > 0 : y + f.len + 20 > h;
      const ty = y + (up ? -1 : 1) * f.len;
      ctx.strokeStyle = on ? ACCENT : "rgba(236,236,234,0.55)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + 0.5, y); ctx.lineTo(x + 0.5, ty); ctx.stroke();
      ctx.fillStyle = on ? ACCENT : INK;
      ctx.fillRect(x - 2.5, y - 2.5, 5, 5);
      ctx.font = SANS(700, 12);
      ctx.textBaseline = up ? "bottom" : "top";
      const tw = ctx.measureText(f.t).width;
      const lx = Math.min(x + 5, right - tw);
      const ly = ty + (up ? -3 : 3);
      ctx.fillStyle = BG;
      ctx.fillRect(lx - 2, up ? ly - 15 : ly - 1, tw + 4, 16);
      ctx.fillStyle = INK;
      ctx.fillText(f.t, lx, ly);
    }

    // crosshair with the price where it meets the line
    if (mouseX !== null && mouseX < right) {
      const i = Math.max(0, Math.min(N - 1, Math.round(mouseX / dx + shift)));
      ctx.fillStyle = "rgba(255,138,31,0.6)";
      ctx.fillRect(Math.round(X(i)), 0, 1, h);
      ctx.fillStyle = ACCENT;
      ctx.fillRect(X(i) - 3, Y(i) - 3, 6, 6);
      ctx.font = MONO(500, 10);
      ctx.textBaseline = "middle";
      const label = price(Y(i));
      const lw = ctx.measureText(label).width;
      const lx = X(i) + lw + 14 > right ? X(i) - lw - 10 : X(i) + 8;
      ctx.fillStyle = BG;
      ctx.fillRect(lx - 3, Y(i) - 18, lw + 6, 14);
      ctx.fillStyle = ACCENT;
      ctx.fillText(label, lx, Y(i) - 11);
    }
  }

  // the tape moves one point every TICK ms, sliding smoothly in between
  const TICK = 220;
  let last = null;
  function frame(now) {
    if (last === null) last = now;
    while (now - last > TICK) {
      last += TICK;
      pts.shift(); pts.push(next());
      for (const f of flags) if (--f.i < 0) f.i += N; // a flag that leaves on the left comes back on the right
    }
    shift = (now - last) / TICK;
    draw();
    requestAnimationFrame(frame);
  }

  window.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    mouseX = e.clientY >= r.top && e.clientY <= r.bottom ? e.clientX - r.left : null;
  });
  canvas.addEventListener("pointerleave", () => { mouseX = null; });
  document.fonts.ready.then(() => { draw(); if (!REDUCED) requestAnimationFrame(frame); });
})();
