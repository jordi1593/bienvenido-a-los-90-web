const PAGE_SIZE = () => window.innerWidth <= 720 ? 6 : 21;

const PLATFORM_SHOW_LINKS = {
  spotify: "https://open.spotify.com/show/5c1ikDBBLMlls8ZTvcu14N",
  apple: "https://podcasts.apple.com/es/podcast/bienvenido-a-los-90/id1369150482",
  amazon: "https://music.amazon.es/podcasts/5778f981-68a5-405e-aa21-b7ef2c972412/bienvenido-a-los-90?refMarker=null",
};

const PLATFORM_ICONS = {
  ivoox: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 13v-1a7 7 0 0 1 14 0v1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><rect x="3.2" y="13" width="4" height="6" rx="1.6" fill="currentColor"/><rect x="16.8" y="13" width="4" height="6" rx="1.6" fill="currentColor"/></svg>',
  apple: '<svg viewBox="0 0 814 1000" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/></svg>',
  spotify: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9.2" stroke="currentColor" stroke-width="1.6"/><path d="M7 10.5c3.2-1 7-.7 9.7 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M7.6 13.3c2.6-.8 5.6-.6 7.8.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M8.3 16c2-.6 4.3-.5 6 .5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  amazon: '<svg viewBox="2.167 .438 251.038 259.969" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="m221.503 210.324c-105.235 50.083-170.545 8.18-212.352-17.271-2.587-1.604-6.984.375-3.169 4.757 13.928 16.888 59.573 57.593 119.153 57.593 59.621 0 95.09-32.532 99.527-38.207 4.407-5.627 1.294-8.731-3.16-6.872zm29.555-16.322c-2.826-3.68-17.184-4.366-26.22-3.256-9.05 1.078-22.634 6.609-21.453 9.93.606 1.244 1.843.686 8.06.127 6.234-.622 23.698-2.826 27.337 1.931 3.656 4.79-5.57 27.608-7.255 31.288-1.628 3.68.622 4.629 3.68 2.178 3.016-2.45 8.476-8.795 12.14-17.774 3.639-9.028 5.858-21.622 3.71-24.424z"/><path d="m150.744 108.13c0 13.141.332 24.1-6.31 35.77-5.361 9.489-13.853 15.324-23.341 15.324-12.952 0-20.495-9.868-20.495-24.432 0-28.75 25.76-33.968 50.146-33.968zm34.015 82.216c-2.23 1.992-5.456 2.135-7.97.806-11.196-9.298-13.189-13.615-19.356-22.487-18.502 18.882-31.596 24.527-55.601 24.527-28.37 0-50.478-17.506-50.478-52.565 0-27.373 14.85-46.018 35.96-55.126 18.313-8.066 43.884-9.489 63.43-11.718v-4.365c0-8.018.616-17.506-4.08-24.432-4.128-6.215-12.003-8.777-18.93-8.777-12.856 0-24.337 6.594-27.136 20.257-.57 3.037-2.799 6.026-5.835 6.168l-32.735-3.51c-2.751-.618-5.787-2.847-5.028-7.07 7.543-39.66 43.36-51.616 75.43-51.616 16.415 0 37.858 4.365 50.81 16.795 16.415 15.323 14.849 35.77 14.849 58.02v52.565c0 15.798 6.547 22.724 12.714 31.264 2.182 3.036 2.657 6.69-.095 8.966-6.879 5.74-19.119 16.415-25.855 22.393l-.095-.095"/></svg>',
  youtube: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2.5" y="6" width="19" height="12" rx="3" stroke="currentColor" stroke-width="1.6"/><path d="M10.5 9.5l5 2.5-5 2.5z" fill="currentColor"/></svg>',
};

function platformLinks(ep) {
  const links = [];
  const ivoox = ep.ivooxLink || ep.downloadLink;
  if (ivoox) links.push({ label: "iVoox", url: ivoox, exact: true, icon: "ivoox" });
  links.push({ label: "Spotify", url: ep.spotifyLink || PLATFORM_SHOW_LINKS.spotify, exact: !!ep.spotifyLink, icon: "spotify" });
  links.push({ label: "Apple Podcasts", url: ep.appleLink || PLATFORM_SHOW_LINKS.apple, exact: !!ep.appleLink, icon: "apple" });
  links.push({ label: "Amazon Music", url: ep.amazonLink || PLATFORM_SHOW_LINKS.amazon, exact: !!ep.amazonLink, icon: "amazon" });
  const youtubeLinks = Array.isArray(ep.youtubeLink) ? ep.youtubeLink : ep.youtubeLink ? [ep.youtubeLink] : [];
  youtubeLinks.forEach((url, i) => {
    links.push({ label: youtubeLinks.length > 1 ? `YouTube ${i + 1}` : "YouTube", url, exact: true, icon: "youtube" });
  });
  return links;
}

