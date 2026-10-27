/* Porting Room — static catalog. Loads games.json, renders sections,
   search, platform filter, and a game detail modal. No build step. */

const $ = (id) => document.getElementById(id);

let ALL = [];
let activePlatform = "";
let activeKind = "";
let activeGenre = "";
let query = "";
const expandedSections = new Set();
let lastMobile = null;
let lang = "id";
try { lang = localStorage.getItem("pr-lang") || "id"; } catch (e) { lang = "id"; }
if (lang !== "id" && lang !== "en") lang = "id";
let openSlug = null;
let statsCache = { total: 0, withPorts: 0, totalPorts: 0 };

const KIND_LABELS = { games: "Game", emulators: "Emulator", apps: "Aplikasi", tools: "Perkakas" };
function kindOf(g) { return KIND_LABELS[g.kind] ? g.kind : "games"; }

const GENRE_DROP = new Set(["free to play", "early access", "casual"]);
const GENRE_CANON = {
  "role-playing": "RPG",
  "rpg": "RPG",
  "construction and management simulation": "Simulation",
  "life simulation": "Simulation",
  "flight simulator": "Simulation",
  "simulation": "Simulation",
};
const GENRE_ICONS = {
  "Action": "bi-lightning-charge",
  "Shooter": "bi-crosshair",
  "RPG": "bi-gem",
  "Strategy": "bi-diagram-3",
  "Platform": "bi-joystick",
  "Adventure": "bi-compass",
  "Racing": "bi-speedometer2",
  "Horror": "bi-moon-stars",
  "Fighting": "bi-controller",
  "Beat 'em Up": "bi-hammer",
  "Puzzle": "bi-puzzle",
  "Simulation": "bi-gear",
  "Indie": "bi-stars",
  "Sports": "bi-trophy",
  "Sandbox": "bi-box",
};
function genreListOf(g) {
  const out = [];
  String(g.genre || "").split(",").forEach((part) => {
    const key = part.trim().toLowerCase();
    if (!key || GENRE_DROP.has(key)) return;
    const label = GENRE_CANON[key] || part.trim();
    if (label && !out.includes(label)) out.push(label);
  });
  return out;
}
function genreIcon(label) { return GENRE_ICONS[label] || "bi-tag"; }

