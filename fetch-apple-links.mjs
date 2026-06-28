// Enriquece episodes.json con el enlace exacto a cada episodio en Apple
// Podcasts, usando la iTunes Search API pública (sin clave).
//
// Estrategia:
// 1. Un único lookup trae los ~200 episodios más recientes de golpe.
// 2. Para el resto, se busca por título y se empareja por el ID de iVoox
//    (extraído de downloadLink), que aparece en episodeGuid de Apple.
// 3. Si no hay downloadLink o no hay coincidencia por ID, se descarta
//    (no se adivina: mejor no mostrar enlace que mostrar uno equivocado).

import fs from "fs";

const COLLECTION_ID = 1369150482; // Bienvenido a los 90 en Apple Podcasts
const DELAY_MS = 2000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ivooxIdFromDownloadLink(downloadLink) {
  if (!downloadLink) return null;
  const m = downloadLink.match(/rf[_/](\d+)/) || downloadLink.match(/ivoox\.com\/(\d+)$/);
  return m ? m[1] : null;
}

function ivooxIdFromGuid(guid) {
  if (!guid) return null;
  const m = guid.match(/ivoox\.com\/(\d+)/);
  return m ? m[1] : null;
}

async function lookupRecentEpisodes() {
  const url = `https://itunes.apple.com/lookup?id=${COLLECTION_ID}&entity=podcastEpisode&limit=200`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Lookup HTTP ${res.status}`);
  const data = await res.json();
  return (data.results || []).filter((r) => r.wrapperType === "podcastEpisode");
}

function cleanTitleForSearch(title) {
  return title
    .replace(/^bienvenido a los 90\s*-\s*/i, "")
    .replace(/^programa\s*#?\d+\s*[-:]?\s*/i, "")
    .replace(/^p\.?\s*\d+\s*[-:]?\s*/i, "")
    .replace(/^\d+\s*-\s*/, "")
    .trim();
}

async function searchEpisodeByTitleTerm(term, retries = 3) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=podcastEpisode&limit=25`;
  const res = await fetch(url);
  if (res.status === 429 && retries > 0) {
    await sleep(15000);
    return searchEpisodeByTitleTerm(term, retries - 1);
  }
  if (!res.ok) throw new Error(`Search HTTP ${res.status}`);
  const data = await res.json();
  return (data.results || []).filter((r) => r.collectionId === COLLECTION_ID);
}

async function searchEpisodeByTitle(title) {
  const cleaned = cleanTitleForSearch(title).slice(0, 60);
  let results = await searchEpisodeByTitleTerm(cleaned || title.slice(0, 60));
  if (results.length === 0 && cleaned) {
    await sleep(2000);
    results = await searchEpisodeByTitleTerm(title.slice(0, 60));
  }
  return results;
}

async function main() {
  const episodes = JSON.parse(fs.readFileSync("episodes.json", "utf-8"));

  // Mapa ivooxId -> trackViewUrl, construido primero con el lookup masivo.
  const byIvooxId = new Map();
  console.log("Descargando los ~200 episodios más recientes de Apple Podcasts...");
  const recent = await lookupRecentEpisodes();
  recent.forEach((ep) => {
    const id = ivooxIdFromGuid(ep.episodeGuid);
    if (id) byIvooxId.set(id, ep.trackViewUrl);
  });
  console.log(`Emparejados ${byIvooxId.size} episodios desde el lookup masivo.`);

  let matched = byIvooxId.size;
  let searched = 0;

  let stillMissing = 0;

  for (const ep of episodes) {
    const ivooxId =
      ivooxIdFromDownloadLink(ep.downloadLink) || ivooxIdFromDownloadLink(ep.ivooxLink);

    if (ep.appleLink) continue; // ya tiene enlace específico, no lo tocamos

    if (ivooxId && byIvooxId.has(ivooxId)) {
      ep.appleLink = byIvooxId.get(ivooxId);
      matched++;
      continue;
    }
    if (!ivooxId) {
      stillMissing++;
      continue;
    }

    searched++;
    try {
      const results = await searchEpisodeByTitle(ep.title);
      const hit = results.find((r) => ivooxIdFromGuid(r.episodeGuid) === ivooxId);
      if (hit) {
        ep.appleLink = hit.trackViewUrl;
        matched++;
      } else {
        stillMissing++;
      }
    } catch (err) {
      console.error(`Error buscando "${ep.title}": ${err.message}`);
      stillMissing++;
    }

    if (searched % 50 === 0) console.log(`Buscados ${searched} episodios antiguos...`);
    await sleep(DELAY_MS);
  }

  console.log(`Sin coincidencia tras la busqueda: ${stillMissing}`);

  fs.writeFileSync("episodes.json", JSON.stringify(episodes, null, 2), "utf-8");
  console.log(`Listo. ${matched}/${episodes.length} episodios con enlace exacto de Apple Podcasts.`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
