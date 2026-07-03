// Genera una página HTML estática por episodio en /episodios/, optimizada
// para SEO: meta description, Open Graph, canonical a esta misma página
// (esta web compite por su propio posicionamiento, no apunta al blog
// original) y JSON-LD PodcastEpisode. También genera sitemap.xml y robots.txt.

import fs from "fs";
import path from "path";

const SITE_URL = process.env.SITE_URL || "https://bienvenidoalos90.com";
const OUT_DIR = "episodios";

// Carga Google Fonts de forma asíncrona (no bloquea el renderizado).
// media="print" hace que el navegador descargue la CSS sin aplicarla;
// onload la activa al terminar. Más compatible que preload as="style".
function fontAsync(href) {
  return `<link rel="stylesheet" href="${href}" media="print" onload="this.media='all';this.onload=null" />\n<noscript><link rel="stylesheet" href="${href}" /></noscript>`;
}

const PLATFORM_ICONS = {
  ivoox: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 13v-1a7 7 0 0 1 14 0v1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><rect x="3.2" y="13" width="4" height="6" rx="1.6" fill="currentColor"/><rect x="16.8" y="13" width="4" height="6" rx="1.6" fill="currentColor"/></svg>',
  apple: '<svg viewBox="0 0 814 1000" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/></svg>',
  spotify: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9.2" stroke="currentColor" stroke-width="1.6"/><path d="M7 10.5c3.2-1 7-.7 9.7 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M7.6 13.3c2.6-.8 5.6-.6 7.8.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M8.3 16c2-.6 4.3-.5 6 .5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  amazon: '<svg viewBox="2.167 .438 251.038 259.969" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="m221.503 210.324c-105.235 50.083-170.545 8.18-212.352-17.271-2.587-1.604-6.984.375-3.169 4.757 13.928 16.888 59.573 57.593 119.153 57.593 59.621 0 95.09-32.532 99.527-38.207 4.407-5.627 1.294-8.731-3.16-6.872zm29.555-16.322c-2.826-3.68-17.184-4.366-26.22-3.256-9.05 1.078-22.634 6.609-21.453 9.93.606 1.244 1.843.686 8.06.127 6.234-.622 23.698-2.826 27.337 1.931 3.656 4.79-5.57 27.608-7.255 31.288-1.628 3.68.622 4.629 3.68 2.178 3.016-2.45 8.476-8.795 12.14-17.774 3.639-9.028 5.858-21.622 3.71-24.424z"/><path d="m150.744 108.13c0 13.141.332 24.1-6.31 35.77-5.361 9.489-13.853 15.324-23.341 15.324-12.952 0-20.495-9.868-20.495-24.432 0-28.75 25.76-33.968 50.146-33.968zm34.015 82.216c-2.23 1.992-5.456 2.135-7.97.806-11.196-9.298-13.189-13.615-19.356-22.487-18.502 18.882-31.596 24.527-55.601 24.527-28.37 0-50.478-17.506-50.478-52.565 0-27.373 14.85-46.018 35.96-55.126 18.313-8.066 43.884-9.489 63.43-11.718v-4.365c0-8.018.616-17.506-4.08-24.432-4.128-6.215-12.003-8.777-18.93-8.777-12.856 0-24.337 6.594-27.136 20.257-.57 3.037-2.799 6.026-5.835 6.168l-32.735-3.51c-2.751-.618-5.787-2.847-5.028-7.07 7.543-39.66 43.36-51.616 75.43-51.616 16.415 0 37.858 4.365 50.81 16.795 16.415 15.323 14.849 35.77 14.849 58.02v52.565c0 15.798 6.547 22.724 12.714 31.264 2.182 3.036 2.657 6.69-.095 8.966-6.879 5.74-19.119 16.415-25.855 22.393l-.095-.095"/></svg>',
  youtube: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2.5" y="6" width="19" height="12" rx="3" stroke="currentColor" stroke-width="1.6"/><path d="M10.5 9.5l5 2.5-5 2.5z" fill="currentColor"/></svg>',
};

function ivooxEpisodeId(ep) {
  const link = ep.ivooxLink || ep.downloadLink;
  if (!link) return null;
  const m = link.match(/rf[_/](\d+)/) || link.match(/ivoox\.com\/(\d+)$/);
  return m ? m[1] : null;
}