const STR = {
  id: {
    searchPh: "Cari game, emulator, aplikasi…",
    all: "Semua",
    allKinds: "Semua Jenis",
    allGenres: "Semua Genre",
    added: "Terakhir Ditambahkan",
    popular: "Populer",
    popularNote: "Urutan Populer: game dari sheet diurutkan menurut kunjungan, game katalog diurutkan menurut jumlah port.",
    updated: "Terakhir Diperbarui",
    allEntries: "Semua Entri",
    noResults: "Tidak ada game yang cocok.",
    portWord: "Port",
    noPort: "Belum ada port",
    more: (n) => `Lihat Selengkapnya (${n} lagi)`,
    less: "Tutup",
    stats: (a, b, c) => `${a} Entri · ${b} dengan Port · ${c} Port · 100% Gratis`,
    tagline: "Classic Games. Reborn for Android, PC & PS5.",
    platform: "Platform",
    kind: "Jenis",
    year: "Tahun",
    genre: "Genre",
    available: "Tersedia di",
    portCount: "Jumlah Port",
    needs: "Kebutuhan",
    portsTitle: "Port Tersedia",
    videoTitle: "Video Gameplay",
    previewsTitle: "Preview",
    noPorts: "Belum ada tautan unduhan untuk game ini.",
    download: "Unduh",
    sourceGh: "Sumber: GitHub",
    sourceDev: "Sumber: Situs developer",
    noticeGame: "<strong>Hanya PS5 (Jailbreak).</strong> Butuh PS5 yang sudah di-jailbreak. Port ini tidak menyertakan file game — bawa file game sendiri yang diperoleh secara legal. Tidak ada file yang di-host di sini.",
    noticeOther: "<strong>Hanya PS5 (Jailbreak).</strong> Butuh PS5 yang sudah di-jailbreak. Tidak ada file yang di-host di sini.",
    foot1: "Files are downloaded from the developers' official sources. We do not host any files.",
    foot2: "PS5 entries require a jailbroken console and your own legally obtained game files.",
    loading: "Memuat katalog…",
    loadFail: "Gagal memuat katalog.",
  },
  en: {
    searchPh: "Search games, emulators, apps…",
    all: "All",
    allKinds: "All Types",
    allGenres: "All Genres",
    added: "Recently Added",
    popular: "Popular",
    popularNote: "Popular order: sheet games by visits, catalog games by port count.",
    updated: "Recently Updated",
    allEntries: "All Entries",
    noResults: "No matching games.",
    portWord: "Port",
    noPort: "No ports yet",
    more: (n) => `Show More (${n} more)`,
    less: "Show Less",
    stats: (a, b, c) => `${a} Entries · ${b} with Ports · ${c} Ports · 100% Free`,
    tagline: "Classic Games. Reborn for Android, PC & PS5.",
    platform: "Platform",
    kind: "Type",
    year: "Year",
    genre: "Genre",
    available: "Available on",
    portCount: "Port Count",
    needs: "Requirements",
    portsTitle: "Available Ports",
    videoTitle: "Gameplay Video",
    previewsTitle: "Previews",
    noPorts: "No download links for this game yet.",
    download: "Download",
    sourceGh: "Source: GitHub",
    sourceDev: "Source: Developer site",
    noticeGame: "<strong>PS5 (Jailbreak) only.</strong> Requires a jailbroken PS5. This port does not include game files — bring your own legally obtained game files. No files are hosted here.",
    noticeOther: "<strong>PS5 (Jailbreak) only.</strong> Requires a jailbroken PS5. No files are hosted here.",
    foot1: "Files are downloaded from the developers' official sources. We do not host any files.",
    foot2: "PS5 entries require a jailbroken console and your own legally obtained game files.",
    loading: "Loading catalog…",
    loadFail: "Failed to load catalog.",
  },
};
const KIND_LABELS_EN = { games: "Game", emulators: "Emulator", apps: "App", tools: "Tool" };
function t(key, ...args) {
  const dict = STR[lang] || STR.id;
  let v = dict[key];
  if (v === undefined) v = STR.id[key];
  if (v === undefined) return key;
  return typeof v === "function" ? v(...args) : v;
}
function kindLabel(k) {
  const labels = lang === "en" ? KIND_LABELS_EN : KIND_LABELS;
  return labels[k] || labels.games;
}
function idDescription(desc) {
  desc = String(desc || "").trim();
  if (!desc) return "";
  const m = desc.match(/^(.*?\.)\s+([\s\S]*)$/);
  if (!m) return desc;
  let rest = m[2];
  rest = rest.replace(/has 0 native ports\./g, "belum memiliki port native.");
  rest = rest.replace(/has 1 native port\./g, "memiliki 1 port native.");
  rest = rest.replace(/has (\d+) native ports\./g, "memiliki $1 port native.");
  rest = rest.replace(/playable on (.+)\./g, "Dapat dimainkan di $1.");
  return (m[1] + " " + rest).trim();
}
function descFor(g) {
  const raw = g.description || "";
  if (lang === "en" || !raw) return raw;
  return idDescription(raw);
}
function renderStats() {
  $("stats").textContent = t("stats", statsCache.total, statsCache.withPorts, statsCache.totalPorts);
}
function applyLang() {
  document.documentElement.lang = lang;
  try { localStorage.setItem("pr-lang", lang); } catch (e) { /* ignore */ }
  $("tagline").textContent = t("tagline");
  $("search").placeholder = t("searchPh");
  $("h-added").textContent = t("added");
  $("h-popular").textContent = t("popular");
  $("popular-note").textContent = t("popularNote");
  $("h-updated").textContent = t("updated");
  $("h-all-label").textContent = t("allEntries");
  $("no-results").textContent = t("noResults");
  $("foot-1").textContent = t("foot1");
  $("foot-2").textContent = t("foot2");
  $("lang-id").classList.toggle("on", lang === "id");
  $("lang-en").classList.toggle("on", lang === "en");
  renderStats();
  renderPlatformChips();
  renderTypeChips();
  renderGenreChips();
  renderSections();
  applyFilter();
  if (openSlug) openDetail(openSlug);
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function norm(s) {
  return String(s || "").toLowerCase();
}

function byName(a, b) {
  return norm(a.name) < norm(b.name) ? -1 : norm(a.name) > norm(b.name) ? 1 : 0;
}

function coverHtml(g, cls) {
  const initial = esc((g.name || "?").trim().charAt(0).toUpperCase());
  if (g.cover) {
    return `<span class="${cls}"><img src="${esc(g.cover)}" alt="" loading="lazy" onerror="this.style.display='none'"><span class="ph">${initial}</span></span>`;
  }
  return `<span class="${cls}"><span class="ph">${initial}</span></span>`;
}

function portBadge(g) {
  if (g.port_count > 0) return `<span class="badge">${g.port_count} ${esc(t("portWord"))}</span>`;
  return `<span class="badge muted">${esc(t("noPort"))}</span>`;
}

function kindBadge(g) {
  const k = kindOf(g);
  if (k === "games") return "";
  return ` <span class="badge kind">${esc(kindLabel(k))}</span>`;
}

function cardHtml(g) {
  const meta = [g.platform, g.year].filter(Boolean).join(" · ");
  return `<article class="card" data-slug="${esc(g.slug)}" tabindex="0">
    ${coverHtml(g, "cover")}
    <div class="card-body">
      <h3>${esc(g.name)}</h3>
      <p class="meta">${esc(meta)}</p>
      ${portBadge(g)}${kindBadge(g)}
    </div>
  </article>`;
}

function renderInto(el, games) {
  el.innerHTML = games.map(cardHtml).join("");
  el.querySelectorAll(".card").forEach((card) => {
    const open = () => openDetail(card.dataset.slug);
    card.addEventListener("click", open);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
    });
  });
}

