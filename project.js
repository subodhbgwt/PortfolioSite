// One template for every project: what it is, how I worked, what I learned.
setupPage("work");

(() => {
  const slug = new URLSearchParams(location.search).get("p");
  let i = PROJECTS.findIndex((p) => p.slug === slug);
  if (i < 0) i = 0;
  const p = PROJECTS[i];
  const n = PROJECTS.length;
  const prev = PROJECTS[(i - 1 + n) % n], next = PROJECTS[(i + 1) % n];
  const $ = (id) => document.getElementById(id);

  document.title = `${p.name} · Subodh Bhagwat`;
  // point search engines at this project's own address
  const url = `https://subodhb.com/project.html?p=${p.slug}`;
  document.querySelector('link[rel="canonical"]').href = url;
  document.querySelector('meta[property="og:url"]').content = url;
  document.querySelector('meta[name="description"]').content = `${p.name}, a project by Subodh Bhagwat. ${p.text}`;

  $("kicker").textContent = `${p.caption} · ${p.year}`;
  $("title").textContent = p.name;
  $("figure").textContent = p.figure;
  $("what").textContent = p.text;
  $("how").textContent = p.how;
  $("learned").textContent = p.learned;
  $("prev").href = `project.html?p=${prev.slug}`;
  $("prev").textContent = `← ${prev.name}`;
  $("next").href = `project.html?p=${next.slug}`;
  $("next").textContent = `${next.name} →`;
  $("index").href = `work.html?p=${p.slug}`;
  if (p.link) $("link").innerHTML = `<a href="${p.link}" target="_blank" rel="noopener">Code on GitHub ↗</a>`;

  // images: click to see the next one
  if (p.media.length) {
    let k = 0;
    const shot = $("shot"), img = $("shot-img"), cap = $("shot-cap");
    const show = () => {
      const m = p.media[k];
      img.src = m.src;
      img.alt = m.alt;
      shot.classList.toggle("invert", !!m.invert);
      cap.textContent = p.media.length > 1 ? `${m.alt} · ${k + 1} / ${p.media.length}, click for the next` : m.alt;
    };
    $("shot-btn").addEventListener("click", () => { k = (k + 1) % p.media.length; show(); });
    shot.hidden = false;
    show();
  }

  // arrow keys flip between projects
  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") $("prev").click();
    if (e.key === "ArrowRight") $("next").click();
  });
})();
