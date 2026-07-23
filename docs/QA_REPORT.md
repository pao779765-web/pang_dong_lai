# QA 报告：首页独立验收（`f8090a0`）

> **验收对象提交：** `f8090a0`（`feat: 同步浅色首页背景与站点源码`）  
> **验收人：** Grok  
> **日期：** 2026-07-23  
> **工作区：** `D:\ai沙盒\codex+grok`  
> **范围：** `pangdonglai_project/site` 首页质量验收；**未修改**网站源码  
> **对照：** `AGENTS.md`、`docs/PLAN.md`、`docs/HANDOFF.md`、`pangdonglai_project/PRODUCT_PLAN.md` §5.5

---

## 最终结论

# **有条件通过**

首页在 **`vinext dev`** 下满足本轮功能与体验验收要求：主标题、漂浮关键词、A/B 锚点、用户提供的浅色 `hero-bg.png`、窄屏布局、键盘焦点与减少动态效果均可验证；lint / test / build 通过；原始 HTML 未被改动。

**未完全通过的原因：**

1. **`vinext start` 生产本地预览仍不托管 `/assets/*`（CSS/JS 404）**——页面 HTML 与 `public/` 图片可用，但无样式/无客户端增强（严重度：高，阻塞生产预览与部署前冒烟）。  
2. **360×800 下 1 个关键词与标题包围盒相交**（严重度：低；层级在标题之下，标题仍可读）。

不建议因非阻塞项回退 `f8090a0`；建议 Codex 优先修生产静态资源后再回归。

---

## 1. 通过项

| 编号 | 检查项 | 结果 |
|------|--------|------|
| P1 | Git：`HEAD` = `f8090a0e7147d74694eb20bb583a14aae3b4dff7`，工作树验收前 clean | 通过 |
| P2 | 提交内容：`globals.css` 浅色 Hero + `public/hero-bg.png`（约 1.0MB） | 通过 |
| P3 | 原始 HTML `git hash-object` = `f6b248970dd5f088e89940a7f726cfa4e1a05159`，与 `91c5804` / `HEAD` 一致 | 通过 |
| P4 | `npm run lint` | 通过（无报错） |
| P5 | `npm test`（含 `vinext build`） | 通过（2/2） |
| P6 | 主标题文案「不要只停留在表面—— / 理解胖东来 / 从理解人开始。」 | 通过（SSR + 浏览器） |
| P7 | 22 个疑问式公众/媒体印象关键词；断点收敛 8 / 16 / 22 | 通过 |
| P8 | A 锚点 `href="#explore"`；鼠标与键盘 Enter 可达，`#explore-title` 可见 | 通过 |
| P9 | B 锚点含「与胖东来对话」、`href="#ai-dialogue"`；鼠标与键盘可达 | 通过 |
| P10 | 浅色 `hero-bg.png`：`background` 引用 `/hero-bg.png`；dev 下 HTTP 200；截图可见水印底图 | 通过 |
| P11 | 窄屏 360×800：关键词 8 个、锚点纵向、布局可用 | 通过 |
| P12 | 键盘 Tab 可达 A/B，有 `:focus-visible` 样式 | 通过 |
| P13 | `prefers-reduced-motion: reduce`：动画时长≈0、`iteration-count:1`、`scroll-behavior:auto` | 通过 |
| P14 | 离屏暂停：`data-active=false`，`animation-play-state:paused` | 通过 |
| P15 | AI 区标明非官方、未接入真实库 | 通过（SSR 断言） |
| P16 | 验收过程未修改 `pangdonglai_project/site/**` | 通过 |

### 环境摘要

| 项 | 值 |
|----|-----|
| Node | v24.18.0 |
| 命令目录 | `pangdonglai_project/site` |
| 交互验收 | Playwright Chromium + `vinext dev` @ `http://localhost:5173/` |
| 生产对照 | `vinext start` @ 端口 4177 |

