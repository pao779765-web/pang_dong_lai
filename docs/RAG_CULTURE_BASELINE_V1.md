# RAG 文化问答 BM25 基线 V1

> 评测集：`rag-culture-questions-v1`（54 题）
>
> 知识快照：30 份资料、135 个片段、6 个案例
>
> 生成时间：2026-08-01T13:18:41.348Z

## 1. 结论

当前 BM25 基线通过 28/54 题，综合通过率为 **51.8%**。本次只运行确定性的检索与路由，不调用 DeepSeek，因此不会产生费用；“生成越界”只记录检索结果可能带来的风险，不把风险写成已经发生的回答错误。

在完成失败分析前，不修改 Query 改写算法，也不接入向量库。

## 2. 核心指标

| 指标 | 结果 |
| --- | --- |
| 综合通过 | 28/54（51.8%） |
| 检索规则通过 | 30/54（55.6%） |
| 有正例问题召回 | 32/47（68.1%） |
| 轨道与案例路由 | 50/54（92.6%） |
| 禁用片段隔离 | 49/54（90.7%） |
| 终局意图识别 | 49/54（90.7%） |
| 无答案问题安全 | 0/6（0.0%） |

## 3. 分主题结果

| 主线 | 通过 | 通过率 | 失败题 |
| --- | --- | --- | --- |
| C1 | 8/14 | 57.1% | `C1-01`、`C1-06`、`C1-07`、`C1-08`、`C1-12`、`C1-13` |
| C2 | 4/8 | 50.0% | `C2-02`、`C2-04`、`C2-07`、`C2-08` |
| C3 | 4/8 | 50.0% | `C3-01`、`C3-02`、`C3-03`、`C3-08` |
| C4 | 3/8 | 37.5% | `C4-03`、`C4-04`、`C4-05`、`C4-06`、`C4-08` |
| C5 | 5/8 | 62.5% | `C5-02`、`C5-03`、`C5-08` |
| C6 | 4/8 | 50.0% | `C6-03`、`C6-04`、`C6-05`、`C6-08` |

## 4. 三类清单

- 资料缺口：`C1-03`、`C1-08`、`C1-13`、`C1-14`、`C2-08`、`C3-03`、`C3-08`、`C4-03`、`C4-04`、`C4-07`、`C4-08`、`C5-08`、`C6-04`、`C6-07`、`C6-08`
- 检索错误：`C1-01`、`C1-06`、`C1-07`、`C1-08`、`C1-12`、`C1-13`、`C2-02`、`C2-04`、`C2-07`、`C2-08`、`C3-01`、`C3-02`、`C3-03`、`C3-08`、`C4-03`、`C4-04`、`C4-05`、`C4-06`、`C4-08`、`C5-02`、`C5-03`、`C5-08`、`C6-03`、`C6-04`、`C6-05`、`C6-08`
- 生成越界风险：`C1-08`、`C2-07`、`C2-08`、`C3-08`、`C4-03`、`C4-04`、`C4-05`、`C4-06`、`C4-08`、`C5-08`、`C6-04`、`C6-05`、`C6-08`

“资料缺口”沿用试卷中预先写明的缺口题，不一定表示检索失败；“生成越界风险”表示检索阶段提供了错误案例、禁用片段或无答案噪声，尚未调用模型验证实际回答。

## 5. 未通过题目

