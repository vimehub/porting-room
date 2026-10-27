/* Porting Room — static catalog. Loads games.json, renders sections,
   search, platform filter, and a game detail modal. No build step. */

const $ = (id) => document.getElementById(id);

let ALL = [];
let activePlatform = "";
let activeKind = "";
let query = "";

const KIND_LABELS = { games: "Game", emulators: "Emulator", apps: "Aplikasi", tools: "Perkakas" };
function kindOf(g) { return KIND_LABELS[g.kind] ? g.kind : "games"; }

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
  if (g.port_count > 0) return `<span class="badge">${g.port_count} Port</span>`;
  return `<span class="badge muted">Belum ada port</span>`;
}

function kindBadge(g) {
  const k = kindOf(g);
  if (k === "games") return "";
  return ` <span class="badge kind">${esc(KIND_LABELS[k])}</span>`;
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

function descHtml(desc) {
  if (!desc) return "";
  return esc(desc).split("|||").map((p) => `<p>${p.trim()}</p>`).join("");
}

function portsHtml(g) {
  const ports = (g.ports || []).filter((p) => p.url);
  if (!ports.length) return "<p>Belum ada tautan unduhan untuk game ini.</p>";
  return ports.map((p) => {
    const isGh = /github\.com/i.test(p.url);
    const label = isGh ? "Sumber: GitHub" : "Sumber: Situs developer";
    return `<div class="port">
      <div><strong>${esc(p.name)}</strong><span class="meta"> · ${esc(p.platform || "")}</span></div>
      <a class="btn" href="${esc(p.url)}" target="_blank" rel="noopener">Unduh</a>
      <span class="src">${label}</span>
    </div>`;
  }).join("");
}

function openDetail(slug) {
  const g = ALL.find((x) => x.slug === slug);
  if (!g) return;
  const info = [
    ["Platform", g.platform],
    ["Jenis", KIND_LABELS[kindOf(g)]],
    ["Tahun", g.year],
    ["Genre", g.genre],
    ["Tersedia di", (g.platforms || []).join(", ")],
    ["Jumlah Port", g.port_count],
    ["Kebutuhan", g.needs],
  ].filter(([, v]) => v !== null && v !== undefined && v !== "");
  const notice = !g.jailbreak ? "" : kindOf(g) === "games"
    ? `<p class="notice"><strong>Hanya PS5 (Jailbreak).</strong> Butuh PS5 yang sudah di-jailbreak. Port ini tidak menyertakan file game — bawa file game sendiri yang diperoleh secara legal. Tidak ada file yang di-host di sini.</p>`
    : `<p class="notice"><strong>Hanya PS5 (Jailbreak).</strong> Butuh PS5 yang sudah di-jailbreak. Tidak ada file yang di-host di sini.</p>`;
  const video = (g.videos && g.videos.length)
    ? `<h3>Video Gameplay</h3><div class="video"><iframe src="https://www.youtube.com/embed/${esc(g.videos[0])}" allowfullscreen referrerpolicy="no-referrer"></iframe></div>`
    : "";
  const previews = (g.previews && g.previews.length)
    ? `<h3>Preview</h3><div class="previews">${g.previews.map((u) => `<img src="${esc(u)}" alt="" loading="lazy" referrerpolicy="no-referrer">`).join("")}</div>`
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
    ${descHtml(g.description)}
    <h3>Port Tersedia</h3>
    ${portsHtml(g)}
    ${video}
    ${previews}`;
  $("modal-backdrop").hidden = false;
  document.body.style.overflow = "hidden";
}

function closeDetail() {
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
  wrap.innerHTML = `<button class="chip on" data-p="">Semua</button>` +
    platforms.map(([p, n]) => `<button class="chip" data-p="${esc(p)}">${esc(p)} (${n})</button>`).join("");
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
  wrap.innerHTML = `<button class="chip on" data-k="">Semua Jenis</button>` +
    order.filter((k) => counts.has(k)).map((k) => `<button class="chip" data-k="${k}">${esc(KIND_LABELS[k])} (${counts.get(k)})</button>`).join("");
  wrap.querySelectorAll(".chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      wrap.querySelectorAll(".chip").forEach((b) => b.classList.remove("on"));
      btn.classList.add("on");
      activeKind = btn.dataset.k;
      applyFilter();
    });
  });
}

function applyFilter() {
  const filtering = query !== "" || activePlatform !== "" || activeKind !== "";
  ["sec-added", "sec-popular", "sec-updated"].forEach((id) => {
    $(id).style.display = filtering ? "none" : "";
  });
  const list = ALL.filter((g) => {
    if (activePlatform && (g.platform || "Others") !== activePlatform) return false;
    if (activeKind && kindOf(g) !== activeKind) return false;
    if (query && !norm(g.name).includes(query)) return false;
    return true;
  });
  $("all-count").textContent = `(${list.length})`;
  $("no-results").hidden = list.length > 0;
  renderInto($("game-list"), list);
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
  renderInto($("last-added-list"), byAdded);
  renderInto($("popular-list"), gapPopular.concat(hisPopular));
  renderInto($("last-updated-list"), byUpdated);
}

async function main() {
  const res = await fetch("games.json");
  const data = await res.json();
  ALL = (data.games || []).sort(byName);
  const withPorts = ALL.filter((g) => g.port_count > 0).length;
  const totalPorts = ALL.reduce((n, g) => n + (g.port_count || 0), 0);
  $("stats").textContent = `${ALL.length} Entri · ${withPorts} dengan Port · ${totalPorts} Port · 100% Gratis`;
  renderPlatformChips();
  renderTypeChips();
  renderSections();
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
  $("stats").textContent = "Gagal memuat katalog.";
});