const state = {
  all: [],
  filtered: [],
  shown: 0,
  search: "",
  labels: new Set(),
  specialFilters: new Map(),
  fullyLoaded: false,
};

const els = {
  list: document.getElementById("episodeList"),
  search: document.getElementById("search"),
  labelFilter: document.getElementById("labelFilter"),
  quickTags: document.getElementById("quickTags"),
  resultCount: document.getElementById("resultCount"),
  clearFilters: document.getElementById("clearFilters"),
  searchClearBtn: document.getElementById("searchClearBtn"),
  loadMore: document.getElementById("loadMore"),
  loadMoreWrap: document.getElementById("loadMoreWrap"),
};

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function highlightMatch(escapedText, query) {
  if (!query) return escapedText;
  const htmlEscapedQuery = escapeHtml(query);
  const regexSource = htmlEscapedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return escapedText.replace(new RegExp(regexSource, "gi"), (m) => `<mark class="search-highlight">${m}</mark>`);
}

function thumbAtSize(thumb, size) {
  return thumb.replace(/\/s\d+(-c)?\//i, `/s${size}/`);
}

function ivooxAudioUrl(ep) {
  const link = ep.ivooxLink || ep.downloadLink || "";
  const m = link.match(/rf[_/](\d+)/) || link.match(/ivoox\.com\/(\d+)$/);
  return m ? `https://go.ivoox.com/rf/${m[1]}` : null;
}

function wrapEpNum(html) {
  return html.replace(/^(\d+\s*[-–]\s*)/, '<span class="ep-num">$1</span>');
}

function episodeCardHtml(ep) {
  const pageUrl = `episodios/${ep.slug}.html`;
  const query = state.search.trim();
  const thumb = ep.thumbnail ? ep.thumbnail.replace("/s72-c/", "/s320/") : "";
  const audioUrl = ivooxAudioUrl(ep);
  const coverImg = thumb
    ? `<img class="episode-cover-img" src="${thumb}"
        srcset="${thumbAtSize(thumb,160)} 160w, ${thumbAtSize(thumb,320)} 320w, ${thumbAtSize(thumb,480)} 480w"
        sizes="(max-width:480px) calc(50vw - 1rem), (max-width:880px) calc(50vw - 2rem), calc((100vw - 300px - 6rem) / 3)"
        alt="" loading="lazy" width="320" height="320" />`
    : `<div class="episode-cover-img"></div>`;

  const playBtn = audioUrl
    ? `<button class="ep-play-btn" aria-label="Reproducir ${escapeHtml(ep.title)}"
        data-audio="${audioUrl}"
        data-title="${escapeHtml(ep.title)}"
        data-meta="${escapeHtml(formatDate(ep.published))}">
        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" aria-hidden="true"><path d="M8 5.5l11 6.5-11 6.5z"/></svg>
      </button>`
    : "";

  return `
    <article class="episode-card">
      <a class="episode-cover-link" href="${pageUrl}">
        ${coverImg}
        <span class="episode-cover-overlay"></span>
        ${playBtn}
      </a>
      <div class="episode-body">
        <h2><a href="${pageUrl}">${wrapEpNum(highlightMatch(escapeHtml(ep.title), query))}</a></h2>
        <div class="episode-meta">${formatDate(ep.published)}${typeof ep.comments === "number" ? ` · ${ep.comments} comentario${ep.comments === 1 ? "" : "s"}` : ""}</div>
        ${typeof ep.likes === "number" ? `<div class="episode-likes"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 20.5s-7.5-4.6-9.8-9.2C.5 7.8 2.3 4.5 5.8 4c2.1-.3 4.1.7 6.2 3 2.1-2.3 4.1-3.3 6.2-3 3.5.5 5.3 3.8 3.6 7.3-2.3 4.6-9.8 9.2-9.8 9.2z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg> ${ep.likes}</div>` : ""}
        <div class="platform-links">
          ${platformLinks(ep).map((p) => `<a class="icon-${p.icon}" href="${p.url}" target="_blank" rel="noopener" title="${p.label}" aria-label="${p.label}">${PLATFORM_ICONS[p.icon]}</a>`).join("")}
        </div>
      </div>
    </article>
  `;
}

const SHOW_NAME_LABEL_VARIANTS = new Set([
  "bienvenido a lo 90",
  "bienvenido a los 90",
  "bienvenido  a los 90",
  "bienvenidoalos90",
  "bienvenidoalo 90",
]);

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function titleCase(str) {
  return str.split(" ").map((word) => (word ? capitalize(word) : word)).join(" ");
}

const LABEL_ALIASES = {
  "paul mccartney": "Paul McCartney",
  "mccartney": "Paul McCartney",
  "mike mccready": "Mike McCready",
  "pj harvey": "PJ Harvey",
  "polly jena harvey": "PJ Harvey",
  "acdc": "AC/DC",
  "thebeatles": "The Beatles",
  "nin": "Nine Inch Nails",
};

function normalizeLabel(label) {
  const key = label.trim().toLowerCase().replace(/\s+/g, " ");
  if (SHOW_NAME_LABEL_VARIANTS.has(key)) return "Bienvenido a los 90";
  if (LABEL_ALIASES[key]) return LABEL_ALIASES[key];
  return titleCase(label);
}

function getSupernovaSlugs(episodes) {
  return new Set(
    episodes.filter((ep) => /b90 classic|b90 supernova/i.test(ep.title)).map((ep) => ep.slug)
  );
}

// Episodios del maratón "Especial 1994" listado en
// https://www.ivoox.com/maraton-radiofonico-1994_bk_list_11032898_1.html
const MARATON_1994_SLUGS = new Set([
  "1021-especial-1994-12-the-beatles-the-stone-roses-bush-pearl-jam",
  "1020-especial-1994-11-the-black-crowes-nirvana-tom-petty-woodstock-94",
  "1019-especial-1994-10-the-cranberries-the-smashing-pumpkins-suede-the-cult-korn-jamir",
  "p-1018-especial-1994-parte-9-rem-radiohead-veruca-salt-pulp-fiction-grant-lee-bu",
  "p-1017-especial-1994-parte-8-oasis-portishead-jeff-buckley-echobelly-sebadoh-din",
  "p-1015-especial-1994-parte-7-prodigy-neil-young-l7-rolling-stones-marilyn-manson",
  "p-1013-especial-1994-parte-6-nirvana-stone-temple-pilots-massive-attack-sonic-yo",
  "p-1004-especial-1994-parte-5-johnny-cash-mark-lanegan-kyuss-bad-religion-live",
  "p-994-especial-1994-parte-4-hole-nick-cave-pulp-terrorvision-melvins-blur-panter",
  "p-987-especial-1994-parte-3-nine-inch-nails-soundgarden-offspring-the-crow",
  "p-983-especial-1994-parte-2-green-day-therapy-ben-harper-pavement-mano-negra-y-b",
  "p-981-especial-1994-parte-1-mark-lanegan-king-s-x-alice-in-chains-meat-puppets-d",
]);

// El listado de "Esenciales" se sincroniza semanalmente desde
// https://www.ivoox.com/esenciales-b90_bk_list_6192164_1.html mediante
// fetch-esenciales.mjs, que genera data/esenciales.json en cada build.
// Aquí solo guardamos el Set ya cargado (ver loadEsencialesSlugs).
let esencialesSlugs = new Set();

// Sello de tiempo único por carga de página: se añade como parámetro a las
// peticiones de data/*.json para que el navegador siempre pida la versión
// actual en vez de servir una copia en caché desde una visita anterior.
const META_CACHE_BUST = Math.floor(Date.now() / 86400000);

async function loadEsencialesSlugs() {
  try {
    const slugs = await (await fetch(`data/esenciales.json?t=${META_CACHE_BUST}`)).json();
    esencialesSlugs = new Set(slugs);
  } catch {
    esencialesSlugs = new Set();
  }
  if (state.specialFilters.has("__esenciales__")) applyFilters();
}

// Episodios del maratón "Especial 1995" listado en
// https://www.ivoox.com/especial-1995_bk_list_11365213_1.html
const MARATON_1995_SLUGS = new Set([
  "1095-especial-1995-5-5-rocket-from-the-crypt-alice-in-chains-pulp-queen-sunny-day-rea",
  "1093-especial-1995-4-5-ramones-garbage-blind-melon-rancid-oasis-no-doubt",
  "1091-especial-1995-3-5-smashing-pumpkins-primus-bjork-alanis-morissette-foo-fighters-",
  "1088-especial-1995-2-5-monster-magnet-morphine-silverchair-wilco-faith-no-more-chris-",
  "1086-especial-1995-1-5-radiohead-pj-harvey-mad-season-the-jayhawks-tricky",
]);

// Episodios relacionados con los discos homenaje de
// https://bienvenidoalos90.bandcamp.com/music
const DISCOS_HOMENAJE_SLUGS = new Set([
  "p-814-homenaje-a-1991-el-ano-que-cambio-la-musica",
  "p-683-homenaje-a-alain-johannes",
  "1024-homenaje-a-dover",
  "b90-supernova-74-la-intrahistoria-del-homenaje-a-dover",
  "programa-528-homenaje-a-bob-dylan",
  "p-886-homenaje-a-havalina",
  "programa-431-in-utero-25",
  "p-924-homenaje-a-mark-lanegan",
  "p-714-homenaje-a-los-25-anos-del-mellon-collie-and-the-infinite-sadness",
  "programa-564-bienvenido-a-los-90-presenta-oasis",
  "bienvenido-a-los-90-presenta-una-semana-en-el-motor-de-un-autobus-homenaje-a-los",
  "los-planetas-una-semana-en-el-motor-de-un-autobus",
  "programa-312-tributo-a-john-lennon",
  "programa-287-ok-computer-revisited",
  "1089-homenaje-a-foo-fighters-1995",
]);

function topSlugsBy(episodes, key, { requireRealStats = false } = {}) {
  const candidates = requireRealStats
    ? episodes.filter((ep) => typeof ep[key] === "number" && ep.likes !== undefined && ep.likes !== null)
    : episodes.filter((ep) => typeof ep[key] === "number");
  const sorted = [...candidates].sort((a, b) => b[key] - a[key]);
  return new Set(sorted.slice(0, 20).map((ep) => ep.slug));
}

// Cada filtro especial del desplegable de etiquetas se define una sola vez
// aquí: su texto, cómo obtener sus episodios (lista curada de slugs o
// calculada a partir de los datos) y, si aplica, cómo ordenar el resultado.
const SPECIAL_FILTERS = [
  {
    value: "__top_escuchados__",
    label: "Lo más escuchado",
    pinned: true,
    getSlugs: (episodes) => topSlugsBy(episodes, "plays"),
    sort: (a, b) => b.plays - a.plays,
  },
  {
    value: "__top_comentados__",
    label: "Lo más comentado",
    pinned: true,
    // Solo episodios con estadísticas reales de iVoox (ep.likes definido);
    // el resto usa el contador de comentarios del blog, que no es comparable.
    getSlugs: (episodes) => topSlugsBy(episodes, "comments", { requireRealStats: true }),
    sort: (a, b) => b.comments - a.comments,
  },
  {
    value: "__top_valorados__",
    label: "Lo más valorado",
    pinned: true,
    getSlugs: (episodes) => topSlugsBy(episodes, "likes", { requireRealStats: true }),
    sort: (a, b) => b.likes - a.likes,
  },
  {
    value: "__esenciales__",
    label: "Esenciales",
    pinned: true,
    getSlugs: () => esencialesSlugs,
  },
  {
    value: "__videos__",
    label: "Programas con vídeo",
    pinned: true,
    getSlugs: (episodes) =>
      new Set(episodes.filter((ep) => ep.youtubeLink && (!Array.isArray(ep.youtubeLink) || ep.youtubeLink.length)).map((ep) => ep.slug)),
  },
  {
    value: "__b90_supernova__",
    label: "B90 Supernova",
    getSlugs: getSupernovaSlugs,
  },
  {
    value: "__maraton_1994__",
    label: "Maratón 1994",
    slugs: MARATON_1994_SLUGS,
  },
  {
    value: "__maraton_1995__",
    label: "Maratón 1995",
    slugs: MARATON_1995_SLUGS,
  },
  {
    value: "__discos_homenaje__",
    label: "Discos Homenaje",
    slugs: DISCOS_HOMENAJE_SLUGS,
  },
];

function renderActiveLabels() {
  const container = document.getElementById("activeLabels");
  if (!container) return;
  if (state.labels.size === 0) { container.hidden = true; container.innerHTML = ""; return; }
  container.hidden = false;
  container.innerHTML = [...state.labels].map((lbl) => {
    const sf = SPECIAL_FILTERS.find((f) => f.value === lbl);
    const name = sf ? sf.label : lbl;
    return `<button class="active-label-chip" data-label="${escapeHtml(lbl)}" type="button">${escapeHtml(name)}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="11" height="11" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg></button>`;
  }).join("");
}

function syncQuickTags() {
  if (!els.quickTags) return;
  els.quickTags.querySelectorAll(".quick-tag[data-label]").forEach((btn) => {
    const lbl = btn.dataset.label;
    btn.classList.toggle("active", lbl === "" ? state.labels.size === 0 : state.labels.has(lbl));
  });
  renderActiveLabels();
}

function termRegex(t) {
  return /^\d+$/.test(t) ? new RegExp(`\\b${t}\\b`) : null;
}

function termMatches(haystack, t) {
  const re = termRegex(t);
  return re ? re.test(haystack) : haystack.includes(t);
}

function searchScore(ep, terms) {
  if (!terms.length) return 0;
  let score = 0;
  const title = ep.title.toLowerCase();
  const labels = ep.labels.map((l) => l.toLowerCase()).join(" ");
  const summary = (ep.summary || "").toLowerCase();
  terms.forEach((t) => {
    if (termMatches(title, t)) score += 100;
    if (termMatches(labels, t)) score += 10;
    if (termMatches(summary, t)) score += 1;
  });
  return score;
}

function labelScore(ep, label) {
  const phrase = label.toLowerCase();
  const title = ep.title.toLowerCase();
  const summary = (ep.summary || "").toLowerCase();
  let score = 0;
  if (title.includes(phrase)) score += 500;
  if (summary.includes(phrase)) score += 20;
  // bonus por cada etiqueta del episodio que contenga la frase buscada
  ep.labels.forEach((l) => {
    if (l.toLowerCase().includes(phrase)) score += 50;
  });
  return score;
}

function applyFilters() {
  const terms = state.search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  state.filtered = state.all.filter((ep) => {
    const title = ep.title.toLowerCase();
    const lbls = ep.labels.map((l) => l.toLowerCase()).join(" ");
    const summary = (ep.summary || "").toLowerCase();
    const haystack = title + " " + lbls + " " + summary;
    const matchesSearch = terms.length === 0 || terms.every((t) => termMatches(haystack, t));
    const matchesLabel = state.labels.size === 0 || [...state.labels].every((lbl) => {
      const af = state.specialFilters.get(lbl);
      return af ? af.slugs.has(ep.slug) : ep.labels.some((l) => normalizeLabel(l) === lbl);
    });
    return matchesSearch && matchesLabel;
  });
  if (terms.length) {
    state.filtered.sort((a, b) => searchScore(b, terms) - searchScore(a, terms));
  } else if (state.labels.size === 1) {
    const onlyLabel = [...state.labels][0];
    const af = state.specialFilters.get(onlyLabel);
    if (af?.sort) {
      state.filtered.sort(af.sort);
    } else if (!onlyLabel.startsWith("__")) {
      state.filtered.sort((a, b) => labelScore(b, onlyLabel) - labelScore(a, onlyLabel));
    }
  }
  syncQuickTags();
  state.shown = 0;
  els.list.innerHTML = "";
  els.list.setAttribute("aria-busy", "true");
  renderNextPage();
  els.list.setAttribute("aria-busy", "false");
}

function renderNextPage() {
  const next = state.filtered.slice(state.shown, state.shown + PAGE_SIZE());
  els.list.insertAdjacentHTML("beforeend", next.map(episodeCardHtml).join(""));
  state.shown += next.length;
  els.resultCount.innerHTML = state.fullyLoaded
    ? `<strong>${state.filtered.length}</strong> episodio${state.filtered.length === 1 ? "" : "s"}`
    : "Cargando episodios…";
  const remaining = state.filtered.length - state.shown;
  if (remaining > 0) {
    els.loadMore.textContent = 'Cargar más episodios';
  }
  els.loadMoreWrap.style.display = remaining > 0 ? "block" : "none";
  els.clearFilters.hidden = !state.search && state.labels.size === 0;
}

function populateLabelFilter(episodes) {
  SPECIAL_FILTERS.filter((filter) => filter.pinned).forEach((filter) => {
    const opt = document.createElement("option");
    opt.value = filter.value;
    opt.textContent = filter.label;
    els.labelFilter.appendChild(opt);
  });

  const EXCLUDED_LABELS = new Set([
    "podcast", "podcast en español", "radio", "radio utopia", "radio utopía",
    "subterfuge radio", "madrid", "ivoox",
    "darwinians radio bike", "darwinians raido bike", "darwiniansradiobike",
    "b90 supernova", "especial", "radioutopia", "pearljam",
    "ringo starr", "seattle", "castellano", "descarga",
    "61 garage", "rufus t. firefly",
    "james iha", "jeff ament", "krist novoselic", "stone gossard",
  ]);
  // Etiquetas que se incluyen siempre en el desplegable aunque no estén
  // entre las más frecuentes, por petición explícita.
  const FORCED_LABELS = new Set([
    "sub pop", "portishead", "the breeders", "sexy sadie", "blind melon", "pasajero",
    "l7", "rage against the machine", "beck", "veruca salt",
  ]);
  const counts = new Map();
  episodes.forEach((ep) => ep.labels.forEach((l) => {
    if (EXCLUDED_LABELS.has(l.trim().toLowerCase())) return;
    const label = normalizeLabel(l);
    if (label === "Bienvenido a los 90") return;
    counts.set(label, (counts.get(label) || 0) + 1);
  }));
  const sortedLabels = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const topLabels = sortedLabels.slice(0, 50).map(([label]) => ({ value: label, label }));
  const topLabelSet = new Set(topLabels.map((l) => l.label));
  sortedLabels.forEach(([label]) => {
    if (FORCED_LABELS.has(label.trim().toLowerCase()) && !topLabelSet.has(label)) {
      topLabels.push({ value: label, label });
      topLabelSet.add(label);
    }
  });

  const unpinnedFilters = SPECIAL_FILTERS.filter((filter) => !filter.pinned)
    .map((filter) => ({ value: filter.value, label: filter.label }));

  const mixed = [...topLabels, ...unpinnedFilters].sort((a, b) =>
    a.label.localeCompare(b.label, "es")
  );
  mixed.forEach(({ value, label }) => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    els.labelFilter.appendChild(opt);
  });
}

