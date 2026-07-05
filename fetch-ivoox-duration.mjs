import fs from "fs";

const LIST_BASE = "https://www.ivoox.com/podcast-bienvenido-a-90_sq_f132699_";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const DELAY_MS = 400;
const MAX_PAGES = 100;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function parseDuration(str) {
  const parts = str.trim().split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}

function parsePage(html) {
  const chunks = html.split('<div class="d-flex mb-3"');
  const results = [];
  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i];
    const idMatch = chunk.match(/_rf_(\d+)_1\.html/);
    if (!idMatch) continue;
    const timeMatches = [...chunk.matchAll(/class="text-gray font-size-11"[^>]*>\s*([\d:]+)\s*<\/div>/gi)];
    let duration = null;
    for (const m of timeMatches) {
      const val = parseDuration(m[1]);
      if (val !== null && val > 60) { duration = val; break; }
    }
    if (duration) results.push({ id: idMatch[1], duration });
  }
  return results;
}

async function main() {
  const durationById = new Map();
  const seenIds = new Set();

  for (let page = 1; page <= MAX_PAGES; page++) {
    process.stdout.write(`Página ${page}... `);
    const res = await fetch(`${LIST_BASE}${page}.html`, { headers: { "User-Agent": UA } });
    if (res.status === 404) { console.log("404, fin."); break; }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const results = parsePage(html);
    if (results.length === 0) { console.log("vacía, fin."); break; }
    const newResults = results.filter(r => !seenIds.has(r.id));
    if (newResults.length === 0) { console.log("IDs repetidos, fin."); break; }
    newResults.forEach(r => { seenIds.add(r.id); durationById.set(r.id, r.duration); });
    console.log(`${newResults.length} episodios con duración.`);
    await sleep(DELAY_MS);
  }

  console.log(`\nDuraciones recogidas: ${durationById.size}`);

  const episodes = JSON.parse(fs.readFileSync("episodes.json", "utf-8"));

  function ivooxId(ep) {
    const link = ep.ivooxLink || ep.downloadLink;
    if (!link) return null;
    const m = link.match(/rf[_/](\d+)/) || link.match(/ivoox\.com\/(\d+)$/);
    return m ? m[1] : null;
  }

  let updated = 0;
  let totalSeconds = 0;
  episodes.forEach(ep => {
    const id = ivooxId(ep);
    const dur = id ? durationById.get(id) : null;
    if (dur) { ep.duration = dur; totalSeconds += dur; updated++; }
  });

  fs.writeFileSync("episodes.json", JSON.stringify(episodes, null, 2), "utf-8");
  console.log(`Actualizados: ${updated}/${episodes.length} episodios`);

  const horas = (totalSeconds / 3600).toFixed(1);
  const dias = (totalSeconds / 86400).toFixed(1);
  const avg = updated > 0 ? Math.round(totalSeconds / updated / 60) : 0;
  console.log(`\nTotal: ${horas} horas (${dias} días)`);
  console.log(`Duración media por episodio: ${avg} minutos`);
}

main().catch(err => { console.error(err); process.exit(1); });
