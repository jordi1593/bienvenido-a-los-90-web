import sharp from "sharp";
import { readdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import { join, extname, basename } from "path";
import { readFile, writeFile } from "fs/promises";

const FOTOS_DIR = "./fotos";
const QUALITY = 82;

const files = await readdir(FOTOS_DIR);
const images = files.filter((f) => /\.(jpg|jpeg|png)$/i.test(f));

let converted = 0;
for (const file of images) {
  const src = join(FOTOS_DIR, file);
  const dest = join(FOTOS_DIR, basename(file, extname(file)) + ".webp");
  if (existsSync(dest)) {
    console.log(`  skip (ya existe): ${dest}`);
    continue;
  }
  await sharp(src).webp({ quality: QUALITY }).toFile(dest);
  console.log(`  ✓ ${file} → ${basename(dest)}`);
  converted++;
}

console.log(`\nConvertidas: ${converted} imágenes`);

// Actualizar photos.json
const json = JSON.parse(await readFile("./photos.json", "utf8"));
let updated = 0;
for (const photo of json) {
  if (/\.(jpg|jpeg|png)$/i.test(photo.image)) {
    const webp = photo.image.replace(/\.(jpg|jpeg|png)$/i, ".webp");
    const webpPath = "./" + webp;
    if (existsSync(webpPath)) {
      photo.image = webp;
      updated++;
    }
  }
}
await writeFile("./photos.json", JSON.stringify(json, null, 2));
console.log(`photos.json actualizado: ${updated} entradas`);
