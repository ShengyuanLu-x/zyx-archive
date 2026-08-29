// 首页逻辑：读取所有事件并显示成列表。

async function renderHomepage() {
  const listEl = document.getElementById("event-list");
  const statusEl = document.getElementById("status");

  try {
    const events = await loadAllEvents();

    if (events.length === 0) {
      statusEl.textContent = "目前还没有任何事件，请在 data/events 里添加。";
      return;
    }

    statusEl.remove();

    listEl.innerHTML = events
      .map(
        (ev) => `
        <a class="event-card" href="event.html?id=${encodeURIComponent(ev.id)}">
          <div class="event-date">${escapeHtml(ev.date)}</div>
          <div class="event-title">${escapeHtml(ev.title)}</div>
          <div class="event-summary">${escapeHtml(ev.summary || "")}</div>
        </a>`
      )
      .join("");
  } catch (err) {
    statusEl.textContent = "加载资料时出错：" + err.message;
    console.error(err);
  }
}

renderHomepage();
