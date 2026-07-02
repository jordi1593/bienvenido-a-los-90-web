// Descarga transcripciones parciales de iVoox (primeros minutos del audio)
// y las guarda en data/transcriptions/<ivoox-id>.txt
// Reanudable: salta episodios ya descargados.
// Uso: node fetch-transcriptions.mjs [--limit N]

import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const OUT_DIR = "data/transcriptions";
const PAUSE_MS = 2500;

const args = process.argv.slice(2);
const limitIdx = args.indexOf("--limit");
const LIMIT = limitIdx !== -1 ? parseInt(args[limitIdx + 1]) : Infinity;

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// Cargar todos los episodios con ivooxLink
const episodes = [];
for (let i = 0; i <= 6; i++) {
  const file = `data/episodes-${i}.json`;
  if (!fs.existsSync(file)) continue;
  const batch = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const ep of batch) {
    if (ep.ivooxLink) episodes.push(ep);
  }
}

console.log(`Total episodios con iVoox: ${episodes.length}`);

// Extraer ID de iVoox desde la URL: ...rf_XXXXXXX_1.html
function ivooxId(url) {
  const m = url.match(/_rf_(\d+)_/);
  return m ? m[1] : null;
}

// Extraer transcripción del HTML de la página de iVoox
// La transcripción está en el __NUXT__ data como texto plano
function extractTranscript(html) {
  // Buscar el patrón: duración,"texto transcripción","ACTIVE"
  const match = html.match(/\d+,"((?:[^"\\]|\\.)*)","ACTIVE"/);
  if (!match) return null;
  // Decodificar secuencias de escape unicode
  try {
    return JSON.parse(`"${match[1]}"`);
  } catch {
    return match[1];
  }
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  locale: "es-ES",
});

let done = 0, skipped = 0, failed = 0;
const total = Math.min(episodes.length, LIMIT);

for (let i = 0; i < total; i++) {
  const ep = episodes[i];
  const id = ivooxId(ep.ivooxLink);
  if (!id) { failed++; continue; }

  const outFile = path.join(OUT_DIR, `${id}.txt`);
  if (fs.existsSync(outFile)) { skipped++; continue; }

  const page = await context.newPage();
  try {
    await page.goto(ep.ivooxLink, { waitUntil: "domcontentloaded", timeout: 20000 });

    const html = await page.content();
    const transcript = extractTranscript(html);

    if (transcript && transcript.length > 100) {
      fs.writeFileSync(outFile, transcript, "utf8");
      done++;
      const pct = Math.round(((i + 1) / total) * 100);
      console.log(`[${pct}%] ${done} ok, ${skipped} skip, ${failed} fail — ${ep.slug?.slice(0, 60)}`);
    } else {
      failed++;
      console.log(`[sin transcript] ${ep.slug?.slice(0, 60)}`);
    }
  } catch (err) {
    failed++;
    console.log(`[error] ${ep.slug?.slice(0, 50)} — ${err.message.slice(0, 80)}`);
  } finally {
    await page.close();
  }

  if (i < total - 1) await new Promise(r => setTimeout(r, PAUSE_MS));
}

await browser.close();
console.log(`\nFin: ${done} descargadas, ${skipped} ya existían, ${failed} sin transcript`);
