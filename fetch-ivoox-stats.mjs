// Extrae las estadísticas reales de iVoox (me gusta, comentarios,
// reproducciones) recorriendo las páginas de listado del podcast, en vez de
// visitar cada episodio uno a uno. El feed de Blogger solo aporta el número
// de comentarios en el propio blog (casi siempre 0), no los de iVoox.

import fs from "fs";

const LIST_BASE = "https://www.ivoox.com/podcast-bienvenido-a-90_sq_f132699_";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const DELAY_MS = 400;
const MAX_PAGES = 100;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchListPage(page) {
  const res = await fetch(`${LIST_BASE}${page}.html`, { headers: { "User-Agent": UA } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
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

  const episodes = JSON.parse(fs.readFileSync("episodes.json", "utf-8"));

  function ivooxId(ep) {
    const link = ep.ivooxLink || ep.downloadLink;
    if (!link) return null;
    const m = link.match(/rf[_/](\d+)/) || link.match(/ivoox\.com\/(\d+)$/);
    return m ? m[1] : null;
  }

  let updated = 0;
  episodes.forEach((ep) => {
    const id = ivooxId(ep);
    const stats = id ? statsById.get(id) : null;
    if (stats) {
      ep.comments = stats.comments;
      ep.likes = stats.likes;
      ep.plays = stats.plays;
      updated++;
    }
  });

  fs.writeFileSync("episodes.json", JSON.stringify(episodes, null, 2), "utf-8");
  console.log(`Actualizados ${updated}/${episodes.length} episodios con estadísticas reales de iVoox.`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
