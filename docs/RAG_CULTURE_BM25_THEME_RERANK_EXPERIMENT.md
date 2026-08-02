# RAG 文化主线小权重重排对照实验

> 评测集：`rag-culture-questions-v1`（54 题）
>
> 知识快照：30 份资料、135 个片段、6 个案例
>
> 生成时间：2026-08-02T08:23:21.991Z

## 1. 结论

当前检索通过 39/54 题，综合通过率为 **72.2%**。当前正式检索控制组为 39/54，本次变化 0 题；新增通过：无；退步：无。本次只运行确定性的检索与路由，不调用 DeepSeek，因此不会产生费用；“生成越界”只记录检索结果可能带来的风险，不把风险写成已经发生的回答错误。

原始 28/54 基线文件保持不变，本实验也不覆盖当前 39/54 控制组；本轮仍不接入向量库。

### 是否启用

**结论：不启用到网站正式检索。** 启用门槛是“综合通过题数提高、零退步，并且隔离、终局意图、无答案安全均不下降”。本次新增通过 无，但退步 无，禁用片段隔离由 51/54 变为 51/54。因此网站继续使用控制组配置；实验开关只用于后续复测。

主题识别命中题集预期主线 54/54；重排权重为 0.05，只调整原 BM25 已通过证据门槛的非案例候选，不扩充候选、不改变案例路由。


## 2. 核心指标

| 指标 | 结果 |
| --- | --- |
| 综合通过 | 39/54（72.2%） |
| 检索规则通过 | 39/54（72.2%） |
| 有正例问题召回 | 35/47（74.5%） |
| 轨道与案例路由 | 52/54（96.3%） |
| 禁用片段隔离 | 51/54（94.4%） |
| 终局意图识别 | 54/54（100.0%） |
| 无答案问题安全 | 6/6（100.0%） |
| Query 文化主线识别 | 54/54（100.0%） |

## 3. 分主题结果

| 主线 | 通过 | 通过率 | 失败题 |
| --- | --- | --- | --- |
| C1 | 11/14 | 78.6% | `C1-01`、`C1-06`、`C1-07` |
| C2 | 6/8 | 75.0% | `C2-02`、`C2-07` |
| C3 | 4/8 | 50.0% | `C3-01`、`C3-02`、`C3-03`、`C3-08` |
| C4 | 6/8 | 75.0% | `C4-05`、`C4-06` |
| C5 | 6/8 | 75.0% | `C5-02`、`C5-03` |
| C6 | 6/8 | 75.0% | `C6-03`、`C6-05` |

## 4. 三类清单

- 资料缺口：`C1-03`、`C1-08`、`C1-13`、`C1-14`、`C2-08`、`C3-03`、`C3-08`、`C4-03`、`C4-04`、`C4-07`、`C4-08`、`C5-08`、`C6-04`、`C6-07`、`C6-08`
- 检索错误：`C1-01`、`C1-06`、`C1-07`、`C2-02`、`C2-07`、`C3-01`、`C3-02`、`C3-03`、`C3-08`、`C4-05`、`C4-06`、`C5-02`、`C5-03`、`C6-03`、`C6-05`
- 生成越界风险：`C2-07`、`C3-08`、`C4-05`、`C4-06`、`C6-05`

“资料缺口”沿用试卷中预先写明的缺口题，不一定表示检索失败；“生成越界风险”表示检索阶段提供了错误案例、禁用片段或无答案噪声，尚未调用模型验证实际回答。

## 5. 未通过题目

