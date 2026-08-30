// 首页和分类页共用的渲染逻辑。
// index.html 没有 ?id= 参数，代表"根目录"（5 个大 tab）；
// category.html?id=xxx 显示某一个分类下面的内容。

function findAncestorColor(path) {
  for (let i = path.length - 1; i >= 0; i--) {
    if (path[i].color) return path[i].color;
  }
  return "#D0CBE3";
}

function breadcrumbHtml(path) {
  return path
    .map((node, i) => {
      const isLast = i === path.length - 1;
      const label = node.id ? escapeHtml(node.title) : "首页";
      if (isLast) {
        return `<span class="crumb current">${label}</span>`;
      }
      const href = node.id ? `category.html?id=${encodeURIComponent(node.id)}` : "index.html";
      return `<a class="crumb" href="${href}">${label}</a>`;
    })
    .join('<span class="crumb-sep">›</span>');
}

async function renderChildCard(child, accentColor) {
  if (child.type === "event") {
    try {
      const ev = await fetchJson(`data/events/${child.eventId}.json`);
      return `
        <a class="node-card event-card-mini" href="event.html?id=${encodeURIComponent(ev.id)}">
          <div class="node-card-kicker">事件</div>
          <div class="node-card-title">${escapeHtml(ev.title)}</div>
          <div class="node-card-date">${escapeHtml(ev.date)}</div>
          <div class="node-card-desc">${escapeHtml(ev.summary || "")}</div>
        </a>`;
    } catch (err) {
      return `<div class="node-card node-card-error">事件加载失败：${escapeHtml(child.eventId)}</div>`;
    }
  }

  if (child.type === "link") {
    return `
      <a class="node-card link-card" href="${escapeHtml(child.url)}" target="_blank" rel="noopener noreferrer">
        ${platformBadgeHtml(child.platform || "?")}
        <span class="node-card-title">${escapeHtml(child.title || "(未命名链接)")}</span>
        <span class="material-arrow">↗</span>
      </a>`;
  }

  // 普通分类节点（文件夹）：如果这个节点自己定义了颜色（比如顶层 5 个大 tab），优先用它自己的颜色
  const count = (child.children || []).length;
  const cardColor = child.color || accentColor;
  return `
    <a class="node-card folder-card" href="category.html?id=${encodeURIComponent(child.id)}" style="--accent:${cardColor}">
      <div class="node-card-title">${escapeHtml(child.title)}</div>
      <div class="node-card-count">${count > 0 ? `${count} 项` : "暂无内容"}</div>
    </a>`;
}

async function renderNavPage() {
  const statusEl = document.getElementById("status");
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id") || "";

  try {
    const path = await loadNodePath(id);
    const current = path[path.length - 1];
    const accentColor = findAncestorColor(path);

    statusEl.remove();

    document.getElementById("breadcrumb").innerHTML = breadcrumbHtml(path);
    const titleEl = document.getElementById("page-title");
    if (current.title) {
      titleEl.textContent = current.title;
    } else {
      titleEl.remove();
    }
    document.documentElement.style.setProperty("--accent", accentColor);

    const introEl = document.getElementById("intro");
    if (current.intro) {
      introEl.textContent = current.intro;
      introEl.classList.add("shown");
    } else {
      introEl.remove();
    }

    const children = current.children || [];
    const gridEl = document.getElementById("node-grid");

    if (children.length === 0) {
      gridEl.innerHTML = `<p class="empty-hint">这里还没有资料，敬请期待。</p>`;
      return;
    }

    const cardsHtml = await Promise.all(children.map((c) => renderChildCard(c, accentColor)));
    gridEl.innerHTML = cardsHtml.join("");
  } catch (err) {
    statusEl.textContent = "加载出错：" + err.message;
    console.error(err);
  }
}

renderNavPage();