const MONTH_NAMES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function renderArchive(episodes) {
  const container = document.getElementById("archiveTree");
  if (!container) return;

  const byYear = new Map();
  episodes.forEach((ep) => {
    const d = new Date(ep.published);
    const year = d.getFullYear();
    const month = d.getMonth();
    if (!byYear.has(year)) byYear.set(year, new Map());
    const byMonth = byYear.get(year);
    if (!byMonth.has(month)) byMonth.set(month, []);
    byMonth.get(month).push(ep);
  });

  const years = [...byYear.keys()].sort((a, b) => b - a);
  let selYear = years[0];
  let selMonth = null;

  function build() {
    container.innerHTML = "";

    const yearsRow = document.createElement("div");
    yearsRow.className = "arch-years";
    years.forEach((y) => {
      const b = document.createElement("button");
      b.className = "arch-yr" + (y === selYear ? " active" : "");
      b.textContent = y;
      b.onclick = () => { selYear = y; selMonth = null; build(); };
      yearsRow.appendChild(b);
    });
    container.appendChild(yearsRow);

    const byMonth = byYear.get(selYear);
    const monthsGrid = document.createElement("div");
    monthsGrid.className = "arch-months";
    for (let m = 0; m < 12; m++) {
      const eps = byMonth.get(m) || [];
      const b = document.createElement("button");
      b.className = "arch-mo" + (m === selMonth ? " active" : "") + (eps.length === 0 ? " empty" : "");
      b.disabled = eps.length === 0;
      b.innerHTML = `${MONTH_NAMES[m].slice(0, 3)}<span>${eps.length || "—"}</span>`;
      if (eps.length) b.onclick = () => { selMonth = m; build(); };
      monthsGrid.appendChild(b);
    }
    container.appendChild(monthsGrid);

    if (selMonth !== null) {
      const eps = (byMonth.get(selMonth) || []).sort((a, b) => new Date(b.published) - new Date(a.published));
      const list = document.createElement("ul");
      list.className = "arch-ep-list";
      eps.forEach((ep) => {
        const li = document.createElement("li");
        li.innerHTML = `<a href="episodios/${ep.slug}.html">${escapeHtml(ep.title)}</a>`;
        list.appendChild(li);
      });
      container.appendChild(list);
    }
  }

  build();
}