| 题号 | 主线 | 原因 | 实际前 5 个片段 |
| --- | --- | --- | --- |
| C1-01 | C1 | 未命中预期片段 | jiemian-freedom-love-rousseau-origin、xinhua-6a-quality-before-scale、book-learn-pdl-ch2-influence、xinhua-culture-love-five-levels、xinhua-yonghui-replication-boundary |
| C1-06 | C1 | 未命中预期片段 | tsinghua-supply-chain-competitor-value、xinhua-culture-love-five-levels、xinhua-yonghui-replication-boundary、yudonglai-red-underwear-track-boundary、xinhua-6a-quality-before-scale |
| C1-07 | C1 | 未命中预期片段 | xinhua-rest-to-service-mechanism、recruitment-special-groups、interview-people-employees-and-replication、tsinghua-employee-customer-practices、tsinghua-freedom-love-definition |
| C2-02 | C2 | 未命中预期片段 | weiqu-award-yudonglai-purpose、xinhua-culture-distribution-operations、book-learn-pdl-how-to-learn-method |
| C2-07 | C2 | 命中禁用片段 | xinhua-yonghui-replication-boundary、xinhua-yonghui-performance-boundary、book-learn-pdl-surface-vs-culture、xinhua-yonghui-learn-pdl-practices、book-learn-pdl-ch2-influence |
| C3-01 | C3 | 未命中预期片段 | jiemian-cinema-service-meaning、xinhua-yonghui-employee-community、book-learn-pdl-ch4-customer、xinhua-work-life-boundaries、tsinghua-customer-value-creation |
| C3-02 | C3 | 未命中预期片段 | book-learn-pdl-flywheel-logic、xinhua-rest-to-service-mechanism、yudonglai-red-underwear-track-boundary、book-learn-pdl-toc-and-structure、book-learn-pdl-time-lag-and-crosscheck |
| C3-03 | C3 | 未命中预期片段 | 无 |
| C3-08 | C3 | 命中禁用片段 | interview-trust-returns-and-complaints、weiqu-award-office-response、jiemian-cinema-rule-boundary、red-underwear-report-customer-and-legal |
| C4-05 | C4 | 轨道/案例错误；未命中预期片段 | recruitment-local-life-rationale |
| C4-06 | C4 | 命中禁用片段 | yudonglai-red-underwear-track-boundary、red-underwear-report-testing-and-staff、red-underwear-judgment-testing-loss-and-reach、xinhua-culture-love-five-levels、weiqu-award-cultural-meaning-boundary |
| C5-02 | C5 | 未命中预期片段 | jiemian-freedom-love-rousseau-origin、book-learn-pdl-flywheel-logic、book-learn-pdl-ch3-humanistic-management、interview-frontline-trust-responsibility-and-society |
| C5-03 | C5 | 未命中预期片段 | 无 |
| C6-03 | C6 | 未命中预期片段 | red-underwear-judgment-outcome、book-learn-pdl-ch1-growth、book-learn-pdl-toc-and-structure |
| C6-05 | C6 | 轨道/案例错误；未命中预期片段 | yudonglai-red-underwear-track-boundary、book-learn-pdl-ch5-culture、red-underwear-lawsuit-filing、red-underwear-judgment-handling-timeline、red-underwear-report-testing-and-staff |

## 6. 基线暴露出的主要问题

1. **无答案保护。** 6 道明确缺少结构化资料的问题均被资料充分性闸门拦截，没有把相似片段交给生成模型。
2. **对话上下文。** 评测集中的上下文追问均能继承最近用户话题，并进入预期案例或召回预期片段。
3. **错别字会破坏案例路由。** 错别字题中未通过的是：`C4-05`、`C6-05`；例如“鲜鸡旦角黄诉”“红内库”没有命中对应案例别名。
4. **终局意图。** 本轮题集中的终局表达已全部正确识别，同时避免把“企业后来怎么解释”误判成终局问题。
5. **案例路由总体较稳但仍有缺口。** 错误路由题为：`C4-05`、`C6-05`，主要集中在追问和错别字，不应通过放宽跨案例检索来弥补。
6. **一般文化问题存在语义错配。** “完整的人”“放权如何兜底”“顾客是否什么都得照办”“为什么不开遍全国”等问题容易被连续双字匹配带到表面相似、实质不支持的片段。

以上是当前算法的真实能力快照，不在本轮通过修改 Query 改写、别名或排序来美化分数。

## 7. 下一步

1. 先根据本报告判断失败属于资料缺口、当前 BM25 能力不足，还是评测题预期需要修订；
2. 只补充明确缺失的文化主线资料，不为提高数量批量抓取；
3. 完成文化知识字段和 Query 改写 V1 后，用同一试卷重跑；
4. 基线可重复且边界测试稳定后，再建立 BM25 + 向量 + 案例路由的混合检索原型。

完整逐题结果见 `pangdonglai_project/evaluation/rag-culture-bm25-theme-rerank-experiment.json`。