### 视口实测（dev）

| 视口 | 可见关键词 | 标题盒相交 | 锚点 | 控制台错误 |
|------|------------|------------|------|------------|
| 360×800 | 8 | `自由与爱？` 1 处 | A/B 通过 | 无 |
| 768×1024 | 16 | 0 | A/B 通过 | 无 |
| 1440×900 | 22 | 0 | A/B 通过 | 无 |
| 1440 reduced | 22 | 0 | A/B 通过 | 无 |

堆叠：`hero-core` z-index 3 > `keyword-field` z-index 2，关键词不盖住标题文字。

---

## 2. 发现的问题及严重程度

| ID | 严重程度 | 描述 | 证据 |
|----|----------|------|------|
| **QA-01** | **高** | `vinext start` 下 HTML 200，但 `/assets/*.css`、`/assets/*.js` 全部 **404**；`/hero-bg.png`、`/og.png`（public）可 200。生产本地预览无样式、无 React 客户端逻辑。 | 端口 4177 探测；HTML 引用如 `/assets/index-DuNYsR7a.css` 等 FAIL |
| **QA-02** | **低** | 360×800 下关键词「自由与爱？」与 `#hero-title` 包围盒相交；截图上贴近副标题区域。标题因更高 z-index 仍可读。 | Playwright 几何 + 截图 |
| **QA-03** | **低** | 锚点激活后焦点落在 section（`#explore` / `#ai-dialogue`），而非 `h2` 标题节点；与方案「焦点到栏目标题」略有差别。 | `activeId` = section id |
| **QA-04** | **信息** | 自动化测试仅 SSR 字符串断言，未覆盖 `hero-bg` 资源、视口几何、reduced-motion、生产资产。 | `tests/rendered-html.test.mjs` |
| **QA-05** | **信息** | 构建时 vinext 路由分类 Unknown 警告、代理环境变量警告；不失败。 | `npm test` 日志 |

---

## 3. 建议由 Codex 修复的事项

1. **【优先】QA-01**：修复 `vinext start` / worker 对 `dist/client/assets/*` 的静态托管，或文档明确仅允许的生产预览方式，并增加「CSS/JS 200」冒烟。  
2. **【可选】QA-02**：微调 `@media (max-width: 760px)` 下关键词坐标，避免与标题盒相交。  
3. **【可选】QA-03**：滚动后将 `focus()` 落到 `#explore-title` / `#dialogue-title`（`tabIndex={-1}`）。  
4. **【可选】QA-04**：补充 Playwright 或集成测试：`/hero-bg.png`、reduced-motion、生产资产。  

**不在本轮 Grok 范围内：** 新功能开发、门店图、真实 AI、云端部署。

---

## 4. 检查清单（用户要求）

- [x] 检查 Git 当前状态与最近提交（`f8090a0`）  
- [x] 运行 `npm run lint`  
- [x] 运行 `npm test`  
- [x] 主标题文案  
- [x] 漂浮印象关键词  
- [x] A → `#explore`  
- [x] 「与胖东来对话」→ `#ai-dialogue`  
- [x] 用户浅色 `hero-bg.png` 首页背景  
- [x] 窄屏 / 键盘 / 减少动态（dev 下无明显阻断问题）  
- [x] 原始 HTML 未修改  
- [x] 未改 `site` 源码；仅更新本报告与 HANDOFF  

---

## 5. 给下一位

| 角色 | 动作 |
|------|------|
| **Codex** | 修 QA-01；可选 QA-02/03；小步提交后交 Grok 复测生产预览 |
| **Grok** | 来源核验 `SOURCE_AUDIT.md`；QA-01 修复后复测 `vinext start` |
| **用户** | 确认浅色 hero 视觉；确认 360 关键词贴近是否可接受 |

---

*报告路径：`docs/QA_REPORT.md`。本地验收截图在 `.tmp_qa/`（不纳入 Git）。*
