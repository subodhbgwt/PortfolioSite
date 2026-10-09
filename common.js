// Shared bits: nav with a Stockholm clock, crosshair cursor, page transition.
const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function buildNav(current) {
  const nav = document.createElement("header");
  nav.className = "nav";
  const link = (href, key, n, label) =>
    `<a href="${href}" ${current === key ? 'aria-current="page"' : ""}><i>${n}</i>${label}</a>`;
  nav.innerHTML = `
    <a href="index.html" class="nav__home"><b>Subodh Bhagwat</b><span class="nav__clock" id="clock" aria-hidden="true"></span></a>
    <nav class="nav__links">
      ${link("index.html#about", "about", "01", "About me")}
      ${link("work.html", "work", "02", "Portfolio")}
      ${link("contact.html", "contact", "03", "Contact")}
    </nav>`;
  document.body.prepend(nav);

  // Stockholm time, ticking
  const clock = nav.querySelector("#clock");
  const fmt = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const tick = () => { clock.textContent = `STHLM ${fmt.format(new Date())}`; };
  tick();
  setInterval(tick, 1000);
}

// the cursor is a chart crosshair: hairlines across the whole screen and a
// small readout of where you are, from 0 to 1 on each axis
function buildCursor() {
  const cur = document.createElement("div");
  cur.className = "cur";
  cur.innerHTML = '<div class="cur__h"></div><div class="cur__v"></div><div class="cur__dot"></div><div class="cur__tag"></div>';
  document.body.appendChild(cur);
  const [hl, vl, dot, tag] = cur.children;
  let x = -100, y = -100, sx = x, sy = y, hot = false;
  window.addEventListener("pointermove", (e) => { x = e.clientX; y = e.clientY; });
  document.addEventListener("pointerover", (e) => {
    hot = !!e.target.closest("a, button");
    cur.classList.toggle("hover", hot);
  });
  (function loop() {
    // a page can set window.cursorMagnet = {x, y} to pull the crosshair onto a target
    const m = window.cursorMagnet;
    const tx = m ? m.x : x, ty = m ? m.y : y;
    sx += (tx - sx) * (m ? 0.3 : 0.35);
    sy += (ty - sy) * (m ? 0.3 : 0.35);
    cur.classList.toggle("snap", !!m);
    dot.style.transform = `translate(${x}px, ${y}px)`;
    vl.style.transform = `translateX(${sx}px)`;
    hl.style.transform = `translateY(${sy}px)`;
    tag.style.transform = `translate(${sx + 12}px, ${sy + 10}px)`;
    tag.textContent = m ? "LOCK" : hot ? "OPEN" : `${(sx / innerWidth).toFixed(3)}  ${(1 - sy / innerHeight).toFixed(3)}`;
    requestAnimationFrame(loop);
  })();
}

// page change: black bars rise in a bell shape, middle first, and cover the
// page; on the next page they carry on upwards and out of the way
const BARS = 18;
function buildCurtain() {
  const wipe = document.createElement("div");
  wipe.className = "wipe";
  for (let i = 0; i < BARS; i++) {
    const bar = document.createElement("i");
    const z = (i - (BARS - 1) / 2) / (BARS * 0.24);
    bar.style.setProperty("--d", `${Math.round(280 * (1 - Math.exp(-z * z / 2)))}ms`);
    wipe.appendChild(bar);
  }
  document.body.appendChild(wipe);

  let arrived = false;
  try { arrived = sessionStorage.getItem("wipe") === "1"; sessionStorage.removeItem("wipe"); } catch (e) {}
  if (REDUCED) document.documentElement.classList.remove("wipe-pending");
  if (arrived && !REDUCED) {
    document.body.classList.add("wipe-shut");
    document.documentElement.classList.remove("wipe-pending");
    // let the closed bars paint once, then open them
    void wipe.offsetWidth;
    setTimeout(() => {
      document.body.classList.add("wipe-out");
      document.body.classList.remove("wipe-shut");
      setTimeout(() => document.body.classList.remove("wipe-out"), 900);
    }, 40);
  }

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || a.target === "_blank" || e.metaKey || e.ctrlKey) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname === location.pathname) return;
    e.preventDefault();
    if (REDUCED) { location.href = a.href; return; }
    try { sessionStorage.setItem("wipe", "1"); } catch (err) {}
    document.body.classList.add("wipe-in");
    setTimeout(() => { location.href = a.href; }, 700);
  });
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) document.body.classList.remove("wipe-in", "wipe-shut");
  });
}

function setupPage(current) {
  buildNav(current);
  buildCursor();
  buildCurtain();
}

// a canvas that tracks its size and device pixel ratio
function fitCanvas(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}
