# HANDOFF（交接报告）

> **规则：** 谁做完谁更新本文件。下一位只认本文件 + Git，不靠聊天记录猜。

**更新时间：** 2026-08-23

**当前执行者：** Grok 按用户要求启用本地向量检索（hybrid）并重启 `npm run dev`。
**Git 状态：** 本地 `main` 含未部署的 UI/热点改动、C1 第二轮知识库增量与召回 knobs。CloudBase 现网仍为 `pangdonglai-site-018`，按用户要求暂不发布。

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
- [x] **RAG-CULTURE-R4B（用户明确授权真实评测）**：用户同意将18道题及相关已审核知识库片段发送给 DeepSeek。最新本地 R4 Worker 顺序调用 18/18 成功，平均 3.98 秒；严格人工验收 10/18。热点事件 5/5 通过，一般文化 4/10、资料不足 1/3；八道失败集中在时间错误、无关案例、遗漏关键区分和单向文化裁定。37 项测试与 lint 通过。结果证明当前不应开始 R5；未部署，详见 `docs/RAG_CULTURE_R4_LIVE_EVALUATION.md`。
- [x] **RAG-CULTURE-R4C（用户要求直接完成前三步）**：不按八道失败题逐题追加提示词补丁；新增通用 Claim、AnswerPlan、AnswerValidation 三类对象。现有135个审核片段确定性生成135个 `claim-v1`，构建强制校验；每次问题只把允许事实与动态边界交给模型，首稿先检查数字、日期、跨案例、绝对判断与终局话术，失败自动重写一次，仍失败安全降级。固定检索54/54、R4自动契约18/18、41项测试与lint通过；未调用第二轮真实DeepSeek、未接向量库、未部署，详见 `docs/RAG_ANSWER_CONTROL_V1.md`。
- [x] **RAG-CULTURE-R4D（用户明确要求运行第二轮评测）**：同一18题及各题允许Claim发送给DeepSeek，调用18/18成功，严格验收由10/18升至12/18。首轮失败题修好5道，一般文化升至6/10、资料不足3/3；但4道有资料问题触发统一安全降级，导致3道原通过题回归，热点事件降至3/5。结论是AnswerValidation存在数字/编号和否定语境误报，安全降级也应保留最小可答事实；未接向量库、未部署，详见 `docs/RAG_CULTURE_R4_LIVE_EVALUATION_ROUND2.md`。
- [x] **RAG-CULTURE-R4E（用户要求继续通用修复）**：不为六道失败题逐题追加提示词。AnswerValidation 已区分列表编号与事实数字，把北京时间、资料日期和来源标题纳入数字依据，并识别“不能说已经证明”等否定语境；第二次重写仍失败时，有 Claim 的问题保留排名最高的最小可答事实。Claim 新增 `distinctions` 必要区分；AnswerPlan 保留 Top-5 BM25 验收口径，同时在同一安全过滤后的 Top-12 候选中按文字相关度、原检索分数和通用证据意图选择最多5条 Claim，能补入退休治理机制、投诉奖用途区分并优先文化争议边界。固定检索54/54、R4自动契约18/18、43项测试与lint通过；未调用第三轮DeepSeek、未接向量库、未部署，详见 `docs/RAG_ANSWER_CONTROL_V1.md`。
- [x] **RAG-CULTURE-R4F（用户明确要求实行第三轮评测）**：同一18题及各题允许Claim发送给DeepSeek，调用18/18成功，严格验收由12/18升至15/18。第二轮三道回归全部修复且无新增回归；一般文化7/10、资料不足3/3、热点事件5/5。退休传承题已覆盖轮值、委员会和手册，茶叶客服初步回应及鸡蛋送检边界不再错误降级。剩余三题显示：最小事实降级未优先具体做法、必要区分只进Prompt未进校验、争议题未稳定说明单案不能证明整套文化真伪。未接向量库、未部署，详见 `docs/RAG_CULTURE_R4_LIVE_EVALUATION_ROUND3.md`。
- [x] **RAG-CULTURE-R4G（用户接受有限通过）**：用户明确接受模型仍有不完美，不要求围绕剩余三道失败题继续增加专用代码；R4 以 15/18 作为本阶段有限通过结果。三类已知问题保留为后续通用质量债务，不作为 R5 的阻断条件，也不得把有限通过解释为模型不会产生幻觉。
- [x] **RAG-CULTURE-R5A（用户明确要求进入 R5）**：用户明确授权发送 135 个审核片段与 54 道评测问题；TokenHub `kinfra-text-embedding-0.6b` 已生成 135 个 1024 维文档向量，普通检索许可仍为 96 个，39 个案例受限片段不进入普通向量候选。首轮纯 RRF 为50/54、4回归、2严重回归；采用 BM25 锚定、禁止向量单独引入 `context_only` 背景片段和通用投诉奖励用途识别后，第二轮54/54、回归0、严重回归0。45项测试与lint通过；未接入Worker、未部署，详见 `docs/RAG_CULTURE_R5_HYBRID_EXPERIMENT.md`。
- [x] **RAG-CULTURE-R5B（用户已授权发送本批问题）**：31 道语义影子题在首次运行前以提交 `5f3f99a` 冻结。真实对照为 BM25 17/31、混合检索 19/31；一般题 Hit@5 从 13/24 升至 15/24，MRR@5 从 0.4444 升至 0.4965，新增通过 2、回归 0、资料不足 2/2、隔离 31/31。用户指定“红裤头开除员工”题两组均失败：正确文化边界片段排第 1 且未串入尝面员工解除合同材料，但因关键词案例路由未识别“红裤头”而停在一般轨，未稳定调出本案免职/降级事实。结论是向量有真实收益，但 BM25 锚定过强、语义案例路由和自然终局意图仍不足；未接入 Worker、未部署，详见 `docs/RAG_CULTURE_R5_SEMANTIC_SHADOW_V1.md`。
- [x] **RAG-CULTURE-R5C-1～6（用户要求执行）**：冻结 54+31 双基线并记录 SHA-256；BM25 Top 12 与向量 Top 12 经安全过滤后由加权 RRF（k=60、权重 1:0.65）直接决定 Top 5，不再固定 BM25 前五。语义案例路由使用现有案例 chunks 的向量相似度、领先差距和案例名称通用模糊匹配；终局意图覆盖监管盖章、尘埃落定、一审结果、法院处理、终审与定论等表达。固定题 54/54、影子题 24/31，相对 R5B 混合检索增加 5、回归 0，案例路由 5/5、隔离 31/31、资料不足 2/2、终局 31/31；用户红裤头题进入正确案例并避免串入尝面员工材料。49项测试与lint通过；未接 Worker、未部署，详见 `docs/RAG_CULTURE_R5C_EXPERIMENT.md`。
- [x] **RAG-CULTURE-R5C-7A（用户要求进行下一步）**：把已通过双基线的混合检索接入本地 Worker；新增 `RAG_RETRIEVAL_MODE=bm25|hybrid`，默认 `bm25`。显式启用 hybrid 后使用 RRF 1:0.65、向量 Top 12 与语义案例路由；缺 TokenHub 密钥、模型不一致或请求失败时自动退回 BM25。CloudBase Node 入口同步读取服务端变量，页面移除面向用户的 BM25 术语。51 项测试和 lint 通过，未部署。
- [x] **RAG-CULTURE-R5C-7B（用户明确授权）**：三道本地 Worker 真实问答均调用成功；普通文化题和资料不足题通过，用户红裤头题需修改，自动与人工验收均为 2/3。该题语义案例路由正确、Top-5 第三名已召回员工免职/降级直接资料且没有串入尝面员工案例，但 AnswerPlan 漏掉该 Claim，导致回答错误称公开资料未明确记载处理措施。结果原样保存且未记录密钥，未部署；详见 `docs/RAG_CULTURE_R5C_WORKER_LIVE.md`。
- [x] **RAG-CULTURE-R5C-8（用户要求执行）**：不为红裤头单题加补丁；在 `createAnswerPlan` 增加通用前提覆盖：当问题含可核实具体前提（员工处置、金额、比例、假期天数、处理结果等），且安全 `eligibleClaims` 中已有直接支持或纠正该前提的 Claim 时，强制至少保留 1 条。匹配只用 statement/title/topics，避免 `canSupport` 范围短语误覆盖。离线回归：53 项测试、固定 54/54、R4 契约 18/18、lint 通过；混合检索用冻结向量索引 mock 嵌入验证红裤头题必保留 `red-underwear-report-testing-and-staff` 且不串尝面案。2026-08-08 真实复测三题均返回 200、流式完成、DeepSeek 调用成功，自动检查 3/3；红裤头题已带出免职/降级 Claim 且未串案，资料不足题安全拒答但回答过于简短。结果写入 `evaluation/rag-culture-r5c-worker-live-v1.json`；尚未部署，人工质量复核仍需记录。
- [x] **RAG-RECALL-10（用户明确要求）**：每题总共召回 10 个 chunks：混合检索 BM25 通道 5 + embedding 通道 5，RRF 排序后不足 10 条时用剩余向量再补 BM25；纯 BM25 模式直接取 Top 10。`retrieved` 与 `answerCandidates` 同一批，不再另留 Top-12 隐藏池。AnswerPlan 的 Claim 上限仍为一般 5 / 案例 8，未改校验或降级。未部署。
- [ ] **RAG-CULTURE-R1**：C1 首批已入库（`docs/SOURCE_AUDIT_C1_01.md`）。第二轮用户已批示：B1 approved，B2/B3/B5 limited，B4/B6 拒绝；4 份休假口径资料已入库，见 `docs/SOURCE_AUDIT_C1_02.md`。C1 一手资料主干仍未完成（缺手册原文、完整薪酬表），不得自动扩充。知识库当前 41 份资料、172 片段、8 案例。
- [x] **RAG-RESEARCH-01**：建立 Codex 与 Grok 强制共用的互联网资料检索与 RAG 入库规范；明确候选池、来源优先级、企业身份核验、转载去重、事件阶段、用户批准、版权边界、入库测试和向量库接入条件，并在 `AGENTS.md` 设置任务前必读入口。
- [x] **Codex【RAG-CASE-01】**：按 Grok 审核顺序完成“案例档案 + 事件事实/文化理解双轨回答”：定义 `caseId`、`claimType`、`finality` schema；事件轨仅引用同案例资料，文化轨不得裁定具体客诉真伪；无 `final` 证据时禁止终局话术；界面展示案例来源的证据阶段；补充误召回与最终结论边界测试。
- [x] **RAG-CASE-01 资料边界**：V3-1（茶叶反馈）和 V3-2（鲜鸡蛋争议）以用户批准的 `limited` 归因资料进入各自案例轨，只能说明企业公开的初步回应，不能作为终局结论；SOURCE_AUDIT_03 其余候选仍未入库。
- [x] **Codex RAG-CASE-02**：面向用户的案例补充说明改为自然语言；不展示内部字段、分级标签或检索过程。
- [x] **Codex UI-EXPLORE-01**：按用户要求删除 Explore 区的索引、标题与说明文案；内容卡片直接承接该区域。
- [x] **Codex UI-CHAPTERS-01**：将原“三扇门”改为两个内容板块框架：01“查看各个门店信息、位置等具体情况”、02“查看热点事件”；AI 对话保留在独立区域。
- [x] **Codex STORE-01**：用胖东来官网的 14 家门店资料补全门店目录，提供官方照片、地址、夏季与常规营业时间、周二安排和地图入口。
- [x] **Codex STORE-02**：美化双栏目与门店目录；点击 01 后门店卡片按顺序出场，点击任一门店照片在新标签打开胖东来官网。
- [x] **Codex UI-CHAPTERS-02**：将双栏目缩小并分隔为独立果冻按钮，补充匹配的悬停浮起与按下回弹效果。
- [x] **Codex UI-HOTSPOT-01**：将 02“查看热点事件”接通为本地可展开档案；首个事件为 2026-07-17 网传“座谈会发言稿”事件，包含企业回应、资料边界、时间线、来源链接和继续提问入口；手机端展开档案时隐藏悬浮提问入口，避免遮挡内容。
- [x] **Codex UI-HOTSPOT-02**：按用户反馈将热点档案从深色信息面板推进为“案头证据桌”视觉：加入 FIELD NOTE 标记、事件水印、扫描线展开、状态雷达、实心/空心时间线节点语义和图钉剪报来源；完成桌面端与手机端浏览器检查。
- [x] **Codex UI-HOTSPOT-03**：按用户反馈将热点区改为“事件索引 → 单事件档案”两级浏览；索引使用桌面三列、平板两列、手机单列的事件关键词卡片，点击卡片后才展示具体时间线、回应、来源与证据边界；当前数据只有 1 件已审核事件，未虚构额外热点。
- [x] **Codex UI-HOTSPOT-04（用户明确要求）**：将热点档案索引层改为浅色关键词锚点，只展示可点击的新闻关键词气泡；移除索引层的额外标题说明、状态、数量和卡片信息，点击关键词后再进入现有事件详情。详情页同步统一为浅色；lint、build、Impeccable 检测和桌面/手机交互检查通过。`npm test` 仍有 1 项既有 R5C 断言落后于实际 3/3 结果。
- [x] **Codex UI-HOTSPOT-05（用户明确要求）**：扩展热点索引背景色彩与层次；为关键词锚点加入轻微弹性出场、高级陶瓷釉面材质和鼠标悬停反馈；使用生成式抽象釉彩纹理并压缩为 84 KB WebP，中央保持低对比以保证文字可读性；手机端锚点保持全宽，减少动态偏好下关闭入场动画。`npm run lint`、`npm run build`、Impeccable 检测和桌面端浏览器交互检查通过；`npm test` 仍仅有 1 项既有 R5C 旧断言失败。
- [x] **Codex UI-HOTSPOT-06（用户明确要求）**：重做关键词锚点，使其直接裁切生成式釉彩背景并采用有机瓷片轮廓、同源纹理游移和更克制的浮起反馈，不再呈现独立彩色渐变按钮感；同步重构展开后的完整事件详情，使主档案、状态面板、时间线、阅读说明、来源和行动入口共享同一釉面材质；保留全部事实、来源、交互、手机布局和浅色可读性。`npm run lint`、`npm run build`、Impeccable 检测和桌面浏览器完整路径通过；`npm test` 仍仅有 1 项既有 R5C 旧断言失败。
- [x] **Codex UI-HOTSPOT-07（用户明确要求）**：重新设计热点索引整体构图与关键词入口，解决当前背景、留白和按钮形体失衡的问题；保持浅色、关键词点击进入详情、出场/悬停动效、事实内容与响应式约束，但不再沿用当前椭圆瓷片按钮方案。改为方向性釉彩档案背景与不对称新闻档案条入口，详情页同步复用同源材质。
- [x] **Codex UI-HOTSPOT-08（用户明确要求）**：将热点档案的整页背景改为新闻编辑台/档案桌面风格，使用报纸校样、新闻照片、剪报、采访记录等新闻元素；锚点改为日期+标题的新闻档案卡片，保留点击详情、悬停反馈、动效、响应式和事实内容。
- [x] **Codex UI-HOTSPOT-09（用户明确要求）**：在新闻详情态右上侧加入独立 Logo 收起按钮；不使用项目宣传图中的“理解胖东来”大标题，改用紧凑 DL + 火焰标记 + PANDONG LAI 字标结构；点击返回热点索引，保留键盘焦点、悬停反馈、移动端缩小和减少动态兼容。
- [x] **Codex UI-HOTSPOT-10（用户明确要求）**：将详情页 Logo 收起按钮移到热点区块外层，改为视口固定的最右侧悬浮侧轨；桌面端加大并垂直居中，移动端缩窄适配，随网页滚动保持位置，点击仍返回热点索引。
- [x] **Codex UI-HOTSPOT-11（用户明确要求）**：放大右侧固定 Logo 收起侧轨中的“收起档案”文字，桌面端提高字号与字重，移动端同步放大，保持按钮整体比例与可读性。
- [x] **Codex UI-HOTSPOT-12（用户明确要求）**：继续强化“收起档案”操作标签，桌面端提升至 `1rem / 800` 并加深颜色与轻微文字高光，移动端提升至 `0.72rem`，确保在侧轨中更醒目。
- [x] **Codex UI-HOTSPOT-13（用户明确要求）**：将收起标签改为“收起 / 档案”两行竖排，并在下方加入醒目的向上箭头；箭头随悬停轻微上移，减少动态模式下关闭位移动画。
- [x] **Codex UI-HOTSPOT-14（用户明确要求）**：继续提高“收起 / 档案”两行文字在侧轨中的视觉占比，桌面端提升至 `1.16rem / 900`，移动端提升至 `0.82rem`，同时保持箭头与按钮边界不溢出。
- [x] **Codex UI-HOTSPOT-15（用户明确要求）**：根据用户截图进一步调整侧轨内信息层级，将“收起 / 档案”提升为主标题级别：桌面端 `1.45rem / 900` 并轻微放大，移动端 `0.92rem`，保持两行、箭头和按钮边界完整。
- [x] **Codex UI-HOTSPOT-16（用户明确要求）**：将桌面端“收起 / 档案”两行标签调整为 `2rem / 900`（约 32px），移动端调整为 `1rem`，并继续保持箭头、固定侧轨和窄屏边界完整。
- [x] **Codex UI-HOTSPOT-17（用户明确要求）**：将桌面端“收起 / 档案”两行标签调整为 `1.8rem / 900`（约 28.8px），移动端继续保持 `1rem`，确保箭头与侧轨边界完整。
- [x] **Codex UI-HOTSPOT-18 / NEWS-UI-01A（用户明确要求）**：依据 `news_summary` 的事件 7 专档整理“网传座谈会发言稿”详情；新增官方/第三方媒体/自媒体/传言四级来源账本、四节点时间线、三条结论边界、来源归因说明和已入库状态；快捷问题点击后直接发送到资料助手。保持新闻编辑台视觉，移除装饰性状态雷达与重复编号，手机端把固定侧轨收为底部角标。`npm run lint`、`npm run build`、`npm test`（58/58）与 Impeccable 检测通过；桌面浏览器路径通过，手机端最终截图受本地浏览器 URL 策略阻断，CSS 冲突已修复但仍建议后续真机复核。未部署。
- [x] **Codex UI-HOTSPOT-19（用户明确要求）**：精简新闻详情文案：删除来源类型前的重复说明和“这件事值得观察什么”区块；将结论边界标题改为“以下内容无法确认”，保留来源账本、时间线、边界清单与可核验来源。
- [x] **Codex UI-HOTSPOT-20（用户明确要求）**：使用 Impeccable 的 layout 工作流重整新闻详情页：按“结论 → 来源层级 → 时间线 / 延伸阅读”组织阅读顺序；将来源类型改为紧凑全宽矩阵，修复已删说明文字留下的双栏空位；收紧时间线与右侧阅读栏的比例、间距和移动端单栏回退。`npm run build`、`npm test`（58/58）和 Impeccable layout 检测通过；未上传 GitHub、未部署云端。
- [x] **Codex UI-HOTSPOT-21（用户明确要求）**：调整热点二级详情的标题层级：主标题最大字号从约 `4.9rem` 收至 `3.55rem`，并将事件日期固定置于标题下方；外层事件锚点不变。`npm run lint`、`npm test`（58/58）和 Impeccable type 检测通过；未上传 GitHub、未部署云端。
- [x] **Codex STORE-03**：优化 01 门店目录“收起”体验：卡片逆序退场、区域平滑回收并把视线带回入口，避免内容突然消失造成页面跳动。
- [x] **Codex DEPLOY-01**：用户已授权并完成仅本人可访问的预览版本发布；未创建公开访问或自定义域名。
- [x] **Codex ARCH-01**：将门店展示资料从 React 页面抽离为独立内容文件，并抽取前后端共用的聊天消息契约，降低内容更新与接口演进的耦合。
- [x] **Codex DEPLOY-CN-01**：在保留现有本地与 Sites 预览流程的前提下，增加腾讯云 CloudBase 可用的 Node 容器运行入口、部署配置与回归验证，为后续国内正式上线做兼容适配。
- [x] **Codex DEPLOY-CN-02**：已将容器版本部署到用户创建的 CloudBase 环境 `pangdonglai-site-d2eqrsj5b8ada0f`；安全版本 004 正常承载 100% 流量，测试域名的首页与健康检查均返回 200；暂未绑定正式域名。
- [x] **Codex SEC-01**：已为 `/api/chat` 增加仅作用于问答接口的应用层保护：同一客户端每分钟最多 6 次、单实例最多 4 个并发、64 KiB 请求体上限、45 秒上游超时，并返回友好的 413/429/503/504 提示；待绑定正式域名后可再叠加 CloudBase HTTP 网关路径级限频。
- [x] **Codex AI-LIVE-01**：用户已在 CloudBase 服务设置中配置 `DEEPSEEK_API_KEY`；仅核验变量存在，不读取或记录密钥值。公网真实问答返回 200，包含流式正文、资料来源与完成事件；线上超大输入按预期返回 413。
- [x] **Codex NEWS-UI-01（用户已布置）**：依据 `pangdonglai_project/news_summary/HANDOFF.md` 将 7 个已审核事件接入统一热点数据模型与前端索引；每个详情均包含官方/第三方媒体/自媒体/传言四级来源、时间线、结论边界、可核验来源和快捷问题直达 AI。事件 8～15 尚未入库或标记待核验，未作为正式热点展示。`npm run lint`、`npm test`（58/58）和 Impeccable layout 检测通过；未上传 GitHub、未部署云端。
- [x] **Codex NEWS-UI-02（用户明确要求）**：将事件 8 新乡擀面皮、9 许昌生活广场伤人案、10 人格尊严侵权公示、11 郑州首店、13 上半年人员流失、14 生活广场店关闭、15 梦之城项目接入前端热点索引和详情；事件 12 暂不接入。事件 8～15 已按协议获批入库；没有直接 URL 的来源显示为不可点击来源卡，不伪造链接。更新来源类型展示以兼容无 URL 来源；`npm run lint`、`npm test`（58/58）和 Impeccable 检测通过；未上传 GitHub、未部署云端。
- [x] **Codex NEWS-UI-03（用户明确要求）**：开放每个已展示事件的“继续追问”；快捷问题点击时附带该事件的 `followUpPrompt`，再发送具体问题，确保资料助手按事件上下文检索；事件 12 仍暂不接入。`npm run lint`、`npm test`（58/58）和 Impeccable 检测通过；未上传 GitHub、未部署云端。
- [x] **Codex NEWS-UI-04（用户明确要求）**：将“继续追问”从详情右侧阅读栏移到每个事件详情的最底部，作为全宽重点行动区；加入更醒目的 Q / FOLLOW-UP 标识、放大标题与说明、桌面三列快捷问题和移动端单列回退；保持点击直达资料助手与键盘焦点反馈。`npm run lint`、`npm test`（58/58）和 Impeccable 检测通过；未上传 GitHub、未部署云端。
- [x] **Codex NEWS-UI-05（用户明确要求）**：将热点事件一级索引改为居中的两列网格，桌面端每行两个并统一卡片宽度、间距和对齐；取消原先影响行列秩序的错落旋转，保留新闻档案卡材质与悬停反馈；760px 以下回退单列。`npm run lint`、`npm test`（58/58）和 Impeccable 检测通过；未上传 GitHub、未部署云端。
- [x] **Codex NEWS-UI-06（用户明确要求）**：将每个新闻详情页的来源按“官方 / 第三方媒体 / 自媒体”分组展示；为已保存 URL 的来源增加明确的“打开来源”入口，并对未保存原帖直链的条目保留“链接待核验”状态，不伪造链接。`npm run lint`、`npm test`（58/58）、`git diff --check` 和 Impeccable 检测通过；未上传 GitHub、未部署云端。
- [x] **Codex NEWS-UI-07（用户明确要求）**：将来源链接从详情页下方的“可核验来源”区域迁移到截图所示的四类来源账本中；每个来源格子内直接展示对应链接，并移除重复的下方来源分组。`npm run lint`、`npm test`（58/58）、`git diff --check` 和 Impeccable 检测通过；未上传 GitHub、未部署云端。
- [x] **Grok DEPLOY-GH-CB-01（用户明确要求）**：将 NEWS-UI-01～07、事件 7～15 知识库增量（39 份资料、167 片段、10 案例）与新闻专档提交并推送 GitHub `main`（`ca1e52b`）；CloudBase `pangdonglai-site-018` 已 100% 切流。最小包含 `knowledge/vector/r5-general-index.json`，不写入密钥。公网 `/` 与 `/healthz` 返回 200，首页含座谈会/擀面皮/人格尊严等热点且不含事件 12；1 个 CSS、5 个 JS 与门店图 200。`npm run lint`、`npm test`（58/58）通过。向量索引仍为 R5C 冻结基线，未重建。
- [x] **Grok UI-EXPLORE-02（用户明确要求）**：删除首页 Explore 区三块装饰卡「标签如何形成 / 做法如何落地 / 证据来自哪里」及对应 `lenses` 数据与 `.lens-*` 样式；保留 `#explore`、A 锚点、门店 01 与热点 02。Explore 区不再占满整屏。`npm run lint`、`npm test`（58/58）通过。未上传 GitHub、未部署云端。
- [x] **Grok UI-CHAPTERS-03（用户要求 `$impeccable` 优化 01/02 按钮）**：把两枚入口从空心果冻块收成目录封面：大号 01/02 填满留白，标题与箭头落在底部一行；门店偏铜、热点偏墨；Unicode 箭头改为 SVG；展开态箭头朝上且不再错误旋转。文案与展开逻辑不变。Impeccable detect 无命中；`npm run lint`、`npm test`（58/58）通过。未部署。
- [x] **Grok UI-CHAPTERS-04（用户要求优化按钮文字与排版）**：标题改为成对四字宋体「各个门店 / 热点事件」，副行说明「信息、位置等具体情况 / 来源、时间线与边界」；去掉把「热点事件」切断的换行。原「查看…」完整说法保留在 `aria-label`。type detect 无命中；lint/test 58/58。未部署。
- [x] **Grok NEWS-PURGE-01（用户明确要求）**：完全剔除「网传座谈会发言稿」与「员工彩礼倡议」：删除 2 个 case、2 个 source、9 个 chunk、前端热点专档与 news_summary 事件文件；向量索引去掉彩礼 5 条（135→130）。知识库现为 37 份资料、158 片段、8 案例。固定试卷 C1-13 改为资料不足题，保留题号以免打乱冻结 54 题历史文件。`npm run lint`、`npm test`（58/58）通过。未部署。
- [x] **Grok NEWS-TITLE-01（用户明确要求）**：将茶叶苍蝇事件显示名改为「顾客在抖音平台反馈茶叶中有苍蝇」。案例 ID、来源文件名和官方《情况说明（一）》原文标题未改。`npm test`（58/58）通过。未部署。
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