function descHtml(g) {
  const desc = descFor(g);
  if (!desc) return "";
  return esc(desc).split("|||").map((p) => `<p>${p.trim()}</p>`).join("");
}

function portsHtml(g) {
  const ports = (g.ports || []).filter((p) => p.url);
  if (!ports.length) return `<p>${esc(t("noPorts"))}</p>`;
  return ports.map((p) => {
    const isGh = /github\.com/i.test(p.url);
    const label = isGh ? t("sourceGh") : t("sourceDev");
    return `<div class="port">
      <div><strong>${esc(p.name)}</strong><span class="meta"> · ${esc(p.platform || "")}</span></div>
      <a class="btn" href="${esc(p.url)}" target="_blank" rel="noopener">${esc(t("download"))}</a>
      <span class="src">${label}</span>
    </div>`;
  }).join("");
}

function videoHtml(g) {
  const vids = (g.videos || []).filter(Boolean);
  if (!vids.length) return "";
  const thumbs = vids.length > 1
    ? `<div class="vthumbs">${vids.map((v, i) => `<button class="vthumb${i === 0 ? " on" : ""}" data-vid="${esc(v)}" aria-label="Video ${i + 1}"><img src="https://i.ytimg.com/vi/${esc(v)}/mqdefault.jpg" alt="" loading="lazy" referrerpolicy="no-referrer"></button>`).join("")}</div>`
    : "";
  return `<h3>${esc(t("videoTitle"))}</h3><div class="video"><iframe id="modal-video" src="https://www.youtube.com/embed/${esc(vids[0])}" allowfullscreen referrerpolicy="no-referrer"></iframe></div>${thumbs}`;
}

