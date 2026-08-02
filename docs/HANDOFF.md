# HANDOFF（交接报告）

> **规则：** 谁做完谁更新本文件。下一位只认本文件 + Git，不靠聊天记录猜。

**更新时间：** 2026-08-02

**当前执行者：** Codex 已将 R4 大众回答契约接入本地 Worker，并建立 18 道代表题；自动契约检查 18/18，下一项是本地真实回答人工验收，暂不接向量库
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
- [x] 本地 RAG 已接入 BM25 检索、流式回答与来源展示；用户批准资料由 `knowledge/` 目录维护，构建时生成只读兼容索引。
- [x] **Codex QA-01**：生产预览改由 Worker 配置提供静态资源；`npm run start` 下首页引用的 1 个 CSS 与 5 个 JS 均返回 200，浏览器样式和客户端交互正常。

---

## 未完成 / 下一步

- [x] **RAG-ARCH-02（用户已授权）**：将单一 `pangdonglai_project/knowledge-base.json` 无损迁移为 `knowledge/manifest.json + sources/<id>/metadata.json/content.md + chunks/<id>.jsonl + cases/<id>.json`；23 份资料、53 个片段和 3 个案例全部保留，现有摘要统一标记 `summary_only`，Worker 改读构建生成的兼容索引，Docker 与结构回归测试通过。此次未抓取或伪造缺失原文。
- [x] **RAG-CONTENT-AUDIT-01**：已逐篇审计现有 23 份资料的页面可访问性、正文保存权限与覆盖状态，结论见 `docs/SOURCE_AUDIT_08.md`；当前没有任何资料具有已核验的全文转载许可。
- [x] **RAG-CONTENT-BACKFILL-01（用户已授权）**：现有 23 份资料已全部逐篇处理。17 份升级为 `partial_text`，6 份因企业原帖/报告缺失、页面不可定位或图书版权边界保留 `summary_only`；片段总数由 53 增至 100。保留摘要是终轮审计结论，不是遗漏；详见 `docs/SOURCE_AUDIT_08.md`。
- [x] **RAG-PLAN-01**：将“帮助网友理解自由与爱”的目标更新为共同路线图；明确六条文化主线、当前能力与缺口、R0～R7 推进顺序、验收标准和 Codex/Grok/用户分工，并加入共同必读入口。
- [x] **RAG-CULTURE-R0**：正式文化知识地图、54 道网友问题试卷与可重复运行的 BM25 基线均已建立；当前通过 28/54（51.8%），有正例问题召回 32/47，案例/轨道路由 50/54，无答案问题安全 0/6。资料缺口、检索错误和生成越界风险清单见 `docs/RAG_CULTURE_BASELINE_V1.md`；本轮未修改 Query 改写算法、未接向量库。
- [x] **RAG-CULTURE-R3A（用户明确要求提前执行）**：检索只在追问需要时继承最近两条用户问题；扩充自然终局表达并避免把“企业后来怎么解释”误判为终局；为已确认缺失的薪酬表、权限表、通用调查流程、供应商名单、财务计划和全部投诉结论增加资料充分性闸门。同一 54 题当前评测为 39/54（72.2%），比冻结基线增加 11 题、无退步；终局意图 54/54、无答案安全 6/6。该闸门不是通用事实判断器，错别字和语义召回仍待后续完整 R3。
- [x] **RAG-CULTURE-R2**：现有 30 份资料的 135 个正式片段已全部写入 `culture-v1`，包含文化主线、关联级别、做法、机制、解释性价值、利益相关者、现实张力和对应时间；4 个纯背景片段不强行挂文化主线。构建脚本会拒绝漏标、未知枚举、边界材料无张力说明或无保留的文化断言。网站正式检索仍不消费新字段、未部署，详见 `docs/RAG_CULTURE_ANNOTATION_V1.md`。
- [x] **RAG-CULTURE-R2B（用户批准）**：用同一 54 题比较当前 BM25 与 `culture-v1` 字段直接拼接。控制组 39/54（72.2%），收紧到仅非案例文化字段后实验组仍为 38/54（70.4%）；新增通过 `C5-02`，但 `C4-02`、`C6-02` 退步，禁用片段隔离由 51/54 降至 50/54。实验未满足“提高、零退步、安全不下降”门槛，网站继续使用控制组配置；未接向量库、未部署。
- [x] **RAG-CULTURE-R3B（用户批准继续）**：新增规则式 Query 文化主线识别，54/54 题均包含预期主线；只对原 BM25 已通过证据门槛的非案例候选做小权重重排，不扩大候选范围。3%、5%、8%、12%、20% 五档权重均保持 39/54，新增通过和退步均为 0，隔离 51/54、终局 54/54、无答案安全 6/6 不变。因未提高综合通过题数，不启用到网站正式检索；详见 `docs/RAG_CULTURE_BM25_THEME_RERANK_EXPERIMENT.md`。
- [x] **RAG-CULTURE-R3C（用户批准继续）**：完成可审计 Query 改写 V1；使用固定领域错字表与 10 条审核短语扩展，保留原问题和逐条改写记录，案例路由只使用纠错结果、不使用扩展词。相较启用前控制组 39/54，实验与当前本地正式检索均为 50/54（92.6%），新增通过 11 题、零退步；路由 54/54、终局 54/54、无答案安全 6/6，隔离保持 51/54。已进入本地 Worker 和当前评测，未部署 CloudBase；详见 `docs/RAG_CULTURE_QUERY_REWRITE_V1_EXPERIMENT.md`。
- [x] **RAG-CULTURE-R3D（用户批准继续）**：完成回答用途过滤 V1；区分“薪酬福利与文化关系”“经营表现与授权文化复制证明”“顾客投诉奖与员工委屈奖”，并对未指定案例的企业自行送检终局问题启用资料不足闸门。薪酬文化题只前置直接支持资料，不删除相关观点；复制证明与投诉奖题才执行用途过滤。相较 50/54 控制组新增通过剩余 4 题、零退步，固定试卷当前为 54/54；召回、路由、隔离、终局和无答案安全均达到该试卷满分。已进入本地 Worker，未部署 CloudBase；详见 `docs/RAG_CULTURE_ANSWER_PURPOSE_FILTER_V1_EXPERIMENT.md`。满分仅表示当前固定题集通过，不代表通用充分性判断已经完成。
- [x] **RAG-CULTURE-R4-SPEC（用户已确认）**：R4 的内部“回答—做法—文化逻辑—边界”改为面向大众的“简单说—具体来看—为什么这么做—还要分清”；热点事件使用“这件事现在知道什么—企业当时怎么处理—后来有没有明确结论—这件事让我们观察什么”。四步是自然组织原则，不强制机械标题；内部归因、时间、事件阶段和不得裁定客诉真伪的约束不变。该规范现已由 R4A 接入本地 Worker。
- [x] **RAG-CULTURE-R4A（用户要求落地）**：已把一般文化、热点事件和资料不足三种大众回答方式集中到共享回答契约并接入本地 Worker；从原 54 题中选出 18 道回答级代表题，每条文化主线 3 道。自动检查 18/18 取得正确检索上下文与回答契约，36 项测试和 lint 通过。自动检查未调用 DeepSeek，真实回答人工验收仍未完成；未接向量库、未部署 CloudBase，详见 `docs/RAG_CULTURE_R4_IMPLEMENTATION.md`。
- [ ] **RAG-CULTURE-R1**：用户已批准 C1“员工的尊严、自由与生活”首批两组资料。7 份资料、32 个片段和 3 个独立案例已按 `approved` / `limited` 范围入库，审核与结果见 `docs/SOURCE_AUDIT_C1_01.md`；知识库现有 30 份资料、135 个片段和 6 个案例。本阶段尚未完成后续 C1 一手资料主干，不得自动扩充。
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

