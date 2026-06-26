import { chromium } from "playwright";
import fs from "fs";

const URL = "https://music.amazon.es/podcasts/5778f981-68a5-405e-aa21-b7ef2c972412/bienvenido-a-los-90";
const MAX_SCROLLS = 200;
const STALL_LIMIT = 6;

function findEpisodeRows(obj, results) {
  if (Array.isArray(obj)) {
    obj.forEach((o) => findEpisodeRows(o, results));
    return;
  }
  if (obj && typeof obj === "object") {
    if (obj.interface === "Web.TemplatesInterface.v1_0.Touch.WidgetsInterface.EpisodeRowItemElement") {
      results.push({ title: obj.primaryText, deeplink: obj.primaryLink?.deeplink });
    }
    Object.values(obj).forEach((v) => findEpisodeRows(v, results));
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  });

  const byDeeplink = new Map();

  page.on("response", async (res) => {
    const url = res.url();
    if (!url.includes("/ZAZ/api/podcast/browse/visual")) return;
    try {
      const data = await res.json();
      const methods = data.methods || [];
      methods.forEach((m) => {
        if (typeof m.content !== "string") return;
        let inner;
        try {
          inner = JSON.parse(m.content);
        } catch {
          return;
        }
        const found = [];
        findEpisodeRows(inner, found);
        found.forEach((ep) => {
          if (ep.deeplink && ep.title) byDeeplink.set(ep.deeplink, ep.title);
        });
      });
    } catch {
      // respuesta no JSON o ya consumida, ignorar
    }
  });

  console.log("Cargando página...");
  await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(3000);

  let lastCount = byDeeplink.size;
  let stall = 0;
  for (let i = 0; i < MAX_SCROLLS; i++) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1500);

    const count = byDeeplink.size;
    console.log(`scroll ${i + 1}: ${count} episodios acumulados`);

    if (count === lastCount) {
      stall++;
      if (stall >= STALL_LIMIT) {
        console.log("Sin crecimiento tras varios scrolls, fin de la carga.");
        break;
      }
    } else {
      stall = 0;
    }
    lastCount = count;
  }

  const results = [...byDeeplink.entries()].map(([deeplink, title]) => ({ title, deeplink }));
  fs.writeFileSync("amazon-episodes.json", JSON.stringify(results, null, 2), "utf-8");
  console.log(`Guardados ${results.length} episodios de Amazon Music en amazon-episodes.json`);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
