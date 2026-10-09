// Home: a live price tape. A random walk draws itself across the screen and
// keeps ticking along, and the things I work on sit on it as annotated
// events, like news flags on a chart. Scroll, swipe or click to move on.
setupPage("home");

(() => {
  const canvas = document.getElementById("home-canvas");
  const BOLD = ["QUANT RESEARCH", "AI AGENTS", "BACKTESTING", "OPTIONS PRICING", "SYSTEMS", "RISK", "AUTOMATION", "PYTHON"];
  const FAINT = ["LOOK-AHEAD BIAS", "MONTE CARLO", "OCAML", "KTH", "STOCKHOLM", "FINANCIAL MATHS"];
  const INK = "#0b0b0b", PAPER = "#e6e6e3", GREY = "#8a8a86", ACCENT = "#ff8a1f";
  const SANS = (wt, px) => `${wt} ${px}px Archivo, "Helvetica Neue", Arial, sans-serif`;
  const MONO = (wt, px) => `${wt} ${px}px "IBM Plex Mono", ui-monospace, Menlo, monospace`;

  // times in ms: the line draws in, then the flags go up
  const T_DRAW = 1500, T_FLAGS = 1100, T_GROWN = 2600;
  const TICK_MS = 160;

  let start = null;
  let mx = -1;
  let skipIntro = REDUCED || location.hash === "#about" || sessionStorage.getItem("seen-intro") === "1";
  window.addEventListener("pointermove", (e) => { mx = e.clientX; });

  // the walk: mean-reverting, so it wanders but stays on screen
  const N = 220;
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  let level = 0;
  const nextPoint = () => (level = level * 0.985 + gauss() * 0.9);
  const pts = Array.from({ length: N }, nextPoint);

  // flags: bold and faint words alternate, spread evenly along the tape
  const order = [];
  for (let i = 0; i < Math.max(BOLD.length, FAINT.length); i++) {
    if (BOLD[i]) order.push({ t: BOLD[i], bold: true });
    if (FAINT[i]) order.push({ t: FAINT[i], bold: false });
  }
  const gapPts = N / order.length;
  const flags = order.map((k, j) => ({
    ...k,
    i: Math.round((j + 0.5) * gapPts),
    up: j % 2 === 0,
    len: k.bold ? 70 + Math.random() * 50 : 38 + Math.random() * 26,
  }));

  let shift = 0, lastTick = null;
  function tape(ctx, w, h, t, now) {
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, w, h);

    // move the tape along one point at a time, sliding smoothly in between
    if (lastTick === null) lastTick = now;
    if (!REDUCED && t > T_DRAW) {
      while (now - lastTick > TICK_MS) {
        lastTick += TICK_MS;
        pts.shift(); pts.push(nextPoint());
        for (const f of flags) if (--f.i < 0) f.i += N; // a flag that leaves on the left comes back on the right
      }
      shift = (now - lastTick) / TICK_MS;
    } else lastTick = now;

    const left = w * 0.04, right = w * 0.9, mid = h * 0.52;
    const dx = (right - left) / (N - 2);
    const scale = h * 0.075;
    const X = (i) => left + (i - shift) * dx;
    const Y = (i) => mid - pts[i] * scale * 0.3;
    const price = (v) => (100 * Math.exp(v * 0.01)).toFixed(2);

    // faint grid with price labels on the right, like a chart axis
    ctx.font = MONO(400, 9);
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    for (let g = -2; g <= 2; g++) {
      const y = mid - g * h * 0.12;
      ctx.fillStyle = "rgba(11,11,11,0.07)";
      ctx.fillRect(left, Math.round(y), right - left, 1);
      ctx.fillStyle = GREY;
      ctx.fillText(price((mid - y) / (scale * 0.3)), right + 10, y);
    }

    // how much of the line has been drawn so far
    const reveal = Math.min(N - 1, Math.floor(N * Math.min(1, t / T_DRAW) ** 0.8));

    // the line, with a very light fill under it
    ctx.beginPath();
    ctx.moveTo(X(0), Y(0));
    for (let i = 1; i <= reveal; i++) ctx.lineTo(X(i), Y(i));
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.lineTo(X(reveal), mid + h * 0.3);
    ctx.lineTo(X(0), mid + h * 0.3);
    const fade = ctx.createLinearGradient(0, mid - h * 0.2, 0, mid + h * 0.3);
    fade.addColorStop(0, "rgba(11,11,11,0.06)");
    fade.addColorStop(0.75, "rgba(11,11,11,0)");
    ctx.fillStyle = fade;
    ctx.fill();

    // the head of the tape: a square and the latest price
    const hx = X(reveal), hy = Y(reveal);
    ctx.fillStyle = ACCENT;
    ctx.fillRect(hx - 3, hy - 3, 6, 6);
    ctx.fillStyle = INK;
    ctx.font = MONO(500, 10);
    ctx.fillText(price(pts[reveal]), hx + 9, hy);

    // which flag is the mouse over (by x)
    let near = null, nd = 50;
    for (const f of flags) {
      if (f.i > reveal) continue;
      const d = Math.abs(X(f.i) - mx);
      if (d < nd) { nd = d; near = f; }
    }

    const grow = Math.min(1, Math.max(0, (t - T_FLAGS) / (T_GROWN - T_FLAGS)));
    // stems get longer until their label clears the labels already placed on that side
    const placed = [];
    for (const f of [...flags].sort((a, b) => a.i - b.i)) {
      if (f.i > reveal || f.i < 1) continue;
      ctx.font = f.bold ? SANS(700, 14) : MONO(400, 10);
      const tw = ctx.measureText(f.t).width, th = f.bold ? 16 : 12;
      const x = X(f.i), y = Y(f.i), lx = Math.min(x + 6, w - 16 - tw);
      let len = f.len;
      for (let tries = 0; tries < 8; tries++) {
        const top = f.up ? y - len - 4 - th : y + len + 4;
        const box = { x: lx - 4, y: top - 2, w: tw + 8, h: th + 4 };
        if (!placed.some((q) => box.x < q.x + q.w && box.x + box.w > q.x && box.y < q.y + q.h && box.y + box.h > q.y)) { placed.push(box); break; }
        len += th + 6;
      }
      // ease towards the new length so labels glide instead of jumping as the tape moves
      f.cur = f.cur === undefined ? len : f.cur + (len - f.cur) * 0.12;
    }
    for (const f of flags) {
      if (f.i > reveal || f.i < 1) continue;
      const x = X(f.i), y = Y(f.i), hot = f === near;
      // flags further along the tape go up a little later during the intro
      const g = Math.min(1, Math.max(0, grow * 1.6 - (f.i / N) * 0.6));
      if (g <= 0) continue;
      const e = 1 - Math.pow(1 - g, 3);
      const dir = f.up ? -1 : 1;
      const ty = y + dir * (f.cur ?? f.len) * e;
      ctx.strokeStyle = hot ? ACCENT : f.bold ? "rgba(11,11,11,0.7)" : "rgba(11,11,11,0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 0.5, y);
      ctx.lineTo(x + 0.5, ty);
      ctx.stroke();
      ctx.fillStyle = hot ? ACCENT : INK;
      if (f.bold) ctx.fillRect(x - 2.5, y - 2.5, 5, 5);
      else { ctx.strokeRect(x - 2, y - 2, 4, 4); }

      ctx.globalAlpha = e;
      ctx.textAlign = "left";
      ctx.textBaseline = f.up ? "bottom" : "top";
      ctx.font = f.bold ? SANS(700, hot ? 14 : 13) : MONO(400, 10);
      const tw = ctx.measureText(f.t).width, th = f.bold ? 16 : 12;
      const lx = Math.min(x + 6, w - 16 - tw);
      const ly = ty + (f.up ? -4 : 4);
      // a paper patch behind the label so the line passes under it
      ctx.fillStyle = PAPER;
      ctx.fillRect(lx - 3, f.up ? ly - th - 1 : ly - 1, tw + 6, th + 2);
      ctx.fillStyle = f.bold || hot ? INK : GREY;
      ctx.fillText(f.t, lx, ly);
      ctx.globalAlpha = 1;
    }
  }

  let introDone = false;
  function frame(now) {
    const { ctx, w, h } = fitCanvas(canvas);
    if (!w || !h) return requestAnimationFrame(frame);
    if (start === null) start = now - (skipIntro ? T_GROWN : 0);
    const t = now - start;

    tape(ctx, w, h, t, now);

    if (!introDone && t >= T_FLAGS) {
      introDone = true;
      document.body.classList.add("intro-done");
      sessionStorage.setItem("seen-intro", "1");
    }
    if (!document.body.classList.contains("at-about") || t < T_GROWN) requestAnimationFrame(frame);
    else paused = true;
  }

  let paused = false;
  document.fonts.ready.then(() => requestAnimationFrame(frame));

  // moving between the two scenes
  function show(scene) {
    const toAbout = scene === "about";
    window.cursorMagnet = null;
    document.body.classList.toggle("at-about", toAbout);
    history.replaceState(null, "", toAbout ? "#about" : "#");
    window.dispatchEvent(new CustomEvent("scene", { detail: scene }));
    if (!toAbout && paused) { paused = false; requestAnimationFrame(frame); }
  }
  window.showScene = show;

  document.getElementById("to-about").addEventListener("click", () => show("about"));
  document.getElementById("to-home").addEventListener("click", () => show("home"));

  let wheelLock = 0;
  window.addEventListener("wheel", (e) => {
    if (Date.now() < wheelLock || !introDone) return;
    const atAbout = document.body.classList.contains("at-about");
    if (!atAbout && e.deltaY > 25) { show("about"); wheelLock = Date.now() + 900; }
    // scrolling up from the about scene goes back to the grey home
    else if (atAbout && e.deltaY < -25 && document.getElementById("panel").hidden) { show("home"); wheelLock = Date.now() + 900; }
  }, { passive: true });

  let touchY = null;
  window.addEventListener("touchstart", (e) => { touchY = e.touches[0].clientY; }, { passive: true });
  window.addEventListener("touchend", (e) => {
    if (touchY === null) return;
    const dy = touchY - e.changedTouches[0].clientY;
    const atAbout = document.body.classList.contains("at-about");
    if (!atAbout && dy > 50 && introDone) show("about");
    else if (atAbout && dy < -50 && e.target.tagName === "CANVAS" && document.getElementById("panel").hidden) show("home");
    touchY = null;
  });

  if (location.hash === "#about") show("about");
  // the nav's "About me" link only changes the hash on this page
  window.addEventListener("hashchange", () => show(location.hash === "#about" ? "about" : "home"));
})();
