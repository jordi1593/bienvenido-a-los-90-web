import fs from "fs";

function numFromTitle(title) {
  let m = title.match(/^(\d+)\s*-/);
  if (m) return parseInt(m[1], 10);
  m = title.match(/^P\.?\s*(\d+)\b/i);
  if (m) return parseInt(m[1], 10);
  m = title.match(/^Programa\s*#?\s*(\d+)/i);
  if (m) return parseInt(m[1], 10);
  m = title.match(/Programa\s*#?\s*(\d+)/i);
  if (m) return parseInt(m[1], 10);
  m = title.match(/^B90\s*Supernova\s*(\d+)/i);
  if (m) return `supernova-${m[1]}`;
  m = title.match(/^B90\s*Classic\s*(\d+)/i);
  if (m) return `classic-${m[1]}`;
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
// por desajustes de numeración entre el blog y Spotify), comparamos por
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
  const spotifyEpisodes = JSON.parse(fs.readFileSync("spotify-episodes.json", "utf-8"));

  const byNumber = new Map();
  const byNormTitle = new Map();
  spotifyEpisodes.forEach((s) => {
    const num = numFromTitle(s.title);
    if (num !== null && !byNumber.has(num)) byNumber.set(num, s);
    const key = normalize(s.title);
    if (!byNormTitle.has(key)) byNormTitle.set(key, s);
  });

  const usedUrls = new Set();
  let matchedByNumber = 0;
  let matchedByTitle = 0;
  const unmatched = [];

  episodes.forEach((ep) => {
    let match = null;
    const epNum = ep.number !== null ? ep.number : numFromTitle(ep.title);
    if (epNum !== null && byNumber.has(epNum)) {
      match = byNumber.get(epNum);
      matchedByNumber++;
    } else {
      const key = normalize(ep.title);
      if (byNormTitle.has(key)) {
        match = byNormTitle.get(key);
        matchedByTitle++;
      }
    }
    if (match) {
      ep.spotifyLink = match.url;
      usedUrls.add(match.url);
    } else {
      unmatched.push(ep);
    }
  });

  // Último recurso: solapamiento de palabras significativas, exigiendo un
  // parecido alto para evitar falsos positivos.
  let matchedByOverlap = 0;
  unmatched.forEach((ep) => {
    let best = null;
    let bestScore = 0;
    spotifyEpisodes.forEach((s) => {
      if (usedUrls.has(s.url)) return;
      const score = wordOverlapScore(ep.title, s.title);
      if (score > bestScore) {
        bestScore = score;
        best = s;
      }
    });
    if (best && bestScore >= 0.8) {
      ep.spotifyLink = best.url;
      usedUrls.add(best.url);
      matchedByOverlap++;
    }
  });

  fs.writeFileSync("episodes.json", JSON.stringify(episodes, null, 2), "utf-8");
  const total = matchedByNumber + matchedByTitle + matchedByOverlap;
  console.log(`Coincidencias por número: ${matchedByNumber}`);
  console.log(`Coincidencias por título exacto: ${matchedByTitle}`);
  console.log(`Coincidencias por solapamiento de palabras: ${matchedByOverlap}`);
  console.log(`Total con spotifyLink: ${total}/${episodes.length}`);
}

main();
