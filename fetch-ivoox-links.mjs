// El feed de Blogger solo incluye el enlace de iVoox (go.ivoox.com/rf/ID)
// cuando el post tiene el texto "DESCARGA EL PROGRAMA". La mayoría de
// episodios llevan el reproductor de iVoox incrustado fuera del cuerpo del
// post, así que para conseguir el enlace exacto hay que visitar la página
// real del blog y extraer la URL del episodio en ivoox.com.

import fs from "fs";

const DELAY_MS = 150;
// Dos formatos posibles según la época del post: URL descriptiva con slug,
// o enlace corto directo "ivoox.com/rf/ID" embebido sin slug.
const IVOOX_SLUG_RE = /[a-z0-9-]*_rf_(\d+)_1\.html/i;
const IVOOX_SHORT_RE = /(?:go\.)?ivoox\.com\/rf\/(\d+)/i;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchIvooxLink(postUrl) {
  const res = await fetch(postUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  const slugMatch = html.match(IVOOX_SLUG_RE);
  if (slugMatch) return `https://www.ivoox.com/${slugMatch[0]}`;

  const shortMatch = html.match(IVOOX_SHORT_RE);
  if (shortMatch) return `https://www.ivoox.com/rf/${shortMatch[1]}`;

  return null;
}

async function main() {
  const episodes = JSON.parse(fs.readFileSync("episodes.json", "utf-8"));

  let resolved = 0;
  let failed = 0;

  for (let i = 0; i < episodes.length; i++) {
    const ep = episodes[i];
    if (!ep.url) continue;

    try {
      const link = await fetchIvooxLink(ep.url);
      if (link) {
        ep.ivooxLink = link;
        resolved++;
      } else {
        failed++;
        console.warn(`Sin coincidencia iVoox: ${ep.title}`);
      }
    } catch (err) {
      failed++;
      console.error(`Error en "${ep.title}": ${err.message}`);
    }

    if ((i + 1) % 100 === 0) {
      console.log(`Procesados ${i + 1}/${episodes.length} (resueltos: ${resolved}, fallidos: ${failed})`);
      fs.writeFileSync("episodes.json", JSON.stringify(episodes, null, 2), "utf-8");
    }

    await sleep(DELAY_MS);
  }

  fs.writeFileSync("episodes.json", JSON.stringify(episodes, null, 2), "utf-8");
  console.log(`Listo. ${resolved}/${episodes.length} episodios con enlace exacto de iVoox.`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
