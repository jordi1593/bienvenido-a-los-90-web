// Extrae las estadísticas reales de iVoox (me gusta, comentarios,
// reproducciones) recorriendo las páginas de listado del podcast, en vez de
// visitar cada episodio uno a uno. El feed de Blogger solo aporta el número
// de comentarios en el propio blog (casi siempre 0), no los de iVoox.

import fs from "fs";

const LIST_BASE = "https://www.ivoox.com/podcast-bienvenido-a-90_sq_f132699_";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
const DELAY_MS = 1200;
const MAX_PAGES = 100;
const MAX_RETRIES = 3;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchListPage(page) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(`${LIST_BASE}${page}.html`, {
      headers: {
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Referer": "https://www.ivoox.com/",
      },
    });
    if (res.status === 404) return null;
    if (res.status === 429 || res.status === 503 || res.status === 500) {
      const wait = attempt * 5000;
      console.log(`  HTTP ${res.status} en página ${page}, reintento ${attempt}/${MAX_RETRIES} en ${wait/1000}s...`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  }
  throw new Error(`HTTP 500 tras ${MAX_RETRIES} reintentos en página ${page}`);
}

// iVoox abrevia cifras grandes como "1.1k" o "2.3m" en vez del número exacto.
function parseAbbreviatedNumber(str) {
  const m = str.match(/^([\d.,]+)([km]?)$/i);
  if (!m) return null;
  const value = parseFloat(m[1].replace(",", "."));
  const suffix = m[2].toLowerCase();
  if (suffix === "k") return Math.round(value * 1000);
  if (suffix === "m") return Math.round(value * 1000000);
  return Math.round(value);
}

function parsePage(html) {
  const chunks = html.split('<div class="d-flex mb-3"');
  const results = [];
  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i];
    const idMatch = chunk.match(/_rf_(\d+)_1\.html/);
    if (!idMatch) continue;
    const nums = [...chunk.matchAll(/class="text-gray"[^>]*>([\d.,]+[km]?)<\/span>/gi)]
      .map((m) => parseAbbreviatedNumber(m[1]));
    // Necesitamos al menos "me gusta" y "comentarios"; "reproducciones" es opcional.
    if (nums.length < 2 || nums[0] === null || nums[1] === null) continue;
    results.push({ id: idMatch[1], likes: nums[0], comments: nums[1], plays: nums[2] ?? null });
  }
  return results;
}

function hhmmssToSeconds(str) {
  const parts = str.trim().split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}

async function fetchDurationsFromRSS() {
  const res = await fetch("https://feeds.ivoox.com/feed_fg_f132699_filtro_1.xml");
  if (!res.ok) throw new Error(`RSS HTTP ${res.status}`);
  const xml = await res.text();
  const durationById = new Map();
  const items = xml.split("<item>");
  for (let i = 1; i < items.length; i++) {
    const idMatch = items[i].match(/_rf_(\d+)_/);
    const durMatch = items[i].match(/<itunes:duration>([^<]+)<\/itunes:duration>/);
    if (idMatch && durMatch) {
      durationById.set(idMatch[1], hhmmssToSeconds(durMatch[1]));
    }
  }
  return durationById;
}

async function main() {
  const statsById = new Map();
  const seenIds = new Set();

  for (let page = 1; page <= MAX_PAGES; page++) {
    console.log(`Descargando página de listado ${page}...`);
    const html = await fetchListPage(page);
    if (html === null) {
      console.log("Página 404, fin de la paginación.");
      break;
    }
    const results = parsePage(html);

    if (results.length === 0) {
      console.log("Página vacía, fin de la paginación.");
      break;
    }

    const newIds = results.filter((r) => !seenIds.has(r.id));
    if (newIds.length === 0) {
      console.log("Todos los IDs ya vistos (fin real de la paginación), parando.");
      break;
    }

    newIds.forEach((r) => {
      seenIds.add(r.id);
      statsById.set(r.id, r);
    });

    await sleep(DELAY_MS);
  }

  console.log(`Recogidas estadísticas de ${statsById.size} episodios de iVoox.`);

  console.log("Descargando duraciones desde el feed RSS...");
  const durationById = await fetchDurationsFromRSS();
  console.log(`Duraciones obtenidas: ${durationById.size} episodios.`);

  const episodes = JSON.parse(fs.readFileSync("episodes.json", "utf-8"));

  function ivooxId(ep) {
    const link = ep.ivooxLink || ep.downloadLink;
    if (!link) return null;
    const m = link.match(/rf[_/](\d+)/) || link.match(/ivoox\.com\/(\d+)$/);
    return m ? m[1] : null;
  }

  let updated = 0;
  let durationsAdded = 0;
  episodes.forEach((ep) => {
    const id = ivooxId(ep);
    const stats = id ? statsById.get(id) : null;
    if (stats) {
      ep.comments = stats.comments;
      ep.likes = stats.likes;
      ep.plays = stats.plays;
      updated++;
    }
    const dur = id ? durationById.get(id) : null;
    if (dur) { ep.duration = dur; durationsAdded++; }
  });

  fs.writeFileSync("episodes.json", JSON.stringify(episodes, null, 2), "utf-8");
  console.log(`Actualizados ${updated}/${episodes.length} episodios con estadísticas reales de iVoox.`);
  console.log(`Duraciones añadidas: ${durationsAdded}/${episodes.length} episodios.`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
