// About scene: a slowly turning 3D cloud of points and lines. Six of the
// points are topics. Clicking one sends it up into a print head, which sweeps
// down the screen and prints the topic on old tractor-feed terminal paper.
(() => {
  const canvas = document.getElementById("about-canvas");
  const labelList = document.getElementById("about-labels");
  const panel = document.getElementById("panel");

  // every topic uses the same row style: grey label, caps title, and a short plain note under it
  const row = (label, title, note = "", href = "", plain = false) => {
    // a bare arrow belongs next to the title, not in the note column
    const arrow = /^[↗→]$/.test(note);
    const inner = `<i>${label}</i><b${plain ? ' class="plain"' : ""}>${title}${arrow ? ` ${note}` : ""}</b><span>${arrow ? "" : note}</span>`;
    const ext = href.startsWith("http") ? ' target="_blank" rel="noopener"' : "";
    return `<li>${href ? `<a href="${href}"${ext}>${inner}</a>` : `<div>${inner}</div>`}</li>`;
  };
  const rows = (items) => `<ul class="rows">${items.join("")}</ul>`;

  const TOPICS = {
    ABOUT: {
      kicker: "About",
      title: "Hi, I'm Subodh",
      html: `<p class="lead">I build tools for markets and data, then spend most of my time checking whether the numbers hold up.</p>` + rows([
        row("Now", "BSc Computer Science & Engineering", "Year 3 at KTH"),
        row("Next", "MSc Financial Mathematics", "At KTH, from 2027"),
        row("Base", "Stockholm, Sweden"),
        row("Roots", "India → Muscat → Sweden", "Moved to Sweden at five"),
      ]),
    },
    WORK: {
      kicker: "Work",
      title: "Selected projects",
      html: () => rows(PROJECTS.map((p, i) => row(String(p.year), p.title, "", `project.html?p=${p.slug}`)))
        + `<p class="more"><a href="work.html">Open the portfolio →</a></p>`,
    },
    SKILLS: {
      kicker: "Skills",
      title: "What I use",
      html: rows([
        row("Code", "Python · C · Java · Go · Haskell · SQL"),
        row("Systems", "RISC-V assembly · C on FPGA"),
        row("Data", "NumPy · pandas · Matplotlib · Excel"),
        row("Tools", "Git · Docker · PostgreSQL · Dash · Claude Code"),
        row("Maths", "Probability · statistics · Monte Carlo"),
      ]),
    },
    EXPERIENCE: {
      kicker: "Experience",
      title: "So far",
      html: rows([
        row("2025–26", "Project co-lead", "Bengt Dahlgren industry project"),
        row("2026", "Florent Code League", "Reached #1, finished 13th of about 130"),
        row("2026–", "D+A Strategies", "Selected member"),
        row("2025", "Finance committee", "Datasektionen's student reception"),
        row("2025", "McKinsey Forward", "Programme participant"),
      ]),
    },
    EDUCATION: {
      kicker: "Education",
      title: "KTH, Stockholm",
      html: rows([
        row("2024–27", "BSc Computer Science & Engineering", "KTH civilingenjör, years 1–3"),
        row("2027–29", "MSc Financial Mathematics", "KTH civilingenjör, years 4–5"),
        row("GPA", "4.64 / 5.0", "KTH, so far"),
        row("2021–24", "Kungsholmens gymnasium", "Natural science, in English"),
        row("Languages", "Swedish · English · Hindi · Marathi", "Plus basic Mandarin"),
      ]),
    },
  };
  const NAMES = Object.keys(TOPICS);

  // a new random cloud on every visit
  let seed = 1 + Math.floor(Math.random() * 2147483645);
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  const pts = [];
  for (let i = 0; i < 240; i++) {
    const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, rr = Math.cbrt(rnd());
    const s = Math.sqrt(1 - u * u);
    pts.push({ x: s * Math.cos(th) * rr * 1.25, y: u * rr * 0.85, z: s * Math.sin(th) * rr * 1.1, b: 0.4 + rnd() * 0.6 });
  }
  // topic nodes at random spots, kept apart so the labels don't overlap
  const spots = [];
  for (let tries = 0; spots.length < NAMES.length && tries < 5000; tries++) {
    const c = [(rnd() * 2 - 1) * 0.95, (rnd() * 2 - 1) * 0.6, (rnd() * 2 - 1) * 0.6];
    const minGap = tries < 3000 ? 0.62 : 0.4;
    if (spots.every((q) => Math.hypot(c[0] - q[0], c[1] - q[1], c[2] - q[2]) > minGap)) spots.push(c);
  }
  NAMES.forEach((n, i) => { const [x, y, z] = spots[i]; pts[i] = { x, y, z, b: 1, name: n }; });

  // each point links to its two nearest neighbours
  const edges = [];
  pts.forEach((p, i) => {
    const near = pts.map((q, j) => [j, (p.x - q.x) ** 2 + (p.y - q.y) ** 2 + (p.z - q.z) ** 2])
      .filter(([j]) => j !== i).sort((a, b) => a[1] - b[1]).slice(0, p.name ? 4 : 2);
    near.forEach(([j]) => { if (i < j || !edges.some(([a, b]) => a === j && b === i)) edges.push([i, j]); });
  });

  const stars = Array.from({ length: 160 }, () => ({ x: rnd(), y: rnd(), r: rnd() < 0.08 ? 1.6 : 0.7, a: 0.15 + rnd() * 0.5 }));

  // labels are real buttons so they work with keyboard and screen readers
  const labels = {};
  let labelHover = false;
  NAMES.forEach((n) => {
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = n;
    b.addEventListener("click", () => open(n));
    b.addEventListener("pointerenter", () => { labelHover = n; });
    b.addEventListener("pointerleave", () => { labelHover = false; });
    li.appendChild(b);
    labelList.appendChild(li);
    labels[n] = b;
  });


  let yaw = 0.4, pitch = -0.15, vy = 0, vp = 0, dragging = false, lx = 0, ly = 0, moved = 0;
  let running = false;
  let lastP = null;

  // mode: cloud -> opening -> printed -> closing -> cloud
  let mode = "cloud", t0 = 0, active = null, orbFrom = null;
  let spin = 1, hoverGlow = 0, lastHover = null;
  let tiltYaw = 0, tiltPitch = 0, mouseX = 0.5, mouseY = 0.5;
  window.addEventListener("pointermove", (e) => { mouseX = e.clientX / innerWidth; mouseY = e.clientY / innerHeight; });
  const OPEN_MS = 1600, CLOSE_MS = 950;

  // nearest topic to a point on screen, within 40px
  function topicAt(x, y) {
    if (!lastP || mode !== "cloud") return null;
    let best = null, bd = 48;
    pts.forEach((p, i) => {
      if (!p.name) return;
      const d = Math.hypot(lastP[i].x - x, lastP[i].y - y);
      if (d < bd) { bd = d; best = p.name; }
    });
    return best;
  }

  let hovering = null;
  canvas.addEventListener("pointerdown", (e) => {
    if (mode !== "cloud") return;
    dragging = true; moved = 0; lx = e.clientX; ly = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) {
      const r = canvas.getBoundingClientRect();
      hovering = topicAt(e.clientX - r.left, e.clientY - r.top);
      return;
    }
    const dx = e.clientX - lx, dy = e.clientY - ly;
    moved += Math.abs(dx) + Math.abs(dy);
    vy = dx * 0.005; vp = dy * 0.004;
    yaw += vy; pitch = Math.max(-1, Math.min(1, pitch + vp));
    lx = e.clientX; ly = e.clientY;
  });
  canvas.addEventListener("pointerup", () => { dragging = false; });
  // open on "click", not "pointerup", so the click can't land on the panel
  canvas.addEventListener("click", (e) => {
    if (moved > 6) return;
    const r = canvas.getBoundingClientRect();
    const best = topicAt(e.clientX - r.left, e.clientY - r.top);
    if (best) open(best);
  });

  function project(p, w, h) {
    const Y = yaw + tiltYaw, X = pitch + tiltPitch;
    const cy = Math.cos(Y), sy = Math.sin(Y), cp = Math.cos(X), sp = Math.sin(X);
    let x = p.x * cy - p.z * sy, z = p.x * sy + p.z * cy;
    let y = p.y * cp - z * sp; z = p.y * sp + z * cp;
    const scale = Math.min(w, h) * 0.5, d = 3.2;
    const f = d / (d + z);
    return { x: w / 2 + x * scale * f, y: h / 2 + y * scale * f, z, f };
  }

  // --- the print head and the sheet ---
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const seg = (t, a, b) => clamp01((t - a) / (b - a));
  const HEAD_TOP = 66; // the sheet starts just under the nav

  // paper grain, made once
  const grain = document.createElement("canvas");
  grain.width = grain.height = 160;
  (() => {
    const g = grain.getContext("2d");
    const img = g.createImageData(160, 160);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 26;
    }
    g.putImageData(img, 0, 0);
  })();
  let grainPattern = null;

  // continuous-form paper from top down to y: faint bars, sprocket holes down both edges
  function drawSheet(ctx, w, h, y) {
    if (y <= HEAD_TOP) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, HEAD_TOP, w, y - HEAD_TOP);
    ctx.clip();
    ctx.fillStyle = "#dcdcd7";
    ctx.fillRect(0, HEAD_TOP, w, y - HEAD_TOP);
    ctx.fillStyle = "rgba(20,20,19,0.045)";
    for (let by = HEAD_TOP + 36; by < y; by += 72) ctx.fillRect(28, by, w - 56, 36);
    ctx.fillStyle = "rgba(20,20,19,0.12)";
    ctx.fillRect(27, HEAD_TOP, 1, y - HEAD_TOP);
    ctx.fillRect(w - 28, HEAD_TOP, 1, y - HEAD_TOP);
    ctx.fillStyle = "#090909";
    for (let hy = HEAD_TOP + 12; hy < y; hy += 24) {
      ctx.beginPath(); ctx.arc(13, hy, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(w - 13, hy, 3.5, 0, Math.PI * 2); ctx.fill();
    }
    grainPattern = grainPattern || ctx.createPattern(grain, "repeat");
    ctx.fillStyle = grainPattern;
    ctx.fillRect(0, HEAD_TOP, w, y - HEAD_TOP);
    ctx.restore();
  }

  // the print head: an amber bar across the screen with a readout at its right end
  function drawHead(ctx, w, y, width, label) {
    if (width <= 0) return;
    const x0 = w / 2 - (w / 2) * width, x1 = w / 2 + (w / 2) * width;
    ctx.fillStyle = "#141413";
    ctx.fillRect(x0, y - 7, x1 - x0, 7);
    ctx.fillStyle = "#ff8a1f";
    ctx.shadowColor = "rgba(255,138,31,0.8)";
    ctx.shadowBlur = 10;
    ctx.fillRect(x0, y - 1, x1 - x0, 2);
    ctx.shadowBlur = 0;
    if (label && width > 0.98) {
      ctx.font = '500 9px "IBM Plex Mono", ui-monospace, monospace';
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.fillStyle = "#ff8a1f";
      ctx.fillText(label, x1 - 40, y - 10);
    }
  }

  function frame(now) {
    if (!document.body.classList.contains("at-about")) { running = false; return; }
    const { ctx, w, h } = fitCanvas(canvas);
    ctx.clearRect(0, 0, w, h);
    const t = now - t0;

    // how visible the cloud is, how wide the print head is, how far down it has printed
    let cloud = 1, head = 0, printed = 0, orb = null;
    if (mode === "opening") {
      cloud = 1 - ease(seg(t, 350, 950));
      head = ease(seg(t, 650, 950));
      printed = ease(seg(t, 950, 1550));
      orb = { m: ease(seg(t, 250, 900)), pulse: seg(t, 0, 300) };
      if (t > 1150) panel.classList.add("on");
      if (t > OPEN_MS) mode = "printed";
    } else if (mode === "printed") {
      cloud = 0; head = 0; printed = 1;
    } else if (mode === "closing") {
      // the head comes back up and rolls the sheet away
      printed = 1 - ease(seg(t, 0, 600));
      head = seg(t, 0, 80) * (1 - ease(seg(t, 600, 780)));
      cloud = ease(seg(t, 450, 950));
      if (t > CLOSE_MS) { mode = "cloud"; panel.hidden = true; document.body.classList.remove("sheet-on"); }
    }

    // hovering a topic eases the spin down, leaving eases it back up
    const hoverName = mode === "cloud" ? (labelHover || hovering) : null;
    if (hoverName) lastHover = hoverName;
    spin += ((hoverName ? 0.08 : 1) - spin) * (hoverName ? 0.06 : 0.02);
    hoverGlow += ((hoverName ? 1 : 0) - hoverGlow) * 0.12;
    // just moving the mouse leans the cloud towards it
    if (!REDUCED) {
      tiltYaw += ((mouseX - 0.5) * 0.7 - tiltYaw) * 0.04;
      tiltPitch += ((mouseY - 0.5) * 0.5 - tiltPitch) * 0.04;
    }
    if (mode === "cloud" && !dragging) {
      vy *= hoverName ? 0.85 : 0.95; vp *= hoverName ? 0.85 : 0.95;
      yaw += (vy + (REDUCED ? 0 : 0.0012)) * spin;
      pitch = Math.max(-1, Math.min(1, pitch + vp * spin));
    }

    // stars, edges and points, all faded by `cloud`
    if (cloud > 0) {
      for (const s of stars) {
        ctx.fillStyle = `rgba(236,236,234,${s.a * cloud})`;
        ctx.fillRect(s.x * w, s.y * h, s.r, s.r);
      }
      const P = pts.map((p) => project(p, w, h));
      lastP = P;
      const ai = orb ? pts.findIndex((p) => p.name === active) : -1;
      ctx.lineWidth = 1;
      for (const [a, b] of edges) {
        const depth = (P[a].f + P[b].f) / 2;
        const hot = a === ai || b === ai;
        ctx.strokeStyle = hot
          ? `rgba(255,255,250,${0.9 * (1 - orb.m)})`
          : `rgba(236,236,234,${(0.05 + (depth - 0.7) * 0.35) * cloud})`;
        ctx.beginPath();
        ctx.moveTo(P[a].x, P[a].y);
        ctx.lineTo(P[b].x, P[b].y);
        ctx.stroke();
      }
      // the hovered topic reaches out to every other topic and its neighbours
      if (hoverGlow > 0.01 && lastHover && !orb) {
        const hi = pts.findIndex((p) => p.name === lastHover);
        const hq = P[hi];
        ctx.lineWidth = 1;
        pts.forEach((p, j) => {
          if (j === hi) return;
          const d = Math.hypot(p.x - pts[hi].x, p.y - pts[hi].y, p.z - pts[hi].z);
          if (!p.name && d > 0.75) return;
          const a = (p.name ? 0.55 : 0.28 * (1 - d / 0.75)) * hoverGlow * cloud;
          ctx.strokeStyle = `rgba(255,255,250,${a})`;
          ctx.beginPath();
          ctx.moveTo(hq.x, hq.y);
          ctx.lineTo(P[j].x, P[j].y);
          ctx.stroke();
        });
        ctx.strokeStyle = `rgba(255,255,250,${0.6 * hoverGlow})`;
        ctx.beginPath(); ctx.arc(hq.x, hq.y, 7 + hoverGlow * 3, 0, Math.PI * 2); ctx.stroke();
      }
      const snapTo = hoverName ? pts.findIndex((p) => p.name === hoverName) : -1;
      window.cursorMagnet = snapTo >= 0 ? { x: P[snapTo].x, y: P[snapTo].y } : null;
      pts.forEach((p, i) => {
        const q = P[i];
        if (i !== ai) {
          ctx.fillStyle = `rgba(236,236,234,${(p.name ? 1 : p.b * (q.f - 0.45)) * cloud})`;
          ctx.beginPath();
          ctx.arc(q.x, q.y, (p.name ? 2.6 : 1.1) * q.f, 0, Math.PI * 2);
          ctx.fill();
        }
        if (p.name) {
          const lb = labels[p.name];
          lb.style.transform = `translate(${q.x + 16}px, ${q.y - 14}px)`;
          lb.style.opacity = Math.max(0.35, Math.min(1, (q.f - 0.6) * 2.2)) * cloud;
        }
      });
    }
    if (cloud <= 0 || mode !== "cloud") window.cursorMagnet = null;
    labelList.style.pointerEvents = mode === "cloud" ? "" : "none";
    labelList.style.visibility = cloud > 0.02 ? "visible" : "hidden";

    const headY = HEAD_TOP + (h - HEAD_TOP) * printed;
    drawSheet(ctx, w, h, mode === "printed" ? h : headY);
    const idx = `PRINT ${String(NAMES.indexOf(active) + 1).padStart(2, "0")}/${String(NAMES.length).padStart(2, "0")}`;
    drawHead(ctx, w, headY, head, mode === "opening" ? idx : "");

    // the clicked point: pulses, then flies up into the middle of the print head
    if (orb && orbFrom) {
      const tx = w / 2, ty = HEAD_TOP;
      const x = orbFrom.x + (tx - orbFrom.x) * orb.m;
      const y = orbFrom.y + (ty - orbFrom.y) * orb.m;
      const r = 4 + orb.pulse * 2 - orb.m * 1.5;
      if (orb.m < 0.98) {
        ctx.fillStyle = "#ff8a1f";
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
        ctx.strokeStyle = `rgba(255,138,31,${0.8 * (1 - orb.pulse)})`;
        const ring = r + 5 + orb.pulse * 16;
        ctx.strokeRect(x - ring, y - ring, ring * 2, ring * 2);
        // a faint trail back to where it came from
        ctx.strokeStyle = `rgba(255,138,31,${0.35 * (1 - orb.m)})`;
        ctx.beginPath(); ctx.moveTo(orbFrom.x, orbFrom.y); ctx.lineTo(x, y); ctx.stroke();
      }
    }

    requestAnimationFrame(frame);
  }

  // --- panel content ---
  const tabs = document.getElementById("panel-tabs");
  NAMES.forEach((n) => {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.topic = n;
    b.textContent = n;
    b.addEventListener("click", () => fill(n, true));
    tabs.appendChild(b);
  });

  function fill(name, swap) {
    const t = TOPICS[name];
    const body = panel.querySelector(".panel__inner");
    const apply = () => {
      active = name;
      document.getElementById("panel-kicker").textContent = `[${String(NAMES.indexOf(name) + 1).padStart(2, "0")}/${String(NAMES.length).padStart(2, "0")}]  ${t.kicker}`;
      document.getElementById("panel-title").textContent = t.title;
      document.getElementById("panel-body").innerHTML = typeof t.html === "function" ? t.html() : t.html;
      // the big word fills the width, so long names get a smaller size
      const big = document.getElementById("panel-big");
      const vw = Math.min(22, 108 / name.length);
      big.textContent = name;
      big.style.fontSize = `${vw}vw`;
      tabs.style.bottom = `calc(${vw * 0.8}vw + 24px)`;
      fitBody();
      tabs.querySelectorAll("button").forEach((b) => b.setAttribute("aria-current", String(b.dataset.topic === name)));
      body.classList.remove("swap");
    };
    if (swap) { body.classList.add("swap"); setTimeout(apply, 180); } else apply();
  }

  // keep the text between the top of the light and the topic tabs; scroll if it's long
  function fitBody() {
    const inner = panel.querySelector(".panel__inner");
    requestAnimationFrame(() => {
      const top = inner.getBoundingClientRect().top;
      const limit = tabs.getBoundingClientRect().top - 28;
      inner.style.maxHeight = `${Math.max(160, limit - top)}px`;
    });
  }
  window.addEventListener("resize", () => { if (!panel.hidden) fitBody(); });

  let lastFocus = null;
  function open(name) {
    if (mode !== "cloud") return;
    const i = pts.findIndex((p) => p.name === name);
    orbFrom = lastP ? { x: lastP[i].x, y: lastP[i].y } : { x: innerWidth / 2, y: innerHeight / 2 };
    fill(name, false);
    lastFocus = document.activeElement;
    panel.hidden = false;
    panel.classList.remove("on");
    document.body.classList.add("sheet-on");
    t0 = performance.now();
    if (REDUCED) { mode = "printed"; panel.classList.add("on"); } else mode = "opening";
    setTimeout(() => document.getElementById("panel-close").focus(), REDUCED ? 0 : 1400);
  }
  function close() {
    if (mode !== "printed" && mode !== "opening") return;
    panel.classList.remove("on");
    t0 = performance.now();
    orbFrom = null;
    if (REDUCED) { mode = "cloud"; panel.hidden = true; document.body.classList.remove("sheet-on"); } else mode = "closing";
    if (lastFocus) lastFocus.focus();
  }
  document.getElementById("panel-close").addEventListener("click", close);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.hidden) close();
    // the status bar's keys, while the cloud is showing
    if (!document.body.classList.contains("at-about") || !panel.hidden) return;
    if (e.key === "ArrowUp") window.showScene("home");
    if (e.key === "ArrowRight") document.querySelector('.about__status a[href="work.html"]').click();
  });

  window.addEventListener("scene", (e) => {
    if (e.detail === "about" && !running) { running = true; requestAnimationFrame(frame); }
  });
  if (document.body.classList.contains("at-about")) { running = true; requestAnimationFrame(frame); }
})();
