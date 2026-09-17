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

  const pending = episodes.filter((ep) => ep.url && !ep.ivooxLink);
  console.log(`Episodios sin enlace iVoox: ${pending.length}`);

  let resolved = 0;
  let failed = 0;

  for (let i = 0; i < pending.length; i++) {
    const ep = pending[i];

    try {
      const link = await fetchIvooxLink(ep.url);
      if (link) {
        ep.ivooxLink = link;
        resolved++;
        console.log(`[${i + 1}/${pending.length}] Resuelto: ${ep.title}`);
      } else {
        failed++;
        console.warn(`[${i + 1}/${pending.length}] Sin coincidencia: ${ep.title}`);
      }
    } catch (err) {
      failed++;
      console.error(`[${i + 1}/${pending.length}] Error en "${ep.title}": ${err.message}`);
    }

    await sleep(DELAY_MS);
  }

  fs.writeFileSync("episodes.json", JSON.stringify(episodes, null, 2), "utf-8");
  console.log(`Listo. ${resolved} resueltos, ${failed} fallidos de ${pending.length} pendientes.`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
