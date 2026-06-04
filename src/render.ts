import type { Snapshot, SourceKey } from "./types";
import { SOURCES } from "./sources";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (isNaN(then)) return "未知";
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins} 分钟前`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} 小时前`;
  return `${Math.round(hrs / 24)} 天前`;
}

function renderSection(key: SourceKey, snap: Snapshot | null): string {
  const def = SOURCES.find((s) => s.key === key)!;
  const items = snap?.items ?? [];
  const status = snap?.error
    ? `<span class="err" title="${esc(snap.error)}">⚠ 抓取异常</span>`
    : snap
      ? `<span class="ok">${timeAgo(snap.fetchedAt)}</span>`
      : `<span class="err">无数据</span>`;

  const rows =
    items.length === 0
      ? `<li class="empty">暂无内容</li>`
      : items
          .map(
            (it) => `<li>
              <a href="${esc(it.url)}" target="_blank" rel="noopener noreferrer">${esc(it.title)}</a>
              ${it.meta ? `<span class="meta">${esc(it.meta)}</span>` : ""}
            </li>`
          )
          .join("");

  return `<section class="card">
    <header>
      <h2><a href="${esc(def.homepage)}" target="_blank" rel="noopener noreferrer">${esc(def.label)}</a></h2>
      ${status}
    </header>
    <ol>${rows}</ol>
  </section>`;
}

export function renderPage(
  snapshots: Record<SourceKey, Snapshot | null>,
  needsToken: boolean
): string {
  const sections = SOURCES.map((s) => renderSection(s.key, snapshots[s.key])).join("");

  return `<!doctype html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Daily Feed · 一手信源聚合</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    background: #0d1117; color: #c9d1d9;
  }
  @media (prefers-color-scheme: light) {
    body { background: #f6f8fa; color: #1f2328; }
    .card { background: #fff; border-color: #d0d7de; }
    a { color: #0969da; }
    .meta { color: #57606a; }
  }
  .wrap { max-width: 1200px; margin: 0 auto; padding: 24px 16px 48px; }
  .top { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
  h1 { font-size: 20px; margin: 0; }
  h1 small { font-weight: 400; opacity: .6; font-size: 13px; margin-left: 8px; }
  button {
    font: inherit; cursor: pointer; padding: 8px 16px; border-radius: 8px;
    border: 1px solid #30363d; background: #238636; color: #fff;
  }
  button:disabled { opacity: .6; cursor: progress; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
  .card { background: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 16px; }
  .card header { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
  .card h2 { font-size: 15px; margin: 0; }
  .card h2 a { text-decoration: none; }
  a { color: #58a6ff; text-decoration: none; }
  a:hover { text-decoration: underline; }
  ol { margin: 0; padding: 0; list-style: none; }
  ol li { padding: 7px 0; border-top: 1px solid rgba(128,128,128,.15); display: flex; flex-direction: column; gap: 2px; }
  ol li:first-child { border-top: none; }
  .meta { font-size: 12px; color: #8b949e; }
  .ok { font-size: 12px; color: #8b949e; }
  .err { font-size: 12px; color: #f85149; }
  .empty { color: #8b949e; }
  #msg { font-size: 13px; color: #8b949e; }
</style>
</head>
<body>
  <div class="wrap">
    <div class="top">
      <h1>Daily Feed <small>一手信源聚合 · ${new Date().toISOString().slice(0, 10)}</small></h1>
      <div>
        <span id="msg"></span>
        <button id="refresh">立即刷新</button>
      </div>
    </div>
    <div class="grid">${sections}</div>
  </div>
<script>
  const NEEDS_TOKEN = ${needsToken};
  const btn = document.getElementById('refresh');
  const msg = document.getElementById('msg');
  btn.addEventListener('click', async () => {
    let token = '';
    if (NEEDS_TOKEN) {
      token = localStorage.getItem('refreshToken') || prompt('请输入 refresh token:') || '';
      if (token) localStorage.setItem('refreshToken', token);
    }
    btn.disabled = true; msg.textContent = '抓取中…';
    try {
      const res = await fetch('/refresh', {
        method: 'POST',
        headers: token ? { 'Authorization': 'Bearer ' + token } : {}
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      msg.textContent = '完成,刷新页面…';
      location.reload();
    } catch (e) {
      msg.textContent = '失败: ' + e.message;
      if (NEEDS_TOKEN) localStorage.removeItem('refreshToken');
      btn.disabled = false;
    }
  });
</script>
</body>
</html>`;
}
