// Sincroniza el listado de "Esenciales" con la lista oficial de iVoox:
// https://www.ivoox.com/esenciales-b90_bk_list_6192164_1.html
//
// Recorre las páginas del listado, extrae el ID de iVoox de cada episodio
// (parámetro rf_) y lo empareja con el slug correspondiente en
// episodes.json usando ese mismo ID (ya presente en ivooxLink/downloadLink).
// El resultado se guarda en esenciales-slugs.json para que build-episodes.mjs
// lo use al generar data/esenciales.json (consumido por app.js).

import fs from "fs";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const LIST_BASE = "https://www.ivoox.com/esenciales-b90_bk_list_6192164_";
const MAX_PAGES = 30;

function ivooxIdFromLink(link) {
  if (!link) return null;
  const m = link.match(/rf[_/](\d+)/) || link.match(/ivoox\.com\/(\d+)$/);
  return m ? m[1] : null;
}

function extractIds(html) {
  const ids = [];
  const seen = new Set();
  const re = /_rf_(\d+)_1\.html/g;
  let m;
  while ((m = re.exec(html))) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      ids.push(m[1]);
    }
  }
  return ids;
}

async function main() {
  const episodes = JSON.parse(fs.readFileSync("episodes.json", "utf-8"));
  const bySlugId = new Map();
  episodes.forEach((ep) => {
    const id = ivooxIdFromLink(ep.ivooxLink) || ivooxIdFromLink(ep.downloadLink);
    if (id) bySlugId.set(id, ep.slug);
  });

  const orderedIds = [];
  const seenIds = new Set();

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `${LIST_BASE}${page}.html`;
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.status === 404) {
      console.log(`Página ${page}: 404, fin.`);
      break;
    }
    const html = await res.text();
    const ids = extractIds(html);
    if (ids.length === 0) {
      console.log(`Página ${page}: sin episodios, fin.`);
      break;
    }
    let added = 0;
    ids.forEach((id) => {
      if (!seenIds.has(id)) {
        seenIds.add(id);
        orderedIds.push(id);
        added++;
      }
    });
    console.log(`Página ${page}: ${ids.length} ids, ${added} nuevos, total ${orderedIds.length}`);
    await new Promise((r) => setTimeout(r, 250));
  }

  const slugs = [];
  const unmatched = [];
  orderedIds.forEach((id) => {
    const slug = bySlugId.get(id);
    if (slug) slugs.push(slug);
    else unmatched.push(id);
  });

  if (unmatched.length) {
    console.log(`Aviso: ${unmatched.length} episodios de la lista de iVoox no se encontraron en episodes.json:`, unmatched);
  }

  fs.writeFileSync("esenciales-slugs.json", JSON.stringify(slugs, null, 2), "utf-8");
  console.log(`Guardados ${slugs.length} slugs en esenciales-slugs.json`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