待用户确认：AI 对话区新视觉、文化六条主线的最终取舍，以及是否进入 R1 资料补充和 R6 真实用户试用。

当前发布状态：NEWS-UI-01～07 与事件 7～15 知识库增量已推送 GitHub `ca1e52b`，CloudBase `pangdonglai-site-018` 已 100% 切流；向量索引仍冻在 R5C 的 135 条。正式域名仍待 ICP 备案后绑定。真机/微信内置浏览器本轮未复测。

---

## 给下一位的指令

### 给 Codex

1. 资料架构只维护 `pangdonglai_project/knowledge/**`；禁止手工修改 `knowledge/compiled/knowledge-base.json` 或恢复旧根文件。
2. CloudBase 现网为 `pangdonglai-site-018`；后续发布务必带上 `knowledge/vector/r5-general-index.json`，见 `docs/DEPLOY_CN.md`。
3. 所有 RAG 工作先读 `docs/RAG_RESEARCH_PROTOCOL.md` 和 `docs/RAG_CULTURE_ROADMAP.md`；不修改原始 HTML，完成后更新本 HANDOFF 并小步提交。

### 给 Grok

1. 先完整阅读 `docs/RAG_RESEARCH_PROTOCOL.md` 与 `docs/RAG_CULTURE_ROADMAP.md`。
2. 用户已明确要求本地使用向量检索。`site/.dev.vars` 现为 `RAG_RETRIEVAL_MODE=hybrid`，本地 `npm run dev` 已按 hybrid 启动。CloudBase 现网环境变量本轮未改，5+5 召回也尚未部署。新开或关闭云端 hybrid 仍需用户明确授权。
3. 未经用户批准不得新增来源入库；部署与密钥只走云端环境变量，禁止写入镜像/Git。

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
| 2026-08-23 | Grok | 按用户要求启用本地 hybrid：确认 `.dev.vars` 为 hybrid，TokenHub 冒烟 `vectorApplied=true` 且召回 10 条，并重启 `npm run dev`（http://localhost:3000/）。未部署 | pangdonglai_project/site/.dev.vars（未提交）, pangdonglai_project/site/scripts/smoke-hybrid-recall.mjs, docs/HANDOFF.md |
| 2026-08-23 | Grok | 按用户要求将每题召回改为 embedding 5 + BM25 5，合计 10 chunks；纯 BM25 也召回 10。未改 AnswerPlan 上限、未部署 | pangdonglai_project/site/shared/retrieval.mjs, pangdonglai_project/site/shared/hybrid-retrieval.mjs, pangdonglai_project/site/worker/index.ts, pangdonglai_project/site/tests/rendered-html.test.mjs, docs/HANDOFF.md |
| 2026-08-23 | Grok | 按用户批示入库 C1 第二轮：B1 approved，B2/B3/B5 limited，B4/B6 拒绝。知识库 41 份资料、172 片段。lint/test 59/59。未部署 | pangdonglai_project/knowledge/**, pangdonglai_project/site/tests/rendered-html.test.mjs, docs/SOURCE_AUDIT_C1_02.md, docs/RAG_APPROVALS.md, docs/HANDOFF.md |
| 2026-08-23 | Codex | 按用户截图删除首页 Hero 的「01 / 从标签走向理解」眉题及对应 CSS，保留主标题、介绍文案和 A/B 入口；`npm run lint`、`npm test`（58/58）和 Impeccable 检测通过。未部署 | pangdonglai_project/site/app/page.tsx, pangdonglai_project/site/app/globals.css, pangdonglai_project/site/tests/rendered-html.test.mjs, docs/HANDOFF.md |
| 2026-08-23 | Codex | 按用户要求将事件详情标签由「总体时间流程：」调整为「总体事件流程：」；保留事实摘要正文。`npm run lint`、`npm test`（58/58）和 Impeccable 检测通过。未部署 | pangdonglai_project/site/app/page.tsx, pangdonglai_project/site/tests/rendered-html.test.mjs, docs/HANDOFF.md |
| 2026-08-23 | Grok | 将茶叶苍蝇事件显示名改为「顾客在抖音平台反馈茶叶中有苍蝇」 | pangdonglai_project/site/data/hotspots.ts, pangdonglai_project/news_summary/events/02-tea-fly-feedback-2026-01.md, pangdonglai_project/news_summary/HANDOFF.md, pangdonglai_project/knowledge/cases/tea-fly-feedback-2026-01.json, pangdonglai_project/site/tests/rendered-html.test.mjs, docs/HANDOFF.md |
| 2026-08-23 | Grok | 按用户截图完全剔除座谈会发言稿与彩礼倡议：删除案例/来源/切片/专档/前端热点，并去掉对应向量条目。知识库 37/158/8。lint/test 58/58。未部署 | pangdonglai_project/knowledge/**, pangdonglai_project/site/data/hotspots.ts, pangdonglai_project/news_summary/**, pangdonglai_project/evaluation/rag-culture-questions-v1.json, pangdonglai_project/site/tests/rendered-html.test.mjs, docs/HANDOFF.md |
| 2026-08-23 | Grok | Impeccable typeset：01/02 按钮改为四字主标题 + 副行说明，展开态同样四字；原「查看…」进 aria-label。type detect 无命中；lint/test 58/58。未部署 | pangdonglai_project/site/app/page.tsx, pangdonglai_project/site/app/globals.css, pangdonglai_project/site/tests/rendered-html.test.mjs, docs/HANDOFF.md |
| 2026-08-23 | Grok | `$impeccable` polish：01/02 入口改为目录封面构图（大号编号、底部标题行、门店/热点材质区分、SVG 箭头）；修复展开态箭头旋转。detect 无命中；lint/test 58/58。未部署 | pangdonglai_project/site/app/page.tsx, pangdonglai_project/site/app/globals.css, pangdonglai_project/site/tests/rendered-html.test.mjs, docs/HANDOFF.md |
| 2026-08-23 | Grok | 按用户截图删除首页三块装饰说明（标签如何形成 / 做法如何落地 / 证据来自哪里），收紧 Explore 区留白；保留门店与热点入口、A 锚点和 `#explore`。`npm run lint`、`npm test`（58/58）通过。未部署 | pangdonglai_project/site/app/page.tsx, pangdonglai_project/site/app/globals.css, pangdonglai_project/site/tests/rendered-html.test.mjs, docs/HANDOFF.md |
| 2026-08-22 | Grok | 按用户要求发布 NEWS-UI-01～07 与事件 7～15 知识库增量：GitHub `main` 推送 `ca1e52b`；CloudBase `pangdonglai-site-018` 100% 切流。公网 `/`、`/healthz`、CSS/JS/门店图均为 200；首页含 14 件热点（事件 12 未接入）。密钥未写入镜像或 Git。`npm run lint`、`npm test`（58/58）通过 | docs/HANDOFF.md, pangdonglai_project/knowledge/**, pangdonglai_project/news_summary/**, pangdonglai_project/site/app/{page.tsx,globals.css}, pangdonglai_project/site/data/hotspots.ts, pangdonglai_project/site/tests/rendered-html.test.mjs, pangdonglai_project/site/public/hotspot-*.{webp,png} |
| 2026-08-12 | Codex | 按协议将事件 8~15 全部入库知识库（用户批准）：新增 8 份 source（擀面皮/伤人案/人格尊严公示/郑州开店/央视报道/员工流失/生活广场关闭/梦之城，均 `partial_text`）+ 3 个 case（noodle-skin、store-assault、dignity-violation），事件 11~15 走一般轨；manifest 更新为 39 份资料、167 片段、167 Claim、10 案例；检索验证 8 问全部正确路由召回；同步更新知识库计数断言（139→167），`npm test` 58/58、lint 通过；BM25 可用，向量索引保持 R5C 冻结基线未重建。未上传 GitHub、未部署云端 | knowledge/cases/{noodle-skin-food-safety-2024-06,store-assault-case-2025-11,dignity-violation-disclosure-2026-08}.json, knowledge/sources/{media-pdl-noodle-skin-food-safety-2024-06,media-pdl-store-assault-2025-11,media-pdl-dignity-violation-disclosure-2026-08,media-pdl-zhengzhou-store-2026,media-cctv-pdl-report-2024-04,official-pdl-turnover-2026-h1,media-pdl-life-plaza-closure-2026,media-pdl-dream-city-project-2026}/**, knowledge/chunks/{对应 8 个}.jsonl, knowledge/manifest.json, knowledge/compiled/knowledge-base.json, site/tests/rendered-html.test.mjs, pangdonglai_project/news_summary/HANDOFF.md, pangdonglai_project/news_summary/events/08~15-*.md, docs/HANDOFF.md |
| 2026-08-12 | Codex | 按用户清单完成 NEWS-UI-02：将事件 8、9、10、11、13、14、15 接入统一热点索引和二级详情；保留事件时间线、四级来源、结论边界与不可点击来源卡，事件 8～15 已按协议获批入库；事件 12 暂未接入。`npm run lint`、`npm test`（58/58）和 Impeccable 检测通过。未上传 GitHub、未部署云端 | pangdonglai_project/site/data/hotspots.ts, pangdonglai_project/site/app/page.tsx, pangdonglai_project/site/app/globals.css, pangdonglai_project/site/tests/rendered-html.test.mjs, docs/HANDOFF.md, pangdonglai_project/news_summary/HANDOFF.md |
| 2026-08-12 | Codex | 实现每个已展示事件的“继续追问”：开放事件 8、9、10、11、13、14、15 的快捷问题；点击时将事件专属追问上下文与具体问题一起发送给资料助手，避免只按孤立问题检索；事件 12 仍按上一轮清单暂未接入。`npm run lint`、`npm test`（58/58）和 Impeccable 检测通过 | pangdonglai_project/site/data/hotspots.ts, pangdonglai_project/site/app/page.tsx, pangdonglai_project/site/tests/rendered-html.test.mjs, docs/HANDOFF.md |
| 2026-08-14 | Codex | 使用 Impeccable layout 重排“继续追问”：从右侧阅读栏移至每个事件详情最底部，做成全宽高强调行动区；加入 Q / FOLLOW-UP 标识、上下文状态胶囊、放大标题、桌面三列快捷问题与手机单列布局。`npm run lint`、`npm test`（58/58）和最终 Impeccable 检测通过。未上传 GitHub、未部署云端 | pangdonglai_project/site/app/page.tsx, pangdonglai_project/site/app/globals.css, pangdonglai_project/site/tests/rendered-html.test.mjs, docs/HANDOFF.md |
| 2026-08-14 | Codex | 使用 Impeccable layout 将热点事件一级索引改为居中的两列档案网格：桌面端一行两个、从上至下统一排列，取消卡片错落旋转；补齐 `display: grid` 以确保浏览器实际按两列渲染，760px 以下回退单列。实测两列卡片位置与宽度正确，`npm run lint`、`npm test`（58/58）和最终 Impeccable 检测通过。未上传 GitHub、未部署云端 | pangdonglai_project/site/app/globals.css, pangdonglai_project/site/tests/rendered-html.test.mjs, docs/HANDOFF.md |
| 2026-08-14 | Codex | 使用 Impeccable 将每个新闻详情页的“可核验来源”按官方、第三方媒体、自媒体和传言分组；带 URL 的来源卡新增明确“打开来源”入口与无障碍标签，未保存原帖直链的来源显示“链接待核验”，同时保留空分类说明。`npm run lint`、`npm test`（58/58）、`git diff --check` 和最终 Impeccable 检测通过。未上传 GitHub、未部署云端 | pangdonglai_project/site/app/page.tsx, pangdonglai_project/site/app/globals.css, pangdonglai_project/site/tests/rendered-html.test.mjs, docs/HANDOFF.md |
| 2026-08-14 | Codex | 按用户截图修正来源链接位置：将每个来源条目直接放进详情页上方四类来源账本的对应格子，显示来源标题、发布方、日期和“打开来源”/“链接待核验”；移除下方重复的“可核验来源”分组。`npm run lint`、`npm test`（58/58）、`git diff --check` 和最终 Impeccable 检测通过。未上传 GitHub、未部署云端 | pangdonglai_project/site/app/page.tsx, pangdonglai_project/site/app/globals.css, pangdonglai_project/site/tests/rendered-html.test.mjs, docs/HANDOFF.md |
| 2026-08-12 | Codex | 应用户反馈继续放大新闻二级详情标题后的事件日期字号：桌面端由 `0.9rem` 调整为 `1.05rem`，移动端由 `0.82rem` 调整为 `0.94rem`，增强日期识别层级并保持既有颜色、字重和布局 | pangdonglai_project/site/app/globals.css, docs/HANDOFF.md |
| 2026-08-12 | Codex | 按用户要求放大新闻二级详情标题后的事件日期字号：桌面端由 `0.78rem` 调整为 `0.9rem`，移动端由 `0.72rem` 调整为 `0.82rem`；保持颜色、字重、间距和布局不变 | pangdonglai_project/site/app/globals.css, docs/HANDOFF.md |
| 2026-08-12 | Codex | 复核 3 处待核验事件：事件 13 确认官方出处（胖东来官网 2026-07-27 公布上半年流失 52 名、流失率 0.50%、管理层零流失），由"仅自媒体不建议收录"升级为可收录；事件 11 郑州店开业推迟（2026-03-13 于东来称因质量要求由五一推迟至 10 月，"河南发布"确认高铁驿站/购物直通车）；事件 12 央视《经济半小时》报道确认为 2024-04-18 播出的"探秘中国胖东来"，2026 年流传"被央视点名"系旧闻误读。已同步更新 `news_summary` 对应事件文件与总览表 | pangdonglai_project/news_summary/HANDOFF.md, pangdonglai_project/news_summary/events/11-zhengzhou-store-2026.md, pangdonglai_project/news_summary/events/12-cctv-economy-30-report-2026.md, pangdonglai_project/news_summary/events/13-staff-turnover-52-2026.md, docs/HANDOFF.md |
| 2026-08-12 | Codex | 按用户要求调整热点二级详情的标题区：缩小所有事件详情主标题，并将“事件日期”从状态行移至标题下方，使用稳定的数字字形与间距，便于在长标题下快速识别时间。`npm run lint`、`npm test`（58/58）及 Impeccable type 检测通过。未上传 GitHub、未部署云端 | pangdonglai_project/site/app/page.tsx, pangdonglai_project/site/app/globals.css, docs/HANDOFF.md |
| 2026-08-12 | Codex | 依据 `news_summary/events/01~07-*.md` 完成 NEWS-UI-01：将红色内裤、茶叶苍蝇、鲜鸡蛋角黄素、尝面员工处分、彩礼倡议、降薪传言与既有座谈会发言稿共 7 个已审核事件接入“查看热点事件”。每条均采用统一新闻详情结构：状态专属说明、四级来源、时间线、无法确认项、可核验来源及快捷提问直达 AI；不把企业回应、内部复议、个人倡议和一审结果混为同一结论。事件 8～15 尚未入库或待核验，未展示。`npm run lint`、`npm test`（58/58）及 Impeccable layout 检测通过。未上传 GitHub、未部署云端 | pangdonglai_project/site/data/hotspots.ts, pangdonglai_project/site/app/page.tsx, pangdonglai_project/site/tests/rendered-html.test.mjs, docs/HANDOFF.md |
| 2026-08-12 | Codex | 按用户要求进行胖东来互联网新闻检索（百度/搜狗/360，2026-08-12）：新增 8 个事件候选并全部写入 `news_summary/events/`（08 擀面皮、09 伤人案、10 人格尊严公示、11 郑州开店、12 央视报道、13 员工流失、14 生活广场关闭、15 梦之城）；逐事件完成时间线+四级可信度标注，标注 3 处待核验（郑州开业进度、央视播出日期、52 名员工数据出处，后者仅自媒体不建议直接收录）；总览表更新为 15 事件；事件 8～15 尚未入库知识库 | pangdonglai_project/news_summary/HANDOFF.md, pangdonglai_project/news_summary/events/08~15-*.md, docs/HANDOFF.md |
| 2026-08-12 | Codex | 使用 Impeccable layout 重整新闻详情排版：来源类型从带空白占位的双栏改为全宽 2×2 信息矩阵，时间线标题改为单列阅读起点，时间线与右侧“以下内容无法确认 / 可核验来源 / 继续追问”形成清晰主次栏；同步处理平板与手机单栏回退。`npm run build`、`npm test`（58/58）及 Impeccable layout 检测通过。未上传 GitHub、未部署云端 | pangdonglai_project/site/app/globals.css, docs/HANDOFF.md |
| 2026-08-12 | Codex | 按用户要求精简新闻详情：删除“先分清信息来自哪里”及其说明文字，删除“这件事值得观察什么”及对应段落，将“还不能确认什么”改为“以下内容无法确认”；保留来源类型账本，并为该无标题区块补充无障碍标签。`npm run lint`、`npm run build`、Impeccable 检测通过。未上传 GitHub、未部署云端 | site/app/page.tsx, docs/HANDOFF.md |
| 2026-08-11 | Codex | 使用 Impeccable 精修“网传座谈会发言稿”事件详情：按已审核专档同步长安街知事/北京日报来源、企业回应与非终局边界，新增四级可信度账本、四节点时间线、三条不能确认事项、来源说明和快捷问题直达 AI；手机端将收起侧轨收为底部角标。lint、build、58 项测试和 Impeccable 检测通过；桌面浏览器路径通过，手机最终截图受本地 URL 策略阻断，未部署 | site/data/hotspots.ts, site/app/page.tsx, site/app/globals.css, site/tests/rendered-html.test.mjs, docs/HANDOFF.md |
| 2026-08-11 | Codex | 按候选卡 V9-1 经用户批准将「网传座谈会发言稿」事件入库知识库：新增 case `fake-seminar-speech-2026-07`（finality: preliminary）、source `media-pdl-fake-seminar-speech-response-2026-07`（L2 limited / partial_text，长安街知事 2026-07-18 报道，抓取核验可访问）与 4 个 chunks；构建得到 31 份资料、139 片段、139 Claim、7 案例；检索验证 4 问均正确路由召回；同步更新既有 R5C live 断言（结果文件实为 3/3、humanReview pending）与知识库计数断言（135→139），`npm test` 57/57、lint 通过；未上传 GitHub、未部署云端 | knowledge/cases/fake-seminar-speech-2026-07.json, knowledge/sources/media-pdl-fake-seminar-speech-response-2026-07/*, knowledge/chunks/media-pdl-fake-seminar-speech-response-2026-07.jsonl, knowledge/manifest.json, knowledge/compiled/knowledge-base.json, site/tests/rendered-html.test.mjs, pangdonglai_project/news_summary/HANDOFF.md, pangdonglai_project/news_summary/events/07-fake-seminar-speech-2026-07.md, docs/HANDOFF.md |
| 2026-08-11 | Codex | 按用户要求将桌面端“收起 / 档案”两行标签从 2rem 调整为 1.8rem（约 28.8px），移动端保持 1rem；未改变箭头、固定位置和收起逻辑。未上传 GitHub、未部署云端 | site/app/globals.css, docs/HANDOFF.md |
| 2026-08-11 | Codex | 按用户要求将桌面端“收起 / 档案”两行标签改为 2rem（约 32px），移动端调整为 1rem；保留 900 字重、向上箭头、右侧固定位置和收起逻辑，并核验文字没有超出侧轨。未上传 GitHub、未部署云端 | site/app/globals.css, docs/HANDOFF.md |
| 2026-08-11 | Codex | 针对用户截图继续提高“收起 / 档案”的占比：桌面端提升至 1.45rem、字重 900、压紧行距并轻微放大，移动端提升至 0.92rem；Logo 与箭头作为辅助元素保留，按钮不溢出。`npm run lint`、`npm run build`、Impeccable 检测通过。未上传 GitHub、未部署云端 | site/app/globals.css, docs/HANDOFF.md |
| 2026-08-11 | Codex | 按用户反馈继续拉高收起标签占比：两行“收起 / 档案”桌面端提升至 1.16rem、字重 900、深色高对比并压紧行距，移动端提升至 0.82rem；保持向上箭头、按钮固定位置和收起逻辑不变。`npm run lint`、`npm run build`、Impeccable 检测通过。未上传 GitHub、未部署云端 | site/app/globals.css, docs/HANDOFF.md |
| 2026-08-11 | Codex | 按用户要求重排右侧收起入口：将“收起档案”拆成两行，并在下方增加向上箭头；箭头采用同源棕橙色、加粗字形和轻微悬停上移，移动端同步缩放。未改变按钮固定位置与点击返回索引逻辑。`npm run lint`、`npm run build`、Impeccable 检测通过。未上传 GitHub、未部署云端 | site/app/page.tsx, site/app/globals.css, docs/HANDOFF.md |
| 2026-08-11 | Codex | 按用户反馈继续强化“收起档案”标签：桌面端提升至 1rem、字重 800、加深颜色并加入轻微白色文字高光，移动端提升至 0.72rem；按钮位置、Logo 和滚动固定行为保持不变。`npm run lint`、`npm run build`、Impeccable 检测通过。未上传 GitHub、未部署云端 | site/app/globals.css, docs/HANDOFF.md |
| 2026-08-11 | Codex | 按用户反馈放大右侧固定收起侧轨中的“收起档案”标签：桌面端字号提高至 0.82rem 并提高字重，移动端提高至 0.62rem；不改变按钮位置、Logo 和滚动固定行为。`npm run lint`、`npm run build`、Impeccable 检测通过。未上传 GitHub、未部署云端 | site/app/globals.css, docs/HANDOFF.md |
| 2026-08-11 | Codex | 按用户要求建立 `news_summary/` 专有交接：把当前阶段已提到的 7 个新闻事件（红内裤、茶叶、鲜鸡蛋、尝面员工、彩礼、降薪、座谈会发言稿）总结为总览 HANDOFF + 每事件详情文件，逐条按用户指定的四级可信度（官方/第三方媒体/自媒体/传言）标注来源并标注事件时间；信息全部来自已审核知识库与热点档案，未虚构。供 Codex 后续设计热点前端与排版 | pangdonglai_project/news_summary/HANDOFF.md, pangdonglai_project/news_summary/events/01~07-*.md, docs/HANDOFF.md |
| 2026-08-11 | Codex | 按用户要求将详情页收起入口改为最右端固定悬浮侧轨：按钮脱离热点区块展开动画的坐标系，使用 `position: fixed` 垂直居中，增强尺寸、边缘贴合、阴影和橙/绿竖向强调线；滚动 420px 前后视口位置保持不变，点击返回热点索引并恢复 `#hotspot-archive`。`npm run lint`、`npm run build`、Impeccable 检测和浏览器固定位置/收起路径通过。未上传 GitHub、未部署云端 | site/app/page.tsx, site/app/globals.css, docs/HANDOFF.md |
| 2026-08-11 | Codex | 按用户要求在新闻详情页右侧增加 Logo 收起入口：按钮不再使用项目宣传图中的大标题，而使用紧凑 DL 标志、上方火焰标记和 PANDONG LAI 字标；点击后返回热点索引，悬停抬升并提供焦点样式，桌面无横向溢出，移动端缩小适配。`npm run lint`、`npm run build`、Impeccable 检测和浏览器详情/悬停/收起路径通过。未上传 GitHub、未部署云端 | site/app/page.tsx, site/app/globals.css, docs/HANDOFF.md |
| 2026-08-11 | Codex | 按用户补充要求将热点档案背景改为新闻元素：使用内置生图模式生成新闻编辑台/档案桌面背景，包含报纸校样、新闻照片、剪报、采访记录与纸张证据，中心保留可读留白；锚点改为“事件日期 + 新闻标题 + 进入箭头”的编辑台卡片，详情态同步使用新闻背景。`npm run lint`、`npm run build`、Impeccable 检测、桌面索引/悬停/详情路径通过，日期显示正确且无横向溢出；手机响应式 CSS 已静态核验。未上传 GitHub、未部署云端 | site/public/hotspot-news-archive-bg.png, site/app/page.tsx, site/app/globals.css, docs/HANDOFF.md |
| 2026-08-11 | Codex | 按用户反馈重做热点索引整体构图：替换旧柔雾背景与椭圆瓷片按钮为方向性釉彩档案背景和不对称新闻档案条；入口仅保留事件标题，加入左侧色带、右侧箭头、轻微弹性落座、悬停纹理位移与键盘焦点反馈；详情页继续复用新背景并保持事实、来源、返回交互。新背景由内置生图模式生成并压缩为 165 KB WebP。`npm run lint`、`npm run build`、Impeccable 检测、桌面索引/悬停/详情/返回路径通过；浏览器当前无可用视口模拟能力，手机响应式 CSS 已静态核验。未上传 GitHub、未部署云端 | site/public/hotspot-archive-field-v2.webp, site/app/globals.css, docs/HANDOFF.md |
| 2026-08-11 | Codex | 按用户二次反馈重做热点视觉：关键词气泡不再使用独立三色渐变，而是裁切同一张背景釉纹形成有机瓷片，悬停时纹理与高光同步游移；展开详情改为连续釉彩档案空间，主档案、资料状态、时间线节点、阅读说明、来源瓷片和继续提问入口统一材质，同时去除旧扫描线、图钉纸条和装饰性英文眉题。保留原有事实、来源、返回/跳转、响应式和减少动态兼容。`npm run lint`、`npm run build`、Impeccable 检测、桌面浏览器索引/悬停/详情完整路径通过且无横向溢出；`npm test` 56/57，唯一失败仍是既有 R5C 统计旧断言。未上传 GitHub、未部署云端 | site/app/globals.css, docs/HANDOFF.md |
| 2026-08-11 | Codex | 按用户反馈为热点索引加入生成式多色陶瓷釉彩背景；关键词锚点改为带釉面高光、内外阴影和不规则圆角的陶瓷气泡，加入轻微弹性落座、分批延迟、鼠标悬停抬升/高光流动、键盘焦点与按压反馈；详情态降低背景纹理强度；补充手机全宽布局和 `prefers-reduced-motion` 兼容。背景压缩为 84 KB WebP。`npm run lint`、`npm run build`、Impeccable 检测、桌面端浏览器展示/悬停/详情跳转通过；手机端浏览器模拟受本地 URL 安全策略限制，已完成响应式 CSS 静态核验；`npm test` 56/57，通过项之外仍是既有 R5C 统计旧断言。未上传 GitHub、未部署云端 | site/public/hotspot-ceramic-glaze-bg.webp, site/app/page.tsx, site/app/globals.css, docs/HANDOFF.md |
| 2026-08-11 | Codex | 按用户反馈将热点档案索引收敛为浅色关键词气泡：索引层仅保留事件标题锚点，移除额外标题、说明、状态、数量、日期和卡片信息；点击气泡进入现有事件详情；详情区域同步改为浅色，并修复索引/详情容器默认焦点边框。`npm run lint`、`npm run build`、Impeccable 检测、桌面/手机交互检查通过；未上传 GitHub、未部署云端 | site/app/page.tsx, site/app/globals.css, docs/HANDOFF.md |
| 2026-08-10 | Codex | 按用户要求清理 GitHub 仓库历史：先提交工作树未提交的文档/评测改动；用 `--force-with-lease` 将本地 main（120 个提交，含热点 UI）接管 `origin/main`；删除 `archive/html-line-2026-07`（Kimi 单文件版 HTML 与 docx，用户确认不需要存档）与 `feature/keyword-orbit-hero` 两个旧分支；保留 `main-2026-08-07/08` 日期分支。远端旧 main 的 17 个网页上传提交成为孤立历史（GitHub 侧仍可找回，未物理抹除） | docs/HANDOFF.md, docs/PLAN.md, docs/RAG_CULTURE_ROADMAP.md, pangdonglai_project/evaluation/rag-culture-r5c-worker-live-v1.json |
| 2026-08-10 | Codex | 按用户反馈将热点档案改为两级浏览：打开 02 后先显示事件关键词索引卡片，点击卡片才进入单事件详情；桌面三列、平板两列、手机单列，详情支持返回索引；`npm run lint`、`npm run build`、impeccable 检查及桌面/手机交互验证通过。当前仅有 1 件已审核热点，未虚构额外事件，未上传 GitHub、未部署云端 | site/app/page.tsx, site/app/globals.css, site/data/hotspots.ts, docs/HANDOFF.md |
| 2026-08-10 | Codex | 按用户反馈将热点档案从信息面板推进为“案头证据桌”：新增 FIELD NOTE 标记、事件水印、扫描线、状态雷达、时间线节点语义和图钉剪报来源；`npm run lint`、`npm run build`、impeccable 检查与桌面/手机浏览器检查通过。未上传 GitHub、未部署云端 | site/app/page.tsx, site/app/globals.css, docs/HANDOFF.md |
| 2026-08-09 | Codex | 按用户要求完成一个胖东来热点事件本地 UI MVP：02 入口可展开热点档案，展示 2026-07-17 网传“座谈会发言稿”事件的企业回应、时间线、资料边界、来源和继续提问入口；修正既有卡片回弹曲线并完成桌面/手机浏览器检查。`npm run lint` 与 `npm run build` 通过；`npm test` 的唯一失败是工作树已有 R5C 评测断言仍期待 2/3、实际结果为 3/3。未上传 GitHub、未部署云端 | site/app/page.tsx, site/app/globals.css, site/data/hotspots.ts, docs/HANDOFF.md |
| 2026-08-08 | Codex | TokenHub 向量接口冒烟验证通过：`kinfra-text-embedding-0.6b` 返回 1024 维向量，约 530ms；项目 hybrid 检索返回 `hybrid-rrf` 且 `vectorApplied=true`，未调用 DeepSeek、未改业务代码 | docs/HANDOFF.md |
| 2026-08-08 | Codex | 经用户要求完成 R5C-8 三道真实问答复测；hybrid 检索与 DeepSeek 均按预期调用，自动检查 3/3。红裤头题已覆盖员工免职/降级事实且无尝面案串入；资料不足题安全拒答但文本过短；未部署 | evaluation/rag-culture-r5c-worker-live-v1.json, docs/HANDOFF.md |
| 2026-08-08 | Codex | 完成全项目状态盘点；`npm test` 57/57、`npm run lint` 通过；确认知识库构建为 30 份资料、135 个片段、135 个 Claim、6 个案例；未改业务代码、未调用外部模型、未部署 | docs/HANDOFF.md |
| 2026-08-08 | Grok | 关键词遮挡修复 push+部署：手机仅顶区关键词 + clip-path；提交 `ff4c7bc` | site/app/globals.css, docs/MOBILE_QA_CHECKLIST.md |
| 2026-08-08 | Grok | 三期移动端：跳过链接、门店图 sizes、content-visibility、focus-visible、`MOBILE_QA_CHECKLIST`；已 push 部署 | site/app/page.tsx, site/app/globals.css, site/tests/rendered-html.test.mjs, docs/MOBILE_QA_CHECKLIST.md, docs/HANDOFF.md |
| 2026-08-08 | Grok | 二期移动端：对话窗 flex 贴底输入、消息自动滚底、来源触控卡片、章节全宽、门店图更矮+地图按钮、关键词静止、480/矮屏横屏、「去提问」FAB；测试 55 通过；分支 `main-2026-08-08` | site/app/page.tsx, site/app/globals.css, site/tests/rendered-html.test.mjs, docs/HANDOFF.md |
| 2026-08-07 | Grok | 一期移动端：viewport/安全区、≤760与390断点、触控热区、输入16px防iOS放大、防横溢与门店/对话收尾；测试通过；推送 `main-2026-08-07` 并部署 CloudBase | site/app/layout.tsx, site/app/globals.css, site/tests/rendered-html.test.mjs, docs/HANDOFF.md |
| 2026-08-07 | Grok | 门店照片下载到 `public/stores` 本站托管，消除官网防盗链；CloudBase 版本 011 起生效 | site/public/stores/*, site/data/store-directory.json, site/scripts/download-store-photos.mjs |
| 2026-08-07 | Grok | 用户要求部署当前网站到 CloudBase：首轮包漏向量索引导致 build_failed(006)；补入 `knowledge/vector/r5-general-index.json` 后版本 007 构建成功并 100% 切流。公网 `/healthz`、首页、静态资源 200；UTF-8 问答 200 且有来源。后续已开 hybrid+TokenHub | pangdonglai_project/cloudbaserc.json, docs/DEPLOY_CN.md, docs/HANDOFF.md, tmp/pdl-cloudbase-7699d52.zip |
| 2026-08-07 | Grok | 用户要求执行 R5C-8：在 AnswerPlan 增加通用前提 Claim 覆盖（支持或纠正），不为红裤头单题打补丁；补单测与混合检索离线集成测。固定 54/54、R4 契约 18/18、53 项测试与 lint 通过。未调用 DeepSeek/TokenHub、未部署 | site/shared/answer-control.mjs, site/tests/rendered-html.test.mjs, evaluation/rag-culture-current-evaluation.json, evaluation/rag-culture-r4-contract-evaluation.json, docs/RAG_CULTURE_CURRENT_EVALUATION.md, docs/RAG_ANSWER_CONTROL_V1.md, docs/RAG_CULTURE_R5C_WORKER_LIVE.md, docs/PLAN.md, docs/HANDOFF.md |
| 2026-08-05 | Codex | 应用户要求整理交接；确认当前工作树为 detached HEAD，最新成果在 `68d4ea3` 与 `c5f3ebd`，未自动并入 main；下一步为 R5C-8 AnswerPlan 通用前提核实 Claim 覆盖，未改代码、未部署 | docs/HANDOFF.md |
| 2026-08-04 | Codex | 经用户明确授权执行 R5C-7B 三道本地真实回答；两道语义题调用 TokenHub，三题及允许片段调用 DeepSeek，均返回 200。自动与人工验收均为 2/3：普通文化与资料不足通过；红裤头题语义路由和 Top-5 召回正确、无跨案例污染，但 AnswerPlan 漏掉员工免职/降级直接 Claim，导致回答错误称资料未记载处理措施。结果原样记录，不按单题改规则，密钥未保存，未部署 | evaluation/rag-culture-r5c-worker-live-v1.json, docs/RAG_CULTURE_R5C_WORKER_LIVE.md, docs/RAG_CULTURE_R5C_EXPERIMENT.md, docs/RAG_CULTURE_ROADMAP.md, docs/PLAN.md, docs/HANDOFF.md |
| 2026-08-04 | Codex | 按用户要求进行 R5C 下一步，将已验收混合检索以默认关闭的 `bm25/hybrid` 开关接入本地 Worker；CloudBase Node 入口同步支持 TokenHub 服务端变量，缺密钥、模型不一致或向量失败自动回退 BM25，页面移除 BM25 实现术语。新增真实回答验收脚本但未运行，因为三道新题及检索上下文发送给 DeepSeek 尚需单独授权。51 项测试与 lint 通过，未部署 | site/worker/index.ts, site/scripts/cloudbase-server.mjs, site/scripts/evaluate-rag-r5c-worker-live.mjs, site/.dev.vars.example, site/README.md, site/app/page.tsx, site/package.json, site/tests/rendered-html.test.mjs, docs/RAG_CULTURE_R5C_EXPERIMENT.md, docs/RAG_CULTURE_ROADMAP.md, docs/PLAN.md, docs/HANDOFF.md |
| 2026-08-04 | Codex | 按用户要求完成R5C-1至R5C-6。冻结双基线后，让安全候选由加权RRF直接选Top5；新增基于案例chunk向量、领先差距和通用名称模糊度的语义案例路由，扩展大众终局表达，并用同一批查询向量评测8组参数。选中1:0.65配置：固定54/54、影子24/31、回归0、案例5/5、隔离31/31、资料不足2/2、终局31/31；红裤头题通过。未接Worker、未部署 | site/shared/hybrid-retrieval.mjs, site/shared/retrieval.mjs, site/scripts/evaluate-rag-r5c.mjs, site/tests/rendered-html.test.mjs, site/package.json, evaluation/rag-culture-r5c-experiment-v1.json, docs/RAG_CULTURE_R5C_EXPERIMENT.md, docs/RAG_CULTURE_R5_HYBRID_PLAN.md, docs/RAG_CULTURE_ROADMAP.md, docs/HANDOFF.md |
| 2026-08-04 | Codex | 经用户授权将冻结的31道R5B语义影子题发送至TokenHub并完成首次真实对照。BM25 17/31，混合检索19/31；Hit@5提升8.33个百分点、MRR@5提升0.0521、新增2、回归0、资料不足2/2、隔离31/31。用户指定红裤头题没有跨事件误召回，但暴露关键词案例路由不能识别事件换称。结果原样记录，未按单题改规则，未接Worker、未部署 | evaluation/rag-culture-r5-semantic-shadow-results-v1.json, docs/RAG_CULTURE_R5_SEMANTIC_SHADOW_V1.md, site/scripts/evaluate-rag-r5-shadow.mjs, site/tests/rendered-html.test.mjs, docs/RAG_CULTURE_R5_HYBRID_PLAN.md, docs/RAG_CULTURE_ROADMAP.md, docs/HANDOFF.md |
| 2026-08-04 | Codex | 经用户授权启动R5B；在首次运行前冻结31道全新语义影子题和预期chunk，新增同题BM25/混合检索评测器。用户指定的红裤头题被定义为跨事件假前提测试：命中红内裤免职/降级材料，禁止召回尝面员工解除合同材料。当前只冻结试卷与工具，尚未发送、未看结果、未调规则 | evaluation/rag-culture-r5-semantic-shadow-v1.json, site/scripts/evaluate-rag-r5-shadow.mjs, site/tests/rendered-html.test.mjs, site/package.json, docs/HANDOFF.md |
| 2026-08-04 | Codex | 经用户明确授权，将135个审核片段与评测问题发送至腾讯云TokenHub；生成135个1024维向量。首轮纯RRF 50/54并有2个严重回归；用BM25锚定、纯背景向量过滤和通用投诉奖励用途识别修正后，第二轮54/54、回归0、严重回归0。安全门槛通过，但新增收益尚待冻结语义影子题；未接入Worker、未部署，密钥未写入文件 | knowledge/vector/r5-general-index.json, evaluation/rag-culture-r5-hybrid-experiment.json, site/shared/embedding-client.mjs, site/shared/hybrid-retrieval.mjs, site/shared/retrieval.mjs, site/scripts/generate-vector-index.mjs, site/scripts/evaluate-rag-hybrid.mjs, site/tests/rendered-html.test.mjs, docs/RAG_CULTURE_R5_HYBRID_EXPERIMENT.md, docs/RAG_CULTURE_R5_HYBRID_PLAN.md, docs/RAG_CULTURE_ROADMAP.md, docs/HANDOFF.md |
| 2026-08-04 | Codex | 用户接受R4以15/18有限通过并要求进入R5；建立国内TokenHub embedding客户端、96片段安全向量语料、RRF混合检索、索引生成与54题对照脚本。案例轨和资料不足问题不调用向量，回答用途过滤继续生效；BM25控制组54/54，45项测试和lint通过。因尚无TokenHub API Key，未生成真实向量、未运行混合对照、未接入Worker、未部署 | site/shared/embedding-client.mjs, site/shared/hybrid-retrieval.mjs, site/shared/retrieval.mjs, site/scripts/generate-vector-index.mjs, site/scripts/evaluate-rag-hybrid.mjs, site/tests/rendered-html.test.mjs, site/package.json, site/.dev.vars.example, docs/RAG_CULTURE_R5_HYBRID_PLAN.md, docs/RAG_CULTURE_ROADMAP.md, docs/HANDOFF.md |
| 2026-08-04 | Codex | 经用户明确要求运行R4第三轮真实评测；同一18题调用18/18成功，严格验收由12/18升至15/18。第二轮三道回归全部修复且无新增回归，热点事件5/5、资料不足3/3；剩余三题集中在最小事实可用性、必要区分覆盖和单案外推边界。未读取、显示或保存密钥，未接向量库、未部署 | evaluation/rag-culture-r4-live-answers-v1.json, evaluation/rag-culture-r4-human-review-v1.json, site/tests/rendered-html.test.mjs, docs/RAG_CULTURE_R4_LIVE_EVALUATION_ROUND3.md, docs/RAG_ANSWER_CONTROL_V1.md, docs/RAG_CULTURE_ROADMAP.md, docs/PLAN.md, docs/HANDOFF.md |
| 2026-08-04 | Codex | 按用户要求继续完成R4通用修复：区分列表编号/事实数字并纳入北京时间与资料日期，识别绝对结论的否定语境，有资料时安全降级保留最小事实；Claim增加必要区分，AnswerPlan在不改变Top-5 BM25评测口径的前提下从安全Top-12候选优选最多5条Claim。固定检索54/54、R4自动契约18/18、43项测试与lint通过。未调用第三轮DeepSeek、未接向量库、未部署 | knowledge/chunks/*.jsonl, knowledge/README.md, site/shared/answer-control.mjs, site/shared/retrieval.mjs, site/worker/index.ts, site/tests/rendered-html.test.mjs, evaluation/rag-culture-current-evaluation.json, evaluation/rag-culture-r4-contract-evaluation.json, docs/RAG_ANSWER_CONTROL_V1.md, docs/RAG_CULTURE_CURRENT_EVALUATION.md, docs/RAG_CULTURE_ROADMAP.md, docs/PLAN.md, docs/HANDOFF.md |
| 2026-08-03 | Codex | 经用户明确要求运行R4第二轮真实评测；同一18题调用18/18成功，严格验收由10/18升至12/18。五道首轮失败题修复，但四道有资料问题触发统一安全降级，其中三道形成新回归；定位为数字/编号、否定语境误报及降级答案未保留最小事实。未读取、显示或保存密钥，未接向量库、未部署 | evaluation/rag-culture-r4-live-answers-v1.json, evaluation/rag-culture-r4-human-review-v1.json, docs/RAG_CULTURE_R4_LIVE_EVALUATION_ROUND2.md, docs/RAG_ANSWER_CONTROL_V1.md, docs/RAG_CULTURE_R4_IMPLEMENTATION.md, docs/RAG_CULTURE_ROADMAP.md, docs/PLAN.md, docs/HANDOFF.md |
| 2026-08-03 | Codex | 按用户要求直接完成回答控制前三步：为135个审核片段确定性生成135个claim-v1并加入构建强校验；每题动态生成AnswerPlan，只允许直接支持的Claim；模型首稿经AnswerValidation检查数字、日期、跨案例、绝对结论与终局表述，失败重写一次、仍失败安全降级。固定检索54/54、R4自动契约18/18、41项测试与lint通过。未运行第二轮真实DeepSeek、未接向量库、未部署 | knowledge/chunks/*.jsonl, knowledge/manifest.json, knowledge/README.md, site/shared/answer-control.mjs, site/scripts/annotate-claims-v1.mjs, site/scripts/build-knowledge.mjs, site/shared/retrieval.mjs, site/worker/index.ts, site/tests/rendered-html.test.mjs, site/package.json, docs/RAG_ANSWER_CONTROL_V1.md, docs/RAG_CULTURE_ROADMAP.md, docs/PLAN.md, docs/HANDOFF.md |
| 2026-08-03 | Codex | 经用户明确同意，将18道题及相关已审核片段发送给 DeepSeek 完成 R4 首轮真实评测；调用18/18成功，平均3.98秒，严格人工验收10/18。热点事件5/5，一般文化4/10，资料不足1/3；记录八道失败题及时间错误、无关案例、遗漏区分、单向裁定四类问题，决定先修复R4、暂不进入R5。未读取或保存密钥值，未部署 | site/scripts/evaluate-rag-r4-live.mjs, site/package.json, site/tests/rendered-html.test.mjs, evaluation/rag-culture-r4-live-answers-v1.json, evaluation/rag-culture-r4-human-review-v1.json, docs/RAG_CULTURE_R4_LIVE_EVALUATION.md, docs/RAG_CULTURE_R4_IMPLEMENTATION.md, docs/RAG_CULTURE_ROADMAP.md, docs/PLAN.md, docs/HANDOFF.md |
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

- **上线：** CloudBase 公网访问与 AI 对话均已可用（现网 `pangdonglai-site-018`）；只剩正式域名需在完成 ICP 备案后绑定。
