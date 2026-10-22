// Contact: the details, with a Monte Carlo simulation playing behind them once
// the page has loaded. Price paths (geometric Brownian motion, fanned out in 3D)
// grow in, break up into the points they are made of, and those points fall
// into a histogram of standardised moves that lands on the normal curve,
// then it runs back to the paths and starts again.
// Moving the mouse tilts the fan while it is still 3D.
setupPage("contact");

(() => {
  const canvas = document.getElementById("paths");
  const N = 48, K = 96, MU = 0.06, SIGMA = 0.22;
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

  // --- the paths, made once per visit ---
  const dt = 1 / K;
  const paths = [];
  const dots = []; // every other step of every path: which point, and the standardised move that led to it
  for (let n = 0; n < N; n++) {
    const P = new Float32Array((K + 1) * 3);
    let logS = 0, z = 0, shock = 0;
    for (let k = 0; k <= K; k++) {
      // x is time, y is log price in units of σ, z is a second walk for depth
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

  // stack the standardised moves into bins, one dot on top of the other
  const BIN = 0.16, ZMAX = 3.6, NB = Math.round((2 * ZMAX) / BIN);
  const counts = new Array(NB).fill(0);
  for (const d of dots) {
    d.b = Math.max(0, Math.min(NB - 1, Math.floor((d.z + ZMAX) / BIN)));
    d.row = counts[d.b]++;
  }
  const tallest = Math.max(...counts);

  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const ramp = (v, a, b) => clamp01((v - a) / (b - a));
  const smooth = (v) => v * v * (3 - 2 * v);

  let spin = 0, yaw = -0.5, pitch = 0.18, tYaw = yaw, tPitch = pitch, t0 = null;
  window.addEventListener("pointermove", (e) => {
    tYaw = -0.5 + (e.clientX / innerWidth - 0.5) * 0.9;
    tPitch = 0.18 + (e.clientY / innerHeight - 0.5) * 0.5;
  });

  const M = (K + 1) * N;
  const sx = new Float32Array(M), sy = new Float32Array(M);

  function frame(now) {
    if (t0 === null) t0 = now;
    // seconds since the page finished loading; with reduced motion, hold on the finished histogram
    const t = REDUCED ? 8 : (now - t0) / 1000;
    const { ctx, w, h } = fitCanvas(canvas);
    ctx.clearRect(0, 0, w, h);

    // the timeline loops every 16 s: paths turn into dots, the dots fall into the
    // histogram and the curve draws, then it all runs backwards to the paths.
    // The paths only grow in the first time.
    const reach = Math.max(2, Math.floor((1 - Math.pow(1 - ramp(t, 0, 2), 3)) * K));
    const u = t % 16;
    const toDots = ramp(u, 2.6, 3.6) * (1 - ramp(u, 13.6, 14.6));
    const fall = smooth(ramp(u, 4.2, 6)) * (1 - smooth(ramp(u, 11.4, 13.2)));
    const curve = ramp(u, 5.9, 7) * (1 - ramp(u, 10.4, 11.2));

    // the fan stops turning as it falls into the histogram
    if (!REDUCED) spin += 0.002 * (1 - fall);
    yaw += (tYaw - yaw) * 0.06;
    pitch += (tPitch - pitch) * 0.06;

    const cs = Math.cos(spin), ss = Math.sin(spin), cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const scale = Math.min(w * 0.42, h * 0.38), F = 3.2, cx0 = w * 0.62, cy0 = h * 0.52;
    for (let n = 0; n < N; n++) {
      const P = paths[n];
      for (let k = 0; k <= K; k++) {
        const X = P[k * 3], Y0 = P[k * 3 + 1], Z0 = P[k * 3 + 2];
        const Y1 = Y0 * cs - Z0 * ss, Z1 = Y0 * ss + Z0 * cs;      // turn round the time axis
        const X2 = X * cyw + Z1 * syw, Z2 = -X * syw + Z1 * cyw;   // yaw
        const Y3 = Y1 * cp - Z2 * sp, Z3 = Y1 * sp + Z2 * cp;      // pitch
        const s = F / (F + Z3), i = n * (K + 1) + k;
        sx[i] = cx0 + X2 * scale * s;
        sy[i] = cy0 - Y3 * scale * s;
      }
    }

    // the paths, fading out as they turn into dots
    if (toDots < 1) {
      ctx.strokeStyle = `rgba(236,236,234,${0.18 * (1 - toDots)})`;
      ctx.lineWidth = 1;
      for (let n = 0; n < N; n++) {
        const a = n * (K + 1);
        ctx.beginPath();
        ctx.moveTo(sx[a], sy[a]);
        for (let k = 2; k <= reach; k += 2) ctx.lineTo(sx[a + k], sy[a + k]);
        ctx.stroke();
      }
    }

    // the histogram sits low on the page, under the details
    const hw = Math.min(w * 0.8, 900), base = h * 0.92;
    const colW = hw / NB, hx0 = (w - hw) / 2;
    const pitchY = Math.min(4, (h * 0.42) / tallest);
    const r = Math.max(1.4, Math.min(3, pitchY - 0.6, colW * 0.42));

    if (toDots > 0) {
      ctx.fillStyle = `rgba(236,236,234,${0.35 * toDots})`;
      ctx.beginPath();
      for (let j = 0; j < dots.length; j++) {
        const d = dots[j];
        // each dot leaves a little after its neighbour, so they pour in rather than jump
        const f = fall <= 0 ? 0 : fall >= 1 ? 1 : smooth(clamp01(fall * 1.5 - (j / dots.length) * 0.5));
        const x = sx[d.i] + (hx0 + (d.b + 0.5) * colW - sx[d.i]) * f;
        const y = sy[d.i] + (base - (d.row + 0.5) * pitchY - sy[d.i]) * f;
        ctx.rect(x - r / 2, y - r / 2, r, r);
      }
      ctx.fill();
    }

    // the standard normal curve the histogram should match, drawn left to right
    if (curve > 0) {
      const area = dots.length * BIN * pitchY;
      const steps = Math.floor(160 * curve);
      ctx.strokeStyle = "rgba(255,138,31,0.7)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let q = 0; q <= steps; q++) {
        const z = -ZMAX + (q / 160) * 2 * ZMAX;
        const y = base - (area * Math.exp(-z * z / 2)) / Math.sqrt(2 * Math.PI);
        const x = hx0 + ((z + ZMAX) / (2 * ZMAX)) * hw;
        q ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }

    requestAnimationFrame(frame);
  }

  // start once everything has loaded, so the animation isn't fighting the page load
  const start = () => {
    requestAnimationFrame(frame);
  };
  if (document.readyState === "complete") start(); else window.addEventListener("load", start);
})();
