# 茶叶苍蝇事件调查与入库记录

> **调查人：** Grok  
> **日期：** 2026-08-01  
> **用户指令：** 调查胖东来「茶叶苍蝇」事件，并将相关资料入库  
> **规范：** `docs/RAG_RESEARCH_PROTOCOL.md`

---

## 调查结论

| 项 | 结论 |
|----|------|
| 事件性质 | 顾客经抖音反馈茶叶异物（苍蝇）→ 企业公开**初步**情况说明 |
| 关键节点 | **2026-01-05** 企业发《情况说明（一）》；媒体 **01-05～01-06** 报道 |
| 企业自述动作 | 集团轮值专项调查组；结果公示承诺；下架排查；访厂全流程复核；承认客服未按流程并致歉 |
| 后续终局 | **未发现**可核验「情况说明（二）」/完整调查报告/监管终局通报（检索至 2026-08-01） |
| 企业原帖 | 媒体称官方抖音；**本库仍无**可核验 aweme_id / 永久分享链 → 保持 **L2**，不升 L1 |
| 入库状态 | 案例 `tea-fly-feedback-2026-01` + 文档 `media-tea-fly-preliminary-response-2026-01` 已存在；本轮**加厚 partial_text 与 chunks**，仍 **limited** |

---

## 主要来源

| 链接 | 角色 |
|------|------|
| https://ha.people.com.cn/n2/2026/0106/c351638-41465164.html | 主链（人民网河南） |
| https://www.thepaper.cn/newsDetail_forward_32324722 | 交叉（澎湃） |
| https://news.qq.com/rain/a/20260105A0581100 | 交叉（腾讯/中新经纬等） |
| https://finance.sina.com.cn/tech/roll/2026-01-05/doc-inhffwpr8122370.shtml | 交叉（新浪） |

---

## 能答 / 不能答

**可答：** 企业当时公开怎么说；先下架、访厂、调查组、致歉等自述动作；为何仍非终局。  

**不可答：** 是否确有苍蝇；责任归属；最终处理结果；「已结案」。

---

## 文件变更

- `knowledge/cases/tea-fly-feedback-2026-01.json` — 扩展 aliases  
- `knowledge/sources/media-tea-fly-preliminary-response-2026-01/*` — 加厚 content / metadata / chunks  
- `npm run knowledge:build` 重建 compiled 索引  
