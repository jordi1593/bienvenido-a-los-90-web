import { chromium } from "playwright";
import fs from "fs";

const URL = "https://open.spotify.com/show/5c1ikDBBLMlls8ZTvcu14N";
const SHOW_URI = "spotify:show:5c1ikDBBLMlls8ZTvcu14N";
const PERSISTED_QUERY_HASH = "06046f9b939d56c8eb7cdbb687da938de1164c006871aec91dc26e4dc7d8eb08";
const PAGE_LIMIT = 50;

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  });

  let capturedHeaders = null;
  page.on("request", (req) => {
    if (!capturedHeaders && req.url().includes("api-partner.spotify.com/pathfinder")) {
      capturedHeaders = req.headers();
    }
  });

  console.log("Cargando página para obtener token de autorización...");
  await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(3000);

  if (!capturedHeaders) throw new Error("No se capturó ninguna petición a api-partner");

  // Paginamos directamente contra el endpoint GraphQL reutilizando el
  // token anónimo capturado, en vez de depender del scroll del DOM.
  const results = await page.evaluate(
    async ({ headers, showUri, hash, limit }) => {
      const all = [];
      let offset = 0;
      let totalCount = Infinity;
      while (offset < totalCount) {
        const body = JSON.stringify({
          variables: { uri: showUri, offset, limit, includeEpisodeContentRatingsV2: true },
          operationName: "queryPodcastEpisodes",
          extensions: { persistedQuery: { version: 1, sha256Hash: hash } },
        });
        const res = await fetch("https://api-partner.spotify.com/pathfinder/v2/query", {
          method: "POST",
          headers: {
            authorization: headers.authorization,
            "client-token": headers["client-token"],
            "content-type": "application/json;charset=UTF-8",
            accept: "application/json",
          },
          body,
        });
        if (!res.ok) {
          all.push({ error: `HTTP ${res.status} en offset ${offset}` });
          break;
        }
        const data = await res.json();
        const ep = data?.data?.podcastUnionV2?.episodesV2;
        if (!ep) {
          all.push({ error: `Sin episodesV2 en offset ${offset}: ${JSON.stringify(data).slice(0, 300)}` });
          break;
        }
        totalCount = ep.totalCount;
        ep.items.forEach((item) => {
          const d = item.entity?.data;
          if (d?.name && d?.sharingInfo?.shareUrl) {
            all.push({ title: d.name, url: d.sharingInfo.shareUrl });
          }
        });
        offset += limit;
        await new Promise((r) => setTimeout(r, 300));
      }
      return all;
    },
    { headers: capturedHeaders, showUri: SHOW_URI, hash: PERSISTED_QUERY_HASH, limit: PAGE_LIMIT }
  );

  const errors = results.filter((r) => r.error);
  const episodes = results.filter((r) => !r.error);

  if (errors.length) console.log("Errores:", errors);

  const byUrl = new Map();
  episodes.forEach((e) => byUrl.set(e.url, e.title));
  const unique = [...byUrl.entries()].map(([url, title]) => ({ title, url }));

  fs.writeFileSync("spotify-episodes.json", JSON.stringify(unique, null, 2), "utf-8");
  console.log(`Guardados ${unique.length} episodios de Spotify en spotify-episodes.json`);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
