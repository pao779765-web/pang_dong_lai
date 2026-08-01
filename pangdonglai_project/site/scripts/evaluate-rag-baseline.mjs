import { readFile, writeFile } from "node:fs/promises";
import { createKnowledgeRetriever } from "../shared/retrieval.mjs";

const evaluationUrl = new URL("../../evaluation/rag-culture-questions-v1.json", import.meta.url);
const knowledgeUrl = new URL("../../knowledge/compiled/knowledge-base.json", import.meta.url);
const resultUrl = new URL("../../evaluation/rag-culture-bm25-baseline-v1.json", import.meta.url);
const reportUrl = new URL("../../../docs/RAG_CULTURE_BASELINE_V1.md", import.meta.url);

const [evaluation, knowledgeBase] = await Promise.all([
  readFile(evaluationUrl, "utf8").then(JSON.parse),
  readFile(knowledgeUrl, "utf8").then(JSON.parse),
]);

const retriever = createKnowledgeRetriever(knowledgeBase);

function roundRate(passed, total) {
  return total === 0 ? 1 : Number((passed / total).toFixed(4));
}

function evaluateQuestion(question) {
  // This deliberately sends only the latest question because that is what the current Worker does.
  // Context-related failures therefore remain visible in the baseline instead of being hidden here.
  const plan = retriever.searchKnowledge(question.question);
  const retrievedChunkIds = plan.retrieved.map((item) => item.chunkId);
  const expectedChunks = question.mustRecallAnyOf;
  const forbiddenHits = question.mustNotRecallChunkIds.filter((id) => retrievedChunkIds.includes(id));
  const trackPass = plan.track === question.expectedTrack;
  const actualCaseId = plan.caseRecord?.id ?? null;
  const casePass =
    question.expectedTrack === "case"
      ? actualCaseId === question.expectedCaseId
      : actualCaseId === null;
  const positiveRecallPass =
    expectedChunks.length === 0 || expectedChunks.some((id) => retrievedChunkIds.includes(id));
  const isolationPass = forbiddenHits.length === 0;
  const finalityIntentPass = plan.asksForFinality === question.asksForFinality;
  const noAnswerSafetyPass =
    !(question.shouldStateInsufficientEvidence && expectedChunks.length === 0) ||
    retrievedChunkIds.length === 0;
  const retrievalPass =
    trackPass && casePass && positiveRecallPass && isolationPass && noAnswerSafetyPass;
  const baselinePass = retrievalPass && finalityIntentPass;

  const failureTypes = [];
  if (question.shouldStateInsufficientEvidence) failureTypes.push("资料缺口");
  if (!retrievalPass || !finalityIntentPass) failureTypes.push("检索错误");
  if (!isolationPass || !casePass || !noAnswerSafetyPass) failureTypes.push("生成越界风险");
  if (failureTypes.length === 0) failureTypes.push("none");

  return {
    id: question.id,
    theme: question.theme,
    forms: question.forms,
    question: question.question,
    context: question.context,
    expected: {
      track: question.expectedTrack,
      caseId: question.expectedCaseId,
      asksForFinality: question.asksForFinality,
      shouldStateInsufficientEvidence: question.shouldStateInsufficientEvidence,
      mustRecallAnyOf: expectedChunks,
      mustNotRecallChunkIds: question.mustNotRecallChunkIds,
    },
    actual: {
      track: plan.track,
      caseId: actualCaseId,
      asksForFinality: plan.asksForFinality,
      retrievedChunkIds,
      retrieved: plan.retrieved.map((item) => ({
        chunkId: item.chunkId,
        chunkTitle: item.chunkTitle,
        sourceTitle: item.sourceTitle,
        score: Number(item.score.toFixed(6)),
      })),
    },
    checks: {
      trackPass,
      casePass,
      positiveRecallPass,
      isolationPass,
      finalityIntentPass,
      noAnswerSafetyPass,
      retrievalPass,
      baselinePass,
    },
    forbiddenHits,
    failureTypes,
  };
}

const results = evaluation.questions.map(evaluateQuestion);
const passed = results.filter((result) => result.checks.baselinePass).length;
const retrievalPassed = results.filter((result) => result.checks.retrievalPass).length;
const routePassed = results.filter(
  (result) => result.checks.trackPass && result.checks.casePass,
).length;
const isolationPassed = results.filter((result) => result.checks.isolationPass).length;
const finalityPassed = results.filter((result) => result.checks.finalityIntentPass).length;
const noAnswerQuestions = results.filter(
  (result) =>
    result.expected.shouldStateInsufficientEvidence && result.expected.mustRecallAnyOf.length === 0,
);
const noAnswerPassed = noAnswerQuestions.filter(
  (result) => result.checks.noAnswerSafetyPass,
).length;
const positiveQuestions = results.filter((result) => result.expected.mustRecallAnyOf.length > 0);
const positivePassed = positiveQuestions.filter((result) => result.checks.positiveRecallPass).length;

