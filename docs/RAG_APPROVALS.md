# RAG 资料批准记录

## 2026-07-24：第一批资料

用户已阅读 Grok 的 [`SOURCE_AUDIT.md`](./SOURCE_AUDIT.md)，并批准以下条目进入本地 JSON 资料库：

| 来源 | 状态 | 可回答范围 |
| --- | --- | --- |
| `https://web.azpdl.cn/contact` | `approved` | 门店名称、地址、联系方式、常规营业安排与周二闭店说明 |

本次批准生成的资料文件：

- [`pangdonglai_project/knowledge-base.json`](../pangdonglai_project/knowledge-base.json)

仍保持候选状态、尚未写入资料库：

| 来源 | 状态 | 原因 |
| --- | --- | --- |
| `https://web.azpdl.cn/` | `candidate` | 需要进一步确认页面主体与更新信息，才能用作企业介绍证据。 |
| `https://cpc.people.com.cn/n1/2025/0819/c64387-40545235.html` | `candidate` | 可用于受访者观点，但不宜单独证明具体制度或客观事实。 |

## 使用边界

门店资料具有时效性。未来回答必须提供原始链接与 `verifiedAt`，并提示以官方最新页面或到店通知为准。
