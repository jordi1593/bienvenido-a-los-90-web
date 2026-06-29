// Descarga el histórico completo de episodios desde el feed JSON de Blogger
// y genera episodes.json con los datos normalizados para la web estática.

import fs from "fs";

const BASE = "https://bienvenidoalos90.blogspot.com/feeds/posts/default";
const PAGE_SIZE = 150;

function stripHtml(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

// Convierte el HTML del post en párrafos de texto plano, preservando los
// saltos de párrafo para poder reconstruir <p> seguros en la página generada.
// Importante: stripHtml() colapsa TODO el whitespace (incluidos los \n que
// marcan los párrafos) en un solo espacio, así que aquí no podemos usarla
// antes de separar por líneas o perderíamos los saltos de párrafo.
function extractParagraphs(html) {
  const withBreaks = html.replace(/<\/p>|<br\s*\/?>/gi, "\n");
  const withoutTags = withBreaks.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ");
  const text = decodeEntities(withoutTags);
  return text
    .split("\n")
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 0 && !/^DESCARGA EL PROGRAMA$/i.test(p));
}

function extractEpisodeNumber(title) {
  const m = title.match(/^(\d+)\s*-/);
  return m ? parseInt(m[1], 10) : null;
}

function slugify(title) {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// Algunas entradas muy antiguas del blog (2012) comparten título (p.ej. dos
// posts llamados "Vacaciones" o sin título) y por tanto generan el mismo
// slug. Si eso ocurre, distinguimos las repeticiones añadiendo el año-mes de
// la URL original para que cada episodio tenga su propia página.
function dedupeSlugs(episodes) {
  const seen = new Map();
  episodes.forEach((ep) => {
    if (!seen.has(ep.slug)) {
      seen.set(ep.slug, [ep]);
    } else {
      seen.get(ep.slug).push(ep);
    }
  });
  seen.forEach((group, slug) => {
    if (group.length < 2) return;
    group
      .slice()
      .sort((a, b) => new Date(a.published) - new Date(b.published))
      .forEach((ep, i) => {
        if (i === 0) return;
        const m = (ep.url || "").match(/\/(\d{4})\/(\d{2})\//);
        const suffix = m ? `${m[1]}-${m[2]}` : String(i + 1);
        ep.slug = `${slug}-${suffix}`;
      });
  });
}

function extractDownloadLink(content) {
  const m = content.match(/https:\/\/go\.ivoox\.com\/rf\/\d+/);
  return m ? m[0] : null;
}

async function fetchPage(startIndex) {
  const url = `${BASE}?alt=json&max-results=${PAGE_SIZE}&start-index=${startIndex}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} en start-index=${startIndex}`);
  return res.json();
}

// Cuenta cuántos episodios tienen cada enlace curado a mano (no derivable
// del blog: youtube, ivoox, apple, amazon, spotify). Se usa como red de
// seguridad: si tras un scrape el recuento de alguno de estos campos baja
// respecto a la version anterior de episodes.json, algo se ha perdido y no
// debemos sobrescribir el fichero.
function countCuratedLinks(episodes) {
  const hasValue = (v) => (Array.isArray(v) ? v.length > 0 : !!v);
  const fields = ["youtubeLink", "ivooxLink", "appleLink", "amazonLink", "spotifyLink"];
  const counts = {};
  fields.forEach((field) => {
    counts[field] = episodes.filter((ep) => hasValue(ep[field])).length;
  });
  return counts;
}

function loadPreviousEpisodes() {
  if (!fs.existsSync("episodes.json")) return [];
  return JSON.parse(fs.readFileSync("episodes.json", "utf-8"));
}

function loadPreviousEnrichment(previous) {
  const byUrl = new Map();
  previous.forEach((ep) => {
    if (ep.url) {
      byUrl.set(ep.url, {
        ivooxLink: ep.ivooxLink,
        appleLink: ep.appleLink,
        amazonLink: ep.amazonLink,
        spotifyLink: ep.spotifyLink,
        youtubeLink: ep.youtubeLink,
        ivooxComments: ep.likes !== undefined ? ep.comments : undefined,
        likes: ep.likes,
        plays: ep.plays,
      });
    }
  });
  return byUrl;
}

// Algunas entradas del blog agrupan varios episodios en un solo post (p.ej.
// "una semana de emisiones" con los programas 364-368): se separaron a mano
// en episodios.json en varias entradas que comparten la misma url. El feed
// de Blogger solo nos da UNA entrada para esa url, así que si no hiciéramos
// nada aquí, cada scrape colapsaría esos episodios de vuelta a uno solo y
// perderíamos sus enlaces individuales. Por eso identificamos estos grupos
// en la versión anterior de episodes.json y los preservamos tal cual,
// descartando la entrada única que generaría el feed para esa misma url.
function loadManualSplitGroups(previous) {
  const byUrl = new Map();
  previous.forEach((ep) => {
    if (!ep.url) return;
    if (!byUrl.has(ep.url)) byUrl.set(ep.url, []);
    byUrl.get(ep.url).push(ep);
  });
  const groups = new Map();
  byUrl.forEach((eps, url) => {
    if (eps.length > 1) groups.set(url, eps);
  });
  return groups;
}

async function main() {
  const first = await fetchPage(1);
  const total = parseInt(first.feed["openSearch$totalResults"]["$t"], 10);
  console.log(`Total de entradas en el blog: ${total}`);

  const allEntries = [...(first.feed.entry || [])];
  let startIndex = 1 + PAGE_SIZE;

  while (startIndex <= total) {
    console.log(`Descargando desde start-index=${startIndex}...`);
    const page = await fetchPage(startIndex);
    const entries = page.feed.entry || [];
    if (entries.length === 0) break;
    allEntries.push(...entries);
    startIndex += PAGE_SIZE;
  }

  console.log(`Descargadas ${allEntries.length} entradas. Procesando...`);

  const previousEpisodes = loadPreviousEpisodes();
  const previousEnrichment = loadPreviousEnrichment(previousEpisodes);
  const manualSplitGroups = loadManualSplitGroups(previousEpisodes);

  const episodes = allEntries.map((entry) => {
    const title = entry.title["$t"];
    const contentHtml = entry.content ? entry.content["$t"] : "";
    const altLink = (entry.link || []).find((l) => l.rel === "alternate");
    const numComments = entry["thr$total"] ? parseInt(entry["thr$total"]["$t"], 10) : 0;
    const number = extractEpisodeNumber(title);
    const paragraphs = extractParagraphs(contentHtml);
    const url = altLink ? altLink.href : null;
    const previous = url ? previousEnrichment.get(url) : null;

    let slug = number ? `${number}-${slugify(title.replace(/^\d+\s*-\s*/, ""))}` : slugify(title);
    if (!slug) {
      // Algunas entradas muy antiguas no tienen título; usamos el último
      // segmento de la URL del blog como slug en su lugar.
      const urlSlug = url ? url.replace(/\/$/, "").split("/").pop().replace(/\.html?$/, "") : "";
      slug = slugify(urlSlug) || "episodio";
    }

    return {
      number,
      slug,
      title,
      published: entry.published["$t"],
      url,
      thumbnail: entry["media$thumbnail"] ? entry["media$thumbnail"].url : null,
      downloadLink: extractDownloadLink(contentHtml),
      ivooxLink: previous?.ivooxLink ?? null,
      appleLink: previous?.appleLink ?? null,
      amazonLink: previous?.amazonLink ?? null,
      spotifyLink: previous?.spotifyLink ?? null,
      youtubeLink: previous?.youtubeLink ?? undefined,
      summary: stripHtml(contentHtml).slice(0, 400),
      paragraphs,
      // Si ya teníamos estadísticas reales de iVoox (likes definido), las
      // conservamos en vez de usar el contador de comentarios del blog.
      comments: previous?.likes !== undefined ? previous.ivooxComments : numComments,
      likes: previous?.likes,
      plays: previous?.plays,
      labels: (entry.category || []).map((c) => c.term),
    };
  });

  dedupeSlugs(episodes);

  // Descartamos las entradas que el feed generaría para urls que en realidad
  // corresponden a un grupo de episodios separado a mano, y reinsertamos ese
  // grupo preservado intacto (ver loadManualSplitGroups).
  const withoutSplitUrls = episodes.filter((ep) => !manualSplitGroups.has(ep.url));
  const preservedGroupEpisodes = [...manualSplitGroups.values()].flat();
  const episodesWithGroups = [...withoutSplitUrls, ...preservedGroupEpisodes];

  const excludedSlugs = new Set(
    JSON.parse(fs.readFileSync("excluded-episodes.json", "utf-8"))
  );
  const filtered = episodesWithGroups.filter((ep) => !excludedSlugs.has(ep.slug));

  filtered.sort((a, b) => new Date(b.published) - new Date(a.published));

  if (previousEpisodes.length > 0) {
    const before = countCuratedLinks(previousEpisodes);
    const after = countCuratedLinks(filtered);
    const regressions = Object.keys(before).filter((field) => after[field] < before[field]);
    if (regressions.length > 0) {
      const details = regressions.map((f) => `${f}: ${before[f]} -> ${after[f]}`).join(", ");
      throw new Error(
        `Abortado: el nuevo episodes.json pierde enlaces curados respecto al actual (${details}). No se sobrescribe el fichero.`
      );
    }
  }

  fs.writeFileSync("episodes.json", JSON.stringify(filtered, null, 2), "utf-8");
  console.log(`episodes.json generado con ${filtered.length} episodios.`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