// Los episodios se sirven en bloques (el primero con los más recientes) para
// poder pintar las primeras tarjetas sin esperar a descargar todo el
// catálogo. El buscador, el desplegable de etiquetas y el archivo necesitan
// el catálogo completo, así que esos se activan en cuanto termina de llegar
// el último bloque.
async function loadEpisodesProgressively(onFirstChunk) {
  const meta = await (await fetch(`data/episodes-meta.json?t=${META_CACHE_BUST}`)).json();
  const v = meta.dataVersion || META_CACHE_BUST;
  const fetchChunk = (i) => fetch(`data/episodes-${i}.json?v=${v}`).then((r) => r.json());
  const promises = Array.from({ length: meta.chunkCount }, (_, i) => fetchChunk(i));
  promises[0].then((chunk) => onFirstChunk(chunk));
  return (await Promise.all(promises)).flat();
}

function renderHeroLatest(episodes) {
  const latest = episodes[0];
  if (!latest) return;
  const wrap = document.getElementById("heroLatest");
  const titleEl = document.getElementById("heroLatestTitle");
  const dateEl = document.getElementById("heroLatestDate");
  const coverEl = document.getElementById("heroLatestCover");
  if (!wrap || !titleEl) return;
  if (dateEl) dateEl.textContent = `Último · ${formatDate(latest.published)}`;
  titleEl.textContent = latest.title;
  wrap.href = `episodios/${latest.slug}.html`;
  wrap.setAttribute("aria-label", `Último episodio: ${latest.title}`);
  if (coverEl && latest.thumbnail) {
    coverEl.src = latest.thumbnail.replace("/s72-c/", "/s160/");
    coverEl.alt = latest.title;
  }
  wrap.hidden = false;
}

