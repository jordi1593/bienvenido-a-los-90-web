import sharp from "sharp";
import fs from "fs";
import path from "path";

const DIR = "fotos";
const MAX_PX = 1000;
const QUALITY = 82;

const files = fs.readdirSync(DIR).filter(f => /\.(jpg|jpeg|png)$/i.test(f));

let totalBefore = 0, totalAfter = 0;

for (const file of files) {
  const filePath = path.join(DIR, file);
  const ext = path.extname(file).toLowerCase();
  const before = fs.statSync(filePath).size;
  totalBefore += before;

  const tmp = filePath + "_opt.tmp";
  const img = sharp(filePath).rotate();
  const meta = await img.metadata();
  const needsResize = meta.width > MAX_PX || meta.height > MAX_PX;

  let pipeline = sharp(filePath).rotate();
  if (needsResize) {
    pipeline = pipeline.resize(MAX_PX, MAX_PX, { fit: "inside", withoutEnlargement: true });
  }

  if (ext === ".webp") {
    await pipeline.webp({ quality: QUALITY }).toFile(tmp);
  } else if (ext === ".png") {
    await pipeline.png({ compressionLevel: 9 }).toFile(tmp);
  } else {
    await pipeline.jpeg({ quality: QUALITY, mozjpeg: true }).toFile(tmp);
  }

  const after = fs.statSync(tmp).size;

  if (after < before) {
    fs.unlinkSync(filePath);
    fs.renameSync(tmp, filePath);
    totalAfter += after;
    const pct = Math.round((1 - after / before) * 100);
    const dim = needsResize ? ` ${meta.width}x${meta.height}→${MAX_PX}px` : "";
    console.log(`-${pct}%  ${file}${dim}  (${Math.round(before/1024)}KB → ${Math.round(after/1024)}KB)`);
  } else {
    fs.unlinkSync(tmp);
    totalAfter += before;
    console.log(`skip  ${file}  (ya optimizado, ${Math.round(before/1024)}KB)`);
  }
}

const total_pct = Math.round((1 - totalAfter / totalBefore) * 100);
console.log(`\nTotal: ${Math.round(totalBefore/1024)}KB → ${Math.round(totalAfter/1024)}KB (-${total_pct}%)`);
