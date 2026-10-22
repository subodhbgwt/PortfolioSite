// Shared bits: the nav with a Stockholm clock, the page transition, and a canvas helper.
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

// page change: black bars rise in a bell shape, middle first, and cover the
// page; on the next page they carry on upwards and out of the way
const BARS = 18;
function buildCurtain() {
  const wipe = document.createElement("div");
  wipe.className = "wipe";
  for (let i = 0; i < BARS; i++) {
    const bar = document.createElement("i");
    const z = (i - (BARS - 1) / 2) / (BARS * 0.24);
    bar.style.setProperty("--d", `${Math.round(140 * (1 - Math.exp(-z * z / 2)))}ms`);
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
      setTimeout(() => document.body.classList.remove("wipe-out"), 600);
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
    setTimeout(() => { location.href = a.href; }, 420);
  });
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) document.body.classList.remove("wipe-in", "wipe-shut");
  });
}

function setupPage(current) {
  buildNav(current);
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
