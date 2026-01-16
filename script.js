

/* ========== CONFIG ========== */
// Replace these with your repo
const OWNER = "TheRealDuckers";
const REPO  = "blog.duckers.dev";

// Pagination: issues per page
const PER_PAGE = 6;

// Optional: set a GitHub token string here to avoid rate limits during development
const GITHUB_TOKEN = null;

/* ========== GISCUS (comments) ========== */
// Fill these if you want giscus comments
const GISCUS_REPO = "";          // e.g. "yourname/yourrepo"
const GISCUS_REPO_ID = "";
const GISCUS_CATEGORY = "";
const GISCUS_CATEGORY_ID = "";
const GISCUS_MAPPING = "pathname";

/* ========== STATE ========== */
const state = {
  page: 1,
  label: null,
  search: "",
  issues: [],
  labels: []
};

/* ========== HELPERS ========== */
function apiFetch(path) {
  const headers = { "User-Agent": "gh-issues-blog" };
  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  return fetch(`https://api.github.com/repos/${OWNER}/${REPO}${path}`, { headers })
    .then(r => {
      if (!r.ok) return r.json().then(j => { throw new Error(j.message || r.statusText); });
      return r.json();
    });
}

function isoToDate(iso) {
  try { return new Date(iso).toLocaleDateString(); } catch (e) { return iso; }
}
function short(s, n = 140) { if (!s) return ""; return s.length > n ? s.slice(0, n).trim() + "…" : s; }
function escapeHtml(s) { if (!s) return ""; return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;'); }

/* ========== RENDERING ========== */
const appEl = document.getElementById("app");

async function renderHome() {
  const issues = await fetchIssues(1, state.label);
  const latest = issues.slice(0, 3);

  appEl.innerHTML = `
    <section class="hero" role="banner">
      <div class="avatar" id="heroAvatar"><img src="https://raw.githubusercontent.com/TheRealDuckers/cdn/refs/heads/main/OIG3.4Ejr4MY.jpg"/></div>
      <div class="meta">
        <h1 id="heroTitle">Hi, welcome to my blog!</h1>
        <div class="bio" id="heroBio">the best and funniest dev blog out there... probably.</div>
      </div>
      <div class="actions">
        <a class="btn primary" style="text-decoration: none;" href="#/posts">Browse All Posts</a>
      </div>
    </section>

    <h2 style="margin:.6rem 0">Latest posts</h2>
    <div style="text-decoration: none;" class="grid">
      ${latest.map(p => `
        <a class="post-link" href="#/posts/${p.number}">
          <article class="card">
            <h3>${escapeHtml(p.title)}</h3>
            <div class="muted">#${p.number} • ${isoToDate(p.created_at)}</div>
            <p>${escapeHtml(short(p.body, 120))}</p>
          </article>
        </a>
      `).join("")}
    </div>
  `;
}

async function renderPosts() {
  if (!state.labels.length) {
    try { state.labels = await apiFetch("/labels"); } catch (e) { state.labels = []; }
  }

  const issues = await fetchIssues(state.page, state.label);
  state.issues = issues;

  const q = state.search.trim().toLowerCase();
  const filtered = issues.filter(i => {
    if (!q) return true;
    return (i.title + " " + (i.body || "")).toLowerCase().includes(q);
  });

  appEl.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between">
      <h1>All posts</h1>
      <div class="muted">Page ${state.page}</div>
    </div>

    <div class="controls">
      <input id="searchInput" class="search" placeholder="Search titles and bodies on this page..." value="${escapeHtml(state.search)}" />
      <div style="display:flex;gap:.5rem;align-items:center">
        <button class="btn" id="prevBtn">Prev</button>
        <button class="btn" id="nextBtn">Next</button>
      </div>
    </div>

    <div class="labels" id="labelsRow">
      <span class="label ${state.label === null ? "active" : ""}" data-label="">All</span>
      ${state.labels.map(l => `<span class="label ${state.label === l.name ? "active" : ""}" data-label="${escapeHtml(l.name)}">${escapeHtml(l.name)}</span>`).join("")}
    </div>

    <div style="margin-top:1rem">
      ${filtered.length ? filtered.map(p => `
        <a class="post-link" href="#/posts/${p.number}">
          <article class="card">
            <h3>${escapeHtml(p.title)}</h3>
            <div class="muted">#${p.number} • ${isoToDate(p.created_at)} • ${p.labels.map(lb => escapeHtml(lb.name)).join(", ")}</div>
            <p>${escapeHtml(short(p.body, 160))}</p>
          </article>
        </a>
      `).join("") : `<div class="card"><p class="muted">No posts found on this page.</p></div>`}
    </div>

    <div class="pagination">
      <button class="btn" id="prevBtn2">Prev</button>
      <div class="muted">Page ${state.page}</div>
      <button class="btn" id="nextBtn2">Next</button>
    </div>
  `;

  document.getElementById("searchInput").addEventListener("input", e => {
    state.search = e.target.value;
    renderPosts();
  });

  document.querySelectorAll(".label").forEach(el => {
    el.addEventListener("click", () => {
      const lbl = el.getAttribute("data-label") || null;
      state.label = lbl || null;
      state.page = 1;
      renderPosts();
    });
  });

  document.getElementById("prevBtn").onclick = document.getElementById("prevBtn2").onclick = () => {
    if (state.page > 1) { state.page--; renderPosts(); }
  };
  document.getElementById("nextBtn").onclick = document.getElementById("nextBtn2").onclick = () => {
    state.page++; renderPosts();
  };
}

async function renderPost(number) {
  let post;
  try { post = await apiFetch(`/issues/${number}`); } catch (e) {
    appEl.innerHTML = `<div class="card"><p class="muted">Error loading post: ${escapeHtml(e.message)}</p></div>`;
    return;
  }

  appEl.innerHTML = `
    <a class="muted" href="#/posts">← Back to posts</a>
    <div class="post-wrap">
      <h1 style="margin-top:.6rem">${escapeHtml(post.title)}</h1>
      <div class="post-meta">#${post.number} • ${isoToDate(post.created_at)} • ${post.labels.map(l => escapeHtml(l.name)).join(", ")}</div>
      <div class="post-body" id="postBody"></div>

      <div id="comments" class="comments"></div>
    </div>
  `;

  const md = post.body || "";
  document.getElementById("postBody").innerHTML = marked.parse(md);

  injectGiscus();
}

/* ========== COMMENTS (giscus) ========== */
function injectGiscus() {
  const container = document.getElementById("comments");
  container.innerHTML = `
    <script src="https://giscus.app/client.js"
            data-repo="TheRealDuckers/blog.duckers.dev"
            data-repo-id="R_kgDOQ3vjAA"
            data-category-id="DIC_kwDOQ3vjAM4C01AL"
            data-mapping="specific"
            data-term="Comments"
            data-strict="0"
            data-reactions-enabled="1"
            data-emit-metadata="0"
            data-input-position="top"
            data-theme="catppuccin_latte"
            data-lang="en"
            data-loading="lazy"
            crossorigin="anonymous"
            async>
    </script>
  `;
}


/* ========== DATA ========== */
async function fetchIssues(page = 1, label = null) {
  // newest first and only issues created by the repo owner
  let path = `/issues?sort=created&direction=desc&page=${page}&per_page=${PER_PAGE}&creator=${encodeURIComponent(OWNER)}`;
  if (label) path += `&labels=${encodeURIComponent(label)}`;
  try {
    const data = await apiFetch(path);
    return Array.isArray(data) ? data.filter(i => !i.pull_request) : [];
  } catch (e) {
    console.error("fetchIssues error", e);
    return [];
  }
}

/* ========== ROUTER ========== */
function router() {
  const hash = location.hash || "#/";
  if (hash === "#/" || hash === "") { renderHome(); return; }
  if (hash === "#/posts") { renderPosts(); return; }
  if (hash.startsWith("#/posts/")) {
    const id = hash.split("/")[2];
    renderPost(id);
    return;
  }
  renderHome();
}

/* ========== THEME ========== */
const themeToggle = document.getElementById("themeToggle");
if (localStorage.dark === "true") document.body.classList.add("dark");
themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.dark = document.body.classList.contains("dark");
  const iframe = document.querySelector("iframe.giscus-frame");
  if (iframe && iframe.contentWindow) {
    const theme = document.body.classList.contains("dark") ? "dark" : "light";
    iframe.contentWindow.postMessage({ giscus: { setConfig: { theme } } }, "https://giscus.app");
  }
});

/* ========== INIT ========== */
window.addEventListener("hashchange", router);
router();