function openDetail(slug) {
  const g = ALL.find((x) => x.slug === slug);
  if (!g) return;
  openSlug = slug;
  const info = [
    [t("platform"), g.platform],
    [t("kind"), kindLabel(kindOf(g))],
    [t("year"), g.year],
    [t("genre"), g.genre],
    [t("available"), (g.platforms || []).join(", ")],
    [t("portCount"), g.port_count],
    [t("needs"), g.needs],
  ].filter(([, v]) => v !== null && v !== undefined && v !== "");
  const notice = !g.jailbreak ? "" : kindOf(g) === "games"
    ? `<p class="notice">${t("noticeGame")}</p>`
    : `<p class="notice">${t("noticeOther")}</p>`;
  const video = videoHtml(g);
  const previews = (g.previews && g.previews.length)
    ? `<h3>${esc(t("previewsTitle"))}</h3><div class="previews">${g.previews.map((u) => `<img src="${esc(u)}" alt="" loading="lazy" referrerpolicy="no-referrer">`).join("")}</div>`
    : "";
  $("modal-body").innerHTML = `
    <div class="detail-head">
      ${coverHtml(g, "cover-lg")}
      <div>
        <h2>${esc(g.name)}</h2>
        <table class="info">${info.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</table>
      </div>
    </div>
    ${notice}
    ${descHtml(g)}
    <h3>${esc(t("portsTitle"))}</h3>
    ${portsHtml(g)}
    ${video}
    ${previews}`;
  $("modal-body").querySelectorAll(".vthumb").forEach((btn) => {
    btn.addEventListener("click", () => {
      const frame = $("modal-video");
      if (frame) frame.src = "https://www.youtube.com/embed/" + btn.dataset.vid;
      $("modal-body").querySelectorAll(".vthumb").forEach((b) => b.classList.remove("on"));
      btn.classList.add("on");
    });
  });
  $("modal-backdrop").hidden = false;
  document.body.style.overflow = "hidden";
}

function closeDetail() {
  openSlug = null;
  $("modal-backdrop").hidden = true;
  document.body.style.overflow = "";
}

function renderPlatformChips() {
  const counts = new Map();
  ALL.forEach((g) => {
    const p = g.platform || "Others";
    counts.set(p, (counts.get(p) || 0) + 1);
  });
  const platforms = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const wrap = $("platform-chips");
  wrap.innerHTML = `<button class="chip${activePlatform === "" ? " on" : ""}" data-p="">${esc(t("all"))}</button>` +
    platforms.map(([p, n]) => `<button class="chip${activePlatform === p ? " on" : ""}" data-p="${esc(p)}">${esc(p)} (${n})</button>`).join("");
  wrap.querySelectorAll(".chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      wrap.querySelectorAll(".chip").forEach((b) => b.classList.remove("on"));
      btn.classList.add("on");
      activePlatform = btn.dataset.p;
      applyFilter();
    });
  });
}

function renderTypeChips() {
  const counts = new Map();
  ALL.forEach((g) => {
    const k = kindOf(g);
    counts.set(k, (counts.get(k) || 0) + 1);
  });
  const order = ["games", "emulators", "apps", "tools"];
  const wrap = $("type-chips");
  wrap.innerHTML = `<button class="chip${activeKind === "" ? " on" : ""}" data-k="">${esc(t("allKinds"))}</button>` +
    order.filter((k) => counts.has(k)).map((k) => `<button class="chip${activeKind === k ? " on" : ""}" data-k="${k}">${esc(kindLabel(k))} (${counts.get(k)})</button>`).join("");
  wrap.querySelectorAll(".chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      wrap.querySelectorAll(".chip").forEach((b) => b.classList.remove("on"));
      btn.classList.add("on");
      activeKind = btn.dataset.k;
      applyFilter();
    });
  });
}

function renderGenreChips() {
  const counts = new Map();
  ALL.forEach((g) => {
    genreListOf(g).forEach((label) => counts.set(label, (counts.get(label) || 0) + 1));
  });
  const genres = [...counts.entries()].filter(([, n]) => n >= 4)
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 16);
  const wrap = $("genre-chips");
  wrap.innerHTML = `<button class="chip${activeGenre === "" ? " on" : ""}" data-g="">${esc(t("allGenres"))}</button>` +
    genres.map(([label, n]) => `<button class="chip${activeGenre === label ? " on" : ""}" data-g="${esc(label)}"><i class="bi ${genreIcon(label)}"></i>${esc(label)} (${n})</button>`).join("");
  wrap.querySelectorAll(".chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      wrap.querySelectorAll(".chip").forEach((b) => b.classList.remove("on"));
      btn.classList.add("on");
      activeGenre = btn.dataset.g;
      applyFilter();
    });
  });
}