1. 资料架构只维护 `pangdonglai_project/knowledge/**`；禁止手工修改 `knowledge/compiled/knowledge-base.json` 或恢复旧根文件。
2. `RAG-CULTURE-R0`、`RAG-CULTURE-R2/R2B`、`RAG-CULTURE-R3A/R3B/R3C/R3D` 与 `RAG-CULTURE-R4A` 已完成；R4 本地回答契约和 18 道代表题已建立。下一项是生成这 18 道真实回答并按试卷人工验收；在回答边界稳定前不接向量库。
3. 所有 RAG 工作先读 `docs/RAG_RESEARCH_PROTOCOL.md` 和 `docs/RAG_CULTURE_ROADMAP.md`；不修改原始 HTML，完成后更新本 HANDOFF 并小步提交。

### 给 Grok

1. 先完整阅读 `docs/RAG_RESEARCH_PROTOCOL.md` 与 `docs/RAG_CULTURE_ROADMAP.md`。
2. 现有 23 份资料终轮回填已完成；如审核本轮，应重点检查 4 份新 `partial_text` 的归因与终局边界，以及 6 份保留 `summary_only` 的理由，不要把摘要认作原文。
3. R0 阶段独立检查文化问题是否覆盖六条主线，并复核误召回、跨案例和最终结论边界；未经用户批准不得新增来源或入库。