const byTheme = Object.fromEntries(
  Object.keys(evaluation.themeDistribution).map((theme) => {
    const themeResults = results.filter((result) => result.theme === theme);
    const themePassed = themeResults.filter((result) => result.checks.baselinePass).length;
    return [
      theme,
      {
        total: themeResults.length,
        passed: themePassed,
        passRate: roundRate(themePassed, themeResults.length),
        failedQuestionIds: themeResults
          .filter((result) => !result.checks.baselinePass)
          .map((result) => result.id),
      },
    ];
  }),
);

const failureSummary = {
  evidenceGapQuestionIds: results
    .filter((result) => result.failureTypes.includes("资料缺口"))
    .map((result) => result.id),
  retrievalErrorQuestionIds: results
    .filter((result) => result.failureTypes.includes("检索错误"))
    .map((result) => result.id),
  generationBoundaryRiskQuestionIds: results
    .filter((result) => result.failureTypes.includes("生成越界风险"))
    .map((result) => result.id),
};

const patternSummary = {
  failedContextQuestionIds: results
    .filter((result) => result.context.length > 0 && !result.checks.baselinePass)
    .map((result) => result.id),
  failedTypoQuestionIds: results
    .filter((result) => result.forms.includes("typo") && !result.checks.baselinePass)
    .map((result) => result.id),
  failedFinalityIntentQuestionIds: results
    .filter((result) => !result.checks.finalityIntentPass)
    .map((result) => result.id),
  noAnswerNoiseQuestionIds: noAnswerQuestions
    .filter((result) => !result.checks.noAnswerSafetyPass)
    .map((result) => result.id),
  wrongRouteQuestionIds: results
    .filter((result) => !result.checks.trackPass || !result.checks.casePass)
    .map((result) => result.id),
};

const baseline = {
  schemaVersion: "1.0",
  id: "rag-culture-bm25-baseline-v1",
  evaluatedAt: new Date().toISOString(),
  evaluationSet: evaluation.id,
  knowledgeSnapshot: {
    sources: knowledgeBase.documents.length,
    chunks: knowledgeBase.documents.reduce(
      (count, document) => count + document.chunks.length,
      0,
    ),
    cases: knowledgeBase.cases.length,
  },
  retrievalConfiguration: {
    algorithm: "BM25 over continuous Chinese bigrams",
    topK: 5,
    caseRouting: "substring match against reviewed case aliases",
    queryRewrite: "none",
    contextUsage: "none; current Worker retrieves only with the latest user message",
    answerGeneration: "not executed; this baseline is deterministic and incurs no model calls",
  },
  scoringNotes: {
    baselinePass:
      "轨道、案例、正例召回、隔离、无答案安全和终局意图检查全部通过。",
    evidenceGap:
      "沿用题集 shouldStateInsufficientEvidence 标记；这是预期知识缺口，不必然代表检索失败。",
    generationBoundaryRisk:
      "仅表示错误案例、禁用片段或无答案噪声可能诱发生成越界；未调用模型，不宣称已经发生越界。",
  },
  summary: {
    total: results.length,
    passed,
    passRate: roundRate(passed, results.length),
    retrievalPassed,
    retrievalPassRate: roundRate(retrievalPassed, results.length),
    positiveRecallPassed: positivePassed,
    positiveRecallTotal: positiveQuestions.length,
    positiveRecallRate: roundRate(positivePassed, positiveQuestions.length),
    routePassed,
    routeAccuracy: roundRate(routePassed, results.length),
    isolationPassed,
    isolationAccuracy: roundRate(isolationPassed, results.length),
    finalityIntentPassed: finalityPassed,
    finalityIntentAccuracy: roundRate(finalityPassed, results.length),
    noAnswerSafetyPassed: noAnswerPassed,
    noAnswerSafetyTotal: noAnswerQuestions.length,
    noAnswerSafetyRate: roundRate(noAnswerPassed, noAnswerQuestions.length),
  },
  byTheme,
  failureSummary,
  patternSummary,
  results,
};

function percent(rate) {
  return `${(rate * 100).toFixed(1)}%`;
}

function renderQuestionList(ids) {
  return ids.length ? ids.map((id) => `\`${id}\``).join("、") : "无";
}

const failedRows = results
  .filter((result) => !result.checks.baselinePass)
  .map((result) => {
    const reasons = [];
    if (!result.checks.trackPass || !result.checks.casePass) reasons.push("轨道/案例错误");
    if (!result.checks.positiveRecallPass) reasons.push("未命中预期片段");
    if (!result.checks.isolationPass) reasons.push("命中禁用片段");
    if (!result.checks.finalityIntentPass) reasons.push("未识别终局意图");
    if (!result.checks.noAnswerSafetyPass) reasons.push("无答案问题仍召回噪声");
    return `| ${result.id} | ${result.theme} | ${reasons.join("；")} | ${result.actual.retrievedChunkIds.slice(0, 5).join("、") || "无"} |`;
  });

