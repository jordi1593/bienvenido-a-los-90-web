// Menú hamburguesa del nav superior, compartido por la home y las páginas de episodio.
(function () {
  const toggle = document.getElementById("navToggle");
  const links = document.querySelector(".topnav-links");
  if (!toggle || !links) return;

  toggle.addEventListener("click", () => {
    const isOpen = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });

  links.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
      links.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
})();

// Botón "Episodio aleatorio", compartido por la home, las páginas de episodio y el 404.
(function () {
  const randomBtn = document.getElementById("randomEpisodeBtn");
  if (!randomBtn) return;

  const inEpisode = location.pathname.includes("/episodios/");
  const dataUrl = inEpisode ? "../data/episode-slugs.json" : "data/episode-slugs.json";

  randomBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      const slugs = await (await fetch(dataUrl)).json();
      const slug = slugs[Math.floor(Math.random() * slugs.length)];
      location.href = inEpisode ? `${slug}.html` : `episodios/${slug}.html`;
    } catch (err) {
      console.error("No se pudo cargar un episodio aleatorio", err);
    }
  });
})();
