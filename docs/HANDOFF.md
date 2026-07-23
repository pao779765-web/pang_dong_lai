# HANDOFF（交接报告）

> **规则：** 谁做完谁更新本文件。下一位只认本文件 + Git，不靠聊天记录猜。

**更新时间：** 2026-07-23

**当前执行者：** Grok（待独立验收提交 `aae95cc`）
**分支：** `main`

---

## 当前目标

在保留原始 HTML 的前提下，建立可维护源码并完成首页 Hero、漂浮关键词、A/B 双锚点、详情落点与 AI 预览。

> 如何借助 AI 技术，让外界更深入地了解胖东来“自由·爱”的企业文化？

完整方案：`pangdonglai_project/PRODUCT_PLAN.md`

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

- [x] 协作工作区与 Git 基建。
- [x] 读取并审阅现有 `胖东来网页（7月22日1点34分）.html`。
- [x] 识别现有文化地图、AI 框架、证据链、故事档案和来源中心。
- [x] 识别现有单文件构建、多轮 Hero 覆盖、缺失资源和交互断开等问题。
- [x] 核对官方页面当前列出的 14 家实体门店范围。
- [x] 收集官方文化资料、权威媒体与多角度报道候选。
- [x] 完成详细产品、内容、技术、阶段、验收和协作计划。
- [x] 更新总体 `docs/PLAN.md`。
- [x] 用户确认首页方案并授权进入代码实现。
- [x] 确认正式共享工作区为 `D:\ai沙盒\codex+grok`，并保留完整本地 Git 历史。
- [x] 原始 HTML 已建立 Git 基线提交 `91c5804`，后续不得覆盖。
- [x] 建立 vinext / React / TypeScript 可维护工程，首页实现提交为 `aae95cc`。
- [x] 完成 22 个疑问式漂浮关键词、中心三层文案与暖黑/米白/铜色视觉。
- [x] 完成 A → `#explore`、B → `#ai-dialogue` 的真实链接、平滑滚动与焦点落点。
- [x] 完成详情承接区与“胖东来文化资料助手（非官方）”结构示例。
- [x] 完成响应式、键盘焦点、减少动态效果模式与离屏暂停动画。
- [x] 生成并接入分享封面 `site/public/og.png`；不使用门店或人物伪造图片。
- [x] `npm run lint`、`npm test` 全部通过；原始 HTML 哈希仍为 `f6b248970dd5f088e89940a7f726cfa4e1a05159`。

---

## 未完成 / 下一步

- [x] 用户确认本轮首页实现方案。
- [x] Codex 完成 Vite 驱动的 vinext + React + TypeScript 工程基线。
- [x] Codex 完成首页 Hero、漂浮关键词和 A/B 锚点。
- [x] Codex 完成 `#explore` 与 `#ai-dialogue` 两个可访问落点。
- [x] Codex 完成本地 lint、构建与服务端渲染验证。
- [ ] Grok 独立复核方案中的 14 家门店、来源候选、链接可达性和合规风险。
- [ ] Grok 对本轮首页做 diff、构建、响应式和可访问性验收，写入 `docs/QA_REPORT.md`。
- [ ] 用户提供门店照片授权，或确认第一版先使用设计占位图。
- [ ] AI 接口阶段前再决定模型、部署位置、预算和数据更新方式。

---

## 本轮结论

产品主线确定为：

```text
网络印象 → 结构化理解 → 门店/报道/证据 → 可追溯 AI 对话
```

现有 HTML 已作为视觉原型归档且未被修改。正式页面现位于
`pangdonglai_project/site`，技术栈为 Vite 驱动的 vinext / Next App Router +
React + TypeScript。

本轮只完成本地工程与 Git 提交，没有上传远端 Git，也没有部署到云端。

---

## 给下一位的指令

### 给 Grok

1. 先读 `AGENTS.md`、`docs/PLAN.md` 和 `pangdonglai_project/PRODUCT_PLAN.md`。
2. 以提交 `aae95cc` 为首页验收对象；不要直接修改 `pangdonglai_project/site/**`。
3. 核验原始 HTML 未被改动，在 `pangdonglai_project/site` 运行 `npm ci`、`npm run lint`、`npm test` 并检查控制台错误。
4. 检查 360、768、1440 px 视口的关键词遮挡、A/B 锚点落点、键盘操作和减少动态模式。
5. 将结果写入 `docs/QA_REPORT.md` 并更新本 HANDOFF；不要直接修改首页源码。

### 给 Codex

1. 在 `pangdonglai_project/site` 中建立源码，不继续修改压缩 HTML。
2. 本轮只做工程基线、Hero、A/B 锚点、`#explore` 和 `#ai-dialogue`。
3. 使用 Vite、React、TypeScript 的原因：恢复可维护组件源码、响应式结构和可验证构建。
4. 完成后更新 HANDOFF 并小步提交 Git，交给 Grok 验收。

---

## 文件边界

- 用户已有、当前不修改：`pangdonglai_project/胖东来网页（7月22日1点34分）.html`
- 稳定详细方案：`pangdonglai_project/PRODUCT_PLAN.md`
- 稳定总体方向：`docs/PLAN.md`
- 当前交接状态：`docs/HANDOFF.md`
- Grok 后续来源报告：`docs/SOURCE_AUDIT.md`
- Grok 后续质量报告：`docs/QA_REPORT.md`

---

## 验收标准（当前方案阶段）

- [x] 首页效果有明确文案、动效、响应式和可访问性方案。
- [x] A/B 锚点有明确样式、目标与降级规则。
- [x] 门店图谱、14 家门店、内部详情页和地图方案明确。
- [x] 新闻报道的数据结构、筛选、外链与版权边界明确。
- [x] AI 界面、RAG、来源等级、拒答和评测方案明确。
- [x] Codex、Grok、用户的文件和阶段分工明确。
- [x] 实施阶段、验收指标与风险清单明确。

---

## 最近变更

| 时间 | 谁 | 做了什么 | 文件 |
|---|---|---|---|
| 2026-07-22 | Grok | 创建协同基建与模板 + Git 初始化 | README.md, AGENTS.md, docs/*, .gitignore, .git |
| 2026-07-22 | Codex | 审阅现有网页、调研来源、编写产品与实施计划并更新交接 | pangdonglai_project/PRODUCT_PLAN.md, docs/PLAN.md, docs/HANDOFF.md |
| 2026-07-23 | Codex | 迁移共享工作区并保存原始 HTML 基线 | .gitignore, pangdonglai_project/原始HTML, AGENTS.md, docs/HANDOFF.md |
| 2026-07-23 | Codex | 完成可维护首页、双锚点、详情/AI 落点、响应式、测试与分享封面；提交 `aae95cc` | pangdonglai_project/site/**, docs/PLAN.md, pangdonglai_project/PRODUCT_PLAN.md |

---

## 阻塞

首页实现无产品阻塞，等待 Grok 独立验收和用户视觉确认。云端发布尚未授权；门店图片授权和真实 AI 接口仍留待后续阶段确认。
