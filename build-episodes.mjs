// Genera una página HTML estática por episodio en /episodios/, optimizada
// para SEO: meta description, Open Graph, canonical a esta misma página
// (esta web compite por su propio posicionamiento, no apunta al blog
// original) y JSON-LD PodcastEpisode. También genera sitemap.xml y robots.txt.

import fs from "fs";
import path from "path";

const SITE_URL = process.env.SITE_URL || "https://bienvenidoalos90.com";
const OUT_DIR = "episodios";

const PLATFORM_SHOW_LINKS = {
  spotify: "https://open.spotify.com/show/5c1ikDBBLMlls8ZTvcu14N",
  apple: "https://podcasts.apple.com/es/podcast/bienvenido-a-los-90/id1369150482",
  amazon: "https://music.amazon.es/podcasts/5778f981-68a5-405e-aa21-b7ef2c972412/bienvenido-a-los-90?refMarker=null",
};

const PLATFORM_ICONS = {
  ivoox: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 13v-1a7 7 0 0 1 14 0v1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><rect x="3.2" y="13" width="4" height="6" rx="1.6" fill="currentColor"/><rect x="16.8" y="13" width="4" height="6" rx="1.6" fill="currentColor"/></svg>',
  apple: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/></svg>',
  spotify: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9.2" stroke="currentColor" stroke-width="1.6"/><path d="M7 10.5c3.2-1 7-.7 9.7 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M7.6 13.3c2.6-.8 5.6-.6 7.8.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M8.3 16c2-.6 4.3-.5 6 .5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  amazon: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9.2" stroke="currentColor" stroke-width="1.6"/><path d="M6.5 14.5c3.6 2.6 7.4 2.6 11 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M16 14.2l1.6.4-.6 1.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

function ivooxEpisodeId(ep) {
  const link = ep.ivooxLink || ep.downloadLink;
  if (!link) return null;
  const m = link.match(/rf[_/](\d+)/);
  return m ? m[1] : null;
}

function platformLinks(ep) {
  const links = [];
  const ivoox = ep.ivooxLink || ep.downloadLink;
  if (ivoox) links.push({ label: "Escuchar en iVoox", url: ivoox, exact: true, icon: "ivoox" });
  links.push({
    label: ep.spotifyLink ? "Escuchar en Spotify" : "Spotify (programa)",
    url: ep.spotifyLink || PLATFORM_SHOW_LINKS.spotify,
    exact: !!ep.spotifyLink,
    icon: "spotify",
  });
  links.push({
    label: ep.appleLink ? "Escuchar en Apple Podcasts" : "Apple Podcasts (programa)",
    url: ep.appleLink || PLATFORM_SHOW_LINKS.apple,
    exact: !!ep.appleLink,
    icon: "apple",
  });
  links.push({
    label: ep.amazonLink ? "Escuchar en Amazon Music" : "Amazon Music (programa)",
    url: ep.amazonLink || PLATFORM_SHOW_LINKS.amazon,
    exact: !!ep.amazonLink,
    icon: "amazon",
  });
  return links;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// Convierte las URLs sueltas que aparecen en el texto (ya escapado) en
// enlaces clicables, p.ej. "+ info - https://linktr.ee/b90podcast".
function linkifyText(escapedText) {
  return escapedText.replace(
    /(https?:\/\/[^\s<]+)/g,
    (url) => `<a href="${url}" target="_blank" rel="noopener">${url}</a>`
  );
}

function formatDateLong(iso) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
}

function metaDescription(paragraphs) {
  const text = paragraphs.find((p) => !/^espacio patrocinado por/i.test(p)) || "";
  return text.length > 160 ? text.slice(0, 157).trimEnd() + "…" : text;
}

function bigThumbnail(thumb) {
  return thumb ? thumb.replace("/s72-c/", "/s640/") : null;
}

// Variantes del nombre del programa que no aportan información temática
// para relacionar episodios entre sí.
const GENERIC_LABEL_KEYS = new Set([
  "bienvenido a lo 90",
  "bienvenido a los 90",
  "bienvenido  a los 90",
  "bienvenidoalos90",
  "bienvenidoalo 90",
]);

function labelKey(label) {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

// Palabras demasiado genéricas en los títulos (nombre del programa, conectores,
// numeración...) que no aportan señal real de temática compartida.
const TITLE_STOPWORDS = new Set([
  "bienvenido", "los", "90", "90s", "programa", "especial", "parte", "p",
  "el", "la", "las", "un", "una", "unos", "unas", "de", "del", "en", "y",
  "o", "a", "con", "sin", "su", "sus", "que", "se", "lo", "al", "por",
  "para", "como", "más", "mas", "este", "esta", "estos", "estas",
]);

function titleKeywords(title) {
  return new Set(
    title
      .toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !TITLE_STOPWORDS.has(w))
  );
}

// Episodios relacionados: prioriza los que comparten etiquetas temáticas
// (artista, banda, tema), suma puntos si comparten palabras clave en el
// título (p.ej. el nombre de un artista que no esté etiquetado), y completa
// con los cronológicamente más cercanos si no hay suficientes coincidencias.
function getRelatedEpisodes(ep, allEpisodes) {
  const epKeys = new Set(ep.labels.map(labelKey).filter((k) => !GENERIC_LABEL_KEYS.has(k)));
  const epTitleWords = titleKeywords(ep.title);
  const epTime = new Date(ep.published).getTime();

  const scored = allEpisodes
    .filter((other) => other.slug !== ep.slug)
    .map((other) => {
      const otherKeys = other.labels.map(labelKey).filter((k) => !GENERIC_LABEL_KEYS.has(k));
      const sharedLabels = otherKeys.filter((k) => epKeys.has(k)).length;
      const otherTitleWords = titleKeywords(other.title);
      const sharedTitleWords = [...epTitleWords].filter((w) => otherTitleWords.has(w)).length;
      const score = sharedLabels * 3 + sharedTitleWords;
      return { ep: other, score, timeDiff: Math.abs(new Date(other.published).getTime() - epTime) };
    });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.timeDiff - b.timeDiff;
  });

  return scored.slice(0, 3).map((s) => s.ep);
}

