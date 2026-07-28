# HANDOFF（交接报告）

> **规则：** 谁做完谁更新本文件。下一位只认本文件 + Git，不靠聊天记录猜。

**更新时间：** 2026-07-28

**当前执行者：** Codex 已完成 UI-CHAPTERS-02；用户可验收果冻入口视觉
**分支：** `main`

---

## 当前目标

在保留原始 HTML 的前提下，建立可维护源码并完成首页 Hero、漂浮关键词、A/B 双锚点、详情落点、AI 预览，以及用户提供的浅色 `hero-bg.png` 背景。

> 如何借助 AI 技术，让外界更深入地了解胖东来“自由·爱”的企业文化？

完整方案：`pangdonglai_project/PRODUCT_PLAN.md`  
本轮质量报告：`docs/QA_REPORT.md`

---

## 业务目标

1. 首页中心呈现“不要只停留在表面——理解胖东来，从理解人开始”。
2. 大众与媒体对胖东来的印象关键词在标题周围动态漂浮。
3. A 锚点平滑进入详情；B 锚点显示“与胖东来对话”并进入 AI 区域。
4. 展示胖东来各门店照片与地理位置，点击进入本项目内部门店详情页。
5. 建立通向各大媒体原始报道的新闻档案。
6. 后续接入基于公开可核验资料、能展示来源和不确定性的 AI 问答。
7. 页面避免只做表面赞美，能够呈现赞誉、疑问、争议与证据。

---

## 已完成

- [x] 协作工作区与 Git 基建（正式目录 `D:\ai沙盒\codex+grok`）。
- [x] 读取并审阅现有 `胖东来网页（7月22日1点34分）.html`。
- [x] 完成产品与实施计划；更新 `docs/PLAN.md`。
- [x] 用户确认首页方案并授权进入代码实现。
- [x] 原始 HTML 基线提交 `91c5804`，哈希 `f6b248970dd5f088e89940a7f726cfa4e1a05159`（后续不得覆盖）。
- [x] 可维护工程与首页双锚点首版：`aae95cc`。
- [x] 同步用户浅色首页背景：`f8090a0`（`public/hero-bg.png` + `globals.css`）。
- [x] 22 个疑问式漂浮关键词、中心三层文案、A/B 锚点、详情与 AI 结构示例。
- [x] 响应式、键盘焦点、减少动态、离屏暂停动画（dev 验证）。
- [x] `npm run lint`、`npm test` 在 `f8090a0` 上通过。
- [x] **Grok 以 `f8090a0` 完成首页独立质量验收**，结论：**有条件通过**，详见 `docs/QA_REPORT.md`。
- [x] 用户授权后，按现有浅色简约风格重构 AI 问答界面与用户/助手气泡（低饱和、圆角、与关键词胶囊气质统一）；保留非官方与未接资料库说明。
- [x] 用户选定方案三：A/B 锚点主次分层（A 轻量次级胶囊，B 主行动大胶囊）。
- [x] 本地 RAG 已接入 BM25 检索、流式回答与来源展示；用户批准的 L1/L2 资料已写入 `knowledge-base.json`。
- [x] **Codex QA-01**：生产预览改由 Worker 配置提供静态资源；`npm run start` 下首页引用的 1 个 CSS 与 5 个 JS 均返回 200，浏览器样式和客户端交互正常。

---

## 未完成 / 下一步

- [x] **Codex【RAG-CASE-01】**：按 Grok 审核顺序完成“案例档案 + 事件事实/文化理解双轨回答”：定义 `caseId`、`claimType`、`finality` schema；事件轨仅引用同案例资料，文化轨不得裁定具体客诉真伪；无 `final` 证据时禁止终局话术；界面展示案例来源的证据阶段；补充误召回与最终结论边界测试。
- [x] **RAG-CASE-01 资料边界**：V3-1（茶叶反馈）和 V3-2（鲜鸡蛋争议）以用户批准的 `limited` 归因资料进入各自案例轨，只能说明企业公开的初步回应，不能作为终局结论；SOURCE_AUDIT_03 其余候选仍未入库。
- [x] **Codex RAG-CASE-02**：面向用户的案例补充说明改为自然语言；不展示内部字段、分级标签或检索过程。
- [x] **Codex UI-EXPLORE-01**：按用户要求删除 Explore 区的索引、标题与说明文案；内容卡片直接承接该区域。
- [x] **Codex UI-CHAPTERS-01**：将原“三扇门”改为两个内容板块框架：01“查看各个门店信息、位置等具体情况”、02“查看热点事件”；AI 对话保留在独立区域。
- [x] **Codex STORE-01**：用胖东来官网的 14 家门店资料补全门店目录，提供官方照片、地址、夏季与常规营业时间、周二安排和地图入口。
- [x] **Codex STORE-02**：美化双栏目与门店目录；点击 01 后门店卡片按顺序出场，点击任一门店照片在新标签打开胖东来官网。
- [x] **Codex UI-CHAPTERS-02**：将双栏目缩小并分隔为独立果冻按钮，补充匹配的悬停浮起与按下回弹效果。
- [ ] Codex（可选）QA-02：微调 360 视口关键词坐标。
- [ ] Codex（可选）QA-03：锚点后焦点落到栏目标题。
- [ ] 用户确认 AI 对话区浅色重构视觉是否满意。
- [x] Grok：按 `RAG_SYNC.md` 审计用户指定 3 条 RAG 候选链接 → `docs/SOURCE_AUDIT.md`（2026-07-24；待用户批准 approved 项）。
- [ ] Grok（可选）：独立复测 `npm run start` 的生产预览资产。
- [ ] 用户：门店照片授权或占位图策略；浅色 hero 视觉最终确认。
- [ ] AI 接口阶段前再定模型、部署与预算。

