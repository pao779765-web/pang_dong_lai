# 目录化知识库

本目录是胖东来文化资料助手的正式知识来源。请勿手工维护旧的单一 `knowledge-base.json`。

## 目录

```text
knowledge/
├─ manifest.json                    # 总目录与计数
├─ sources/<document-id>/
│  ├─ metadata.json                # 来源、审核、范围、回答边界与正文覆盖状态
│  └─ content.md                   # 规范化正文；尚未补正文时明确标记 summary_only
├─ chunks/<document-id>.jsonl      # 检索片段，一行一个 JSON
├─ cases/<case-id>.json            # 热点事件、别名、阶段与文化观察角度
├─ compiled/knowledge-base.json    # 构建脚本生成，禁止手改
└─ legacy/knowledge-base.v2.json   # 迁移前只读快照，不参与构建
```

`scripts/migrate-knowledge-v2.mjs` 是一次性迁移工具，默认拒绝运行，避免覆盖后续新增资料。只有明确需要从 v2 快照完全重建时才使用其强制参数。

`scripts/migrate-knowledge-v2.mjs` 是一次性迁移工具，默认拒绝运行，避免覆盖后续新增资料。只有明确需要从 v2 快照完全重建时才使用其强制参数。

## 维护规则

1. 新资料先执行 `docs/RAG_RESEARCH_PROTOCOL.md` 的候选、审核和用户批准流程。
2. `metadata.json` 只保存该来源的元数据和使用边界，不放检索片段。
3. `content.md` 用于保存允许入库的规范化正文。没有取得正文时必须保留 `summary_only`，不得把摘要冒充原文。
4. `chunks/*.jsonl` 用于检索；每行必须包含 `documentId`、唯一 `id`、`title`、`text` 和 `facts`。
5. 由旧库迁移且尚未回填的片段标记为 `contentKind: reviewed_summary`；已经依据原页回填的片段标记为 `contentKind: source_text`，并用 `sourceSpans` 定位到 `content.md` 的段落。
6. 修改后在 `pangdonglai_project/site` 运行 `npm run knowledge:build`，再运行测试和 lint。

## 正文覆盖状态

- `summary_only`：当前只有已审核摘要；
- `partial_text`：已保存部分允许使用的正文；
- `full_text`：已按来源权限保存并核验完整正文；
- `metadata_only`：只保留来源信息，不保存正文。

是否允许保存全文必须逐篇判断。新闻、图书和视频资料不得因为能够访问就默认可以全文入库。

## 当前回填进度

- 资料总数：23
- 检索片段：58
- `partial_text`：3（官网简介、官网门店页、人民日报访谈）
- `summary_only`：20

逐篇权限与覆盖审计见 `docs/SOURCE_AUDIT_08.md`。