async function init() {
  const episodes = await loadEpisodesProgressively((firstChunk) => {
    state.all = firstChunk;
    renderHeroLatest(firstChunk);
    applyFilters();
  });

  state.all = episodes;
  state.fullyLoaded = true;
  await loadEsencialesSlugs();
  state.specialFilters = new Map(
    SPECIAL_FILTERS.map((filter) => [
      filter.value,
      { ...filter, slugs: filter.slugs ?? filter.getSlugs(episodes) },
    ])
  );
  populateLabelFilter(episodes);
  renderArchive(episodes);

  const labelParam = new URLSearchParams(location.search).get("label");
  if (labelParam) {
    const normalized = normalizeLabel(labelParam);
    state.labels = new Set([normalized]);
    els.labelFilter.value = normalized;
  }
  applyFilters();

  // Después de renderizar los episodios el layout cambia de tamaño, lo que
  // puede desplazar el scroll si el usuario llegó con un ancla (#sobre-nosotros,
  // #sigue, etc.). Re-scrolleamos al elemento destino una vez todo está listo.
  if (location.hash) {
    const target = document.querySelector(location.hash);
    if (target) target.scrollIntoView({ block: "start" });
  }

  els.search.addEventListener("input", (e) => {
    state.search = e.target.value;
    if (els.searchClearBtn) els.searchClearBtn.hidden = !e.target.value;
    applyFilters();
  });

  if (els.searchClearBtn) {
    els.searchClearBtn.addEventListener("click", () => {
      state.search = "";
      els.search.value = "";
      els.searchClearBtn.hidden = true;
      applyFilters();
      els.search.focus();
    });
  }

  els.labelFilter.addEventListener("change", (e) => {
    const val = e.target.value;
    if (!val) {
      state.labels = new Set();
    } else {
      state.labels.has(val) ? state.labels.delete(val) : state.labels.add(val);
      els.labelFilter.value = "";
    }
    applyFilters();
  });

  if (els.quickTags) {
    els.quickTags.querySelectorAll(".quick-tag[data-label]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const lbl = btn.dataset.label;
        if (lbl === "" || state.labels.has(lbl)) {
          state.labels = new Set();
          els.labelFilter.value = "";
        } else {
          state.labels = new Set([lbl]);
          els.labelFilter.value = lbl;
        }
        applyFilters();
      });
    });
  }

  els.loadMore.addEventListener("click", renderNextPage);

  els.clearFilters.addEventListener("click", () => {
    state.search = "";
    state.labels = new Set();
    els.search.value = "";
    els.labelFilter.value = "";
    if (els.searchClearBtn) els.searchClearBtn.hidden = true;
    applyFilters();
  });

  document.addEventListener("click", (e) => {
    const chip = e.target.closest(".active-label-chip");
    if (!chip) return;
    state.labels.delete(chip.dataset.label);
    applyFilters();
  });
}