// Detecta especiales multi-parte por el título (p.ej. "... (Parte 2)") y
// agrupa los episodios que pertenecen a la misma serie, para poder
// enlazarlos explícitamente entre sí en cada página.
function stripNumberPrefix(title) {
  let s = title;
  let prev;
  do {
    prev = s;
    s = s.replace(/^(?:bienvenido a los 90\s*-\s*|programa\s*\d+\s*-\s*|p\.?\s*\d+\s*-?\s*|\d+\s*-\s*)/i, "").trim();
  } while (s !== prev);
  return s;
}

function detectSeriesPart(title) {
  const m = title.match(/^(.*?)[\s,(]*parte\s*(\d+)\)?\s*:?\s*(.*)$/i);
  if (!m) return null;
  let base = m[1].trim().replace(/[,(:-]+$/, "").trim();
  base = stripNumberPrefix(base);
  base = base.replace(/\s*["“][^"”]+["”]\s*$/, "").trim();
  if (!base) return null;
  return { key: base.toLowerCase(), partNum: parseInt(m[2], 10) };
}

function buildSeriesMap(allEpisodes) {
  const groups = new Map();
  for (const ep of allEpisodes) {
    const detected = detectSeriesPart(ep.title);
    if (!detected) continue;
    if (!groups.has(detected.key)) groups.set(detected.key, []);
    groups.get(detected.key).push({ ep, partNum: detected.partNum });
  }

  const seriesBySlug = new Map();
  for (const items of groups.values()) {
    if (items.length < 2) continue;
    items.sort((a, b) => a.partNum - b.partNum);
    const parts = items.map((i) => ({ slug: i.ep.slug, title: i.ep.title, partNum: i.partNum }));
    for (const item of items) {
      seriesBySlug.set(item.ep.slug, parts);
    }
  }
  return seriesBySlug;
}

function episodePage(ep, { prev, next, related, series }) {
  const description = escapeHtml(metaDescription(ep.paragraphs));
  // Algunos episodios muy antiguos no tienen miniatura propia; usamos el
  // logo del podcast como respaldo para que la vista previa al compartir
  // nunca quede sin imagen.
  const image = bigThumbnail(ep.thumbnail) || `${SITE_URL}/images/b90-logo-new.jpg`;
  const pageUrl = `${SITE_URL}/episodios/${ep.slug}.html`;
  const canonical = pageUrl;
  const ivooxId = ivooxEpisodeId(ep);

  const bodyParagraphs = ep.paragraphs
    .map((p) => `<p>${linkifyText(escapeHtml(p))}</p>`)
    .join("\n      ");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "PodcastEpisode",
    name: ep.title,
    datePublished: ep.published,
    url: pageUrl,
    description: metaDescription(ep.paragraphs),
    ...(image ? { image } : {}),
    partOfSeries: {
      "@type": "PodcastSeries",
      name: "Bienvenido a los 90",
      url: SITE_URL,
    },
    ...(ep.ivooxLink || ep.downloadLink ? {
      associatedMedia: {
        "@type": "MediaObject",
        contentUrl: ep.ivooxLink || ep.downloadLink,
      },
    } : {}),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Episodios", item: `${SITE_URL}/#episodios` },
      { "@type": "ListItem", position: 3, name: ep.title, item: pageUrl },
    ],
  };

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<script>(function(){var t=localStorage.getItem("theme");if(t==="dark")document.documentElement.setAttribute("data-theme","dark");})();</script>
<title>${escapeHtml(ep.title)} — Bienvenido a los 90</title>
<link rel="icon" type="image/jpeg" href="../images/b90-logo-new.jpg" media="(prefers-color-scheme: light)" />
<link rel="icon" type="image/png" href="../images/b90-logo-transparent.png" media="(prefers-color-scheme: dark)" />
<link rel="apple-touch-icon" href="../images/b90-logo-new.jpg" />
<meta name="description" content="${description}" />
<link rel="canonical" href="${canonical}" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="../styles.css?v=32" />

<meta property="og:type" content="article" />
<meta property="og:title" content="${escapeHtml(ep.title)}" />
<meta property="og:description" content="${description}" />
<meta property="og:url" content="${pageUrl}" />
${image ? `<meta property="og:image" content="${image}" />` : ""}
<meta property="article:published_time" content="${ep.published}" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(ep.title)}" />
<meta name="twitter:description" content="${description}" />
${image ? `<meta name="twitter:image" content="${image}" />` : ""}

<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
<script type="application/ld+json">${JSON.stringify(breadcrumbJsonLd)}</script>
</head>
<body>
  <nav class="topnav">
    <div class="container topnav-inner">
      <a class="brand" href="../" aria-label="Bienvenido a los 90">
        <img class="brand-logo logo-light" src="../images/b90-logo-transparent.png" alt="B" />
        <img class="brand-logo logo-dark" src="../images/b90-logo-dark.png" alt="B" />
        <span>ienvenido a los 90</span>
      </a>
      <div class="topnav-links">
        <a href="../#episodios">Episodios</a>
        <a href="../#escuchanos">Escúchanos</a>
        <a href="../#sigue">Síguenos</a>
        <a href="#" id="randomEpisodeBtn">🎲 Episodio aleatorio</a>
      </div>
      <button class="theme-toggle" id="themeToggle" type="button" title="Cambiar tema" aria-label="Cambiar tema claro/oscuro">
        <svg class="icon-sun" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="4.5" stroke="currentColor" stroke-width="1.6"/><path d="M12 2.5v2.5M12 19v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2.5 12H5M19 12h2.5M4.2 19.8L6 18M18 6l1.8-1.8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
        <svg class="icon-moon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>
      </button>
      <button class="nav-toggle" id="navToggle" aria-label="Abrir menú" aria-expanded="false">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </button>
    </div>
  </nav>

  <main class="container episode-page">
    <nav class="breadcrumbs"><a href="../">Episodios</a> / <span>${ep.number ? `#${ep.number}` : ""}</span></nav>

    <div class="episode-page-layout">
    <article>
      <h1>${escapeHtml(ep.title)}</h1>
      <p class="episode-meta">${formatDateLong(ep.published)} · ${ep.comments} comentario${ep.comments === 1 ? "" : "s"}</p>
      ${typeof ep.likes === "number" ? `<p class="episode-likes"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 20.5s-7.5-4.6-9.8-9.2C.5 7.8 2.3 4.5 5.8 4c2.1-.3 4.1.7 6.2 3 2.1-2.3 4.1-3.3 6.2-3 3.5.5 5.3 3.8 3.6 7.3-2.3 4.6-9.8 9.2-9.8 9.2z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg> ${ep.likes}</p>` : ""}

      ${ivooxId ? `<div class="ivoox-player"><iframe frameborder="0" allowfullscreen scrolling="no" height="200" style="width:100%;" src="https://www.ivoox.com/player_ej_${ivooxId}_4_1.html?c1=ed285e" loading="lazy" title="Reproductor de iVoox"></iframe></div>` : ""}

      ${!ivooxId && image ? `<img class="episode-cover" src="${image}" alt="${escapeHtml(ep.title)}" loading="lazy" />` : ""}

      <div class="episode-actions">
        <a class="primary" href="${ep.url}" target="_blank" rel="noopener">Ver en el blog original</a>
      </div>

      <div class="platform-row">
        <span class="platform-row-label">Escúchalo en:</span>
        ${platformLinks(ep).map((p) => `<a class="icon-${p.icon}" href="${p.url}" target="_blank" rel="noopener" title="${escapeHtml(p.label)}" aria-label="${escapeHtml(p.label)}">${PLATFORM_ICONS[p.icon]}</a>`).join("")}
      </div>

      <div class="share-row">
        <span class="share-row-label">Compartir:</span>
        <a class="share-btn icon-whatsapp" href="https://wa.me/?text=${encodeURIComponent(`${ep.title} ${pageUrl}`)}" target="_blank" rel="noopener" title="Compartir en WhatsApp" aria-label="Compartir en WhatsApp"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3.5a8.5 8.5 0 0 0-7.3 12.8L4 20.5l4.3-1.1A8.5 8.5 0 1 0 12 3.5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M9 9.8c.1-.8.6-.9 1-.9s.7 0 .9.5c.2.5.6 1.5.6 1.7s0 .4-.2.6c-.2.3-.4.4-.2.7.2.3 1 1.3 2.2 1.8.3.1.5.1.7-.1.2-.2.6-.7.8-.9.2-.2.3-.2.6-.1.3.1 1.6.8 1.9 1 .3.1.4.2.5.3.1.2.1.9-.2 1.3-.3.4-1.3 1-2.4.7-1.1-.3-2.9-1.1-4.4-2.7-1.2-1.3-1.9-2.7-2.1-3.2-.2-.5-.4-1.2-.3-1.7z" fill="currentColor"/></svg></a>
        <a class="share-btn icon-x" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(ep.title)}&url=${encodeURIComponent(pageUrl)}" target="_blank" rel="noopener" title="Compartir en X" aria-label="Compartir en X"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" stroke-width="1.6"/><path d="M7.5 7.5l9 9M16.5 7.5l-9 9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></a>
        <button class="share-btn icon-copy" type="button" data-copy-url="${pageUrl}" title="Copiar enlace" aria-label="Copiar enlace"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 9V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><rect x="4" y="9" width="11" height="11" rx="2" stroke="currentColor" stroke-width="1.6"/></svg></button>
      </div>

      <div class="episode-content">
      ${bodyParagraphs}
      </div>

      ${ep.labels.length ? `<div class="episode-tags">${ep.labels.map((l) => `<a href="../?label=${encodeURIComponent(l)}#episodios">${escapeHtml(l)}</a>`).join("")}</div>` : ""}

      ${series ? `
      <div class="series-box">
        <h3>Especial en varias partes</h3>
        <ol class="series-list">
          ${series.map((s) => `
          <li class="${s.slug === ep.slug ? "series-current" : ""}">
            ${s.slug === ep.slug
              ? `<span>Parte ${s.partNum}: ${escapeHtml(s.title)}</span>`
              : `<a href="${s.slug}.html">Parte ${s.partNum}: ${escapeHtml(s.title)}</a>`}
          </li>`).join("")}
        </ol>
      </div>` : ""}
    </article>

    <aside class="related-episodes">
      <h3>Relacionados</h3>
      ${related.map((r) => {
        const relImage = bigThumbnail(r.thumbnail);
        const relBadge = r.number ? `#${r.number}` : "";
        return `
        <a class="related-card" href="${r.slug}.html">
          <span class="episode-cover-link related-cover-link">
            ${relImage ? `<img class="episode-cover-img" src="${relImage}" alt="" loading="lazy" />` : `<div class="episode-cover-img"></div>`}
            ${relBadge ? `<span class="episode-badge">${relBadge}</span>` : ""}
          </span>
          <span class="related-card-title">${escapeHtml(r.title)}</span>
        </a>`;
      }).join("")}
    </aside>
    </div>

    <nav class="episode-pager">
      ${prev ? `<a href="${prev.slug}.html">← ${escapeHtml(prev.title)}</a>` : "<span></span>"}
      ${next ? `<a href="${next.slug}.html">${escapeHtml(next.title)} →</a>` : "<span></span>"}
    </nav>

    <p class="back-link"><a href="../">← Volver al listado completo de episodios</a></p>
  </main>

  <footer class="site-footer">
    <div class="container">
      <h3>Encuéntranos en</h3>
      <div class="social-row">
        <a class="social-btn icon-instagram" href="https://instagram.com/b90podcast" target="_blank" rel="noopener" title="Instagram" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="4.2" stroke="currentColor" stroke-width="1.6"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor"/></svg></a>
        <a class="social-btn icon-substack" href="https://bienvenidoalos90.substack.com/" target="_blank" rel="noopener" title="Substack" aria-label="Substack"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="5" width="16" height="2.2" fill="currentColor"/><rect x="4" y="9" width="16" height="2.2" fill="currentColor"/><path d="M4 13.5h16L12 20.5z" fill="currentColor"/></svg></a>
        <a class="social-btn icon-facebook" href="https://www.facebook.com/bienvenidoalo90" target="_blank" rel="noopener" title="Facebook" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9.2" stroke="currentColor" stroke-width="1.6"/><path d="M13.5 9.2h1.8V7H13.2c-1.5 0-2.4 1-2.4 2.5v1.3H9.4v2h1.4V17h2.1v-4.2h1.7l.3-2h-2V9.6c0-.3.2-.4.6-.4z" fill="currentColor"/></svg></a>
        <a class="social-btn icon-x" href="https://x.com/Rockisroll" target="_blank" rel="noopener" title="X" aria-label="X"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" stroke-width="1.6"/><path d="M7.5 7.5l9 9M16.5 7.5l-9 9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></a>
        <a class="social-btn icon-tiktok" href="https://tiktok.com/@b90podcast" target="_blank" rel="noopener" title="TikTok" aria-label="TikTok"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 4v9.5a3.5 3.5 0 1 1-3-3.46" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 4c.3 2 1.8 3.6 4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></a>
        <a class="social-btn icon-twitch" href="https://www.twitch.tv/bienvenidoalos90" target="_blank" rel="noopener" title="Twitch" aria-label="Twitch"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 4h14v10l-3.5 3.5H12l-2 2H8v-2H5V4z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M11 8v3.5M15 8v3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></a>
        <a class="social-btn icon-telegram" href="https://t.me/bienvenidoalosnoventa" target="_blank" rel="noopener" title="Telegram" aria-label="Telegram"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9.2" stroke="currentColor" stroke-width="1.6"/><path d="M7 12.3l9-4.3-3 9-2.1-3.3-3.4 2 .5-3.4z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg></a>
        <a class="social-btn icon-bluesky" href="https://bsky.app/profile/bienvenidoalos90.bsky.social" target="_blank" rel="noopener" title="Bluesky" aria-label="Bluesky"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 8.5c-1-2.3-3.6-4-5.8-3-1.3.6-1 2.6.1 3.7 1 1 2.7 1.6 4 1.7-1.3.2-3 .8-4 1.8-1.1 1.1-1.4 3.1-.1 3.7 2.2 1 4.8-.7 5.8-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 8.5c1-2.3 3.6-4 5.8-3 1.3.6 1 2.6-.1 3.7-1 1-2.7 1.6-4 1.7 1.3.2 3 .8 4 1.8 1.1 1.1 1.4 3.1.1 3.7-2.2 1-4.8-.7-5.8-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
        <a class="social-btn icon-whatsapp" href="https://www.whatsapp.com/channel/0029VaASqFALY6d2gMeB771N" target="_blank" rel="noopener" title="WhatsApp" aria-label="WhatsApp"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3.5a8.5 8.5 0 0 0-7.3 12.8L4 20.5l4.3-1.1A8.5 8.5 0 1 0 12 3.5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M9 9.8c.1-.8.6-.9 1-.9s.7 0 .9.5c.2.5.6 1.5.6 1.7s0 .4-.2.6c-.2.3-.4.4-.2.7.2.3 1 1.3 2.2 1.8.3.1.5.1.7-.1.2-.2.6-.7.8-.9.2-.2.3-.2.6-.1.3.1 1.6.8 1.9 1 .3.1.4.2.5.3.1.2.1.9-.2 1.3-.3.4-1.3 1-2.4.7-1.1-.3-2.9-1.1-4.4-2.7-1.2-1.3-1.9-2.7-2.1-3.2-.2-.5-.4-1.2-.3-1.7z" fill="currentColor"/></svg></a>
        <a class="social-btn icon-email" href="mailto:bienvenidoalosnoventa@gmail.com" title="Email" aria-label="Email"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M4 6.5l8 6 8-6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
        <a class="social-btn icon-linktree" href="https://linktr.ee/b90podcast" target="_blank" rel="noopener" title="Linktree" aria-label="Linktree"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3v18M12 9L6 5M12 9l6-4M12 14L6 10M12 14l6-4M9 18l3 3 3-3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
      </div>
      <p class="footer-tagline">Bienvenido a los 90 · Podcast independiente de música · Conectando personas desde 2012</p>
    </div>
  </footer>

  <script src="../nav.js?v=4" defer></script>