---

## 本轮结论

```text
网络印象 → 结构化理解 → 门店/报道/证据 → 可追溯 AI 对话
```

正式页面：`pangdonglai_project/site`（vinext / React / TypeScript）。  
首页验收提交：`f8090a0`（有条件通过）。  
本轮另完成：AI 对话区浅色柔和 UI 重构（用户授权，与 Hero/关键词视觉统一）。

待用户确认：AI 对话区新视觉。

未推送远端，未部署云端。

---

## 给下一位的指令

### 给 Codex

1. **只修 QA 报告列出的问题**；不要扩大范围做新栏目。
2. 不修改原始 HTML。  
3. 生产预览使用 `npm run start`；修完更新本 HANDOFF 并小步提交。

### 给 Grok

1. 首页 `f8090a0` 验收已写入 `docs/QA_REPORT.md`。  
2. 下一项：来源核验 `SOURCE_AUDIT.md`；或等 Codex 修完 QA-01 后做生产预览回归。

### 给用户

1. 确认浅色 hero、360 首屏与 **AI 对话区新气泡 UI** 是否可接受。  
2. 门店图与发布仍待授权。

---

## 文件边界

- 不修改：`pangdonglai_project/胖东来网页（7月22日1点34分）.html`
- 网站源码：`pangdonglai_project/site/**`（生产预览入口：`scripts/start.mjs`、`wrangler.preview.json`）
- 方案：`pangdonglai_project/PRODUCT_PLAN.md`、`docs/PLAN.md`
- 交接：`docs/HANDOFF.md`
- 质量报告：`docs/QA_REPORT.md`
- 待写来源报告：`docs/SOURCE_AUDIT.md`

---

## 验收标准（首页 `f8090a0`）

- [x] lint / test / build 通过  
- [x] 主标题、关键词、A/B 锚点、浅色 hero-bg（dev）  
- [x] 窄屏 / 键盘 / 减少动态无明显阻断  
- [x] 原始 HTML 哈希未变  
- [x] 生产预览（`npm run start`）CSS/JS 完整 — **通过（2026-07-27）**

---

## 最近变更

| 时间 | 谁 | 做了什么 | 文件 |
|---|---|---|---|
| 2026-07-22 | Grok | 协同基建 + Git 初始化 | README.md, AGENTS.md, docs/*, .gitignore |
| 2026-07-22 | Codex | 产品与实施计划 | PRODUCT_PLAN.md, PLAN.md, HANDOFF.md |
| 2026-07-23 | Codex | 原始 HTML 基线与工程迁移 | site/**, HANDOFF 等 |
| 2026-07-23 | Codex | 首页首屏与双锚点 | `aae95cc` |
| 2026-07-23 | Codex | 同步浅色 hero-bg 与样式 | `f8090a0`（hero-bg.png, globals.css） |
| 2026-07-23 | Grok | 以 `f8090a0` 做首页独立验收：有条件通过 | docs/QA_REPORT.md, docs/HANDOFF.md |
| 2026-07-23 | Grok | 重构 AI 对话区为浅色柔和气泡 UI，与 Hero/关键词风格统一 | site/app/page.tsx, site/app/globals.css, docs/HANDOFF.md |
| 2026-07-24 | Grok | A/B 锚点方案三：主次分层软胶囊 | site/app/globals.css, site/app/page.tsx, docs/HANDOFF.md |
| 2026-07-27 | Codex | 修复生产预览静态资源映射；验证 CSS/JS、浏览器样式与客户端交互 | site/package.json, site/scripts/start.mjs, site/wrangler.preview.json, site/README.md, docs/* |
| 2026-07-28 | Codex | 按 Grok 审核完成案例 schema、事件/文化双轨检索、证据阶段来源标记与回归测试 | knowledge-base.json, site/worker/index.ts, site/app/page.tsx, site/app/globals.css, site/tests/rendered-html.test.mjs, docs/HANDOFF.md |
| 2026-07-28 | Codex | 将案例回答的补充说明融入正文，移除面向用户的内部字段、分级标签和检索术语 | site/worker/index.ts, site/app/page.tsx, site/app/globals.css, site/tests/rendered-html.test.mjs, docs/HANDOFF.md |
| 2026-07-28 | Codex | 删除 Explore 区的引导文案，并收紧内容卡片顶部留白 | site/app/page.tsx, site/app/globals.css, docs/HANDOFF.md |
| 2026-07-28 | Codex | 将原“三扇门”改为门店地图与新闻档案的双栏内容框架 | site/app/page.tsx, site/app/globals.css, docs/HANDOFF.md |
| 2026-07-28 | Codex | 按用户指定文案更新双栏：查看各个门店信息、位置等具体情况；查看热点事件 | site/app/page.tsx, docs/HANDOFF.md |
| 2026-07-28 | Codex | 补全 14 家门店目录：官方照片、地址、营业时间、周二安排与地图入口 | site/app/page.tsx, site/app/globals.css, site/tests/rendered-html.test.mjs, docs/HANDOFF.md |
| 2026-07-28 | Codex | 美化双栏目与门店目录；实现 01 点击展开、门店卡片顺序出场和照片跳转官网 | site/app/page.tsx, site/app/globals.css, site/tests/rendered-html.test.mjs, docs/HANDOFF.md |
| 2026-07-28 | Codex | 将双栏目收束为独立果冻按钮，并加入悬停与按下回弹效果 | site/app/globals.css, docs/HANDOFF.md |

---

## 阻塞

- **产品：** 门店图片、AI 接口、云端发布待用户确认。
