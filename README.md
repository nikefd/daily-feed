# daily-feed

每天自动抓取权威一手信源的链接,聚合成一个列表页。运行在 **Cloudflare Workers** 上,零外部服务依赖,`wrangler deploy` 一键部署。

## 数据源

| 源 | 方式 | 说明 |
|---|---|---|
| **GitHub Trending** | 解析 `github.com/trending`(无官方 API) | 当日热门仓库 + 今日 star 数 |
| **Anthropic** | 解析 `anthropic.com/news`(无官方 RSS) | 最新文章 |
| **OpenAI** | 官方 RSS `openai.com/news/rss.xml` | 最新文章 + 发布日期 |
| **Hacker News** | 官方 Firebase API | Top stories + 分数/评论数 |

> Anthropic 与 GitHub Trending 靠解析页面 HTML。若站点改版导致解析为空,**会自动保留上一次成功的数据**并在卡片上标记 `⚠ 抓取异常`,不影响其他源。届时更新 `src/sources/anthropic.ts` / `src/sources/github.ts` 里的匹配规则即可。

## 工作方式

- **每天定时**:Cron Trigger 每天 UTC 01:00 抓取一次,写入 KV(见 `wrangler.toml` 的 `[triggers]`)。
- **手动触发**:页面右上角「立即刷新」按钮,或直接 `POST /refresh`。
- 首次访问且 KV 为空时,会在后台自动跑一次抓取。

## 路由

| 路径 | 说明 |
|---|---|
| `GET /` | 聚合列表页(HTML) |
| `GET /api/feed` | 各源最新数据(JSON) |
| `POST /refresh` | 立即抓取全部源并写入 KV;配置了 token 时需鉴权 |

## 本地开发

```bash
npm install
npm run dev          # http://localhost:8787
```

本地用 miniflare 模拟 KV,无需 Cloudflare 账号即可调试。访问 `/` 或 `POST /refresh` 测试抓取。

## 部署到 Cloudflare(三步)

```bash
# 1. 登录(首次)
npx wrangler login

# 2. 创建 KV namespace,把返回的 id 填进 wrangler.toml 的 kv_namespaces.id
npx wrangler kv namespace create FEED_KV

# 3. 部署
npm run deploy
```

部署后 Worker 会按 `wrangler.toml` 的 cron 每天自动抓取。用 `npm run tail` 观察日志。

### 保护手动刷新接口(可选,推荐公开部署时启用)

设置一个 secret,启用后 `/refresh` 需要 token,页面按钮会提示输入(存在浏览器 localStorage):

```bash
npx wrangler secret put REFRESH_TOKEN
```

未设置 `REFRESH_TOKEN` 时 `/refresh` 公开可调用。

## 配置项(`wrangler.toml` 的 `[vars]`)

| 变量 | 默认 | 说明 |
|---|---|---|
| `HN_LIMIT` | 30 | Hacker News 取前 N 条 |
| `RSS_LIMIT` | 15 | OpenAI RSS 取前 N 条 |
| `PAGE_LIMIT` | 15 | Anthropic / GitHub 各取前 N 条 |

修改抓取频率:改 `[triggers].crons`(标准 cron,UTC)。
