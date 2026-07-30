# HANDOFF（交接报告）

> **规则：** 谁做完谁更新本文件。下一位只认本文件 + Git，不靠聊天记录猜。

**更新时间：** 2026-07-30

**当前执行者：** Grok 已按用户定级入库红内裤案 L1 企业材料+L2 判决；社交原片待用户审链
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

- [x] **RAG-RESEARCH-01**：建立 Codex 与 Grok 强制共用的互联网资料检索与 RAG 入库规范；明确候选池、来源优先级、企业身份核验、转载去重、事件阶段、用户批准、版权边界、入库测试和向量库接入条件，并在 `AGENTS.md` 设置任务前必读入口。
- [x] **Codex【RAG-CASE-01】**：按 Grok 审核顺序完成“案例档案 + 事件事实/文化理解双轨回答”：定义 `caseId`、`claimType`、`finality` schema；事件轨仅引用同案例资料，文化轨不得裁定具体客诉真伪；无 `final` 证据时禁止终局话术；界面展示案例来源的证据阶段；补充误召回与最终结论边界测试。
- [x] **RAG-CASE-01 资料边界**：V3-1（茶叶反馈）和 V3-2（鲜鸡蛋争议）以用户批准的 `limited` 归因资料进入各自案例轨，只能说明企业公开的初步回应，不能作为终局结论；SOURCE_AUDIT_03 其余候选仍未入库。
- [x] **Codex RAG-CASE-02**：面向用户的案例补充说明改为自然语言；不展示内部字段、分级标签或检索过程。
- [x] **Codex UI-EXPLORE-01**：按用户要求删除 Explore 区的索引、标题与说明文案；内容卡片直接承接该区域。
- [x] **Codex UI-CHAPTERS-01**：将原“三扇门”改为两个内容板块框架：01“查看各个门店信息、位置等具体情况”、02“查看热点事件”；AI 对话保留在独立区域。
- [x] **Codex STORE-01**：用胖东来官网的 14 家门店资料补全门店目录，提供官方照片、地址、夏季与常规营业时间、周二安排和地图入口。
- [x] **Codex STORE-02**：美化双栏目与门店目录；点击 01 后门店卡片按顺序出场，点击任一门店照片在新标签打开胖东来官网。
- [x] **Codex UI-CHAPTERS-02**：将双栏目缩小并分隔为独立果冻按钮，补充匹配的悬停浮起与按下回弹效果。
- [x] **Codex STORE-03**：优化 01 门店目录“收起”体验：卡片逆序退场、区域平滑回收并把视线带回入口，避免内容突然消失造成页面跳动。
- [x] **Codex DEPLOY-01**：用户已授权并完成仅本人可访问的预览版本发布；未创建公开访问或自定义域名。
- [x] **Codex ARCH-01**：将门店展示资料从 React 页面抽离为独立内容文件，并抽取前后端共用的聊天消息契约，降低内容更新与接口演进的耦合。
- [x] **Codex DEPLOY-CN-01**：在保留现有本地与 Sites 预览流程的前提下，增加腾讯云 CloudBase 可用的 Node 容器运行入口、部署配置与回归验证，为后续国内正式上线做兼容适配。
- [x] **Codex DEPLOY-CN-02**：已将容器版本部署到用户创建的 CloudBase 环境 `pangdonglai-site-d2eqrsj5b8ada0f`；安全版本 004 正常承载 100% 流量，测试域名的首页与健康检查均返回 200；暂未绑定正式域名。
- [x] **Codex SEC-01**：已为 `/api/chat` 增加仅作用于问答接口的应用层保护：同一客户端每分钟最多 6 次、单实例最多 4 个并发、64 KiB 请求体上限、45 秒上游超时，并返回友好的 413/429/503/504 提示；待绑定正式域名后可再叠加 CloudBase HTTP 网关路径级限频。
- [x] **Codex AI-LIVE-01**：用户已在 CloudBase 服务设置中配置 `DEEPSEEK_API_KEY`；仅核验变量存在，不读取或记录密钥值。公网真实问答返回 200，包含流式正文、资料来源与完成事件；线上超大输入按预期返回 413。
- [ ] Codex（可选）QA-02：微调 360 视口关键词坐标。
- [ ] Codex（可选）QA-03：锚点后焦点落到栏目标题。
- [ ] 用户确认 AI 对话区浅色重构视觉是否满意。
- [x] Grok：按 `RAG_SYNC.md` 审计用户指定 3 条 RAG 候选链接 → `docs/SOURCE_AUDIT.md`（2026-07-24；待用户批准 approved 项）。
- [ ] Grok（可选）：独立复测 `npm run start` 的生产预览资产。
- [ ] 用户：门店照片授权或占位图策略；浅色 hero 视觉最终确认。
- [x] AI 接口采用 `deepseek-v4-flash` 非思考模式并部署在 CloudBase；通过 700 token 输出上限、按客户端分钟限频和 DeepSeek 账户余额共同控制初期成本，后续按真实流量调整。

