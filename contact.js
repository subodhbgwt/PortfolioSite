// Contact: the details, with Monte Carlo price paths behind them. Once the
// page has loaded the paths grow in from the left and the fan turns slowly;
// moving the mouse tilts it.
setupPage("contact");

(() => {
  const canvas = document.getElementById("paths");
  const N = 48, K = 96, MU = 0.06, SIGMA = 0.22;
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

  // each path gets a second random walk for depth, so the fan opens like a cone
  const paths = [];
  for (let n = 0; n < N; n++) {
    const P = new Float32Array((K + 1) * 3);
    let logS = 0, z = 0;
    for (let k = 0; k <= K; k++) {
      P[k * 3] = (k / K - 0.5) * 2;
      P[k * 3 + 1] = (logS / SIGMA) * 0.34;
      P[k * 3 + 2] = z * 0.34;
      logS += (MU - 0.5 * SIGMA * SIGMA) / K + SIGMA * Math.sqrt(1 / K) * gauss();
      z += Math.sqrt(1 / K) * gauss();
    }
    paths.push(P);
  }

  let spin = 0, yaw = -0.5, pitch = 0.18, tYaw = yaw, tPitch = pitch, t0 = null;
  window.addEventListener("pointermove", (e) => {
    tYaw = -0.5 + (e.clientX / innerWidth - 0.5) * 0.9;
    tPitch = 0.18 + (e.clientY / innerHeight - 0.5) * 0.5;
  });

  function frame(now) {
    if (t0 === null) t0 = now;
    const { ctx, w, h } = fitCanvas(canvas);
    ctx.clearRect(0, 0, w, h);
    if (!REDUCED) spin += 0.002;
    yaw += (tYaw - yaw) * 0.06;
    pitch += (tPitch - pitch) * 0.06;

    // how much of each path is drawn: they grow in over the first two seconds
    const grow = Math.min(1, (now - t0) / 1900);
    const reach = Math.max(2, Math.floor((1 - Math.pow(1 - grow, 3)) * K));

    const cs = Math.cos(spin), ss = Math.sin(spin), cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const scale = Math.min(w * 0.42, h * 0.38), F = 3.2, cx0 = w * 0.62, cy0 = h * 0.52;
    ctx.strokeStyle = "rgba(236,236,234,0.16)";
    ctx.lineWidth = 1;
    for (const P of paths) {
      ctx.beginPath();
      for (let k = 0; k <= reach; k += 2) {
        const X = P[k * 3], Y0 = P[k * 3 + 1], Z0 = P[k * 3 + 2];
        const Y1 = Y0 * cs - Z0 * ss, Z1 = Y0 * ss + Z0 * cs;   // turn round the time axis
        const X2 = X * cy + Z1 * sy, Z2 = -X * sy + Z1 * cy;
        const Y3 = Y1 * cp - Z2 * sp, Z3 = Y1 * sp + Z2 * cp;
        const s = F / (F + Z3);
        const x = cx0 + X2 * scale * s, y = cy0 - Y3 * scale * s;
        k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    requestAnimationFrame(frame);
  }

  // start once everything has loaded, so the animation isn't fighting the page load
  const start = () => (REDUCED ? (t0 = -1e9, frame(0)) : requestAnimationFrame(frame));
  if (document.readyState === "complete") start(); else window.addEventListener("load", start);
})();