</body>
</html>
`;
}

function buildSitemap(episodes) {
  const urls = [
    { loc: `${SITE_URL}/`, priority: "1.0", image: `${SITE_URL}/images/b90-logo-new.jpg` },
    ...episodes.map((ep) => ({
      loc: `${SITE_URL}/episodios/${ep.slug}.html`,
      lastmod: ep.published.slice(0, 10),
      priority: "0.7",
      // Mismo respaldo que el og:image: si el episodio no tiene miniatura
      // propia, anunciamos el logo del podcast para esa página.
      image: bigThumbnail(ep.thumbnail) || `${SITE_URL}/images/b90-logo-new.jpg`,
    })),
  ];

  const body = urls.map((u) => `  <url>
    <loc>${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}
    <priority>${u.priority}</priority>
    ${u.image ? `<image:image><image:loc>${u.image}</image:loc></image:image>` : ""}
  </url>`).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${body}
</urlset>
`;
}

function buildRobots() {
  return `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
}

function main() {
  const episodes = JSON.parse(fs.readFileSync("episodes.json", "utf-8"));
  // Orden cronológico ascendente para la navegación prev/next entre episodios
  const chronological = [...episodes].sort((a, b) => new Date(a.published) - new Date(b.published));

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const seriesBySlug = buildSeriesMap(episodes);

  chronological.forEach((ep, i) => {
    const prev = i > 0 ? chronological[i - 1] : null;
    const next = i < chronological.length - 1 ? chronological[i + 1] : null;
    const related = getRelatedEpisodes(ep, episodes);
    const series = seriesBySlug.get(ep.slug) || null;
    const html = episodePage(ep, { prev, next, related, series });
    fs.writeFileSync(path.join(OUT_DIR, `${ep.slug}.html`), html, "utf-8");
  });

  fs.writeFileSync("sitemap.xml", buildSitemap(episodes), "utf-8");
  fs.writeFileSync("robots.txt", buildRobots(), "utf-8");

  // episodes.json incluye "paragraphs" (el cuerpo completo de cada episodio),
  // que solo usan las páginas estáticas de /episodios generadas arriba. La
  // portada (app.js) solo necesita los datos de listado/tarjeta, así que le
  // damos una copia sin ese campo para no descargar ~1.3MB de más.
  //
  // Además la partimos en bloques (el primero con los más recientes) para
  // que la portada pueda pintar las primeras tarjetas en cuanto llega el
  // primer bloque, sin esperar a que se descargue todo el catálogo.
  const episodesList = episodes.map(({ paragraphs, ...rest }) => rest);
  const CHUNK_SIZE = 200;
  fs.mkdirSync("data", { recursive: true });
  const chunks = [];
  for (let i = 0; i < episodesList.length; i += CHUNK_SIZE) {
    chunks.push(episodesList.slice(i, i + CHUNK_SIZE));
  }
  chunks.forEach((chunk, i) => {
    fs.writeFileSync(`data/episodes-${i}.json`, JSON.stringify(chunk), "utf-8");
  });
  fs.writeFileSync(
    "data/episodes-meta.json",
    JSON.stringify({ total: episodesList.length, chunkCount: chunks.length }),
    "utf-8"
  );

  // Lista ligera de slugs para el botón "Episodio aleatorio" (sin tener que
  // descargar todos los bloques de episodes-N.json para elegir uno al azar).
  fs.writeFileSync(
    "data/episode-slugs.json",
    JSON.stringify(episodesList.map((ep) => ep.slug)),
    "utf-8"
  );

  console.log(`Generadas ${episodes.length} páginas en /${OUT_DIR}, sitemap.xml, robots.txt y ${chunks.length} bloques en /data (SITE_URL=${SITE_URL}).`);
}

main();