---

## 本轮结论

```text
网络印象 → 结构化理解 → 门店/报道/证据 → 可追溯 AI 对话
```

正式页面：`pangdonglai_project/site`（vinext / React / TypeScript）。  
首页验收提交：`f8090a0`（有条件通过）。  
本轮另完成：AI 对话区浅色柔和 UI 重构（用户授权，与 Hero/关键词视觉统一）。

待用户确认：AI 对话区新视觉。

未推送远端；CloudBase 测试域名已部署安全版本 004。

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
| 2026-07-30 | Codex | 建立 Codex 与 Grok 强制共用的互联网资料检索与 RAG 入库规范，并在共同项目规则中设置检索、审核和入库前必读入口 | docs/RAG_RESEARCH_PROTOCOL.md, AGENTS.md, docs/HANDOFF.md |
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
| 2026-07-28 | Codex | 优化门店目录收起动效：卡片逆序退场、目录平滑收拢并在收起时回到 01 入口，消除内容被直接裁切后的页面跳动 | site/app/page.tsx, site/app/globals.css, docs/HANDOFF.md |
| 2026-07-28 | Codex | 绑定 Sites 项目并发布仅本人可访问的预览版本；未公开发布，站点级 WAF 限流待平台入口或 Worker 级方案落实 | site/.openai/hosting.json, docs/HANDOFF.md |
| 2026-07-29 | Codex | 将 14 家门店资料抽为独立 JSON 内容文件，并抽出前后端共用的聊天请求与来源契约；补充结构回归测试 | site/data/store-directory.json, site/data/stores.ts, site/shared/chat.ts, site/app/page.tsx, site/worker/index.ts, site/tests/rendered-html.test.mjs, docs/HANDOFF.md |
| 2026-07-29 | Grok | 修复 L3 图书 limited 未进一般轨检索：一般轨可搜 approved + 无 caseId 的 limited；停用「怎么/是否」等虚词作 distinctive 证据，避免书误召回门店/酱油问；补充 how-to 召回测试 | knowledge-base.json, site/worker/index.ts, site/tests/rendered-html.test.mjs, docs/HANDOFF.md |
| 2026-07-29 | Grok | 用户要求图书多收录：按公开目录扩为 12 条主题摘要（仍不存全书）；prompt 强制「据书中讨论」归因；一般轨 top-k=5；sources 展示书目链接 | knowledge-base.json, site/worker/index.ts, site/tests/rendered-html.test.mjs, docs/SOURCE_AUDIT_04.md, docs/HANDOFF.md |
| 2026-07-29 | Codex | 保留现有本地与 Sites 预览，新增 CloudBase Node 容器运行入口、非 root Dockerfile、密钥排除规则、部署手册及首页/静态资源/API 回归测试 | site/scripts/cloudbase-server.mjs, site/Dockerfile, site/.dockerignore, site/package.json, site/tests/rendered-html.test.mjs, docs/DEPLOY_CN.md, docs/HANDOFF.md |
| 2026-07-29 | Codex | 定位 CloudBase 首次构建失败为部署包缺少项目根知识库；将容器构建上下文提升到项目目录，并以最小允许清单同时纳入 site 与 knowledge-base.json | pangdonglai_project/Dockerfile, pangdonglai_project/.dockerignore, site/tests/rendered-html.test.mjs, docs/DEPLOY_CN.md, docs/HANDOFF.md |
| 2026-07-29 | Codex | 定位 CloudBase 二次构建失败为 Sites Vite 配置被 Docker 白名单误排除；仅放行非敏感 hosting.json，继续排除环境变量和密钥文件 | pangdonglai_project/.dockerignore, site/tests/rendered-html.test.mjs, docs/DEPLOY_CN.md, docs/HANDOFF.md |
| 2026-07-29 | Codex | CloudBase 版本 003 构建并全量发布成功；测试域名首页、`/healthz` 与 6 个 CSS/JS 资源均验收为 200，尚未配置正式域名与云端 DeepSeek 密钥 | docs/HANDOFF.md |
| 2026-07-30 | Codex | 为 AI 问答增加按客户端分钟限频、实例并发上限、请求体上限及模型超时；页面端同步增加请求超时与友好错误提示，15 项测试及 lint 通过 | site/worker/index.ts, site/app/page.tsx, site/tests/rendered-html.test.mjs, docs/HANDOFF.md |
| 2026-07-30 | Codex | CloudBase 安全版本 004 构建成功并接管 100% 流量；公网首页与 `/healthz` 返回 200，未配置密钥时 `/api/chat` 按预期返回 503 | docs/HANDOFF.md |
| 2026-07-30 | Codex | 用户自行在 CloudBase 配置 DeepSeek 密钥；只核验变量存在。真实问答 3.4 秒返回 200，正文、来源、完成事件齐全；线上超大输入返回 413 | docs/HANDOFF.md |
| 2026-07-30 | Grok | 用户提交王波粒「逛 3 天胖东来」抖音链；按 RAG_RESEARCH_PROTOCOL 写 V5-1 候选卡（L4，建议 limited 或仅作线索）；同源 B站/YouTube 已记录；**未写 knowledge-base** | docs/SOURCE_AUDIT_05.md, docs/HANDOFF.md |
| 2026-07-30 | Grok | 用户选 C：视频不入库；按线索上挖，对照已有 L1/L2/L3；新增上级候选建议 C1 新华社千笔楼、C4 影城退票报道；塑封书/抓娃娃等仍缺上级源 | docs/SOURCE_AUDIT_05.md, docs/HANDOFF.md |
| 2026-07-30 | Grok | 用户批准 C1+C4：入库新华社千笔楼（approved/L2，3 chunks）与界面影城半价退票（limited/L2，2 chunks）；补充召回测试 | knowledge-base.json, site/tests/rendered-html.test.mjs, docs/SOURCE_AUDIT_05.md, docs/HANDOFF.md |
| 2026-07-30 | Grok | 红内裤案：用户定 L1 企业早期回应/报告/起诉公示 approved；判决 L2 approved；社交原片 candidate 待审；案例轨与 UI 阶段文案 | knowledge-base.json, site/worker/index.ts, site/app/page.tsx, site/tests/rendered-html.test.mjs, docs/SOURCE_AUDIT_06.md, docs/HANDOFF.md |
| 2026-07-30 | Grok | 用户批准舆论表：澎湃马上评 L3 limited、识微情感占比 L4 limited、于东来要理性 L2 approved；网友抽样不进主库 | knowledge-base.json, docs/SOURCE_AUDIT_06.md, docs/HANDOFF.md |

---

## 阻塞

- **上线：** CloudBase 公网访问与 AI 对话均已可用；只剩正式域名需在完成 ICP 备案后绑定。
