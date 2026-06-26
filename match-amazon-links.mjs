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

// Para los casos donde ni el número ni el título exacto coinciden (p.ej.
// por desajustes de numeración entre el blog y Amazon), comparamos por
// solapamiento de palabras significativas como último recurso.
function wordOverlapScore(a, b) {
  const wordsA = new Set(normalize(a).split(" ").filter((w) => w.length > 3));
  const wordsB = new Set(normalize(b).split(" ").filter((w) => w.length > 3));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  const overlap = [...wordsA].filter((w) => wordsB.has(w)).length;
  return overlap / Math.min(wordsA.size, wordsB.size);
}

function main() {
  const episodes = JSON.parse(fs.readFileSync("episodes.json", "utf-8"));
  const amazonEpisodes = JSON.parse(fs.readFileSync("amazon-episodes.json", "utf-8"));

  const byNumber = new Map();
  const byNormTitle = new Map();
  amazonEpisodes.forEach((a) => {
    const num = numFromTitle(a.title);
    if (num !== null && !byNumber.has(num)) byNumber.set(num, a);
    const key = normalize(a.title);
    if (!byNormTitle.has(key)) byNormTitle.set(key, a);
  });

  const usedDeeplinks = new Set();
  let matchedByNumber = 0;
  let matchedByTitle = 0;
  const unmatched = [];

  episodes.forEach((ep) => {
    let match = null;
    if (ep.number !== null && byNumber.has(ep.number)) {
      match = byNumber.get(ep.number);
      matchedByNumber++;
    } else {
      const key = normalize(ep.title);
      if (byNormTitle.has(key)) {
        match = byNormTitle.get(key);
        matchedByTitle++;
      }
    }
    if (match) {
      ep.amazonLink = `https://music.amazon.es${match.deeplink}`;
      usedDeeplinks.add(match.deeplink);
    } else {
      unmatched.push(ep);
    }
  });

  let matchedByOverlap = 0;
  unmatched.forEach((ep) => {
    let best = null;
    let bestScore = 0;
    amazonEpisodes.forEach((a) => {
      if (usedDeeplinks.has(a.deeplink)) return;
      const score = wordOverlapScore(ep.title, a.title);
      if (score > bestScore) {
        bestScore = score;
        best = a;
      }
    });
    if (best && bestScore >= 0.8) {
      ep.amazonLink = `https://music.amazon.es${best.deeplink}`;
      usedDeeplinks.add(best.deeplink);
      matchedByOverlap++;
    }
  });

  fs.writeFileSync("episodes.json", JSON.stringify(episodes, null, 2), "utf-8");
  const total = matchedByNumber + matchedByTitle + matchedByOverlap;
  console.log(`Coincidencias por número: ${matchedByNumber}`);
  console.log(`Coincidencias por título exacto: ${matchedByTitle}`);
  console.log(`Coincidencias por solapamiento de palabras: ${matchedByOverlap}`);
  console.log(`Total con amazonLink: ${total}/${episodes.length}`);
}

main();
