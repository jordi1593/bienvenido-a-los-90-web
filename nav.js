// Marca el enlace activo del nav según la página actual.
(function () {
  const path = location.pathname;
  const links = document.querySelectorAll(".topnav-links a");

  // Páginas estáticas: comparar href con pathname
  const pageMap = [
    { pattern: /\/fotos\.html$/, href: ["fotos.html", "../fotos.html"] },
    { pattern: /\/directo\.html$/, href: ["directo.html", "../directo.html"] },
    { pattern: /\/tienda\.html$/, href: ["tienda.html", "../tienda.html"] },
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

// Barra de navegación inferior para móvil — inyecta también su propio CSS.
(function () {
  const style = document.createElement("style");
  style.textContent = `
    @media (max-width: 720px) {
      body { padding-bottom: calc(60px + env(safe-area-inset-bottom, 0px)); }
      .bottom-nav {
        position: fixed; bottom: 0; left: 0; right: 0; z-index: 100;
        display: flex; align-items: stretch;
        background: var(--bg-flat); border-top: 1px solid var(--border);
        padding-bottom: env(safe-area-inset-bottom, 0px);
        height: calc(60px + env(safe-area-inset-bottom, 0px));
      }
      .bottom-nav-item {
        flex: 1; display: flex; flex-direction: column;
        align-items: center; justify-content: center; gap: 3px;
        text-decoration: none; color: var(--text-dim);
        font-size: .6rem; font-weight: 700; letter-spacing: .04em;
        text-transform: uppercase; font-family: var(--font-body);
        padding: 8px 4px 6px; border: none; background: none;
        cursor: pointer; transition: color .15s ease;
        -webkit-tap-highlight-color: transparent;
      }
      .bottom-nav-item svg {
        width: 22px; height: 22px; flex-shrink: 0;
        stroke: currentColor; fill: none;
        stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round;
      }
      .bottom-nav-item.active, .bottom-nav-item:active { color: var(--accent); }
      .bottom-nav-item.active svg { stroke-width: 2.2; }
    }
    @media (min-width: 721px) { .bottom-nav { display: none !important; } }
  `;
  document.head.appendChild(style);
})();

(function () {
  const path = location.pathname;
  const inEpisode = path.includes("/episodios/");
  const inEtiqueta = path.includes("/etiquetas/");
  const depth = (inEpisode || inEtiqueta) ? "../" : "";

  const isHome     = path === "/" || path.endsWith("/index.html");
  const isTienda   = /\/tienda\.html$/.test(path);
  const isEpisodio = inEpisode;

  function item(href, label, svgPath, isActive, isBtn) {
    const tag = isBtn ? "button" : "a";
    const attrs = isBtn
      ? `type="button"`
      : `href="${href}"`;
    return `<${tag} class="bottom-nav-item${isActive ? " active" : ""}" ${attrs} aria-label="${label}">
      <svg viewBox="0 0 24 24" aria-hidden="true">${svgPath}</svg>
      <span>${label}</span>
    </${tag}>`;
  }

  const nav = document.createElement("nav");
  nav.className = "bottom-nav";
  nav.setAttribute("aria-label", "Navegación rápida");
  nav.innerHTML = [
    item(
      `${depth === "" ? "/" : depth}`,
      "Inicio",
      '<path d="M3 12L12 4l9 8"/><path d="M5 10v9a1 1 0 001 1h4v-4h4v4h4a1 1 0 001-1v-9"/>',
      isHome
    ),
    item(
      `${depth === "" ? "#episodios" : depth + "#episodios"}`,
      "Episodios",
      '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="3" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="3" cy="18" r="1" fill="currentColor" stroke="none"/>',
      isEpisodio
    ),
    item(
      `${depth === "" ? "#episodios" : depth + "#episodios"}`,
      "Buscar",
      '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
      false
    ),
    item(
      `${depth}tienda.html`,
      "Tienda",
      '<path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>',
      isTienda
    ),
    item(null, "Aleatorio", '<rect x="2" y="2" width="20" height="20" rx="3"/><circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none"/><circle cx="16" cy="8" r="1.2" fill="currentColor" stroke="none"/><circle cx="8" cy="16" r="1.2" fill="currentColor" stroke="none"/><circle cx="16" cy="16" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>', false, true),
  ].join("");

  document.body.appendChild(nav);

  // Botón aleatorio
  nav.querySelector("button").addEventListener("click", () => {
    const btn = document.getElementById("randomEpisodeBtn");
    if (btn) btn.click();
  });

  // Buscar: intenta enfocar el buscador si existe en la página
  nav.querySelectorAll("a").forEach(a => {
    if (a.textContent.trim() === "Buscar") {
      a.addEventListener("click", e => {
        const search = document.querySelector('input[type="search"]');
        if (search) {
          e.preventDefault();
          search.focus();
          search.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
    }
  });
})();
