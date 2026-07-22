// Marca el enlace activo del nav según la página actual.
(function () {
  const path = location.pathname;
  const links = document.querySelectorAll(".topnav-links a");

  // Páginas estáticas: comparar href con pathname
  const pageMap = [
    { pattern: /\/fotos\.html$/, href: ["fotos.html", "../fotos.html"] },
    { pattern: /\/directo\.html$/, href: ["directo.html", "../directo.html"] },
    { pattern: /\/etiquetas(\/|$|\/index\.html)/, href: ["etiquetas/", "../etiquetas/"] },
    { pattern: /\/episodios\//, href: ["../episodios/", "#episodios", "/#episodios", "../#episodios"] },
  ];

  let marked = false;
  for (const { pattern, href } of pageMap) {
    if (pattern.test(path)) {
      links.forEach(a => {
        if (href.includes(a.getAttribute("href"))) {
          a.classList.add("active");
          marked = true;
        }
      });
      break;
    }
  }

  // Home: IntersectionObserver para secciones de ancla
  if (!marked && (path === "/" || path.endsWith("/index.html"))) {
    const anchorLinks = [...links].filter(a => {
      const h = a.getAttribute("href");
      return h && h.startsWith("#");
    });
    if (!anchorLinks.length) return;

    const sectionIds = anchorLinks.map(a => a.getAttribute("href").slice(1));
    const sections = sectionIds.map(id => document.getElementById(id)).filter(Boolean);

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          anchorLinks.forEach(a => a.classList.remove("active"));
          const match = anchorLinks.find(a => a.getAttribute("href") === "#" + id);
          if (match) match.classList.add("active");
        }
      });
    }, { rootMargin: "-30% 0px -60% 0px", threshold: 0 });

    sections.forEach(s => observer.observe(s));
  }
})();

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
  const inEtiqueta = location.pathname.includes("/etiquetas/");
  const dataUrl = (inEpisode || inEtiqueta) ? "../data/episode-slugs.json" : "data/episode-slugs.json";

  randomBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      const slugs = await (await fetch(dataUrl)).json();
      const slug = slugs[Math.floor(Math.random() * slugs.length)];
      if (inEpisode) {
        location.href = `${slug}.html`;
      } else if (inEtiqueta) {
        location.href = `../episodios/${slug}.html`;
      } else {
        location.href = `episodios/${slug}.html`;
      }
    } catch (err) {
      console.error("No se pudo cargar un episodio aleatorio", err);
    }
  });
})();

// Botón de modo oscuro/claro, compartido por todas las páginas.
(function () {
  const toggle = document.getElementById("themeToggle");
  if (!toggle) return;

  toggle.addEventListener("click", () => {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    if (isDark) {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("theme", "light");
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("theme", "dark");
    }
  });
})();

// Botón "Copiar enlace" en la fila de compartir de cada episodio.
(function () {
  const copyBtn = document.querySelector(".icon-copy");
  if (!copyBtn) return;

  const url = copyBtn.dataset.copyUrl;
  const originalTitle = copyBtn.getAttribute("title");

  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(url);
      copyBtn.classList.add("copied");
      copyBtn.setAttribute("title", "¡Enlace copiado!");
      setTimeout(() => {
        copyBtn.classList.remove("copied");
        copyBtn.setAttribute("title", originalTitle);
      }, 2000);
    } catch (err) {
      console.error("No se pudo copiar el enlace", err);
    }
  });
})();