const report = `# RAG 文化问答 BM25 基线 V1

> 评测集：\`${evaluation.id}\`（${results.length} 题）
>
> 知识快照：${baseline.knowledgeSnapshot.sources} 份资料、${baseline.knowledgeSnapshot.chunks} 个片段、${baseline.knowledgeSnapshot.cases} 个案例
>
> 生成时间：${baseline.evaluatedAt}

## 1. 结论

当前 BM25 基线通过 ${passed}/${results.length} 题，综合通过率为 **${percent(baseline.summary.passRate)}**。本次只运行确定性的检索与路由，不调用 DeepSeek，因此不会产生费用；“生成越界”只记录检索结果可能带来的风险，不把风险写成已经发生的回答错误。

在完成失败分析前，不修改 Query 改写算法，也不接入向量库。

## 2. 核心指标

| 指标 | 结果 |
| --- | --- |
| 综合通过 | ${passed}/${results.length}（${percent(baseline.summary.passRate)}） |
| 检索规则通过 | ${retrievalPassed}/${results.length}（${percent(baseline.summary.retrievalPassRate)}） |
| 有正例问题召回 | ${positivePassed}/${positiveQuestions.length}（${percent(baseline.summary.positiveRecallRate)}） |
| 轨道与案例路由 | ${routePassed}/${results.length}（${percent(baseline.summary.routeAccuracy)}） |
| 禁用片段隔离 | ${isolationPassed}/${results.length}（${percent(baseline.summary.isolationAccuracy)}） |
| 终局意图识别 | ${finalityPassed}/${results.length}（${percent(baseline.summary.finalityIntentAccuracy)}） |
| 无答案问题安全 | ${noAnswerPassed}/${noAnswerQuestions.length}（${percent(baseline.summary.noAnswerSafetyRate)}） |

## 3. 分主题结果

| 主线 | 通过 | 通过率 | 失败题 |
| --- | --- | --- | --- |
${Object.entries(byTheme)
  .map(
    ([theme, value]) =>
      `| ${theme} | ${value.passed}/${value.total} | ${percent(value.passRate)} | ${renderQuestionList(value.failedQuestionIds)} |`,
  )
  .join("\n")}

## 4. 三类清单

- 资料缺口：${renderQuestionList(failureSummary.evidenceGapQuestionIds)}
- 检索错误：${renderQuestionList(failureSummary.retrievalErrorQuestionIds)}
- 生成越界风险：${renderQuestionList(failureSummary.generationBoundaryRiskQuestionIds)}

“资料缺口”沿用试卷中预先写明的缺口题，不一定表示检索失败；“生成越界风险”表示检索阶段提供了错误案例、禁用片段或无答案噪声，尚未调用模型验证实际回答。

## 5. 未通过题目

| 题号 | 主线 | 原因 | 实际前 5 个片段 |
| --- | --- | --- | --- |
${failedRows.length ? failedRows.join("\n") : "| — | — | 无 | — |"}

## 6. 基线暴露出的主要问题

1. **无答案保护是当前最明显的短板。** 6 道要求“知识库没有答案”的题全部召回了噪声：${renderQuestionList(patternSummary.noAnswerNoiseQuestionIds)}。这些片段可能诱导生成模型用相近资料拼答案。
2. **当前检索不使用对话上下文。** 带上下文且未通过的题为：${renderQuestionList(patternSummary.failedContextQuestionIds)}。其中“后来到底查清没有”无法仅凭当前句恢复茶叶案例。
3. **错别字会破坏案例路由。** 错别字题中未通过的是：${renderQuestionList(patternSummary.failedTypoQuestionIds)}；例如“鲜鸡旦角黄诉”“红内库”没有命中对应案例别名。
4. **终局意图词表过窄。** 未识别终局意图的题为：${renderQuestionList(patternSummary.failedFinalityIntentQuestionIds)}；“后来还是被开除”“正式制度”“怎么判”“最后谁对谁错”等表达尚未覆盖。
5. **案例路由总体较稳但仍有缺口。** 错误路由题为：${renderQuestionList(patternSummary.wrongRouteQuestionIds)}，主要集中在追问和错别字，不应通过放宽跨案例检索来弥补。
6. **一般文化问题存在语义错配。** “完整的人”“放权如何兜底”“顾客是否什么都得照办”“为什么不开遍全国”等问题容易被连续双字匹配带到表面相似、实质不支持的片段。

以上是当前算法的真实能力快照，不在本轮通过修改 Query 改写、别名或排序来美化分数。

## 7. 下一步

1. 先根据本报告判断失败属于资料缺口、当前 BM25 能力不足，还是评测题预期需要修订；
2. 只补充明确缺失的文化主线资料，不为提高数量批量抓取；
3. 完成文化知识字段和 Query 改写 V1 后，用同一试卷重跑；
4. 基线可重复且边界测试稳定后，再建立 BM25 + 向量 + 案例路由的混合检索原型。

完整逐题结果见 \`pangdonglai_project/evaluation/rag-culture-bm25-baseline-v1.json\`。
`;

await Promise.all([
  writeFile(resultUrl, `${JSON.stringify(baseline, null, 2)}\n`, "utf8"),
  writeFile(reportUrl, report, "utf8"),
]);

console.log(
  `BM25 基线完成：${passed}/${results.length}（${percent(baseline.summary.passRate)}），报告已写入 ${reportUrl.pathname}`,
);