function platformLinks(ep) {
  const links = [];
  const ivoox = ep.ivooxLink || ep.downloadLink;
  if (ivoox) links.push({ label: "Escuchar en iVoox", url: ivoox, exact: true, icon: "ivoox" });
  if (ep.spotifyLink) {
    links.push({ label: "Escuchar en Spotify", url: ep.spotifyLink, exact: true, icon: "spotify" });
  }
  if (ep.appleLink) {
    links.push({ label: "Escuchar en Apple Podcasts", url: ep.appleLink, exact: true, icon: "apple" });
  }
  if (ep.amazonLink) {
    links.push({ label: "Escuchar en Amazon Music", url: ep.amazonLink, exact: true, icon: "amazon" });
  }
  const youtubeLinks = Array.isArray(ep.youtubeLink) ? ep.youtubeLink : ep.youtubeLink ? [ep.youtubeLink] : [];
  youtubeLinks.forEach((url, i) => {
    links.push({ label: youtubeLinks.length > 1 ? `Ver en YouTube ${i + 1}` : "Ver en YouTube", url, exact: true, icon: "youtube" });
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
  const SKIP = /^(espacio patrocinado|descarga el programa|escucha el programa|\+\s*info)/i;
  const candidates = paragraphs.filter(p => !SKIP.test(p) && p.length > 20);
  // Concatenar párrafos hasta alcanzar al menos 80 chars pero no más de 155
  let text = "";
  for (const p of candidates) {
    const joined = text ? text + " " + p : p;
    if (joined.length > 155) {
      if (text.length >= 80) break;
      text = joined.slice(0, 152).trimEnd() + "…";
      break;
    }
    text = joined;
    if (text.length >= 80) break;
  }
  if (text.length > 155) text = text.slice(0, 152).trimEnd() + "…";
  return text;
}

function bigThumbnail(thumb) {
  return thumb ? thumb.replace("/s72-c/", "/s640/") : null;
}

// Las tarjetas de "relacionados" muestran la miniatura en una caja de
// 140px; 320px da margen de sobra para pantallas retina sin pedir una
// imagen sobredimensionada como hacía bigThumbnail (640px).
function cardThumbnail(thumb) {
  return thumb ? thumb.replace("/s72-c/", "/s320/") : null;
}

// Recorte cuadrado de tamaño fijo (a diferencia de bigThumbnail, que respeta
// el ratio original) para poder declarar siempre las mismas dimensiones en
// las meta etiquetas og:image, lo que agiliza la vista previa al compartir
// en redes sociales y WhatsApp.
function ogThumbnail(thumb) {
  return thumb ? thumb.replace("/s72-c/", "/s1200-c/") : null;
}

// Variantes del nombre del programa y etiquetas de segmentos/colaboradores
// recurrentes que no aportan información temática para relacionar episodios
// entre sí (coinciden porque comparten un segmento fijo del programa, no un tema).
const GENERIC_LABEL_KEYS = new Set([
  "bienvenido a lo 90",
  "bienvenido a los 90",
  "bienvenido  a los 90",
  "bienvenidoalos90",
  "bienvenidoalo 90",
  "podcast",
  "podcast en español",
  "radio",
  "radio utopia",
  "radio utopía",
  "subterfuge radio",
  "madrid",
  "ivoox",
  "darwinians radio bike",
  "darwinians raido bike",
  "darwiniansradiobike",
  "b90 supernova",
  "especial",
  "radioutopia",
  "castellano",
  "descarga",
  "radio 3",
  "felipe couselo",
  "paco perez bryan",
  "paco pérez bryan",
  "julio ruiz",
]);

function labelKey(label) {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

// Algunas etiquetas del blog representan el mismo concepto pero con grafías
// distintas (p.ej. "Foo Fighters" / "Foofighters", o con/sin tilde), porque
// con los años se escribieron de forma inconsistente. Esta clave "laxa"
// (sin espacios, sin tildes, sin "the " inicial) agrupa esas variantes para
// poder fusionarlas en una sola etiqueta canónica antes de mostrarlas.
// Erratas conocidas en las etiquetas del blog que looseLabelKey no puede
// fusionar por sí solo (no son solo diferencia de espacios/acentos/mayúsculas,
// sino errores de tecleo reales). El scraper recoge las etiquetas tal cual
// están en el blog en cada ejecución, así que esta tabla debe vivir aquí
// (se aplica en cada build) y no como una edición puntual de episodes.json,
// que el siguiente scrape automático revertiría.
const LABEL_TYPO_FIXES = new Map([
  ["grudge", "grunge"],
  ["seatlle", "seattle"],
  ["the smashing pumkins", "the smashing pumpkins"],
  ["smashing pumkins", "smashing pumpkins"],
  ["pegadeth", "megadeth"],
  ["dave ghrol", "dave grohl"],
  ["foo fighteres", "foo fighters"],
  ["alian johannes", "alain johannes"],
  ["screming trees", "screaming trees"],
  ["noel gallaghers", "noel gallagher"],
  ["okotok", "oknotok"],
  ["manu cabezali", "manuel cabezali"],
  ["peral jam", "pearl jam"],
  ["blidmelon", "blind melon"],
  ["ringostar", "ringo starr"],
  ["quuen", "queen"],
  ["ruce springsteen", "bruce springsteen"],
  ["bruce springteen", "bruce springsteen"],
  ["nailyoung", "neil young"],
  ["piinkfloyd", "pink floyd"],
  ["silvercjair", "silverchair"],
  ["rock botton magazine", "rock bottom magazine"],
  ["mauel pinazo", "manuel pinazo"],
  ["gunsandroses", "guns n roses"],
  ["jean-benoît dunckel", "jean benoit duncke"],
  ["kurt cobian", "kurt cobain"],
  ["jurt cobain", "kurt cobain"],
  ["kurt obain", "kurt cobain"],
  ["rock'n'roll animal", "rock and roll animal"],
  ["rage againt the machine", "rage against the machine"],
  ["om morello", "tom morello"],
  ["zac de la rocha", "zack de la rocha"],
  ["the cramberries", "the cranberries"],
  ["rolling stone", "rolling stones"],
  ["j macis", "j mascis"],
  ["danielarias", "daniel arias"],
  ["dani arias", "daniel arias"],
  ["gisco grande", "disco grande"],
  ["zahra", "zahara"],
  ["messura", "mesura"],
  ["sandford music factory", "sanford music factory"],
  ["sandfrodmusicfactory", "sanford music factory"],
  ["bleacj", "bleach"],
  ["vlack maracas", "black maracas"],
  ["primaversa sound", "primavera sound"],
  ["lost in traslation", "lost in translation"],
  ["artic monkeys", "arctic monkeys"],
  ["diwaway", "dieaway"],
  ["rkdrano", "rkadrano"],
  ["thustrston moore", "thurston moore"],
  ["the last internacionales", "the last internationale"],
  ["kings os leon", "kings of leon"],
  ["robert jhonson", "robert johnson"],
  ["brass againts", "brass against"],
  ["los concierto de radio 3", "los conciertos de radio 3"],
  ["love baterry", "love battery"],
  ["charlescross", "charles cross"],
  ["charles r. cross", "charles cross"],
  ["stiltsjin", "stiltskin"],
  ["joy divion", "joy division"],
  ["jack iron", "jack irons"],
  ["copper", "cooper"],
  ["citidendick", "citizen dick"],
  ["nowonder", "new order"],
  ["smokerdieyoung", "smokers die young"],
  ["tom cabin", "tom´s cabin"],
  ["delila paz", "delaila paz"],
  ["gaz commbes", "gaz coombes"],
  ["counting creows", "counting crows"],
  ["darwinians raido bike", "darwinians radio bike"],
  ["pacoprezbryan", "paco perez bryan"],
  ["roayal bustards", "royal bustards"],
  ["podcats", "podcast"],
  ["podctas", "podcast"],
  ["podcasy", "podcast"],
  ["podcas", "podcast"],
  ["podvast", "podcast"],
  ["planetas", "los planetas"],
]);

function looseLabelKey(label) {
  return label
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/^the\s+/, "")
    .replace(/[^a-z0-9]/g, "");
}

function titleCaseLabel(label) {
  return label
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

// Construye, a partir de todo el corpus, un mapa "etiqueta tal cual aparece
// en el blog" -> "etiqueta canónica a mostrar", fusionando las variantes
// detectadas por looseLabelKey. Dentro de cada grupo se elige como canónica
// la grafía con espacios más frecuente (si existe alguna); si todas las
// variantes son "una sola palabra pegada", se usa la más frecuente tal cual.
function fixLabelTypo(label) {
  const fixed = LABEL_TYPO_FIXES.get(label.toLowerCase());
  return fixed ?? label;
}

function buildLabelAliasMap(episodes) {
  const counts = new Map(); // label tal cual (trim) -> nº de apariciones
  episodes.forEach((ep) => {
    ep.labels.forEach((raw) => {
      const label = fixLabelTypo(raw.trim().replace(/\s+/g, " "));
      if (!label) return;
      counts.set(label, (counts.get(label) || 0) + 1);
    });
  });

  const groups = new Map(); // looseKey -> [[label, count], ...]
  for (const [label, count] of counts) {
    const key = looseLabelKey(label);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push([label, count]);
  }

  const aliasMap = new Map(); // label original -> etiqueta canonica
  for (const variants of groups.values()) {
    if (variants.length === 1) continue;
    const withSpaces = variants.filter(([label]) => label.includes(" "));
    const pool = withSpaces.length ? withSpaces : variants;
    const canonical = pool.sort((a, b) => b[1] - a[1])[0][0];
    variants.forEach(([label]) => aliasMap.set(label, titleCaseLabel(canonical)));
  }
  return aliasMap;
}

// Aplica el mapa de alias a las etiquetas de cada episodio, fusionando
// variantes y eliminando duplicados resultantes dentro de un mismo episodio.
function canonicalizeLabels(episodes) {
  const aliasMap = buildLabelAliasMap(episodes);
  episodes.forEach((ep) => {
    const seen = new Set();
    ep.labels = ep.labels
      .map((raw) => {
        const label = fixLabelTypo(raw.trim().replace(/\s+/g, " "));
        return aliasMap.get(label) || titleCaseLabel(label);
      })
      .filter((label) => {
        if (seen.has(label)) return false;
        seen.add(label);
        return true;
      });
  });
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
  const ogThumb = ogThumbnail(ep.thumbnail);
  const image = ogThumb || `${SITE_URL}/images/b90-logo-new.jpg`;
  const imageSize = ogThumb ? 1200 : 735;
  // La cabecera visible de la página usa una versión más ligera (no el
  // recorte de 1200px reservado para las meta etiquetas og:image).
  const coverImage = bigThumbnail(ep.thumbnail) || `${SITE_URL}/images/b90-logo-new.jpg`;
  const pageUrl = `${SITE_URL}/episodios/${ep.slug}.html`;
  const canonical = pageUrl;
  const ivooxId = ivooxEpisodeId(ep);

  const transcriptFile = ivooxId ? `data/transcriptions/${ivooxId}.txt` : null;
  const transcriptText = transcriptFile && fs.existsSync(transcriptFile)
    ? fs.readFileSync(transcriptFile, "utf8").trim()
    : null;

  const bodyParagraphs = ep.paragraphs
    .map((p) => `<p>${linkifyText(escapeHtml(p))}</p>`)
    .join("\n      ");

  const audioUrl = ivooxId ? `https://go.ivoox.com/rf/${ivooxId}` : ep.downloadLink;
  const relevantLabels = (ep.labels || []).filter(l =>
    !["podcast", "podcast en español", "radio", "radio utopia", "ivoox", "madrid",
      "bienvenido a los 90", "bienvenido a lo 90", "seattle"].includes(l.toLowerCase())
  );

  const episodeDesc = metaDescription(ep.paragraphs) ||
    "Episodio del podcast Bienvenido a los 90, música de los 90 en español.";
  const imageObject = ogThumb
    ? { "@type": "ImageObject", url: ogThumb, width: 1200, height: 1200 }
    : { "@type": "ImageObject", url: `${SITE_URL}/images/b90-logo-new.jpg`, width: 735, height: 735 };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "PodcastEpisode",
    name: ep.title,
    datePublished: ep.published,
    url: pageUrl,
    inLanguage: "es",
    description: episodeDesc,
    image: imageObject,
    author: { "@type": "Person", name: "Roberto Martínez" },
    ...(relevantLabels.length ? { keywords: relevantLabels.join(", ") } : {}),
    partOfSeries: {
      "@type": "PodcastSeries",
      name: "Bienvenido a los 90",
      url: SITE_URL,
      description: "Podcast de música de los años 90: pop, rock, dance y eurodance en español. Más de 1200 episodios desde 2012.",
      image: { "@type": "ImageObject", url: `${SITE_URL}/images/b90-logo-new.jpg`, width: 735, height: 735 },
      webFeed: "https://bienvenidoalos90.blogspot.com/feeds/posts/default",
    },
    ...(audioUrl ? {
      associatedMedia: {
        "@type": "AudioObject",
        contentUrl: audioUrl,
        encodingFormat: "audio/mpeg",
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

  const faqQuestions = [
    {
      q: `¿De qué trata el episodio "${ep.title}"?`,
      a: metaDescription(ep.paragraphs),
    },
    ...(ep.ivooxLink ? [{
      q: `¿Dónde puedo escuchar "${ep.title}"?`,
      a: `Puedes escuchar este episodio en iVoox: ${ep.ivooxLink}`,
    }] : []),
    ...(ep.published ? [{
      q: `¿Cuándo se emitió el episodio "${ep.title}"?`,
      a: `Este episodio se emitió el ${formatDateLong(ep.published)}.`,
    }] : []),
  ];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqQuestions.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<script>(function(){var t=localStorage.getItem("theme");if(t==="dark")document.documentElement.setAttribute("data-theme","dark");})();</script>
<title>${escapeHtml(ep.title)} — Bienvenido a los 90</title>
<meta name="robots" content="index, follow" />
<meta name="author" content="Roberto Martínez" />
<link rel="icon" type="image/jpeg" href="../images/b90-logo-new.jpg" media="(prefers-color-scheme: light)" />
<link rel="icon" type="image/png" href="../images/b90-logo-dark-icon.png" media="(prefers-color-scheme: dark)" />
<link rel="apple-touch-icon" href="../images/b90-logo-new.jpg" />
<meta name="description" content="${description}" />
<link rel="canonical" href="${canonical}" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
${fontAsync("https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap")}
<link rel="stylesheet" href="../styles.css?v=75" />

<meta property="og:type" content="article" />
<meta property="og:title" content="${escapeHtml(ep.title)}" />
<meta property="og:description" content="${description}" />
<meta property="og:url" content="${pageUrl}" />
${image ? `<meta property="og:image" content="${image}" />
<meta property="og:image:width" content="${imageSize}" />
<meta property="og:image:height" content="${imageSize}" />` : ""}
<meta property="article:published_time" content="${ep.published}" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(ep.title)}" />
<meta name="twitter:site" content="@Rockisroll" />
<meta name="twitter:description" content="${description}" />
${image ? `<meta name="twitter:image" content="${image}" />` : ""}

<link rel="preload" as="image" href="${coverImage}" />
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
<script type="application/ld+json">${JSON.stringify(breadcrumbJsonLd)}</script>
<script type="application/ld+json">${JSON.stringify(faqJsonLd)}</script>
</head>
<body>
  <nav class="topnav">
    <div class="container topnav-inner">
      <a class="brand" href="../" aria-label="Bienvenido a los 90">
        <img class="brand-logo logo-light" src="../images/b90-logo-transparent.png" alt="B" width="735" height="735" />
        <img class="brand-logo logo-dark" src="../images/b90-logo-dark-icon.png" alt="B" width="128" height="128" loading="lazy" />
        <span>ienvenido a los 90</span>
      </a>
      <div class="topnav-links">
        <a href="../#episodios">Episodios</a>
        <a href="../#escuchanos">Escúchanos</a>
        <a href="../#sigue">Síguenos</a>
        <a href="../fotos.html">Fotos</a>
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

      ${!ivooxId && coverImage ? `<img class="episode-cover" src="${coverImage}" alt="${escapeHtml(ep.title)}" width="320" height="213" />` : ""}

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
      ${ep.paragraphs.length > 1 ? `<h2 class="show-notes-heading">Notas del programa</h2>` : ""}
      ${bodyParagraphs}
      </div>

      ${transcriptText ? `
      <details class="transcript-box">
        <summary>Transcripción del audio</summary>
        <p class="transcript-notice">Generada automáticamente por iVoox. Puede contener errores.</p>
        <div class="transcript-text">${escapeHtml(transcriptText).replace(/\n\n/g, "</p><p>").replace(/\n/g, " ")}</div>
      </details>` : ""}

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
        const relImage = cardThumbnail(r.thumbnail);
        return `
        <a class="related-card" href="${r.slug}.html">
          <span class="episode-cover-link related-cover-link">
            ${relImage ? `<img class="episode-cover-img" src="${relImage}" alt="" loading="lazy" width="320" height="213" />` : `<div class="episode-cover-img"></div>`}
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
      <h3>Encuéntranos</h3>
      <div class="social-row">
        <a class="social-btn icon-instagram" href="https://instagram.com/b90podcast" target="_blank" rel="noopener" title="Instagram" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="4.2" stroke="currentColor" stroke-width="1.6"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor"/></svg></a>
        <a class="social-btn icon-substack" href="https://bienvenidoalos90.substack.com/" target="_blank" rel="noopener" title="Substack" aria-label="Substack"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="5" width="16" height="2.2" fill="currentColor"/><rect x="4" y="9" width="16" height="2.2" fill="currentColor"/><path d="M4 13.5h16L12 20.5z" fill="currentColor"/></svg></a>
        <a class="social-btn icon-facebook" href="https://www.facebook.com/bienvenidoalo90" target="_blank" rel="noopener" title="Facebook" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9.2" stroke="currentColor" stroke-width="1.6"/><path d="M13.5 9.2h1.8V7H13.2c-1.5 0-2.4 1-2.4 2.5v1.3H9.4v2h1.4V17h2.1v-4.2h1.7l.3-2h-2V9.6c0-.3.2-.4.6-.4z" fill="currentColor"/></svg></a>
        <a class="social-btn icon-x" href="https://x.com/Rockisroll" target="_blank" rel="noopener" title="X" aria-label="X"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" stroke-width="1.6"/><path d="M7.5 7.5l9 9M16.5 7.5l-9 9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></a>
        <a class="social-btn icon-tiktok" href="https://tiktok.com/@b90podcast" target="_blank" rel="noopener" title="TikTok" aria-label="TikTok"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 4v9.5a3.5 3.5 0 1 1-3-3.46" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 4c.3 2 1.8 3.6 4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></a>
        <a class="social-btn icon-twitch" href="https://www.twitch.tv/bienvenidoalos90" target="_blank" rel="noopener" title="Twitch" aria-label="Twitch"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 4h14v10l-3.5 3.5H12l-2 2H8v-2H5V4z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M11 8v3.5M15 8v3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></a>
        <a class="social-btn icon-telegram" href="https://t.me/bienvenidoalosnoventa" target="_blank" rel="noopener" title="Telegram" aria-label="Telegram"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22 2L11 13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 2L15 22 11 13 2 9 22 2z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg></a>
        <a class="social-btn icon-bluesky" href="https://bsky.app/profile/bienvenidoalos90.bsky.social" target="_blank" rel="noopener" title="Bluesky" aria-label="Bluesky"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 8.5c-1-2.3-3.6-4-5.8-3-1.3.6-1 2.6.1 3.7 1 1 2.7 1.6 4 1.7-1.3.2-3 .8-4 1.8-1.1 1.1-1.4 3.1-.1 3.7 2.2 1 4.8-.7 5.8-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 8.5c1-2.3 3.6-4 5.8-3 1.3.6 1 2.6-.1 3.7-1 1-2.7 1.6-4 1.7 1.3.2 3 .8 4 1.8 1.1 1.1 1.4 3.1.1 3.7-2.2 1-4.8-.7-5.8-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
        <a class="social-btn icon-whatsapp" href="https://www.whatsapp.com/channel/0029VaASqFALY6d2gMeB771N" target="_blank" rel="noopener" title="WhatsApp" aria-label="WhatsApp"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3.5a8.5 8.5 0 0 0-7.3 12.8L4 20.5l4.3-1.1A8.5 8.5 0 1 0 12 3.5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M9 9.8c.1-.8.6-.9 1-.9s.7 0 .9.5c.2.5.6 1.5.6 1.7s0 .4-.2.6c-.2.3-.4.4-.2.7.2.3 1 1.3 2.2 1.8.3.1.5.1.7-.1.2-.2.6-.7.8-.9.2-.2.3-.2.6-.1.3.1 1.6.8 1.9 1 .3.1.4.2.5.3.1.2.1.9-.2 1.3-.3.4-1.3 1-2.4.7-1.1-.3-2.9-1.1-4.4-2.7-1.2-1.3-1.9-2.7-2.1-3.2-.2-.5-.4-1.2-.3-1.7z" fill="currentColor"/></svg></a>
        <a class="social-btn icon-email" href="mailto:bienvenidoalosnoventa@gmail.com" title="Email" aria-label="Email"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M4 6.5l8 6 8-6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
        <a class="social-btn icon-linktree" href="https://linktr.ee/b90podcast" target="_blank" rel="noopener" title="Linktree" aria-label="Linktree"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3v18M12 9L6 5M12 9l6-4M12 14L6 10M12 14l6-4M9 18l3 3 3-3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
      </div>
      <p class="footer-tagline">Bienvenido a los 90 · Podcast independiente de música · Conectando personas desde 2012</p>
    </div>
  </footer>

  <script src="../nav.js?v=4" defer></script>
  <!-- Cloudflare Web Analytics --><script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "c082acebb6434c21b4d7bc2ac95019c3"}'></script><!-- End Cloudflare Web Analytics -->
</body>
</html>
`;
}

const ETIQUETAS_MIN_EPISODES = 5;
const ETIQUETAS_DIR = "etiquetas";

// Datos curados para los artistas principales: intro SEO + sameAs Wikidata
const ARTIST_DATA = {
  "Nirvana": {
    intro: "Nirvana fue la banda de grunge más influyente de los años 90. Formada en Aberdeen (Washington) en 1987 por Kurt Cobain, Krist Novoselic y Dave Grohl, revolucionaron el rock mundial con álbumes como Nevermind (1991) y In Utero (1993). En Bienvenido a los 90, el podcast de música de los 90 en español, dedicamos decenas de episodios a analizar su legado, sus discos y su impacto en la cultura popular.",
    sameAs: "https://www.wikidata.org/wiki/Q11649",
  },
  "Pearl Jam": {
    intro: "Pearl Jam es uno de los pilares del grunge y el rock alternativo de los 90. La banda de Seattle liderada por Eddie Vedder publicó Ten (1991), uno de los álbumes más vendidos de la década. En Bienvenido a los 90, el podcast de rock de los años 90 en español, analizamos en profundidad su discografía, sus directos y su trayectoria hasta hoy.",
    sameAs: "https://www.wikidata.org/wiki/Q128736",
  },
  "Oasis": {
    intro: "Oasis fue la banda de britpop más importante de los años 90. Los hermanos Gallagher —Liam y Noel— conquistaron el mundo con Definitely Maybe (1994) y (What's the Story) Morning Glory? (1995). En Bienvenido a los 90, el podcast de música de los 90 en español, dedicamos numerosos episodios a su historia, sus discos y la mítica rivalidad con Blur.",
    sameAs: "https://www.wikidata.org/wiki/Q51752",
  },
  "The Smashing Pumpkins": {
    intro: "The Smashing Pumpkins, liderados por Billy Corgan, definieron el rock alternativo de los 90 con discos como Siamese Dream (1993) y Mellon Collie and the Infinite Sadness (1995). En Bienvenido a los 90, el podcast de rock alternativo de los 90 en español, exploramos su sonido único que mezcla grunge, psicodelia y rock clásico.",
    sameAs: "https://www.wikidata.org/wiki/Q27776",
  },
  "Radiohead": {
    intro: "Radiohead es una de las bandas más aclamadas de los años 90 y del rock en general. Desde Pablo Honey (1993) hasta OK Computer (1997) y Kid A (2000), su evolución artística no tiene precedente. En Bienvenido a los 90, el podcast de música de los 90 en español, analizamos episodio a episodio la carrera de la banda de Oxford.",
    sameAs: "https://www.wikidata.org/wiki/Q47565",
  },
  "Foo Fighters": {
    intro: "Foo Fighters nació en 1994 cuando Dave Grohl, batería de Nirvana, decidió seguir adelante tras la muerte de Kurt Cobain. Con su debut homónimo y discos como The Colour and the Shape (1997), se convirtieron en una de las bandas de rock alternativo más grandes del mundo. En Bienvenido a los 90, el podcast de rock de los 90 en español, seguimos de cerca su historia.",
    sameAs: "https://www.wikidata.org/wiki/Q106506",
  },
  "Soundgarden": {
    intro: "Soundgarden fue una de las grandes bandas de grunge de Seattle. Con Chris Cornell al frente, publicaron obras maestras como Superunknown (1994) y Down on the Upside (1996). En Bienvenido a los 90, el podcast de música de los 90 en español, rendimos homenaje a su legado y analizamos su impacto en la historia del rock.",
    sameAs: "https://www.wikidata.org/wiki/Q128917",
  },
  "The Beatles": {
    intro: "The Beatles marcaron el siglo XX y su influencia sigue siendo omnipresente en la música de los años 90. En Bienvenido a los 90, el podcast de música de los 90 en español, abordamos su legado a través de los artistas y movimientos que inspiraron, así como los lanzamientos póstumos y las carreras en solitario de sus miembros.",
    sameAs: "https://www.wikidata.org/wiki/Q1299",
  },
  "Kurt Cobain": {
    intro: "Kurt Cobain, líder y compositor de Nirvana, es una de las figuras más icónicas de la música de los años 90. Su muerte en 1994 conmocionó al mundo y su legado sigue siendo estudiado y debatido décadas después. En Bienvenido a los 90, el podcast de rock de los 90 en español, dedicamos varios episodios a su vida, su obra y su impacto cultural.",
    sameAs: "https://www.wikidata.org/wiki/Q2632",
    type: "Person",
  },
  "Dave Grohl": {
    intro: "Dave Grohl es uno de los músicos más queridos del rock: batería de Nirvana y fundador de Foo Fighters. Su carrera abarca más de tres décadas de rock alternativo. En Bienvenido a los 90, el podcast de música de los 90 en español, seguimos su trayectoria desde Seattle hasta convertirse en uno de los grandes del rock mundial.",
    sameAs: "https://www.wikidata.org/wiki/Q44437",
    type: "Person",
  },
  "Eddie Vedder": {
    intro: "Eddie Vedder es la voz inconfundible de Pearl Jam y uno de los cantantes más emblemáticos del grunge y el rock de los 90. En Bienvenido a los 90, el podcast de música de los 90 en español, analizamos su carrera tanto con Pearl Jam como en solitario.",
    sameAs: "https://www.wikidata.org/wiki/Q313013",
    type: "Person",
  },
  "Noel Gallagher": {
    intro: "Noel Gallagher, compositor y guitarrista de Oasis, es uno de los grandes autores del britpop y el rock de los 90. Sus canciones definieron una generación. En Bienvenido a los 90, el podcast de música de los 90 en español, seguimos tanto su etapa en Oasis como su carrera en solitario con High Flying Birds.",
    sameAs: "https://www.wikidata.org/wiki/Q312783",
    type: "Person",
  },
  "Liam Gallagher": {
    intro: "Liam Gallagher, voz de Oasis, es uno de los frontmen más carismáticos del rock de los años 90. Su actitud, su voz y su imagen lo convirtieron en un icono del britpop. En Bienvenido a los 90, el podcast de música de los 90 en español, seguimos su trayectoria con Oasis, Beady Eye y en solitario.",
    sameAs: "https://www.wikidata.org/wiki/Q312784",
    type: "Person",
  },
  "Billy Corgan": {
    intro: "Billy Corgan es el alma de The Smashing Pumpkins: compositor, guitarrista y líder de una de las bandas más influyentes del rock alternativo de los 90. En Bienvenido a los 90, el podcast de música de los 90 en español, exploramos su visión artística y el legado de la banda.",
    sameAs: "https://www.wikidata.org/wiki/Q236909",
    type: "Person",
  },
  "John Lennon": {
    intro: "John Lennon, cofundador de The Beatles, sigue siendo una de las figuras más influyentes de la historia de la música. En Bienvenido a los 90, el podcast de música de los 90 en español, analizamos su influencia en los artistas y movimientos que definieron la década.",
    sameAs: "https://www.wikidata.org/wiki/Q1203",
    type: "Person",
  },
  "Paul Mccartney": {
    intro: "Paul McCartney es uno de los compositores más prolíficos de la historia. Tras The Beatles, su carrera en solitario continuó en los años 90 con nuevos álbumes y giras memorables. En Bienvenido a los 90, el podcast de música de los 90 en español, cubrimos sus actuaciones y lanzamientos de esta época.",
    sameAs: "https://www.wikidata.org/wiki/Q2599",
    type: "Person",
  },
};

function labelSlug(label) {
  return label.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function buildEtiquetasPages(episodes) {
  const EXCLUDED = new Set([
    "podcast", "podcast en español", "radio", "radio utopia", "radio utopía",
    "subterfuge radio", "madrid", "ivoox", "radioutopia", "bienvenido a los 90",
    "bienvenido a lo 90", "bienvenidoalos90", "castellano", "descarga", "seattle",
  ]);

  const labelMap = new Map();
  episodes.forEach((ep) => {
    (ep.labels || []).forEach((label) => {
      if (EXCLUDED.has(label.toLowerCase())) return;
      if (!labelMap.has(label)) labelMap.set(label, []);
      labelMap.get(label).push(ep);
    });
  });

  const qualifying = [...labelMap.entries()]
    .filter(([, eps]) => eps.length >= ETIQUETAS_MIN_EPISODES)
    .sort((a, b) => b[1].length - a[1].length);

  fs.mkdirSync(ETIQUETAS_DIR, { recursive: true });

  const footer = `  <footer class="site-footer">
    <div class="container">
      <p class="footer-tagline">Bienvenido a los 90 · Podcast independiente de música · Conectando personas desde 2012 · <a href="/privacidad.html">Privacidad y cookies</a></p>
    </div>
  </footer>`;

  qualifying.forEach(([label, eps]) => {
    const slug = labelSlug(label);
    const pageUrl = `${SITE_URL}/etiquetas/${slug}.html`;
    const artistData = ARTIST_DATA[label] || null;
    const title = artistData
      ? `${label} — Podcast de música de los 90 en español | Bienvenido a los 90`
      : `${label} — ${eps.length} episodios | Bienvenido a los 90`;
    const description = artistData
      ? `Escucha todos los episodios de Bienvenido a los 90 sobre ${label}. El podcast de música de los años 90 en español analiza su historia, discografía y legado.`
      : `Todos los episodios del podcast Bienvenido a los 90 dedicados a ${label}: análisis, entrevistas y retrospectivas.`;
    const sorted = [...eps].sort((a, b) => new Date(b.published) - new Date(a.published));

    const artistType = artistData?.type || "MusicGroup";
    const extraLd = artistData ? JSON.stringify({
      "@context": "https://schema.org",
      "@type": artistType,
      name: label,
      sameAs: artistData.sameAs,
      subjectOf: {
        "@type": "PodcastSeries",
        name: "Bienvenido a los 90",
        url: SITE_URL,
      },
    }) : null;

    const jsonLd = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: title,
      description,
      url: pageUrl,
      isPartOf: { "@type": "WebSite", name: "Bienvenido a los 90", url: SITE_URL },
    });

    const breadcrumbLd = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: "Etiquetas", item: `${SITE_URL}/etiquetas/` },
        { "@type": "ListItem", position: 3, name: label, item: pageUrl },
      ],
    });

    const episodesHtml = sorted.map((ep) => {
      const thumb = cardThumbnail(ep.thumbnail);
      const date = ep.published ? new Date(ep.published).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" }) : "";
      return `<article class="episode-card">
        <a class="episode-cover-link" href="../episodios/${ep.slug}.html" tabindex="-1" aria-hidden="true">
          ${thumb ? `<img class="episode-cover-img" src="${escapeHtml(thumb)}" alt="" loading="lazy" width="320" height="213" />` : `<div class="episode-cover-img"></div>`}
        </a>
        <div class="episode-body">
          <h2 class="episode-title"><a href="../episodios/${ep.slug}.html">${escapeHtml(ep.title.replace(/^B90\s*-\s*/i, ""))}</a></h2>
          ${date ? `<p class="episode-date">${date}</p>` : ""}
        </div>
      </article>`;
    }).join("\n");

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<script>(function(){var t=localStorage.getItem("theme");if(t==="dark")document.documentElement.setAttribute("data-theme","dark");})();</script>
<title>${escapeHtml(title)}</title>
<meta name="robots" content="index, follow" />
<meta name="author" content="Roberto Martínez" />
<link rel="icon" type="image/jpeg" href="../images/b90-logo-new.jpg" media="(prefers-color-scheme: light)" />
<link rel="icon" type="image/png" href="../images/b90-logo-dark-icon.png" media="(prefers-color-scheme: dark)" />
<link rel="apple-touch-icon" href="../images/b90-logo-new.jpg" />
<meta name="description" content="${escapeHtml(description)}" />
<link rel="canonical" href="${pageUrl}" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
${fontAsync("https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap")}
<link rel="stylesheet" href="../styles.css?v=75" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:url" content="${pageUrl}" />
<meta property="og:image" content="${SITE_URL}/images/og-home.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@Rockisroll" />
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:description" content="${escapeHtml(description)}" />
<script type="application/ld+json">${jsonLd}</script>
<script type="application/ld+json">${breadcrumbLd}</script>
${extraLd ? `<script type="application/ld+json">${extraLd}</script>` : ""}
</head>
<body>
  <nav class="topnav">
    <div class="container topnav-inner">
      <a class="brand" href="/" aria-label="Bienvenido a los 90">
        <img class="brand-logo logo-light" src="../images/b90-logo-transparent.png" alt="B" width="128" height="128" />
        <img class="brand-logo logo-dark" src="../images/b90-logo-dark-icon.png" alt="B" width="128" height="128" loading="lazy" />
        <span>ienvenido a los 90</span>
      </a>
      <div class="topnav-links">
        <a href="/#episodios">Episodios</a>
        <a href="/#escuchanos">Escúchanos</a>
        <a href="/#sobre-nosotros">Sobre Nosotros</a>
        <a href="/#sigue">Síguenos</a>
        <a href="../fotos.html">Fotos</a>
        <a href="/#" id="randomEpisodeBtn">🎲 Episodio aleatorio</a>
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

  <main class="container" style="padding-top:2rem;padding-bottom:3rem">
    <nav class="breadcrumb" aria-label="Ruta de navegación" style="font-size:0.82rem;color:var(--text-dim);margin-bottom:1.5rem">
      <a href="/">Inicio</a> › <a href="/etiquetas/">Etiquetas</a> › <span>${escapeHtml(label)}</span>
    </nav>
    <h1 class="section-title font-brand">${escapeHtml(label)}</h1>
    ${artistData ? `<p class="artist-intro">${escapeHtml(artistData.intro)}</p>` : ""}
    <p style="color:var(--text-dim);margin-bottom:2rem">${eps.length} episodio${eps.length === 1 ? "" : "s"}</p>
    <section class="episode-list">
      ${episodesHtml}
    </section>
    <p class="back-link" style="margin-top:2rem"><a href="/">← Volver al inicio</a></p>
  </main>

${footer}

  <script src="../nav.js?v=4" defer></script>
  <!-- Cloudflare Web Analytics --><script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "c082acebb6434c21b4d7bc2ac95019c3"}'></script><!-- End Cloudflare Web Analytics -->
</body>
</html>`;

    fs.writeFileSync(path.join(ETIQUETAS_DIR, `${slug}.html`), html, "utf-8");
  });

  const indexHtml = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<script>(function(){var t=localStorage.getItem("theme");if(t==="dark")document.documentElement.setAttribute("data-theme","dark");})();</script>
<title>Etiquetas — Bienvenido a los 90</title>
<link rel="icon" type="image/jpeg" href="../images/b90-logo-new.jpg" media="(prefers-color-scheme: light)" />
<link rel="icon" type="image/png" href="../images/b90-logo-dark-icon.png" media="(prefers-color-scheme: dark)" />
<meta name="description" content="Explora los episodios de Bienvenido a los 90 por artista o temática: Nirvana, Oasis, Pearl Jam, grunge, britpop y mucho más." />
<link rel="canonical" href="${SITE_URL}/etiquetas/" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
${fontAsync("https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap")}
<link rel="stylesheet" href="../styles.css?v=75" />
</head>
<body>
  <nav class="topnav">
    <div class="container topnav-inner">
      <a class="brand" href="/" aria-label="Bienvenido a los 90">
        <img class="brand-logo logo-light" src="../images/b90-logo-transparent.png" alt="B" width="128" height="128" />
        <img class="brand-logo logo-dark" src="../images/b90-logo-dark-icon.png" alt="B" width="128" height="128" loading="lazy" />
        <span>ienvenido a los 90</span>
      </a>
      <div class="topnav-links">
        <a href="/#episodios">Episodios</a>
        <a href="/#escuchanos">Escúchanos</a>
        <a href="/#sobre-nosotros">Sobre Nosotros</a>
        <a href="/#sigue">Síguenos</a>
        <a href="../fotos.html">Fotos</a>
        <a href="/#" id="randomEpisodeBtn">🎲 Episodio aleatorio</a>
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

  <main class="container" style="padding-top:2rem;padding-bottom:3rem">
    <h1 class="section-title font-brand">Etiquetas</h1>
    <p style="color:var(--text-dim);margin-bottom:2rem">Explora los episodios por artista o temática.</p>
    <div style="display:flex;flex-wrap:wrap;gap:0.6rem">
      ${qualifying.map(([label, eps]) => `<a href="/etiquetas/${labelSlug(label)}.html" class="quick-tag">${escapeHtml(label)} <span style="opacity:0.6;font-size:0.75em">${eps.length}</span></a>`).join("\n      ")}
    </div>
  </main>

${footer}

  <script src="../nav.js?v=4" defer></script>
  <!-- Cloudflare Web Analytics --><script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "c082acebb6434c21b4d7bc2ac95019c3"}'></script><!-- End Cloudflare Web Analytics -->
</body>
</html>`;

  fs.writeFileSync(path.join(ETIQUETAS_DIR, "index.html"), indexHtml, "utf-8");

  return qualifying;
}

function buildSitemap(episodes, etiquetas) {
  const today = new Date().toISOString().slice(0, 10);
  // El episodio más reciente marca el lastmod de la home y el índice de etiquetas
  const latestEpisodeDate = episodes[0]?.published?.slice(0, 10) ?? today;

  // Prioridad mayor para etiquetas de artistas conocidos (tienen intro curado)
  const artistSlugs = new Set(Object.keys(ARTIST_DATA).map(labelSlug));

  const urls = [
    {
      loc: `${SITE_URL}/`,
      lastmod: latestEpisodeDate,
      changefreq: "daily",
      priority: "1.0",
      image: `${SITE_URL}/images/b90-logo-new.jpg`,
    },
    {
      loc: `${SITE_URL}/fotos.html`,
      lastmod: today,
      changefreq: "monthly",
      priority: "0.5",
      image: `${SITE_URL}/images/og-home.png`,
    },
    {
      loc: `${SITE_URL}/etiquetas/`,
      lastmod: latestEpisodeDate,
      changefreq: "weekly",
      priority: "0.6",
    },
    ...etiquetas.map(([label, eps]) => {
      const slug = labelSlug(label);
      const isArtist = artistSlugs.has(slug);
      const newestEp = eps.sort((a, b) => new Date(b.published) - new Date(a.published))[0];
      return {
        loc: `${SITE_URL}/etiquetas/${slug}.html`,
        lastmod: newestEp?.published?.slice(0, 10) ?? today,
        changefreq: "weekly",
        priority: isArtist ? "0.8" : "0.6",
      };
    }),
    ...episodes.map((ep) => ({
      loc: `${SITE_URL}/episodios/${ep.slug}.html`,
      lastmod: (ep.updated || ep.published).slice(0, 10),
      changefreq: "yearly",
      priority: "0.7",
      image: bigThumbnail(ep.thumbnail) || `${SITE_URL}/images/b90-logo-new.jpg`,
    })),
  ];

  const body = urls.map((u) => `  <url>
    <loc>${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}
    <changefreq>${u.changefreq}</changefreq>
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
  return `# robots.txt — Bienvenido a los 90
# Estrategia: centrar el crawl budget en episodios y páginas de artistas.
# El sitemap lista únicamente las URLs de valor; el resto se bloquea aquí.

User-agent: *

# Página legal sin valor SEO (ya lleva <meta name="robots" content="noindex">)
Disallow: /privacidad.html

# Archivos de texto de transcripciones: datos internos sin estructura HTML.
# No aportan valor como páginas independientes y desperdician crawl budget.
Disallow: /data/transcriptions/

# Nota: /data/*.json queda accesible a propósito — Googlebot necesita
# leer esos archivos para renderizar el JavaScript de la home y descubrir
# los episodios. Están excluidos del sitemap, así que no se indexarán
# como páginas, pero bloquearlos rompería el renderizado para Google.

# Bots de IA que rastrean para entrenamiento (no aportan tráfico)
User-agent: GPTBot
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: anthropic-ai
Disallow: /

User-agent: Claude-Web
Disallow: /

User-agent: Omgilibot
Disallow: /

User-agent: peer39_crawler
Disallow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
}

// Página "Fotos": una galería con instantáneas de programas emblemáticos,
// curada a mano en photos.json (imagen + pie de foto + episodio al que
// pertenece). Cada foto enlaza a las plataformas del episodio asociado,
// resueltas desde episodes.json en cada build para que no se desactualicen.
// Títulos de grupo personalizados para la galería de fotos, distintos del
// título real del episodio (que no se toca: sigue igual en su propia
// página, el listado y el SEO). Clave: slug del episodio.
const PHOTO_GROUP_TITLE_OVERRIDES = new Map([
  ["programa-97-hora-y-media-con-le-traste", "Programa 97 - LE TRASTE"],
  ["programa-188-oasis-this-is-history-capitulo-1-the-rain-1990-glastonbury-1995", "Programa 188 - Oasis \"This is history\""],
  ["programa-271-entrevista-new-day-los-planetas", "Programa 271 - Entrevista a New Day"],
]);

function buildFotosPage(episodesBySlug) {
  const photosPath = "photos.json";
  const photos = fs.existsSync(photosPath)
    ? JSON.parse(fs.readFileSync(photosPath, "utf-8"))
    : [];

  // Agrupamos las fotos por episodio para que la galería se navegue por
  // programa (con su título y enlaces de plataforma una sola vez) en vez de
  // mostrarlas todas sueltas en una única rejilla.
  const groups = [];
  const groupBySlug = new Map();
  photos.forEach((photo) => {
    let group = groupBySlug.get(photo.episodeSlug);
    if (!group) {
      group = { episodeSlug: photo.episodeSlug, ep: episodesBySlug.get(photo.episodeSlug), photos: [] };
      groupBySlug.set(photo.episodeSlug, group);
      groups.push(group);
    }
    group.photos.push(photo);
  });
  // Programas más recientes primero (los sin episodio asociado, al final).
  groups.sort((a, b) => {
    if (!a.ep) return 1;
    if (!b.ep) return -1;
    return new Date(b.ep.published) - new Date(a.ep.published);
  });

  let globalPhotoIndex = 0;
  const groupsHtml = groups.map((group) => {
    const { ep } = group;
    const links = ep ? platformLinks(ep) : [];
    const linksHtml = links.length
      ? `<div class="platform-links">${links.map((p) => `<a class="icon-${p.icon}" href="${p.url}" target="_blank" rel="noopener" title="${escapeHtml(p.label)}" aria-label="${escapeHtml(p.label)}">${PLATFORM_ICONS[p.icon]}</a>`).join("")}</div>`
      : "";
    const groupDate = group.photos.find((p) => p.date)?.date;
    const groupTitle = PHOTO_GROUP_TITLE_OVERRIDES.get(group.episodeSlug)
      || (ep ? ep.title.replace(/^B90\s*-\s*/i, "") : group.episodeSlug);
    const titleLink = ep
      ? `<a href="episodios/${ep.slug}.html">${escapeHtml(groupTitle)}</a>`
      : escapeHtml(groupTitle);

    const startIndex = globalPhotoIndex;
    globalPhotoIndex += group.photos.length;

    const cover = group.photos[0];
    const countLabel = group.photos.length === 1 ? "1 foto" : `${group.photos.length} fotos`;
    const hiddenPhotos = group.photos.map((p) =>
      `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.caption)}" width="600" height="400" />`).join("");

    return `
    <article class="ep-card">
      <button class="ep-cover-btn" type="button" data-start="${startIndex}" aria-label="Ver ${countLabel} de ${escapeHtml(groupTitle)}">
        <img src="${escapeHtml(cover.image)}" alt="${escapeHtml(cover.caption)}" loading="lazy" width="600" height="400"${cover.focalPoint ? ` style="object-position:${escapeHtml(cover.focalPoint)}"` : ""} />
        ${group.photos.length > 1 ? `<span class="ep-photo-count">${countLabel}</span>` : ""}
      </button>
      <div class="ep-body">
        <h2 class="ep-title">${titleLink}</h2>
        ${groupDate ? `<p class="ep-date">emitido el ${escapeHtml(groupDate)}</p>` : ""}
        ${linksHtml}
      </div>
      <div class="stack-photos" hidden>${hiddenPhotos}</div>
    </article>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<script>(function(){var t=localStorage.getItem("theme");if(t==="dark")document.documentElement.setAttribute("data-theme","dark");})();</script>
<title>Fotos — Bienvenido a los 90</title>
<meta name="description" content="Galería de fotos de programas emblemáticos de Bienvenido a los 90, el podcast de música de los años 90." />
<link rel="canonical" href="${SITE_URL}/fotos.html" />
<link rel="icon" type="image/jpeg" href="images/b90-logo-new.jpg" media="(prefers-color-scheme: light)" />
<link rel="icon" type="image/png" href="images/b90-logo-dark-icon.png" media="(prefers-color-scheme: dark)" />
<link rel="apple-touch-icon" href="images/b90-logo-new.jpg" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
${fontAsync("https://fonts.googleapis.com/css2?family=Poppins:wght@700;800&family=Space+Grotesk:wght@400;600;700&family=Special+Elite&display=swap")}
<link rel="stylesheet" href="styles.css?v=75" />

<meta property="og:type" content="website" />
<meta property="og:title" content="Fotos — Bienvenido a los 90" />
<meta property="og:description" content="Galería de fotos de programas emblemáticos de Bienvenido a los 90." />
<meta property="og:url" content="${SITE_URL}/fotos.html" />
<meta property="og:image" content="${SITE_URL}/images/og-home.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Fotos — Bienvenido a los 90" />
<meta name="twitter:description" content="Galería de fotos de programas emblemáticos de Bienvenido a los 90." />
<meta name="twitter:image" content="${SITE_URL}/images/og-home.png" />
</head>
<body>
  <nav class="topnav">
    <div class="container topnav-inner">
      <a class="brand" href="/" aria-label="Bienvenido a los 90">
        <img class="brand-logo logo-light" src="images/b90-logo-transparent.png" alt="B" width="128" height="128" />
        <img class="brand-logo logo-dark" src="images/b90-logo-dark-icon.png" alt="B" width="128" height="128" />
        <span>ienvenido a los 90</span>
      </a>
      <div class="topnav-links">
        <a href="/#episodios">Episodios</a>
        <a href="/#escuchanos">Escúchanos</a>
        <a href="/#sobre-nosotros">Sobre Nosotros</a>
        <a href="/#sigue">Síguenos</a>
        <a href="fotos.html">Fotos</a>
        <a href="/#" id="randomEpisodeBtn">🎲 Episodio aleatorio</a>
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

  <main class="container">
    <h1 class="section-title font-brand">Fotos</h1>
    <p class="photos-intro">Instantáneas de algunos programas.</p>
    <div class="ep-grid">${groupsHtml}</div>
  </main>

  <div id="lightbox" class="lightbox" hidden>
    <button class="lightbox-close" type="button" aria-label="Cerrar">&times;</button>
    <button class="lightbox-nav lightbox-prev" type="button" aria-label="Foto anterior">&#8249;</button>
    <img id="lightboxImg" src="" alt="" />
    <button class="lightbox-nav lightbox-next" type="button" aria-label="Foto siguiente">&#8250;</button>
    <p id="lightboxCaption" class="lightbox-caption"></p>
  </div>

  <footer class="site-footer">
    <div class="container">
      <h3 class="font-brand">Encuéntranos</h3>
      <div class="social-row">
        <a class="social-btn icon-instagram" href="https://instagram.com/b90podcast" target="_blank" rel="noopener" title="Instagram" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="4.2" stroke="currentColor" stroke-width="1.6"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor"/></svg></a>
        <a class="social-btn icon-substack" href="https://bienvenidoalos90.substack.com/" target="_blank" rel="noopener" title="Substack" aria-label="Substack"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="5" width="16" height="2.2" fill="currentColor"/><rect x="4" y="9" width="16" height="2.2" fill="currentColor"/><path d="M4 13.5h16L12 20.5z" fill="currentColor"/></svg></a>
        <a class="social-btn icon-facebook" href="https://www.facebook.com/bienvenidoalo90" target="_blank" rel="noopener" title="Facebook" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9.2" stroke="currentColor" stroke-width="1.6"/><path d="M13.5 9.2h1.8V7H13.2c-1.5 0-2.4 1-2.4 2.5v1.3H9.4v2h1.4V17h2.1v-4.2h1.7l.3-2h-2V9.6c0-.3.2-.4.6-.4z" fill="currentColor"/></svg></a>
        <a class="social-btn icon-x" href="https://x.com/Rockisroll" target="_blank" rel="noopener" title="X" aria-label="X"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" stroke-width="1.6"/><path d="M7.5 7.5l9 9M16.5 7.5l-9 9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></a>
        <a class="social-btn icon-tiktok" href="https://tiktok.com/@b90podcast" target="_blank" rel="noopener" title="TikTok" aria-label="TikTok"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 4v9.5a3.5 3.5 0 1 1-3-3.46" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 4c.3 2 1.8 3.6 4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></a>
        <a class="social-btn icon-twitch" href="https://www.twitch.tv/bienvenidoalos90" target="_blank" rel="noopener" title="Twitch" aria-label="Twitch"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 4h14v10l-3.5 3.5H12l-2 2H8v-2H5V4z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M11 8v3.5M15 8v3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></a>
        <a class="social-btn icon-telegram" href="https://t.me/bienvenidoalosnoventa" target="_blank" rel="noopener" title="Telegram" aria-label="Telegram"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22 2L11 13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 2L15 22 11 13 2 9 22 2z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg></a>
        <a class="social-btn icon-bluesky" href="https://bsky.app/profile/bienvenidoalos90.bsky.social" target="_blank" rel="noopener" title="Bluesky" aria-label="Bluesky"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 8.5c-1-2.3-3.6-4-5.8-3-1.3.6-1 2.6.1 3.7 1 1 2.7 1.6 4 1.7-1.3.2-3 .8-4 1.8-1.1 1.1-1.4 3.1-.1 3.7 2.2 1 4.8-.7 5.8-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 8.5c1-2.3 3.6-4 5.8-3 1.3.6 1 2.6-.1 3.7-1 1-2.7 1.6-4 1.7 1.3.2 3 .8 4 1.8 1.1 1.1 1.4 3.1.1 3.7-2.2 1-4.8-.7-5.8-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
        <a class="social-btn icon-whatsapp" href="https://www.whatsapp.com/channel/0029VaASqFALY6d2gMeB771N" target="_blank" rel="noopener" title="WhatsApp" aria-label="WhatsApp"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3.5a8.5 8.5 0 0 0-7.3 12.8L4 20.5l4.3-1.1A8.5 8.5 0 1 0 12 3.5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M9 9.8c.1-.8.6-.9 1-.9s.7 0 .9.5c.2.5.6 1.5.6 1.7s0 .4-.2.6c-.2.3-.4.4-.2.7.2.3 1 1.3 2.2 1.8.3.1.5.1.7-.1.2-.2.6-.7.8-.9.2-.2.3-.2.6-.1.3.1 1.6.8 1.9 1 .3.1.4.2.5.3.1.2.1.9-.2 1.3-.3.4-1.3 1-2.4.7-1.1-.3-2.9-1.1-4.4-2.7-1.2-1.3-1.9-2.7-2.1-3.2-.2-.5-.4-1.2-.3-1.7z" fill="currentColor"/></svg></a>
        <a class="social-btn icon-email" href="mailto:bienvenidoalosnoventa@gmail.com" title="Email" aria-label="Email"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M4 6.5l8 6 8-6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
        <a class="social-btn icon-linktree" href="https://linktr.ee/b90podcast" target="_blank" rel="noopener" title="Linktree" aria-label="Linktree"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3v18M12 9L6 5M12 9l6-4M12 14L6 10M12 14l6-4M9 18l3 3 3-3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
      </div>
      <p class="footer-tagline">Bienvenido a los 90 · Podcast independiente de música · Conectando personas desde 2012 · <a href="/privacidad.html">Privacidad y cookies</a></p>
    </div>
  </footer>

  <script src="nav.js?v=4" defer></script>
  <script>
    (function () {
      var lightbox = document.getElementById("lightbox");
      var lightboxImg = document.getElementById("lightboxImg");
      var lightboxCaption = document.getElementById("lightboxCaption");
      var allPhotos = Array.prototype.slice.call(document.querySelectorAll(".stack-photos img"));
      var currentIndex = -1;
      function showIndex(index) {
        currentIndex = (index + allPhotos.length) % allPhotos.length;
        var img = allPhotos[currentIndex];
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt;
        lightboxCaption.textContent = img.alt;
        lightbox.hidden = false;
      }
      function closeLightbox() {
        lightbox.hidden = true;
        lightboxImg.src = "";
      }
      document.querySelectorAll(".ep-cover-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          showIndex(parseInt(btn.dataset.start, 10));
        });
      });
      lightbox.addEventListener("click", function (e) {
        if (e.target === lightbox || e.target.classList.contains("lightbox-close")) closeLightbox();
        if (e.target.classList.contains("lightbox-prev")) showIndex(currentIndex - 1);
        if (e.target.classList.contains("lightbox-next")) showIndex(currentIndex + 1);
      });
      document.addEventListener("keydown", function (e) {
        if (lightbox.hidden) return;
        if (e.key === "Escape") closeLightbox();
        if (e.key === "ArrowLeft") showIndex(currentIndex - 1);
        if (e.key === "ArrowRight") showIndex(currentIndex + 1);
      });
      var touchStartX = 0;
      var touchStartY = 0;
      lightbox.addEventListener("touchstart", function (e) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }, { passive: true });
      lightbox.addEventListener("touchend", function (e) {
        var dx = e.changedTouches[0].clientX - touchStartX;
        var dy = e.changedTouches[0].clientY - touchStartY;
        if (Math.abs(dy) > Math.abs(dx) && dy > 60) { closeLightbox(); return; }
        if (Math.abs(dx) > 40) showIndex(currentIndex + (dx < 0 ? 1 : -1));
      }, { passive: true });
    })();
  </script>
  <!-- Cloudflare Web Analytics --><script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "c082acebb6434c21b4d7bc2ac95019c3"}'></script><!-- End Cloudflare Web Analytics -->
</body>
</html>
`;
}

function main() {
  const episodes = JSON.parse(fs.readFileSync("episodes.json", "utf-8"));
  canonicalizeLabels(episodes);
  // Orden cronológico ascendente para la navegación prev/next entre episodios
  const chronological = [...episodes].sort((a, b) => new Date(a.published) - new Date(b.published));

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const episodesBySlug = new Map(episodes.map((ep) => [ep.slug, ep]));
  fs.writeFileSync("fotos.html", buildFotosPage(episodesBySlug), "utf-8");

  const seriesBySlug = buildSeriesMap(episodes);

  chronological.forEach((ep, i) => {
    const prev = i > 0 ? chronological[i - 1] : null;
    const next = i < chronological.length - 1 ? chronological[i + 1] : null;
    const related = getRelatedEpisodes(ep, episodes);
    const series = seriesBySlug.get(ep.slug) || null;
    const html = episodePage(ep, { prev, next, related, series });
    fs.writeFileSync(path.join(OUT_DIR, `${ep.slug}.html`), html, "utf-8");
  });

  const etiquetas = buildEtiquetasPages(episodes);
  fs.writeFileSync("sitemap.xml", buildSitemap(episodes, etiquetas), "utf-8");
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

  // Slugs de "Esenciales", sincronizados semanalmente desde el listado
  // oficial de iVoox por fetch-esenciales.mjs (ver esenciales-slugs.json).
  const esencialesSlugs = fs.existsSync("esenciales-slugs.json")
    ? JSON.parse(fs.readFileSync("esenciales-slugs.json", "utf-8"))
    : [];
  fs.writeFileSync("data/esenciales.json", JSON.stringify(esencialesSlugs), "utf-8");

  console.log(`Generadas ${episodes.length} páginas en /${OUT_DIR}, sitemap.xml, robots.txt y ${chunks.length} bloques en /data (SITE_URL=${SITE_URL}).`);
}

main();
