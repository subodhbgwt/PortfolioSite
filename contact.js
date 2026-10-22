// Contact: the details, with Monte Carlo price paths faint behind them.
// The paths only turn when you move the mouse, then settle.
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

  let yaw = -0.5, pitch = 0.18, tYaw = yaw, tPitch = pitch, running = false;
  function draw() {
    const { ctx, w, h } = fitCanvas(canvas);
    ctx.clearRect(0, 0, w, h);
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const scale = Math.min(w * 0.42, h * 0.38), F = 3.2, cx0 = w * 0.62, cy0 = h * 0.52;
    ctx.strokeStyle = "rgba(236,236,234,0.13)";
    ctx.lineWidth = 1;
    for (const P of paths) {
      ctx.beginPath();
      for (let k = 0; k <= K; k += 2) {
        const X = P[k * 3], Y0 = P[k * 3 + 1], Z0 = P[k * 3 + 2];
        const X2 = X * cy + Z0 * sy, Z2 = -X * sy + Z0 * cy;
        const Y3 = Y0 * cp - Z2 * sp, Z3 = Y0 * sp + Z2 * cp;
        const s = F / (F + Z3);
        const x = cx0 + X2 * scale * s, y = cy0 - Y3 * scale * s;
        k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
  }

  function step() {
    yaw += (tYaw - yaw) * 0.08;
    pitch += (tPitch - pitch) * 0.08;
    draw();
    if (Math.abs(tYaw - yaw) > 0.001 || Math.abs(tPitch - pitch) > 0.001) requestAnimationFrame(step);
    else running = false;
  }
  window.addEventListener("pointermove", (e) => {
    if (REDUCED) return;
    tYaw = -0.5 + (e.clientX / innerWidth - 0.5) * 0.9;
    tPitch = 0.18 + (e.clientY / innerHeight - 0.5) * 0.5;
    if (!running) { running = true; requestAnimationFrame(step); }
  });
  window.addEventListener("resize", draw);
  draw();
})();
