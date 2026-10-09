// One template for every project. Behind the text: a field of grey words,
// and the project's key words in white, joined up like a graph.
setupPage("work");

(() => {
  const slug = new URLSearchParams(location.search).get("p");
  let i = PROJECTS.findIndex((p) => p.slug === slug);
  if (i < 0) i = 0;
  const p = PROJECTS[i];
  const n = PROJECTS.length;

  document.title = `${p.name} · Subodh Bhagwat`;
  // point search engines at this project's own address
  const url = `https://subodhb.com/project.html?p=${p.slug}`;
  document.querySelector('link[rel="canonical"]').href = url;
  document.querySelector('meta[property="og:url"]').content = url;
  document.querySelector('meta[name="description"]').content = `${p.name}, a project by Subodh Bhagwat. ${p.text.split(". ")[0]}.`;
  document.getElementById("kicker").textContent = `[ Work ${String(i + 1).padStart(2, "0")} ]  ${p.caption}  ·  ${p.year}`;
  document.getElementById("title").textContent = p.title;
  document.getElementById("text").textContent = p.text;
  document.getElementById("figure").textContent = p.figure;
  document.getElementById("prev").href = `project.html?p=${PROJECTS[(i - 1 + n) % n].slug}`;
  document.getElementById("next").href = `project.html?p=${PROJECTS[(i + 1) % n].slug}`;
  document.getElementById("index").href = `work.html?p=${p.slug}`;

  // images: one at a time in a frame on the right, click to see the next
  const shot = document.getElementById("shot");
  if (p.media.length) {
    let k = 0;
    const img = document.getElementById("shot-img");
    const cap = document.getElementById("shot-cap");
    const showShot = () => {
      const m = p.media[k];
      img.src = m.src;
      img.alt = m.alt;
      shot.classList.toggle("invert", !!m.invert);
      cap.textContent = p.media.length > 1 ? `${k + 1} / ${p.media.length} · click for next` : m.alt;
    };
    document.getElementById("shot-btn").addEventListener("click", () => { k = (k + 1) % p.media.length; showShot(); });
    shot.hidden = false;
    showShot();
  }
  if (p.link) {
    document.getElementById("link").innerHTML = `<a href="${p.link}" target="_blank" rel="noopener">Code on GitHub ↗</a>`;
  }
  // arrow keys flip between projects, Esc goes back to the list
  window.addEventListener("keydown", (e) => {
    const go = { ArrowLeft: "prev", ArrowRight: "next", Escape: "index" }[e.key];
    if (go) document.getElementById(go).click();
  });

  // --- the word field ---
  const canvas = document.getElementById("words");
  let seed = [...p.slug].reduce((a, c) => a + c.charCodeAt(0), 11);
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  const LABEL_FONT = '600 12px Archivo, "Helvetica Neue", Arial, sans-serif';
  const fieldFont = (size) => `300 ${size}px Archivo, "Helvetica Neue", Arial, sans-serif`;

  let layout = null;
  function build(ctx, w, h) {
    const textBox = document.querySelector(".proj__intro").getBoundingClientRect();
    const taken = [{ x: 0, y: 0, w: textBox.right + 30, h: textBox.bottom + 24 }];
    if (!shot.hidden) {
      const sb = shot.getBoundingClientRect();
      taken.push({ x: sb.left - 24, y: 0, w: w - sb.left + 24, h: sb.bottom + 24 });
    }
    taken.push({ x: 0, y: h - 70, w, h: 70 }); // the nav row
    const hits = (r) => taken.some((q) => r.x < q.x + q.w && r.x + r.w > q.x && r.y < q.y + q.h && r.y + r.h > q.y);

    // key words: white caps with a dot, on a loose grid below the text
    ctx.font = LABEL_FONT;
    if ("letterSpacing" in ctx) ctx.letterSpacing = "1.8px";
    const cols = w < 700 ? 2 : 4;
    const rows = Math.ceil(p.graph.length / cols);
    const slots = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) slots.push([c, r]);
    for (let k = slots.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [slots[k], slots[j]] = [slots[j], slots[k]]; }
    const top = Math.max(0.45, (Math.max(textBox.bottom, shot.hidden ? 0 : shot.getBoundingClientRect().bottom) + 50) / h);
    const graph = p.graph.map((t, k) => {
      const [c, r] = slots[k];
      const label = t.toUpperCase();
      const g = {
        t: label,
        x: 0.05 + (c + rnd() * 0.4) * (0.86 / cols),
        y: top + (r + 0.2 + rnd() * 0.5) * ((0.86 - top) / rows),
        tw: ctx.measureText(label).width,
        ph: rnd() * 6,
      };
      taken.push({ x: g.x * w - 12, y: g.y * h - 14, w: g.tw + 34, h: 28 });
      return g;
    });

    // each key word links to its two nearest neighbours, so lines stay short
    const links = new Set();
    graph.forEach((g, k) => {
      graph.map((o, j) => [j, Math.hypot((o.x - g.x) * w, (o.y - g.y) * h)])
        .filter(([j]) => j !== k).sort((a2, b2) => a2[1] - b2[1]).slice(0, 2)
        .forEach(([j]) => links.add(k < j ? `${k}-${j}` : `${j}-${k}`));
    });

    // grey background words, each used once, never overlapping anything
    const field = [];
    for (const t of p.field) {
      const size = 13 + Math.round(rnd() * 6);
      ctx.font = fieldFont(size);
      if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
      const tw = ctx.measureText(t).width;
      for (let tries = 0; tries < 60; tries++) {
        const x = 16 + rnd() * (w - tw - 32), y = 80 + rnd() * (h - 150);
        const r = { x: x - 8, y: y - size, w: tw + 16, h: size * 2 };
        if (!hits(r)) { taken.push(r); field.push({ t, x, y, s: size, a: 0.14 + rnd() * 0.16, ph: rnd() * 6 }); break; }
      }
    }
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
    layout = { field, graph, links: [...links].map((k) => k.split("-").map(Number)), w, h };
  }

  // the mouse eases the two layers in opposite directions; nothing wobbles on its own
  let mx = 0.5, my = 0.5, smx = 0.5, smy = 0.5;
  window.addEventListener("pointermove", (e) => { mx = e.clientX / innerWidth; my = e.clientY / innerHeight; });

  function frame(t) {
    const { ctx, w, h } = fitCanvas(canvas);
    if (!w || !h) return requestAnimationFrame(frame);
    if (!layout || layout.w !== w || layout.h !== h) build(ctx, w, h);
    ctx.clearRect(0, 0, w, h);
    if (!REDUCED) { smx += (mx - smx) * 0.05; smy += (my - smy) * 0.05; }
    const px = (smx - 0.5) * 14, py = (smy - 0.5) * 10;

    ctx.textBaseline = "middle";
    for (const f of layout.field) {
      ctx.font = fieldFont(f.s);
      ctx.fillStyle = `rgba(236,236,234,${f.a})`;
      ctx.fillText(f.t, f.x - px * 0.5, f.y - py * 0.5);
    }

    const pos = layout.graph.map((g) => ({ x: g.x * w + px, y: g.y * h + py }));
    ctx.strokeStyle = "rgba(236,236,234,0.55)";
    ctx.lineWidth = 1;
    for (const [a, b] of layout.links) {
      ctx.beginPath();
      ctx.moveTo(pos[a].x, pos[a].y);
      ctx.lineTo(pos[b].x, pos[b].y);
      ctx.stroke();
    }

    ctx.font = LABEL_FONT;
    if ("letterSpacing" in ctx) ctx.letterSpacing = "1.8px";
    layout.graph.forEach((g, k) => {
      const { x, y } = pos[k];
      // a dark patch behind each label so lines pass under the words, not through them
      ctx.fillStyle = "#090909";
      ctx.fillRect(x + 8, y - 10, g.tw + 10, 20);
      ctx.fillStyle = "#ececea";
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText(g.t, x + 13, y + 1);
    });
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";

    requestAnimationFrame(frame);
  }
  document.fonts.ready.then(() => requestAnimationFrame(frame));
})();
