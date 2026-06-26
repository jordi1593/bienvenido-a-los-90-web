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
const DELAY_MS = 350;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ivooxIdFromDownloadLink(downloadLink) {
  if (!downloadLink) return null;
  const m = downloadLink.match(/\/rf\/(\d+)/);
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

async function searchEpisodeByTitle(title) {
  const term = encodeURIComponent(title.replace(/^\d+\s*-\s*/, "").slice(0, 60));
  const url = `https://itunes.apple.com/search?term=${term}&entity=podcastEpisode&limit=10`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Search HTTP ${res.status}`);
  const data = await res.json();
  return (data.results || []).filter((r) => r.collectionId === COLLECTION_ID);
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

  for (const ep of episodes) {
    const ivooxId = ivooxIdFromDownloadLink(ep.downloadLink);
    if (ivooxId && byIvooxId.has(ivooxId)) {
      ep.appleLink = byIvooxId.get(ivooxId);
      continue;
    }
    if (!ivooxId) {
      ep.appleLink = null;
      continue;
    }

    searched++;
    try {
      const results = await searchEpisodeByTitle(ep.title);
      const hit = results.find((r) => ivooxIdFromGuid(r.episodeGuid) === ivooxId);
      ep.appleLink = hit ? hit.trackViewUrl : null;
      if (hit) matched++;
    } catch (err) {
      console.error(`Error buscando "${ep.title}": ${err.message}`);
      ep.appleLink = null;
    }

    if (searched % 50 === 0) console.log(`Buscados ${searched} episodios antiguos...`);
    await sleep(DELAY_MS);
  }

  fs.writeFileSync("episodes.json", JSON.stringify(episodes, null, 2), "utf-8");
  console.log(`Listo. ${matched}/${episodes.length} episodios con enlace exacto de Apple Podcasts.`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