| 题号 | 主线 | 原因 | 实际前 5 个片段 |
| --- | --- | --- | --- |
| C1-01 | C1 | 未命中预期片段 | jiemian-freedom-love-rousseau-origin、xinhua-6a-quality-before-scale、book-learn-pdl-ch2-influence、xinhua-culture-love-five-levels、xinhua-yonghui-replication-boundary |
| C1-06 | C1 | 未命中预期片段 | tsinghua-supply-chain-competitor-value、yudonglai-red-underwear-track-boundary、xinhua-culture-love-five-levels、xinhua-yonghui-replication-boundary、xinhua-6a-quality-before-scale |
| C1-07 | C1 | 未命中预期片段 | xinhua-rest-to-service-mechanism、recruitment-special-groups、interview-people-employees-and-replication、tsinghua-employee-customer-practices、tsinghua-freedom-love-definition |
| C1-08 | C1 | 无答案问题仍召回噪声 | recruitment-batch-boundary、xinhua-yonghui-learn-pdl-practices、red-underwear-report-testing-and-staff、tsinghua-employee-customer-practices、xinhua-yonghui-employee-community |
| C1-12 | C1 | 未识别终局意图 | noodle-initial-dismissal、noodle-expert-proportionality、noodle-food-vs-labor-rights、noodle-initial-stage-boundary、noodle-reconsideration-timeline |
| C1-13 | C1 | 未识别终局意图 | bride-price-statement、bride-price-company-response-not-policy、bride-price-legal-governance、bride-price-opposing-views、bride-price-cultural-boundary |
| C2-02 | C2 | 未命中预期片段 | weiqu-award-yudonglai-purpose、xinhua-culture-distribution-operations、book-learn-pdl-how-to-learn-method |
| C2-04 | C2 | 未命中预期片段 | 无 |
| C2-07 | C2 | 命中禁用片段 | xinhua-yonghui-performance-boundary、xinhua-yonghui-replication-boundary、xinhua-yonghui-learn-pdl-practices、book-learn-pdl-surface-vs-culture、book-learn-pdl-ch2-influence |
| C2-08 | C2 | 无答案问题仍召回噪声 | yudonglai-red-underwear-source-chain、jiemian-retirement-culture-question |
| C3-01 | C3 | 未命中预期片段 | jiemian-cinema-service-meaning、xinhua-yonghui-employee-community、book-learn-pdl-ch4-customer、xinhua-work-life-boundaries、tsinghua-customer-value-creation |
| C3-02 | C3 | 未命中预期片段 | book-learn-pdl-flywheel-logic、xinhua-rest-to-service-mechanism、yudonglai-red-underwear-track-boundary、book-learn-pdl-toc-and-structure、book-learn-pdl-time-lag-and-crosscheck |
| C3-03 | C3 | 未命中预期片段 | 无 |
| C3-08 | C3 | 命中禁用片段 | interview-trust-returns-and-complaints、weiqu-award-office-response、jiemian-cinema-rule-boundary、red-underwear-report-customer-and-legal |
| C4-03 | C4 | 命中禁用片段；无答案问题仍召回噪声 | xinhua-yonghui-product-restructure、tsinghua-customer-value-creation、red-underwear-early-apology、book-learn-pdl-toc-and-structure、red-underwear-report-testing-and-staff |
| C4-04 | C4 | 轨道/案例错误；未命中预期片段；未识别终局意图 | red-underwear-judgment-source-boundary、recruitment-batch-boundary、recruitment-data-retention、book-learn-pdl-surface-vs-culture、cnfin-process-not-outcome |
| C4-05 | C4 | 轨道/案例错误；未命中预期片段 | recruitment-local-life-rationale |
| C4-06 | C4 | 命中禁用片段 | yudonglai-red-underwear-track-boundary、red-underwear-report-testing-and-staff、red-underwear-judgment-testing-loss-and-reach、xinhua-culture-love-five-levels、weiqu-award-cultural-meaning-boundary |
| C4-08 | C4 | 命中禁用片段；无答案问题仍召回噪声 | interview-quality-suppliers-and-scale、tsinghua-supply-chain-competitor-value、culture-system-purpose-and-principles、xinhua-6a-holiday-traffic-data、xinhua-6a-learning-and-reform |
| C5-02 | C5 | 未命中预期片段 | jiemian-freedom-love-rousseau-origin、book-learn-pdl-flywheel-logic、book-learn-pdl-ch3-humanistic-management、interview-frontline-trust-responsibility-and-society |
| C5-03 | C5 | 未命中预期片段 | 无 |
| C5-08 | C5 | 无答案问题仍召回噪声 | jiemian-retirement-culture-question |
| C6-03 | C6 | 未命中预期片段 | red-underwear-judgment-outcome、book-learn-pdl-ch1-growth、book-learn-pdl-toc-and-structure |
| C6-04 | C6 | 轨道/案例错误；未命中预期片段 | 无 |
| C6-05 | C6 | 轨道/案例错误；未命中预期片段；未识别终局意图 | yudonglai-red-underwear-track-boundary、book-learn-pdl-ch5-culture、red-underwear-lawsuit-filing、red-underwear-judgment-handling-timeline、red-underwear-report-testing-and-staff |
| C6-08 | C6 | 未识别终局意图；无答案问题仍召回噪声 | jiemian-retirement-culture-question、book-learn-pdl-ch5-culture |

## 6. 基线暴露出的主要问题

1. **无答案保护是当前最明显的短板。** 6 道要求“知识库没有答案”的题全部召回了噪声：`C1-08`、`C2-08`、`C4-03`、`C4-08`、`C5-08`、`C6-08`。这些片段可能诱导生成模型用相近资料拼答案。
2. **当前检索不使用对话上下文。** 带上下文且未通过的题为：`C2-04`、`C4-04`、`C6-04`。其中“后来到底查清没有”无法仅凭当前句恢复茶叶案例。
3. **错别字会破坏案例路由。** 错别字题中未通过的是：`C4-05`、`C6-05`；例如“鲜鸡旦角黄诉”“红内库”没有命中对应案例别名。
4. **终局意图词表过窄。** 未识别终局意图的题为：`C1-12`、`C1-13`、`C4-04`、`C6-05`、`C6-08`；“后来还是被开除”“正式制度”“怎么判”“最后谁对谁错”等表达尚未覆盖。
5. **案例路由总体较稳但仍有缺口。** 错误路由题为：`C4-04`、`C4-05`、`C6-04`、`C6-05`，主要集中在追问和错别字，不应通过放宽跨案例检索来弥补。
6. **一般文化问题存在语义错配。** “完整的人”“放权如何兜底”“顾客是否什么都得照办”“为什么不开遍全国”等问题容易被连续双字匹配带到表面相似、实质不支持的片段。

以上是当前算法的真实能力快照，不在本轮通过修改 Query 改写、别名或排序来美化分数。

## 7. 下一步

1. 先根据本报告判断失败属于资料缺口、当前 BM25 能力不足，还是评测题预期需要修订；
2. 只补充明确缺失的文化主线资料，不为提高数量批量抓取；
3. 完成文化知识字段和 Query 改写 V1 后，用同一试卷重跑；
4. 基线可重复且边界测试稳定后，再建立 BM25 + 向量 + 案例路由的混合检索原型。

完整逐题结果见 `pangdonglai_project/evaluation/rag-culture-bm25-baseline-v1.json`。
