import fs from "fs";

function numFromTitle(title) {
  let m = title.match(/^(\d+)\s*-/);
  if (m) return parseInt(m[1], 10);
  m = title.match(/^Programa\s+(\d+)/i);
  if (m) return parseInt(m[1], 10);
  return null;
}

function normalize(str) {
  return str
    .replace(/\s*-\s*Episodio exclusivo para mecenas\s*$/i, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function wordOverlapScore(a, b) {
  const wordsA = new Set(normalize(a).split(" ").filter((w) => w.length > 3));
  const wordsB = new Set(normalize(b).split(" ").filter((w) => w.length > 3));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  const overlap = [...wordsA].filter((w) => wordsB.has(w)).length;
  return overlap / Math.min(wordsA.size, wordsB.size);
}

function main() {
  const episodes = JSON.parse(fs.readFileSync("episodes.json", "utf-8"));
  const ivooxTitles = JSON.parse(fs.readFileSync("ivoox-titles.json", "utf-8"));

  const usedIds = new Set();
  // IDs ya usados por episodios que tienen ivooxLink desde el blog original
  episodes.forEach((ep) => {
    const link = ep.ivooxLink || ep.downloadLink;
    if (link) {
      const m = link.match(/rf[_/](\d+)/);
      if (m) usedIds.add(m[1]);
    }
  });

  const byNumber = new Map();
  const byNormTitle = new Map();
  ivooxTitles.forEach((t) => {
    const num = numFromTitle(t.title);
    if (num !== null && !byNumber.has(num)) byNumber.set(num, t);
    const key = normalize(t.title);
    if (!byNormTitle.has(key)) byNormTitle.set(key, t);
  });

  const unmatched = episodes.filter((ep) => !ep.ivooxLink);

  let matchedByNumber = 0;
  let matchedByTitle = 0;
  const stillUnmatched = [];

  unmatched.forEach((ep) => {
    let match = null;
    if (ep.number !== null && byNumber.has(ep.number) && !usedIds.has(byNumber.get(ep.number).id)) {
      match = byNumber.get(ep.number);
      matchedByNumber++;
    } else {
      const key = normalize(ep.title);
      const cand = byNormTitle.get(key);
      if (cand && !usedIds.has(cand.id)) {
        match = cand;
        matchedByTitle++;
      }
    }
    if (match) {
      ep.ivooxLink = `https://www.ivoox.com/rf/${match.id}`;
      usedIds.add(match.id);
    } else {
      stillUnmatched.push(ep);
    }
  });

  let matchedByOverlap = 0;
  stillUnmatched.forEach((ep) => {
    let best = null;
    let bestScore = 0;
    ivooxTitles.forEach((t) => {
      if (usedIds.has(t.id)) return;
      const score = wordOverlapScore(ep.title, t.title);
      if (score > bestScore) {
        bestScore = score;
        best = t;
      }
    });
    if (best && bestScore >= 0.8) {
      ep.ivooxLink = `https://www.ivoox.com/rf/${best.id}`;
      usedIds.add(best.id);
      matchedByOverlap++;
    }
  });

  fs.writeFileSync("episodes.json", JSON.stringify(episodes, null, 2), "utf-8");
  const total = matchedByNumber + matchedByTitle + matchedByOverlap;
  console.log(`Coincidencias nuevas por número: ${matchedByNumber}`);
  console.log(`Coincidencias nuevas por título exacto: ${matchedByTitle}`);
  console.log(`Coincidencias nuevas por solapamiento: ${matchedByOverlap}`);
  console.log(`Total nuevas: ${total}/${unmatched.length} pendientes`);
  console.log(`Total con ivooxLink ahora: ${episodes.filter((e) => e.ivooxLink).length}/${episodes.length}`);
}

main();
