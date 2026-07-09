// Extrae el color dominante de la portada de cada episodio y lo guarda en
// data/episode-colors.json como { slug: [r, g, b] }.
// Uso: node extract-colors.mjs
// Añade --force para rere-extraer episodios ya procesados.

import fs from "fs";
import https from "https";
import http from "http";
import path from "path";
import sharp from "sharp";

const DATA_DIR = "data";
const OUT_FILE = path.join(DATA_DIR, "episode-colors.json");
const FORCE = process.argv.includes("--force");

// Descarga una URL a un Buffer
function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    mod.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchBuffer(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

// Sustituye el parámetro de tamaño del CDN de Blogger por /s120-c/ (pequeño y cuadrado).
function thumbSmall(thumb) {
  if (!thumb) return null;
  return thumb.replace(/\/s\d+(-c)?\//i, "/s120-c/");
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}

function hslToRgb(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  return [hue2rgb(p, q, h + 1/3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1/3)].map(v => Math.round(v * 255));
}

// Extrae el color más característico de un Buffer de imagen y lo ajusta para
// que sea usable como acento web (saturación y luminosidad mínimas garantizadas).
async function dominantColor(buf) {
  const { data, info } = await sharp(buf)
    .resize(128, 128, { fit: "cover" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const buckets = new Map();
  const px = info.width * info.height;

  for (let i = 0; i < px * 3; i += 3) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    if (brightness < 15 || brightness > 240) continue; // negro puro y blanco
    if (sat < 0.12) continue;                           // grises neutros

    // Cuantiza a cubos de 24 para agrupar colores similares
    const qr = Math.round(r / 24) * 24;
    const qg = Math.round(g / 24) * 24;
    const qb = Math.round(b / 24) * 24;
    const key = `${qr},${qg},${qb}`;
    const entry = buckets.get(key) || { count: 0, r: 0, g: 0, b: 0 };
    entry.count++;
    entry.r += r; entry.g += g; entry.b += b;
    buckets.set(key, entry);
  }

  if (!buckets.size) return [150, 30, 60]; // fallback al acento original

  // Elige el cubo con mayor score: frecuencia × saturación²
  let best = null, bestScore = -1;
  for (const e of buckets.values()) {
    const ar = Math.round(e.r / e.count);
    const ag = Math.round(e.g / e.count);
    const ab = Math.round(e.b / e.count);
    const max = Math.max(ar, ag, ab), min = Math.min(ar, ag, ab);
    const sat = max === 0 ? 0 : (max - min) / max;
    const score = e.count * Math.pow(sat, 2);
    if (score > bestScore) { bestScore = score; best = [ar, ag, ab]; }
  }

  // Convierte a HSL y garantiza que sea usable como acento:
  // mínimo 50% de saturación y entre 35–55% de luminosidad.
  const [h, s, l] = rgbToHsl(...best);
  const finalS = Math.max(s, 50);
  const finalL = Math.min(Math.max(l, 35), 55);
  return hslToRgb(h, finalS, finalL);
}

// Carga todos los episodios de los ficheros data/episodes-*.json
function loadAllEpisodes() {
  const files = fs.readdirSync(DATA_DIR).filter(f => /^episodes-\d+\.json$/.test(f));
  const all = [];
  for (const f of files) {
    const raw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), "utf8"));
    all.push(...Object.values(raw));
  }
  return all;
}

async function main() {
  const existing = fs.existsSync(OUT_FILE)
    ? JSON.parse(fs.readFileSync(OUT_FILE, "utf8"))
    : {};

  const episodes = loadAllEpisodes().filter(ep => ep.thumbnail);
  const toProcess = FORCE
    ? episodes
    : episodes.filter(ep => !existing[ep.slug]);

  console.log(`Total episodios con portada: ${episodes.length}`);
  console.log(`Por procesar: ${toProcess.length}${FORCE ? " (--force)" : " (nuevos)"}`);

  let done = 0, errors = 0;
  const CONCURRENCY = 8;

  async function processEp(ep) {
    try {
      const url = thumbSmall(ep.thumbnail);
      const buf = await fetchBuffer(url);
      const color = await dominantColor(buf);
      existing[ep.slug] = color;
      done++;
      if (done % 50 === 0 || done === toProcess.length) {
        process.stdout.write(`\r  ${done}/${toProcess.length} (${errors} errores)`);
        fs.writeFileSync(OUT_FILE, JSON.stringify(existing, null, 2));
      }
    } catch (e) {
      errors++;
    }
  }

  // Procesa en lotes de CONCURRENCY en paralelo
  for (let i = 0; i < toProcess.length; i += CONCURRENCY) {
    await Promise.all(toProcess.slice(i, i + CONCURRENCY).map(processEp));
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(existing, null, 2));
  console.log(`\nGuardado en ${OUT_FILE}. OK: ${done}, errores: ${errors}`);
}

main().catch(err => { console.error(err); process.exit(1); });
