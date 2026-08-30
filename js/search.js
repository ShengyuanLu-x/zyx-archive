// 全站搜索：完全在浏览器里进行，不需要服务器参与。
// 打开任意一个页面时，会把 nav.json + 所有被引用到的事件文件读一遍，
// 在内存里拼成一份"搜索用清单"，然后根据输入框内容做关键字匹配。

let searchIndexPromise = null;

async function buildSearchIndex() {
  const nav = await loadNav();
  const records = [];

  async function walk(node, crumbs) {
    if (node.id) {
      records.push({
        title: node.title,
        subtitle: crumbs.map((c) => c.title).filter(Boolean).join(" › ") || "分类",
        href: `category.html?id=${encodeURIComponent(node.id)}`,
        external: false,
        keywords: node.title.toLowerCase(),
      });
    }
    const newCrumbs = node.id ? [...crumbs, node] : crumbs;

    for (const child of node.children || []) {
      if (child.type === "event") {
        try {
          const ev = await fetchJson(`data/events/${child.eventId}.json`);
          const crumbText = newCrumbs.map((c) => c.title).join(" › ");
          records.push({
            title: ev.title,
            subtitle: crumbText,
            href: `event.html?id=${encodeURIComponent(ev.id)}`,
            external: false,
            keywords: `${ev.title} ${ev.summary || ""}`.toLowerCase(),
          });
          for (const m of ev.materials || []) {
            records.push({
              title: m.title || "(未命名链接)",
              subtitle: `${crumbText} › ${ev.title} · ${m.platform || ""}`,
              href: m.url,
              external: true,
              keywords: `${m.title || ""} ${m.platform || ""} ${ev.title}`.toLowerCase(),
            });
          }
        } catch (err) {
          console.warn("搜索索引：事件加载失败", child.eventId, err);
        }
      } else if (child.type === "link") {
        const crumbText = newCrumbs.map((c) => c.title).join(" › ");
        records.push({
          title: child.title || "(未命名链接)",
          subtitle: `${crumbText} · ${child.platform || ""}`,
          href: child.url,
          external: true,
          keywords: `${child.title || ""} ${child.platform || ""}`.toLowerCase(),
        });
      } else {
        await walk(child, newCrumbs);
      }
    }
  }

  await walk(rootNode(nav), []);
  return records;
}

function getSearchIndex() {
  if (!searchIndexPromise) searchIndexPromise = buildSearchIndex();
  return searchIndexPromise;
}

function renderResults(container, records, query) {
  if (!query.trim()) {
    container.innerHTML = "";
    container.classList.remove("shown");
    return;
  }

  const q = query.trim().toLowerCase();
  const matches = records.filter((r) => r.keywords.includes(q)).slice(0, 8);

  if (matches.length === 0) {
    container.innerHTML = `<div class="search-empty">没有找到匹配"${escapeHtml(query)}"的内容</div>`;
  } else {
    container.innerHTML = matches
      .map(
        (r) => `
        <a class="search-result" href="${escapeHtml(r.href)}" ${r.external ? 'target="_blank" rel="noopener noreferrer"' : ""}>
          <div class="search-result-title">${escapeHtml(r.title)}${r.external ? ' <span class="search-ext">↗</span>' : ""}</div>
          <div class="search-result-sub">${escapeHtml(r.subtitle)}</div>
        </a>`
      )
      .join("");
  }
  container.classList.add("shown");
}

function initSiteSearch() {
  const input = document.getElementById("search-input");
  const resultsEl = document.getElementById("search-results");
  if (!input || !resultsEl) return;

  input.addEventListener("input", async () => {
    const records = await getSearchIndex();
    renderResults(resultsEl, records, input.value);
  });

  input.addEventListener("focus", async () => {
    const records = await getSearchIndex();
    if (input.value.trim()) renderResults(resultsEl, records, input.value);
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".site-search")) {
      resultsEl.classList.remove("shown");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      resultsEl.classList.remove("shown");
      input.blur();
    }
  });
}

initSiteSearch();
