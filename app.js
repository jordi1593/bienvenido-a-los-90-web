const PAGE_SIZE = 20;

const PLATFORM_SHOW_LINKS = {
  spotify: "https://open.spotify.com/show/5c1ikDBBLMlls8ZTvcu14N",
  apple: "https://podcasts.apple.com/es/podcast/bienvenido-a-los-90/id1369150482",
  amazon: "https://music.amazon.es/podcasts/5778f981-68a5-405e-aa21-b7ef2c972412/bienvenido-a-los-90?refMarker=null",
};

const PLATFORM_ICONS = {
  ivoox: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 13v-1a7 7 0 0 1 14 0v1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><rect x="3.2" y="13" width="4" height="6" rx="1.6" fill="currentColor"/><rect x="16.8" y="13" width="4" height="6" rx="1.6" fill="currentColor"/></svg>',
  apple: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/></svg>',
  spotify: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9.2" stroke="currentColor" stroke-width="1.6"/><path d="M7 10.5c3.2-1 7-.7 9.7 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M7.6 13.3c2.6-.8 5.6-.6 7.8.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M8.3 16c2-.6 4.3-.5 6 .5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  amazon: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9.2" stroke="currentColor" stroke-width="1.6"/><path d="M6.5 14.5c3.6 2.6 7.4 2.6 11 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M16 14.2l1.6.4-.6 1.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

function platformLinks(ep) {
  const links = [];
  const ivoox = ep.ivooxLink || ep.downloadLink;
  if (ivoox) links.push({ label: "iVoox", url: ivoox, exact: true, icon: "ivoox" });
  links.push({ label: "Spotify", url: ep.spotifyLink || PLATFORM_SHOW_LINKS.spotify, exact: !!ep.spotifyLink, icon: "spotify" });
  links.push({ label: "Apple Podcasts", url: ep.appleLink || PLATFORM_SHOW_LINKS.apple, exact: !!ep.appleLink, icon: "apple" });
  links.push({ label: "Amazon Music", url: ep.amazonLink || PLATFORM_SHOW_LINKS.amazon, exact: !!ep.amazonLink, icon: "amazon" });
  return links;
}

const state = {
  all: [],
  filtered: [],
  shown: 0,
  search: "",
  label: "",
  specialFilters: new Map(),
};

const els = {
  list: document.getElementById("episodeList"),
  search: document.getElementById("search"),
  labelFilter: document.getElementById("labelFilter"),
  resultCount: document.getElementById("resultCount"),
  clearFilters: document.getElementById("clearFilters"),
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
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return escapedText.replace(new RegExp(escapedQuery, "gi"), (m) => `<mark class="search-highlight">${m}</mark>`);
}

function episodeCardHtml(ep) {
  const cover = ep.thumbnail
    ? ep.thumbnail.replace("/s72-c/", "/s600/")
    : "";
  const numBadge = ep.number ? `#${ep.number}` : "";
  const pageUrl = `episodios/${ep.slug}.html`;
  const query = state.search.trim();
  return `
    <article class="episode-card">
      <a class="episode-cover-link" href="${pageUrl}">
        ${cover ? `<img class="episode-cover-img" src="${cover}" alt="" loading="lazy" />` : `<div class="episode-cover-img"></div>`}
        ${numBadge ? `<span class="episode-badge">${numBadge}</span>` : ""}
        <span class="episode-cover-overlay"></span>
      </a>
      <div class="episode-body">
        <h2><a href="${pageUrl}">${highlightMatch(escapeHtml(ep.title), query)}</a></h2>
        <div class="episode-meta">${formatDate(ep.published)} · ${ep.comments} comentario${ep.comments === 1 ? "" : "s"}</div>
        ${typeof ep.likes === "number" ? `<div class="episode-likes"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 20.5s-7.5-4.6-9.8-9.2C.5 7.8 2.3 4.5 5.8 4c2.1-.3 4.1.7 6.2 3 2.1-2.3 4.1-3.3 6.2-3 3.5.5 5.3 3.8 3.6 7.3-2.3 4.6-9.8 9.2-9.8 9.2z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg> ${ep.likes}</div>` : ""}
        <div class="episode-actions">
          <a class="primary" href="${pageUrl}">Ver episodio</a>
        </div>
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

function normalizeLabel(label) {
  const key = label.trim().toLowerCase().replace(/\s+/g, " ");
  if (SHOW_NAME_LABEL_VARIANTS.has(key)) return "Bienvenido a los 90";
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

// Episodios listados en
// https://www.ivoox.com/esenciales-b90_bk_list_6192164_1.html
const ESENCIALES_SLUGS = new Set([
  "p-814-homenaje-a-1991-el-ano-que-cambio-la-musica","p-810-especial-gentlemen-de-the-afghan-whigs","p-807-charlando-con-beavis-y-butt-head","p-804-michael-azerrad-y-el-fenomeno-nirvana","p-802-john-squire-de-the-stone-roses-a-the-seahorses","p-801-un-repaso-al-libro-de-dave-grohl-the-storyteller-tales-of-life-and-music","p-797-que-demonios-paso-el-24-de-septiembre-de-1991","p-796-canciones-imbatibles-que-abren-disco","p-792-el-repaso-definitivo-a-1991","p-787-the-strokes-is-this-it","p-777-cuando-dave-conocio-a-david","p-774-yann-tiersen-y-el-fabuloso-destino-de-amelie-poulain","p-769-extremoduro-agila-1996","p-768-my-bloody-valentine-loveless-1991","p-763-especial-deluxe-xoel-lopez","p-762-el-disco-perdido-de-crispian-mills-kula-shaker-the-jeevas","p-761-especial-the-jeevas","p-760-hablamos-del-nuevo-libro-de-dave-grohl","p-759-the-prodigy-the-fat-of-the-land","p-754-la-amargura-sonora-de-codeine","p-752-jerry-cantrell","p-749-ray-loriga-heroes","p-747-el-misterio-de-where-did-you-sleep-last-night","p-744-el-fenomeno-oasis-en-la-radio-musical-espanola-de-los-90","p-741-courtney-love-renaciendo-de-las-cenizas","p-739-the-smashing-pumpkins-madrid-1998-la-intrahistoria","p-736-la-entrevista-perdida-a-noel-gallagher-1997","p-735-axl-rose-vs-kurt-cobain","p-732-visitamos-el-crocodile-de-seattle","p-730-recordamos-magnolia-loto-de-rufus-t-firefly","p-727-sintiendo-caer-la-mierda-sobre-mi-canciones-para-el-blue-monday-vol-1","p-726-the-5-6-7-8-s-la-banda-que-enamoro-a-tarantino","p-725-the-chemical-brothers-dig-your-own-hole","p-723-visitamos-la-unica-fabrica-de-vinilos-de-madrid-mad-vinyl-music","p-720-despedimos-el-ano-con-paco-perez-bryan","p-714-homenaje-a-los-25-anos-del-mellon-collie-and-the-infinite-sadness","p-713-querido-john","p-710-mis-canciones-favoritas-de-radiohead-que-no-estan-en-sus-discos","p-704-canciones-que-vivieron-una-segunda-juventud-en-los-anos-90-parte-1","p-703-no-doubt-tragic-kingdom-1995","p-702-especial-pj-harvey-parte-1","p-695-especial-heroes-del-silencio","p-694-el-latido-de-portishead","p-693-the-smashing-pumpkins-pisces-iscariot","p-691-recordando-a-shannon-hoon-blind-melon","p-690-placebo-black-market-music-cumple-20-anos","p-688-lily-cornell-silver-entrevista-a-eddie-vedder","p-687-una-masterclass-noventera-con-alain-johannes","p-683-homenaje-a-alain-johannes","programa-375-libros-musicales-y-dali","programa-431-in-utero-25","p-678-vive-rapido-muere-joven-y-deja-un-bonito-cadaver-elastica","p-675-offspring-smash-el-disco-independiente-mas-vendido-de-la-historia","p-670-the-smashing-pumpkins-la-historia-de-machina-the-machines-of-god","p-668-la-cara-oculta-de-dave-grohl","p-666-marilyn-manson-antichrist-superstar","p-664-mark-lanegan-sing-backwards-and-weep","p-642-canciones-que-si-pero-discos-que-no","p-644-the-rocket-la-revista-local-de-seattle","p-645-smashing-pumpkins-especial-gish","p-646-radiohead-especial-the-bends","p-647-especial-odelay-de-beck","p-648-the-cardigans-gran-turismo","p-649-la-historia-de-veruca-salt","p-650-mad-season-above","mark-lanegan-caminando-al-filo-del-abismo","p-653-radiohead-amnesiac","p-656-la-historia-de-mark-sandman-y-morphine","p-657-bandas-sonoras-vol-1","p-627-especial-the-gits-mia-zapata","p-633-la-historia-de-dave-abbruzzese-pearl-jam","p-639-smashing-pumpkins-especial-siamese-dream-parte-2","p-638-smashing-pumpkins-especial-siamese-dream-parte-1","p-603-richey-james-edwards-manic-street-preachers","p-607-especial-the-dark-side-of-the-moon-de-pink-floyd","p-608-chris-cornell-poncier","p-611-susan-silver-la-manager-del-grunge-soundgarden-alice-in-chains-screaming-t","p-613-days-of-the-new","p-616-mi-reproductor-de-musica-favorito-el-ipod","p-584-el-fatidico-8-de-diciembre-john-lennon","p-595-danny-goldberg-serving-the-servant-recordando-a-kurt-cobain","p-597-especial-sperm","p-600-desde-furinyaki-records-studio-con-gyoza-y-james-vieco-band","p-576-road-trip-podcast-en-busca-de-mark-lanegan-segunda-parte","p-575-road-trip-podcast-en-busca-de-mark-lanegan-primera-parte","programa-566-una-agradable-charla-con-alain-johannes","p-577-dave-grohl-mis-beatles","p-581-r-e-m-monster-cumple-25-anos","programa-546-cuando-y-por-que-dejaron-de-molar-los-foo-fighters","programa-549-bob-dylan-highway-61-revisited","programa-534-nirvana-y-su-identidad-visual","programa-536-radiohead-ok-minidisc","programa-538-construyendo-el-sonido-de-los-90","programa-505-mis-10-documentales-musicales-favoritos-de-los-90","programa-509-los-ultimos-dias-de-kurt-cobain","programa-511-nirvana-heavier-than-heaven-charles-cross-2019","programa-515-hole-live-through-this-1994","programa-521-el-cassette-que-sirvio-para-enamorarme-de-ti","programa-490-the-smashing-pumpkins-twilight-to-starlight","programa-489-the-smashing-pumpkins-dawn-to-dusk","programa-496-la-ultima-entrevista-real-a-kurt-cobain","programa-501-zach-de-la-rocha","programa-469-manic-street-preachers-this-is-my-truth-tell-me-yours-cumple-20-ano","programa-470-nirvana-live-and-loud-pier-48","programa-482-wild-dog-the-last-days-2018","programa-483-sonic-youth-su-ultimo-concierto-en-nueva-york","programa-447-sexy-sadie-it-s-beautiful-it-s-love-1998-2018","programa-451-gracias-pasajero","programa-458-music-radar-clan","programa-432-musica-para-viajar","programa-437-diez-anos-buscando-cintas","programa-439-un-paseo-por-tokio","programa-442-sonic-youth-daydream-nation","programa-446-john-lennon-imagine-el-libro","programa-isaac-gracie","programa-427-radiohead-kid-a","programa-429-la-banda-sonora-del-fin-del-milenio","programa-430-kristen-pfaff","programa-392-truly","programa-409-entrevista-no-dogs","programa-388-roger-waters","programa-337-alain-johannes-unfinished-plan","programa-338-singles-deluxe","programa-342-daniel-arias-pasajero-zoo-nuevenoventaicinco","programa-319-nirvana-iv","programa-304-eddie-vedder-the-beatles","programa-282-radiohead-ok-computer","programa-291-nirvana-visita-espana-1992","programa-253-1991-the-year-punk-broke","programa-202-adios-bowie","programa-180-entrevista-charles-cross","programa-161-un-paseo-por-seattle","programa-166-adios-standstill","programa-171-the-beatles-en-madrid","programa-146-pearl-jam-self-pollution-radio-1995","programa-127-seattle-en-los-90","programa-157-the-sunday-drivers-little-heart-attacks-con-virginia-diaz","programa-130-entrevista-a-charles-r-cross","programa-109-20-anos-nirvana","b90-una-hora-con-standstill","b90-programa-77-el-cuervo","programa-58-especial-cara-b"
]);

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
  "p-687-una-masterclass-noventera-con-alain-johannes",
  "1024-homenaje-a-dover",
  "b90-supernova-74-la-intrahistoria-del-homenaje-a-dover",
  "programa-528-homenaje-a-bob-dylan",
  "p-600-desde-furinyaki-records-studio-con-gyoza-y-james-vieco-band",
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
    ? episodes.filter((ep) => ep.likes !== undefined && ep.likes !== null)
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
    getSlugs: (episodes) => topSlugsBy(episodes, "plays"),
    sort: (a, b) => b.plays - a.plays,
  },
  {
    value: "__top_comentados__",
    label: "Lo más comentado",
    // Solo episodios con estadísticas reales de iVoox (ep.likes definido);
    // el resto usa el contador de comentarios del blog, que no es comparable.
    getSlugs: (episodes) => topSlugsBy(episodes, "comments", { requireRealStats: true }),
    sort: (a, b) => b.comments - a.comments,
  },
  {
    value: "__top_valorados__",
    label: "Lo más valorado",
    getSlugs: (episodes) => topSlugsBy(episodes, "likes", { requireRealStats: true }),
    sort: (a, b) => b.likes - a.likes,
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
    value: "__esenciales__",
    label: "Esenciales",
    slugs: ESENCIALES_SLUGS,
  },
  {
    value: "__discos_homenaje__",
    label: "Discos Homenaje",
    slugs: DISCOS_HOMENAJE_SLUGS,
  },
];

function applyFilters() {
  const q = state.search.trim().toLowerCase();
  const activeFilter = state.specialFilters.get(state.label);
  state.filtered = state.all.filter((ep) => {
    const matchesSearch = !q ||
      ep.title.toLowerCase().includes(q) ||
      ep.summary.toLowerCase().includes(q) ||
      ep.labels.some((l) => l.toLowerCase().includes(q));
    const matchesLabel = !state.label ||
      (activeFilter
        ? activeFilter.slugs.has(ep.slug)
        : ep.labels.some((l) => normalizeLabel(l) === state.label));
    return matchesSearch && matchesLabel;
  });
  if (activeFilter?.sort) {
    state.filtered.sort(activeFilter.sort);
  }
  state.shown = 0;
  els.list.innerHTML = "";
  renderNextPage();
}

function renderNextPage() {
  const next = state.filtered.slice(state.shown, state.shown + PAGE_SIZE);
  els.list.insertAdjacentHTML("beforeend", next.map(episodeCardHtml).join(""));
  state.shown += next.length;
  els.resultCount.innerHTML = `<strong>${state.filtered.length}</strong> episodio${state.filtered.length === 1 ? "" : "s"}`;
  els.loadMoreWrap.style.display = state.shown < state.filtered.length ? "block" : "none";
  els.clearFilters.hidden = !state.search && !state.label;
}

function populateLabelFilter(episodes) {
  SPECIAL_FILTERS.forEach((filter) => {
    const opt = document.createElement("option");
    opt.value = filter.value;
    opt.textContent = filter.label;
    els.labelFilter.appendChild(opt);
  });

  const EXCLUDED_LABELS = new Set([
    "podcast", "podcast en español", "radio", "radio utopia", "radio utopía",
    "subterfuge radio", "madrid", "ivoox",
    "darwinians radio bike", "darwinians raido bike", "darwiniansradiobike",
    "b90 supernova", "especial", "radioutopia", "mike mccready", "pearljam",
    "ringo starr", "seattle", "castellano", "descarga",
  ]);
  const counts = new Map();
  episodes.forEach((ep) => ep.labels.forEach((l) => {
    if (EXCLUDED_LABELS.has(l.trim().toLowerCase())) return;
    const label = normalizeLabel(l);
    if (label === "Bienvenido a los 90") return;
    counts.set(label, (counts.get(label) || 0) + 1);
  }));
  const topLabels = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40)
    .map(([label]) => label);
  topLabels.sort((a, b) => a.localeCompare(b, "es"));
  topLabels.forEach((label) => {
    const opt = document.createElement("option");
    opt.value = label;
    opt.textContent = label;
    els.labelFilter.appendChild(opt);
  });
}

const MONTH_NAMES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function buildArchiveTree(episodes) {
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

  return years.map((year) => {
    const byMonth = byYear.get(year);
    const months = [...byMonth.keys()].sort((a, b) => b - a);
    const total = months.reduce((sum, m) => sum + byMonth.get(m).length, 0);
    const monthsHtml = months.map((month) => {
      const eps = byMonth.get(month).sort((a, b) => new Date(b.published) - new Date(a.published));
      const itemsHtml = eps.map((ep) => `<li><a href="episodios/${ep.slug}.html">${escapeHtml(ep.title)}</a></li>`).join("");
      return `
        <details class="archive-month">
          <summary>${MONTH_NAMES[month]} (${eps.length})</summary>
          <ul class="archive-episode-list">${itemsHtml}</ul>
        </details>`;
    }).join("");

    return `
      <details class="archive-year">
        <summary>${year} (${total})</summary>
        ${monthsHtml}
      </details>`;
  }).join("");
}

function renderArchive(episodes) {
  const el = document.getElementById("archiveTree");
  if (el) el.innerHTML = buildArchiveTree(episodes);
}

// Los episodios se sirven en bloques (el primero con los más recientes) para
// poder pintar las primeras tarjetas sin esperar a descargar todo el
// catálogo. El buscador, el desplegable de etiquetas y el archivo necesitan
// el catálogo completo, así que esos se activan en cuanto termina de llegar
// el último bloque.
async function loadEpisodesProgressively(onFirstChunk) {
  const meta = await (await fetch("data/episodes-meta.json")).json();
  const chunks = [];
  for (let i = 0; i < meta.chunkCount; i++) {
    const chunk = await (await fetch(`data/episodes-${i}.json`)).json();
    chunks.push(chunk);
    if (i === 0) onFirstChunk(chunk);
  }
  return chunks.flat();
}

async function init() {
  const episodes = await loadEpisodesProgressively((firstChunk) => {
    state.all = firstChunk;
    applyFilters();
  });

  state.all = episodes;
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
    state.label = normalizeLabel(labelParam);
    els.labelFilter.value = state.label;
  }
  applyFilters();

  els.search.addEventListener("input", (e) => {
    state.search = e.target.value;
    applyFilters();
  });

  els.labelFilter.addEventListener("change", (e) => {
    state.label = e.target.value;
    applyFilters();
  });

  els.loadMore.addEventListener("click", renderNextPage);

  els.clearFilters.addEventListener("click", () => {
    state.search = "";
    state.label = "";
    els.search.value = "";
    els.labelFilter.value = "";
    applyFilters();
  });
}

init();