init();

// ── Sticky player ─────────────────────────────────────────────
(function () {
  const player  = document.getElementById("sticky-player");
  const audio   = document.getElementById("sticky-audio");
  const playBtn = document.getElementById("sticky-play-btn");
  const closeBtn= document.getElementById("sticky-close");
  const seek    = document.getElementById("sticky-seek");
  const timeEl  = document.getElementById("sticky-time");
  const durEl   = document.getElementById("sticky-dur");
  const titleEl = document.getElementById("sticky-title");
  const subEl   = document.getElementById("sticky-sub");
  const progress= document.getElementById("sticky-progress");

  const PLAY_ICON  = '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true"><path d="M8 5.5l11 6.5-11 6.5z"/></svg>';
  const PAUSE_ICON = '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>';

  const speedBtn = document.getElementById("sticky-speed");
  const SPEEDS = [1, 1.5, 2];
  let speedIdx = 0;
  if (speedBtn) {
    speedBtn.addEventListener("click", () => {
      speedIdx = (speedIdx + 1) % SPEEDS.length;
      audio.playbackRate = SPEEDS[speedIdx];
      const label = SPEEDS[speedIdx] + "×";
      speedBtn.textContent = label;
      speedBtn.setAttribute("aria-label", `Velocidad de reproducción: ${label}`);
    });
  }

  let currentBtn = null;

  function fmt(s) {
    if (!isFinite(s)) return "--:--";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return m + ":" + String(sec).padStart(2, "0");
  }

  function setPlayingCard(btn, isPlaying) {
    if (currentBtn && currentBtn !== btn) {
      currentBtn.classList.remove("playing");
      currentBtn.setAttribute("aria-label", "Reproducir " + currentBtn.dataset.title);
      currentBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" aria-hidden="true"><path d="M8 5.5l11 6.5-11 6.5z"/></svg>';
    }
    if (btn) {
      btn.classList.toggle("playing", isPlaying);
    }
    currentBtn = isPlaying ? btn : null;
  }

  function updatePlayBtn() {
    const paused = audio.paused;
    const title = titleEl.textContent;
    playBtn.innerHTML = paused ? PLAY_ICON : PAUSE_ICON;
    playBtn.setAttribute("aria-label", (paused ? "Reproducir" : "Pausar") + (title ? ": " + title : ""));
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".ep-play-btn");
    if (!btn) return;
    e.preventDefault();

    if (currentBtn === btn) {
      audio.paused ? audio.play().catch(() => {}) : audio.pause();
      return;
    }

    setPlayingCard(btn, true);
    audio.src = btn.dataset.audio;
    titleEl.textContent = btn.dataset.title;
    subEl.textContent   = btn.dataset.meta;
    player.hidden = false;
    seek.value = 0;
    progress.style.width = "0%";
    timeEl.textContent = "0:00";
    durEl.textContent  = "--:--";
    audio.play().catch(() => {
      player.hidden = true;
      setPlayingCard(null, false);
      updatePlayBtn();
      alert("No se ha podido cargar el audio. Prueba a escucharlo directamente en iVoox.");
    });
  });

  audio.addEventListener("play",  updatePlayBtn);
  audio.addEventListener("pause", updatePlayBtn);

  audio.addEventListener("loadedmetadata", () => {
    durEl.textContent = fmt(audio.duration);
    seek.max = Math.floor(audio.duration) || 100;
  });

  audio.addEventListener("timeupdate", () => {
    if (!audio.duration) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    seek.value = Math.floor(audio.currentTime);
    progress.style.width = pct.toFixed(1) + "%";
    timeEl.textContent = fmt(audio.currentTime);
  });

  audio.addEventListener("ended", () => {
    setPlayingCard(null, false);
    updatePlayBtn();
    progress.style.width = "0%";
  });

  playBtn.addEventListener("click", () => {
    audio.paused ? audio.play().catch(() => {}) : audio.pause();
  });

  seek.addEventListener("input", () => {
    audio.currentTime = Number(seek.value);
  });

  closeBtn.addEventListener("click", () => {
    audio.pause();
    audio.src = "";
    player.hidden = true;
    setPlayingCard(null, false);
    updatePlayBtn();
    progress.style.width = "0%";
  });
})();
