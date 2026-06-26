import fs from "fs";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const LIST_BASE = "https://www.ivoox.com/podcast-bienvenido-a-90_sq_f132699_";

function parsePage(html) {
  const chunks = html.split('<div class="d-flex mb-3"');
  const results = [];
  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i];
    const idMatch = chunk.match(/_rf_(\d+)_1\.html/);
    if (!idMatch) continue;
    const titleMatch = chunk.match(/<h3[^>]*><a[^>]*>\s*([^<]+?)\s*<\/a>/);
    if (!titleMatch) continue;
    results.push({ id: idMatch[1], title: titleMatch[1].trim() });
  }
  return results;
}

async function main() {
  const byId = new Map();
  for (let page = 1; page <= 70; page++) {
    const res = await fetch(`${LIST_BASE}${page}.html`, { headers: { "User-Agent": UA } });
    if (res.status === 404) {
      console.log(`Página ${page}: 404, fin.`);
      break;
    }
    const html = await res.text();
    const results = parsePage(html);
    if (results.length === 0) {
      console.log(`Página ${page}: vacía, fin.`);
      break;
    }
    let added = 0;
    results.forEach((r) => {
      if (!byId.has(r.id)) {
        byId.set(r.id, r.title);
        added++;
      }
    });
    console.log(`Página ${page}: ${results.length} entradas, ${added} nuevas, total ${byId.size}`);
    await new Promise((r) => setTimeout(r, 250));
  }

  const out = [...byId.entries()].map(([id, title]) => ({ id, title }));
  fs.writeFileSync("ivoox-titles.json", JSON.stringify(out, null, 2), "utf-8");
  console.log(`Guardadas ${out.length} entradas en ivoox-titles.json`);
}

main();