### 给用户

1. 确认六条文化主线是否符合你对“自由与爱”的理解目标。
2. R1 开始后批准、限制或拒绝候选资料；最终判断回答是否真正帮助普通网友理解。

---

## 文件边界

- 不修改：`pangdonglai_project/胖东来网页（7月22日1点34分）.html`
- 网站源码：`pangdonglai_project/site/**`（生产预览入口：`scripts/start.mjs`、`wrangler.preview.json`）
- 正式知识库：`pangdonglai_project/knowledge/**`（入口 `manifest.json`；`compiled/knowledge-base.json` 为生成文件，禁止手改）
- 一次性迁移脚本：`pangdonglai_project/scripts/migrate-knowledge-v2.mjs`（默认拒绝运行，避免覆盖后续资料）
- 构建脚本：`pangdonglai_project/site/scripts/build-knowledge.mjs`
- 方案：`pangdonglai_project/PRODUCT_PLAN.md`、`docs/PLAN.md`
- RAG 文化路线：`docs/RAG_CULTURE_ROADMAP.md`
- RAG 资料规范：`docs/RAG_RESEARCH_PROTOCOL.md`
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
| 2026-08-02 | Codex | 按用户要求将 R4 正式接入本地 Worker：一般文化、热点事件和资料不足分别使用对应大众理解顺序，且不强制机械标题；从原 54 题选出 18 道代表题并建立可重复的回答契约检查，18/18 通过。36 项测试与 lint 通过。自动检查未调用 DeepSeek，真实回答仍待人工验收；未接向量库、未部署 | site/shared/answer-guidance.mjs, site/worker/index.ts, site/scripts/evaluate-rag-r4-contract.mjs, site/tests/rendered-html.test.mjs, site/package.json, evaluation/rag-culture-r4-*.json, docs/RAG_CULTURE_R4_IMPLEMENTATION.md, docs/RAG_CULTURE_ROADMAP.md, docs/PLAN.md, docs/HANDOFF.md |
| 2026-08-02 | Codex | 按用户确认将 R4 从内部术语“回答—做法—文化逻辑—边界”改写为大众表达“简单说—具体来看—为什么这么做—还要分清”；同时确定热点事件的自然四步、可合并但不可省略重要边界的规则和回答级验收标准。当前仅更新规范与交接，未修改提示词、检索代码或云端版本 | docs/RAG_CULTURE_ROADMAP.md, docs/PLAN.md, docs/HANDOFF.md |
| 2026-08-02 | Codex | 继续处理 50/54 后剩余四题，完成回答用途过滤 V1：薪酬文化题只前置直接证据；授权文化复制证明排除不能证明文化复制的经营数据；当前顾客投诉奖排除员工委屈奖和具体事件金额；未指定案例的企业自行送检终局问题进入资料不足闸门。对照实验由 50/54 升至 54/54、零退步，隔离由 51/54 升至 54/54，其余安全指标保持满分；已进入本地 Worker。35 项测试、构建和 lint 通过，未接向量库、未部署 | site/shared/retrieval.mjs, site/worker/index.ts, site/scripts/evaluate-rag-baseline.mjs, site/package.json, site/tests/rendered-html.test.mjs, evaluation/rag-culture-*.json, docs/RAG_CULTURE_*.md, docs/HANDOFF.md |
| 2026-08-02 | Codex | 按用户要求继续完成可审计 Query 改写 V1：固定领域错字修正与 10 条审核口语/同义扩展均保留原问题和审计记录，案例路由不使用扩展词。54 题由 39/54 升至 50/54，新增通过 11 题、零退步；路由与终局均 54/54、无答案安全 6/6、隔离保持 51/54，满足启用门槛并进入本地 Worker；新增启用前冻结控制组、实验报告和回归测试。34 项测试及 lint 通过，未接向量库、未部署 | site/shared/retrieval.mjs, site/worker/index.ts, site/scripts/evaluate-rag-baseline.mjs, site/package.json, site/tests/rendered-html.test.mjs, evaluation/rag-culture-*.json, docs/RAG_CULTURE_*.md, docs/HANDOFF.md |
| 2026-08-02 | Codex | 按用户要求继续完成 Query 文化主线识别与小权重重排实验：54/54 题识别到预期主线；重排严格限制在原 BM25 候选且排除案例字段扩散。3%～20% 五档权重均保持 39/54，未新增通过也未退步，安全指标不变，因此按“必须提高”门槛拒绝启用；33 项测试与 lint 通过，未部署 | site/shared/retrieval.mjs, site/scripts/evaluate-rag-baseline.mjs, site/package.json, evaluation/rag-culture-bm25-theme-rerank-experiment.json, docs/RAG_CULTURE_BM25_THEME_RERANK_EXPERIMENT.md, site/tests/rendered-html.test.mjs, docs/RAG_CULTURE_ANNOTATION_V1.md, docs/RAG_CULTURE_ROADMAP.md, docs/HANDOFF.md |
| 2026-08-02 | Codex | 经用户批准，用同一 54 题完成 `culture-v1` BM25 对照实验；全量直接拼接与仅非案例字段两轮均为 38/54，最终收紧方案相较 39/54 控制组新增通过 C5-02、但 C4-02/C6-02 退步，禁用片段隔离降至 50/54。已设置“提高、零退步、安全不下降”启用门槛并明确拒绝上线，实验开关仅供复测；32 项测试与 lint 通过，未接向量库、未部署 | site/shared/retrieval.mjs, site/scripts/evaluate-rag-baseline.mjs, site/package.json, evaluation/rag-culture-bm25-culture-v1-experiment.json, docs/RAG_CULTURE_BM25_CULTURE_V1_EXPERIMENT.md, site/tests/rendered-html.test.mjs, docs/RAG_CULTURE_ANNOTATION_V1.md, docs/RAG_CULTURE_ROADMAP.md, docs/HANDOFF.md |
| 2026-08-02 | Codex | 按用户要求为现有 135 个正式片段完成 `culture-v1` 标注；区分直接、辅助、边界与纯背景资料，增加做法、机制、解释性价值、利益相关者、张力和时间字段；构建时强制校验标注结构并补充回归测试与审计报告。未修改检索排序、未接向量库、未部署 | knowledge/chunks/*.jsonl, knowledge/compiled/knowledge-base.json, knowledge/README.md, site/scripts/annotate-culture-v1.mjs, site/scripts/build-knowledge.mjs, site/tests/rendered-html.test.mjs, docs/RAG_CULTURE_ANNOTATION_V1.md, docs/RAG_CULTURE_ROADMAP.md, docs/HANDOFF.md |
| 2026-08-01 | Codex | 按用户明确要求提前处理上下文、终局意图和资料不足噪声：仅对追问继承最近用户话题，增加自然终局表达规则，并以可维护的已知缺口闸门阻止薪酬表、权限表、供应商名单等无依据请求进入生成上下文；冻结基线保持 28/54，当前同题集升至 39/54（72.2%）、无退步，终局意图 54/54、无答案安全 6/6；31 项测试与 lint 通过，未接向量库、未部署 | site/shared/retrieval.mjs, site/worker/index.ts, site/scripts/evaluate-rag-baseline.mjs, evaluation/rag-culture-current-evaluation.json, docs/RAG_CULTURE_CURRENT_EVALUATION.md, site/tests/rendered-html.test.mjs, docs/RAG_CULTURE_ROADMAP.md, docs/HANDOFF.md |
| 2026-08-01 | Codex | 抽取网站与评测共用的原样 BM25/案例路由模块，建立可重复运行的 54 题基线脚本与逐题结果；当前通过 28/54（51.8%），有正例召回 32/47、路由 50/54、隔离 49/54、无答案安全 0/6，已输出资料缺口、检索错误和生成越界风险清单；29 项测试与 lint 通过。本轮未调用 DeepSeek、未修改 Query、未接向量库、未部署 | site/shared/retrieval.mjs, site/scripts/evaluate-rag-baseline.mjs, evaluation/rag-culture-bm25-baseline-v1.json, docs/RAG_CULTURE_BASELINE_V1.md, site/tests/rendered-html.test.mjs, docs/RAG_CULTURE_*, docs/HANDOFF.md |
| 2026-08-01 | Codex | 用户批准 C1 首批两组资料后，正式入库新华社员工之家、特定招聘公告、夜班报平安产品案例，以及尝面员工处分、彩礼倡议、降薪传言三组现实边界资料；新增 7 份资料、32 个片段和 3 个独立案例，试卷由 48 题扩为 54 题。知识构建得到 30 份资料、135 个片段、6 个案例；28 项测试与 lint 通过，未部署 | docs/SOURCE_AUDIT_C1_01.md, docs/RAG_CULTURE_*, pangdonglai_project/knowledge/**, pangdonglai_project/evaluation/rag-culture-questions-v1.json, site/worker/index.ts, site/tests/rendered-html.test.mjs, docs/HANDOFF.md |
| 2026-08-01 | Codex | 建立六条主线的“自由与爱”文化知识地图和 48 题首批网友问题试卷；随后按用户要求检索 C1 员工主题，筛选 30 余个结果、深审 7 组候选并形成批准清单。候选尚未获用户逐项批准，未写入正式知识库、未部署 | docs/RAG_CULTURE_KNOWLEDGE_MAP.md, pangdonglai_project/evaluation/rag-culture-questions-v1.json, docs/SOURCE_AUDIT_C1_01.md, docs/HANDOFF.md |
| 2026-08-01 | Codex | 完成最后 10 份资料终轮处理：文化制度转载、红内裤一审报道、茶叶初步回应、鸡蛋送检报道升级为 `partial_text`；百科门户、申红丽页面、3 份缺企业原帖的红内裤材料和图书保留 `summary_only` 并记录原因。现有 23 份资料全部处理完毕，共 100 个片段；新增鸡蛋监管终局边界测试，23 项测试与 lint 通过，未新增来源、未部署 | docs/SOURCE_AUDIT_08.md, pangdonglai_project/knowledge/**, site/tests/rendered-html.test.mjs, docs/RAG_CULTURE_ROADMAP.md, docs/HANDOFF.md |
| 2026-08-01 | Grok | 调查茶叶苍蝇：未见情况说明（二）/终局报告；加厚 V3-1 正文与 6 条 chunks（共 103 片段）；案例别名扩展 | docs/SOURCE_AUDIT_TEA_FLY.md, knowledge/cases/tea-fly*, knowledge/sources/media-tea-fly*, knowledge/chunks/media-tea-fly*, knowledge/manifest.json, docs/HANDOFF.md |
| 2026-07-31 | Codex | 完成第三批 5 份资料回填：永辉鲁谷店调改、影城半价退票、澎湃红内裤判决评论、于东来理性表态传播链、识微商业舆情指标；明确他企实践、媒体评论、人物表态和商业监测边界，片段增至 89，新增永辉边界测试后 22 项测试通过，未新增来源、未部署 | docs/SOURCE_AUDIT_08.md, pangdonglai_project/knowledge/**, site/tests/rendered-html.test.mjs, docs/RAG_CULTURE_ROADMAP.md, docs/HANDOFF.md |
| 2026-07-31 | Codex | 完成第二批 5 份文化资料回填：新华社“6A 景区”、新华网《觉醒胖东来》书评、清华管理评论、界面“自由·爱”线索、委屈奖媒体记录；均保留来源归因、时点和版权边界，知识片段增至 72，未新增来源、未部署 | docs/SOURCE_AUDIT_08.md, pangdonglai_project/knowledge/**, site/tests/rendered-html.test.mjs, docs/RAG_CULTURE_ROADMAP.md, docs/HANDOFF.md |
| 2026-07-31 | Codex | 完成现有 23 份来源的首轮正文权限与覆盖审计；首批将官网简介、官网门店页和人民日报访谈升级为 partial_text，以事实、必要短引文和段落定位生成 58 个检索片段；21 项测试与 lint 通过，未新增来源、未部署 | docs/SOURCE_AUDIT_08.md, pangdonglai_project/knowledge/**, site/tests/rendered-html.test.mjs, docs/RAG_CULTURE_ROADMAP.md, docs/HANDOFF.md |
| 2026-07-31 | Codex | 将 23 份资料、53 个片段和 3 个案例从单一 JSON 无损迁移为 manifest、来源元数据/内容、JSONL 切片和独立案例；现有内容标记 summary_only，构建自动生成兼容索引，21 项测试与 lint 通过 | pangdonglai_project/knowledge/**, site/scripts/build-knowledge.mjs, site/worker/index.ts, Dockerfile, .dockerignore, site/tests/rendered-html.test.mjs, docs/* |
| 2026-07-31 | Codex | 将“帮助网友理解自由与爱”的目标整理为 RAG 主路线图：六条文化主线、R0～R7 顺序、验收标准与协作分工；同步总体计划、共同必读入口和交接任务 | docs/RAG_CULTURE_ROADMAP.md, docs/PLAN.md, AGENTS.md, docs/HANDOFF.md |
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
| 2026-07-31 | Grok | 用户选方案丙：入库清华自由·爱、界面理念起源、委屈奖、永辉调改、新华大纲转述；SOURCE_AUDIT_07 登记官网手册深挖缺口 | knowledge-base.json, docs/SOURCE_AUDIT_07.md, docs/HANDOFF.md |
| 2026-07-31 | Grok | 线甲：核验 baike.azpdl 百科门户；入库门户 L1、2022 企业文化制度媒体转载 L2、申红丽幸福生命手册表述 L2 | knowledge-base.json, docs/SOURCE_AUDIT_07.md, docs/HANDOFF.md |

---

## 阻塞

- **上线：** CloudBase 公网访问与 AI 对话均已可用；只剩正式域名需在完成 ICP 备案后绑定。