function applyFilter() {
  const filtering = query !== "" || activePlatform !== "" || activeKind !== "" || activeGenre !== "";
  ["sec-added", "sec-popular", "sec-updated"].forEach((id) => {
    $(id).style.display = filtering ? "none" : "";
  });
  const list = ALL.filter((g) => {
    if (activePlatform && (g.platform || "Others") !== activePlatform) return false;
    if (activeKind && kindOf(g) !== activeKind) return false;
    if (activeGenre && !genreListOf(g).includes(activeGenre)) return false;
    if (query && !norm(g.name).includes(query)) return false;
    return true;
  });
  $("all-count").textContent = `(${list.length})`;
  $("no-results").hidden = list.length > 0;
  renderInto($("game-list"), list);
}

const SECTION_DEFS = [
  { key: "added", listId: "last-added-list", moreId: "more-added" },
  { key: "popular", listId: "popular-list", moreId: "more-popular" },
  { key: "updated", listId: "last-updated-list", moreId: "more-updated" },
];
const MOBILE_CAP = 4;
let sectionLists = {};
function isMobileView() { return window.matchMedia("(max-width: 560px)").matches; }
function renderSection(def) {
  const list = sectionLists[def.key] || [];
  const collapsed = isMobileView() && !expandedSections.has(def.key);
  renderInto($(def.listId), collapsed ? list.slice(0, MOBILE_CAP) : list);
  const btn = $(def.moreId);
  if (!btn) return;
  if (!isMobileView() || list.length <= MOBILE_CAP) { btn.hidden = true; return; }
  btn.hidden = false;
  btn.textContent = expandedSections.has(def.key)
    ? t("less")
    : t("more", list.length - MOBILE_CAP);
}
function renderSections() {
  const byAdded = ALL.filter((g) => g.dateAdded)
    .sort((a, b) => b.dateAdded.localeCompare(a.dateAdded)).slice(0, 12);
  const byUpdated = ALL.filter((g) => g.lastUpdate)
    .sort((a, b) => b.lastUpdate.localeCompare(a.lastUpdate)).slice(0, 12);
  const gapPopular = ALL.filter((g) => g.visitas != null)
    .sort((a, b) => b.visitas - a.visitas).slice(0, 10);
  const hisPopular = ALL.filter((g) => g.visitas == null && g.port_count > 0)
    .sort((a, b) => (b.port_count - a.port_count) || byName(a, b)).slice(0, 10);
  sectionLists = {
    added: byAdded,
    popular: gapPopular.concat(hisPopular),
    updated: byUpdated,
  };
  SECTION_DEFS.forEach(renderSection);
}

async function main() {
  const res = await fetch("games.json");
  const data = await res.json();
  ALL = (data.games || []).sort(byName);
  statsCache = {
    total: ALL.length,
    withPorts: ALL.filter((g) => g.port_count > 0).length,
    totalPorts: ALL.reduce((n, g) => n + (g.port_count || 0), 0),
  };
  renderPlatformChips();
  renderTypeChips();
  renderGenreChips();
  lastMobile = isMobileView();
  renderSections();
  SECTION_DEFS.forEach((def) => {
    $(def.moreId).addEventListener("click", () => {
      if (expandedSections.has(def.key)) expandedSections.delete(def.key);
      else expandedSections.add(def.key);
      renderSection(def);
    });
  });
  window.addEventListener("resize", () => {
    const m = isMobileView();
    if (m !== lastMobile) { lastMobile = m; renderSections(); }
  });
  $("lang-id").addEventListener("click", () => { lang = "id"; applyLang(); });
  $("lang-en").addEventListener("click", () => { lang = "en"; applyLang(); });
  applyLang();
  applyFilter();
  $("search").addEventListener("input", (e) => {
    query = norm(e.target.value.trim());
    applyFilter();
  });
  $("modal-close").addEventListener("click", closeDetail);
  $("modal-backdrop").addEventListener("click", (e) => {
    if (e.target.id === "modal-backdrop") closeDetail();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDetail();
  });
}

main().catch(() => {
  $("stats").textContent = t("loadFail");
});
