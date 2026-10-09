// Portfolio, laid out like a positions screen: one row per project with a
// small trace next to it, and a preview of the selected one on the right.
// Hover, scroll or use the arrow keys to move; click or Enter to open.
setupPage("work");

(() => {
  const rows = document.getElementById("rows");
  const n = PROJECTS.length;
  document.getElementById("total").textContent = String(n).padStart(2, "0");
  const years = PROJECTS.map((p) => p.year);
  document.getElementById("span").textContent = `${Math.min(...years)}–${Math.max(...years)}`;

  // a random walk per project, seeded by its slug so it looks the same every visit
  function trace(slug) {
    let seed = [...slug].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 2147483647 || 1;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    let v = 0;
    return Array.from({ length: 48 }, () => (v += (rnd() + rnd() + rnd() - 1.5) * 0.9));
  }
  function drawTrace(canvas, pts, hot) {
    const { ctx, w, h } = fitCanvas(canvas);
    const lo = Math.min(...pts), hi = Math.max(...pts);
    const y = (v) => h - 3 - ((v - lo) / (hi - lo || 1)) * (h - 6);
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = hot ? "#ff8a1f" : "rgba(236,236,234,0.35)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    pts.forEach((v, i) => { const x = (i / (pts.length - 1)) * w; i ? ctx.lineTo(x, y(v)) : ctx.moveTo(x, y(v)); });
    ctx.stroke();
    ctx.fillStyle = hot ? "#ff8a1f" : "rgba(236,236,234,0.6)";
    ctx.fillRect(w - 3, y(pts[pts.length - 1]) - 1.5, 3, 3);
  }

  const items = PROJECTS.map((p, i) => {
    const a = document.createElement("a");
    a.className = "row";
    a.href = `project.html?p=${p.slug}`;
    a.setAttribute("role", "listitem");
    a.innerHTML = `
      <i class="row__n">${String(i + 1).padStart(2, "0")}</i>
      <span class="row__name"><b>${p.title}</b><small>${p.caption}</small></span>
      <canvas class="row__trace" aria-hidden="true"></canvas>
      <i class="row__year">${p.year}</i>`;
    a.addEventListener("pointerenter", () => select(i));
    a.addEventListener("focus", () => select(i));
    rows.appendChild(a);
    return { a, canvas: a.querySelector("canvas"), pts: trace(p.slug) };
  });

  const shot = document.getElementById("shot");
  const shotImg = document.getElementById("shot-img");
  const shotTxt = document.getElementById("shot-txt");
  const els = ["pcap", "ptitle", "ptext", "pfig"].reduce((o, id) => ((o[id] = document.getElementById(id)), o), {});
  const open = document.getElementById("popen");

  let current = -1;
  function select(i) {
    i = Math.max(0, Math.min(n - 1, i));
    if (i === current) return;
    current = i;
    const p = PROJECTS[i];
    items.forEach((it, j) => { it.a.classList.toggle("on", j === i); drawTrace(it.canvas, it.pts, j === i); });
    els.pcap.textContent = `${String(i + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")} · ${p.caption}`;
    els.ptitle.textContent = p.name;
    els.ptext.textContent = p.text;
    els.pfig.textContent = p.figure;
    open.href = shot.href = `project.html?p=${p.slug}`;
    if (p.media.length) {
      shotImg.src = p.media[0].src;
      shotImg.alt = p.media[0].alt;
      shotImg.hidden = false;
      shotTxt.hidden = true;
      shot.classList.toggle("invert", !!p.media[0].invert);
    } else {
      shotImg.hidden = true;
      shotTxt.hidden = false;
      shotTxt.textContent = p.figure;
      shot.classList.remove("invert");
    }
  }

  let wheelAcc = 0;
  window.addEventListener("wheel", (e) => {
    if (window.innerWidth < 760) return; // small screens just scroll the list
    wheelAcc += e.deltaY;
    if (Math.abs(wheelAcc) > 60) { select(current + Math.sign(wheelAcc)); wheelAcc = 0; }
  }, { passive: true });
  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "j") { e.preventDefault(); select(current + 1); }
    if (e.key === "ArrowUp" || e.key === "k") { e.preventDefault(); select(current - 1); }
    if (e.key === "Enter" && document.activeElement === document.body) items[current].a.click();
  });
  window.addEventListener("resize", () => items.forEach((it, j) => drawTrace(it.canvas, it.pts, j === current)));

  const start = Math.max(0, PROJECTS.findIndex((p) => p.slug === new URLSearchParams(location.search).get("p")));
  select(start);
})();
