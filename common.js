// Shared bits: the nav with a Stockholm clock, and a canvas helper.
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

function setupPage(current) {
  buildNav(current);
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
