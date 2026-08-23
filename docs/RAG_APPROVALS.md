# RAG 资料批准记录

## 2026-07-24：第一批资料

用户已阅读 Grok 的 [`SOURCE_AUDIT.md`](./SOURCE_AUDIT.md)，并批准以下条目进入本地资料库：

| 来源 | 状态 | 可回答范围 |
| --- | --- | --- |
| `https://web.azpdl.cn/contact` | `approved` | 门店名称、地址、联系方式、常规营业安排与周二闭店说明 |

本次批准内容现已迁移到目录化资料库：

- [`pangdonglai_project/knowledge/manifest.json`](../pangdonglai_project/knowledge/manifest.json)
- [`pangdonglai_project/knowledge/sources/official-store-directory-2026-07-24/metadata.json`](../pangdonglai_project/knowledge/sources/official-store-directory-2026-07-24/metadata.json)

仍保持候选状态、尚未写入资料库：

| 来源 | 状态 | 原因 |
| --- | --- | --- |
| `https://web.azpdl.cn/` | `candidate` | 需要进一步确认页面主体与更新信息，才能用作企业介绍证据。 |
| `https://cpc.people.com.cn/n1/2025/0819/c64387-40545235.html` | `candidate` | 可用于受访者观点，但不宜单独证明具体制度或客观事实。 |

## 2026-08-23：C1 第二轮休假口径

用户已阅读 [`SOURCE_AUDIT_C1_02.md`](./SOURCE_AUDIT_C1_02.md)，并批示：批准 B1；限制 B2、B3、B5；拒绝 B4、B6。

| 来源 | 状态 | 可回答范围 |
| --- | --- | --- |
| https://www.ctdsb.net/c1716_202608/2823455.html | `approved` | 2026-08-06 客服确认的年假 / 自由假天数与自动审批 |
| https://www.nbd.com.cn/articles/2024-03-26/3296439.html | `limited` | 仅 2024-03 公开宣布不开心假的时点 |
| https://www.nbd.com.cn/articles/2026-03-09/4283840.html | `limited` | 企业公布的降薪增假投票与 40 天休假满意度 |
| https://www.nbd.com.cn/articles/2023-12-02/3143738.html | `limited` | 仅 2023-11 分享会「不允许不批假」的历史表述 |

未入库：快科技转述企业 15 页说明（缺原帖）；搜狐员工手册摘录（版权与版本无法确认）。

## 使用边界

门店资料具有时效性。未来回答必须提供原始链接与 `verifiedAt`，并提示以官方最新页面或到店通知为准。
