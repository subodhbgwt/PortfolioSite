// Contact: Monte Carlo price paths (geometric Brownian motion) fanned out in 3D,
// each with a second random walk for depth. Scrolling scrubs through what the
// simulation is: the paths, then the points they are made of, then those
// points' steps standardised and stacked into a histogram that lands on the normal
// curve. One more step brings up the contact details. Drag to turn it.
setupPage("contact");

(() => {
  const canvas = document.getElementById("wire");
  const info = document.getElementById("info");

  // --- the paths, made once per visit ---
  const N = 48, K = 96, MU = 0.06, SIGMA = 0.22;
  function gauss() {
    let u = 0, v = 0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  const dt = 1 / K;
  const paths = [];
  const dots = []; // every other step of every path: which point, and the standardised move that led to it
  for (let n = 0; n < N; n++) {
    const P = new Float32Array((K + 1) * 3);
    let logS = 0, z = 0, shock = 0;
    for (let k = 0; k <= K; k++) {
      // x is time, y is log price in units of σ, z is the depth walk
      P[k * 3] = (k / K - 0.5) * 2;
      P[k * 3 + 1] = (logS / SIGMA) * 0.34;
      P[k * 3 + 2] = z * 0.34;
      // each step's move, minus the drift and divided by σ√dt, is an independent N(0, 1) draw
      if (k > 0 && k % 2 === n % 2) dots.push({ i: n * (K + 1) + k, z: shock });
      shock = gauss();
      logS += (MU - 0.5 * SIGMA * SIGMA) * dt + SIGMA * Math.sqrt(dt) * shock;
      z += Math.sqrt(dt) * gauss();
    }
    paths.push(P);
  }

  // stack the standardised returns into bins, one dot on top of the other
  const BIN = 0.16, ZMAX = 3.6, NB = Math.round((2 * ZMAX) / BIN);
  const counts = new Array(NB).fill(0);
  for (const d of dots) {
    const b = Math.floor((d.z + ZMAX) / BIN);
    d.b = Math.max(0, Math.min(NB - 1, b));
    d.row = counts[d.b]++;
  }
  const tallest = Math.max(...counts);

  // --- scrolling scrubs through the stages; when it stops, it settles on the nearest one ---
  let target = 0, prog = 0, settle = 0;
  const go = (t) => { target = Math.max(0, Math.min(3, t)); };
  const nudge = (d) => {
    go(target + d);
    clearTimeout(settle);
    settle = setTimeout(() => go(Math.round(target)), 350);
  };
  window.addEventListener("wheel", (e) => {
    nudge((e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY) / 650);
  }, { passive: true });
  window.addEventListener("keydown", (e) => {
    if (["ArrowDown", "PageDown", " "].includes(e.key)) go(target + 1);
    if (["ArrowUp", "PageUp"].includes(e.key)) go(target - 1);
  });

  // --- turning: a slow spin round the time axis, plus drag with a little glide ---
  let spin = 0, yaw = -0.5, pitch = 0.18, vYaw = 0, vPitch = 0;
  let drag = null;
  canvas.addEventListener("pointerdown", (e) => {
    drag = { x: e.clientX, y: e.clientY, touch: e.pointerType === "touch" };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    vYaw = dx * 0.006;
    // on touch screens dragging up and down scrubs the stages instead of tilting
    if (drag.touch) nudge(-dy / 500); else vPitch = dy * 0.004;
    drag.x = e.clientX; drag.y = e.clientY;
  });
  const endDrag = () => { drag = null; };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const ramp = (v, a, b) => clamp01((v - a) / (b - a));
  const smooth = (v) => v * v * (3 - 2 * v);
  const t0 = performance.now();
  const M = (K + 1) * N;
  const sx = new Float32Array(M), sy = new Float32Array(M);

  // drawn at 1x: thousands of thin lines cost a lot more at 2x and look nearly the same
  const ctx = canvas.getContext("2d");
  let w = 0, h = 0;
  function size() {
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w; canvas.height = h;
  }
  size();
  window.addEventListener("resize", size);

  let lastT = performance.now();
  function frame(now) {
    // ease towards the stage at the same speed whatever the refresh rate
    const step = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    prog = REDUCED ? target : prog + (target - prog) * (1 - Math.exp(-step * 6));
    if (!REDUCED) spin += 0.0025;
    yaw += vYaw; pitch = Math.max(-0.9, Math.min(0.9, pitch + vPitch));
    vYaw *= drag ? 0.5 : 0.93; vPitch *= drag ? 0.5 : 0.9;

    // project every point once
    const cs = Math.cos(spin), ss = Math.sin(spin), cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const scale = Math.min(w * 0.4, h * 0.36), F = 3.2, cx0 = w / 2, cy0 = h * 0.46;
    for (let n = 0; n < N; n++) {
      const P = paths[n];
      for (let k = 0; k <= K; k++) {
        const X = P[k * 3], Y0 = P[k * 3 + 1], Z0 = P[k * 3 + 2];
        const Y1 = Y0 * cs - Z0 * ss, Z1 = Y0 * ss + Z0 * cs;      // spin round the time axis
        const X2 = X * cyw + Z1 * syw, Z2 = -X * syw + Z1 * cyw;   // yaw
        const Y3 = Y1 * cp - Z2 * sp, Z3 = Y1 * sp + Z2 * cp;      // pitch
        const s = F / (F + Z3), i = n * (K + 1) + k;
        sx[i] = cx0 + X2 * scale * s;
        sy[i] = cy0 - Y3 * scale * s;
      }
    }

    // how much of each path is drawn, so it grows in on arrival
    const reach = REDUCED ? K : Math.min(K, Math.floor(ramp(now - t0, 150, 1900) ** 0.7 * K));
    const lineA = 1 - ramp(prog, 0.3, 1);
    const dotA = ramp(prog, 0.2, 0.8);
    const fall = smooth(ramp(prog, 1.05, 1.95));      // dots moving into the histogram
    const dim = 1 - 0.6 * ramp(prog, 2.3, 3);          // everything fades back for the contact details

    ctx.clearRect(0, 0, w, h);

    if (lineA > 0.01) {
      ctx.strokeStyle = `rgba(236,236,234,${0.42 * lineA})`;
      ctx.lineWidth = 1;
      for (let n = 0; n < N; n++) {
        const a = n * (K + 1);
        ctx.beginPath();
        ctx.moveTo(sx[a], sy[a]);
        for (let k = 2; k <= reach; k += 2) ctx.lineTo(sx[a + k], sy[a + k]);
        ctx.stroke();
      }
    }

    // histogram layout: bins across the middle, stacked up from a baseline
    const hw = Math.min(w * 0.8, 900), base = h * 0.7;
    const colW = hw / NB, hx0 = (w - hw) / 2;
    const pitchY = Math.min(4, (h * 0.5) / tallest);
    const r = Math.max(1.4, Math.min(3, pitchY - 0.6, colW * 0.42));

    if (dotA > 0.01) {
      ctx.fillStyle = `rgba(236,236,234,${dotA * dim * (0.55 + 0.45 * fall)})`;
      ctx.beginPath();
      for (let j = 0; j < dots.length; j++) {
        const d = dots[j];
        if ((d.i % (K + 1)) > reach) continue;
        // each dot leaves a little after its neighbour, so they pour in rather than jump
        const f = fall <= 0 ? 0 : fall >= 1 ? 1 : smooth(clamp01(fall * 1.5 - (j / dots.length) * 0.5));
        const x = sx[d.i] + (hx0 + (d.b + 0.5) * colW - sx[d.i]) * f;
        const y = sy[d.i] + (base - (d.row + 0.5) * pitchY - sy[d.i]) * f;
        ctx.rect(x - r / 2, y - r / 2, r, r);
      }
      ctx.fill();
    }

    // the standard normal curve the histogram should match, drawn once the dots have landed
    const curveA = ramp(prog, 1.7, 2.1) * dim;
    if (curveA > 0.01) {
      const area = dots.length * BIN * pitchY; // dots per unit z, times height per dot
      ctx.strokeStyle = `rgba(255,138,31,${0.9 * curveA})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let q = 0; q <= 160; q++) {
        const z = -ZMAX + (q / 160) * 2 * ZMAX;
        const y = base - (area * Math.exp(-z * z / 2)) / Math.sqrt(2 * Math.PI);
        const x = hx0 + ((z + ZMAX) / (2 * ZMAX)) * hw;
        q ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = `rgba(236,236,234,${0.25 * curveA})`;
      ctx.fillRect(hx0, base + 2, hw, 1);
    }

    // where every path ends: one bright point each
    if (reach === K && fall < 0.05) {
      ctx.fillStyle = `rgba(236,236,234,${0.9 * (1 - ramp(prog, 0.8, 1.05))})`;
      for (let n = 0; n < N; n++) { const i = n * (K + 1) + K; ctx.fillRect(sx[i] - 1.5, sy[i] - 1.5, 3, 3); }
    }

    info.classList.toggle("on", prog > 2.5);
    requestAnimationFrame(frame);
  }
  document.fonts.ready.then(() => requestAnimationFrame(frame));
})();
