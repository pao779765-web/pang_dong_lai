import { readFile, writeFile } from "node:fs/promises";
import { createKnowledgeRetriever } from "../shared/retrieval.mjs";

const evaluationUrl = new URL("../../evaluation/rag-culture-questions-v1.json", import.meta.url);
const knowledgeUrl = new URL("../../knowledge/compiled/knowledge-base.json", import.meta.url);
const frozenBaselineUrl = new URL("../../evaluation/rag-culture-bm25-baseline-v1.json", import.meta.url);
const isCurrentEvaluation = process.argv.includes("--current");
const includesCultureV1 = process.argv.includes("--culture-v1");
const cultureRerankArgument = process.argv.find((argument) =>
  argument.startsWith("--culture-rerank="),
);
const cultureRerankWeight = cultureRerankArgument
  ? Number(cultureRerankArgument.split("=")[1])
  : 0;
const usesCultureRerank = cultureRerankWeight > 0;
const isExperiment = includesCultureV1 || usesCultureRerank;
if (isExperiment && !isCurrentEvaluation) {
  throw new Error("文化检索实验必须与 --current 一起运行，以保留相同的上下文和安全规则。");
}
if (includesCultureV1 && usesCultureRerank) {
  throw new Error("字段直接拼接和主题重排必须分开评测，不能同时启用。");
}
const currentEvaluationUrl = new URL(
  "../../evaluation/rag-culture-current-evaluation.json",
  import.meta.url,
);
const cultureExperimentUrl = new URL(
  "../../evaluation/rag-culture-bm25-culture-v1-experiment.json",
  import.meta.url,
);
const cultureRerankExperimentUrl = new URL(
  "../../evaluation/rag-culture-bm25-theme-rerank-experiment.json",
  import.meta.url,
);
const resultUrl = usesCultureRerank
  ? cultureRerankExperimentUrl
  : includesCultureV1
  ? cultureExperimentUrl
  : isCurrentEvaluation
  ? new URL("../../evaluation/rag-culture-current-evaluation.json", import.meta.url)
  : frozenBaselineUrl;
const reportUrl = usesCultureRerank
  ? new URL("../../../docs/RAG_CULTURE_BM25_THEME_RERANK_EXPERIMENT.md", import.meta.url)
  : includesCultureV1
  ? new URL("../../../docs/RAG_CULTURE_BM25_CULTURE_V1_EXPERIMENT.md", import.meta.url)
  : isCurrentEvaluation
  ? new URL("../../../docs/RAG_CULTURE_CURRENT_EVALUATION.md", import.meta.url)
  : new URL("../../../docs/RAG_CULTURE_BASELINE_V1.md", import.meta.url);

const [evaluation, knowledgeBase] = await Promise.all([
  readFile(evaluationUrl, "utf8").then(JSON.parse),
  readFile(knowledgeUrl, "utf8").then(JSON.parse),
]);

const retriever = createKnowledgeRetriever(knowledgeBase, {
  includeCultureAnnotations: includesCultureV1,
  cultureRerankWeight,
});

function roundRate(passed, total) {
  return total === 0 ? 1 : Number((passed / total).toFixed(4));
}

function evaluateQuestion(question) {
  const context = isCurrentEvaluation ? question.context : [];
  const plan = retriever.searchKnowledge(question.question, context);
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
      contextApplied: plan.contextApplied,
      queryText: plan.queryText,
      detectedCultureThemes: plan.detectedCultureThemes ?? [],
      insufficientReason: plan.insufficientReason ?? null,
      retrievedChunkIds,
      retrieved: plan.retrieved.map((item) => ({
        chunkId: item.chunkId,
        chunkTitle: item.chunkTitle,
        sourceTitle: item.sourceTitle,
        score: Number(item.score.toFixed(6)),
        baseScore: Number((item.baseScore ?? item.score).toFixed(6)),
        cultureThemeMatches: item.cultureThemeMatches ?? 0,
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

const comparisonReference = isCurrentEvaluation
  ? JSON.parse(
      await readFile(isExperiment ? currentEvaluationUrl : frozenBaselineUrl, "utf8"),
    )
  : null;
const comparisonToBaseline = comparisonReference
  ? {
      baselineId: comparisonReference.id,
      baselinePassed: comparisonReference.summary.passed,
      currentPassed: passed,
      passedDelta: passed - comparisonReference.summary.passed,
      baselinePassRate: comparisonReference.summary.passRate,
      currentPassRate: roundRate(passed, results.length),
      passRateDelta: Number(
        (roundRate(passed, results.length) - comparisonReference.summary.passRate).toFixed(4),
      ),
      newlyPassedQuestionIds: results
        .filter((result) => {
          const oldResult = comparisonReference.results.find((item) => item.id === result.id);
          return result.checks.baselinePass && !oldResult?.checks.baselinePass;
        })
        .map((result) => result.id),
      regressedQuestionIds: results
        .filter((result) => {
          const oldResult = comparisonReference.results.find((item) => item.id === result.id);
          return !result.checks.baselinePass && oldResult?.checks.baselinePass;
        })
        .map((result) => result.id),
    }
  : null;

const patternSummary = {
  failedContextQuestionIds: results
    .filter(
      (result) =>
        result.context.length > 0 &&
        (!result.checks.trackPass ||
          !result.checks.casePass ||
          !result.checks.positiveRecallPass),
    )
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

const themeDetectionPassed = usesCultureRerank
  ? results.filter((result) => result.actual.detectedCultureThemes.includes(result.theme)).length
  : null;

const experimentDecision = isExperiment
  ? {
      recommendedForProduction:
        passed > comparisonReference.summary.passed &&
        comparisonToBaseline.regressedQuestionIds.length === 0 &&
        isolationPassed >= comparisonReference.summary.isolationPassed &&
        finalityPassed >= comparisonReference.summary.finalityIntentPassed &&
        noAnswerPassed >= comparisonReference.summary.noAnswerSafetyPassed,
      adoptionGate:
        "综合通过题数必须提高、不得有退步题，且隔离、终局意图和无答案安全均不得下降。",
      controlPassed: comparisonReference.summary.passed,
      experimentPassed: passed,
      newlyPassedQuestionIds: comparisonToBaseline.newlyPassedQuestionIds,
      regressedQuestionIds: comparisonToBaseline.regressedQuestionIds,
      controlIsolationPassed: comparisonReference.summary.isolationPassed,
      experimentIsolationPassed: isolationPassed,
    }
  : null;

const baseline = {
  schemaVersion: "1.0",
  id: isCurrentEvaluation
    ? usesCultureRerank
      ? "rag-culture-bm25-theme-rerank-experiment"
      : includesCultureV1
      ? "rag-culture-bm25-culture-v1-experiment"
      : "rag-culture-current-evaluation"
    : "rag-culture-bm25-baseline-v1",
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
    cultureAnnotationSearch: includesCultureV1
      ? "non-case culture-v1 theme labels, practice, mechanism, qualified value meaning, stakeholders and tension; case annotations excluded from general-track expansion"
      : "disabled",
    cultureThemeRerank: usesCultureRerank
      ? `rule-based query theme detection; original BM25 candidates only; non-case culture-v1 match multiplier ${cultureRerankWeight}`
      : "disabled",
    topK: 5,
    caseRouting: "substring match against reviewed case aliases",
    queryRewrite: isCurrentEvaluation
      ? "rules for contextual follow-ups, finality intent and known evidence gaps"
      : "none",
    contextUsage: isCurrentEvaluation
      ? "up to two previous user messages, only for context-dependent follow-ups"
      : "none; baseline Worker retrieved only with the latest user message",
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
    themeDetectionPassed,
    themeDetectionTotal: usesCultureRerank ? results.length : null,
    themeDetectionRate: usesCultureRerank
      ? roundRate(themeDetectionPassed, results.length)
      : null,
  },
  byTheme,
  failureSummary,
  patternSummary,
  comparisonToBaseline,
  experimentDecision,
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

const reportTitle = usesCultureRerank
  ? "RAG 文化主线小权重重排对照实验"
  : includesCultureV1
  ? "RAG culture-v1 字段 BM25 对照实验"
  : isCurrentEvaluation
  ? "RAG 文化问答当前检索评测"
  : "RAG 文化问答 BM25 基线 V1";
const comparisonParagraph = comparisonToBaseline
  ? `${isExperiment ? "当前正式检索控制组" : "冻结基线"}为 ${comparisonToBaseline.baselinePassed}/${results.length}，本次变化 ${comparisonToBaseline.passedDelta} 题；新增通过：${renderQuestionList(comparisonToBaseline.newlyPassedQuestionIds)}；退步：${renderQuestionList(comparisonToBaseline.regressedQuestionIds)}。`
  : "这是修改 Query、上下文或检索门槛之前的冻结基线。";
const experimentDecisionSection = isExperiment
  ? `
### 是否启用

**结论：${experimentDecision.recommendedForProduction ? "建议进入本地正式检索，等待用户验收后再部署" : "不启用到网站正式检索"}。** 启用门槛是“综合通过题数提高、零退步，并且隔离、终局意图、无答案安全均不下降”。本次新增通过 ${renderQuestionList(experimentDecision.newlyPassedQuestionIds)}，但退步 ${renderQuestionList(experimentDecision.regressedQuestionIds)}，禁用片段隔离由 ${experimentDecision.controlIsolationPassed}/${results.length} 变为 ${experimentDecision.experimentIsolationPassed}/${results.length}。${experimentDecision.recommendedForProduction ? "该实验满足自动门槛，但仍需检查新增通过题和真实用户问法。" : "因此网站继续使用控制组配置；实验开关只用于后续复测。"}

${usesCultureRerank ? `主题识别命中题集预期主线 ${themeDetectionPassed}/${results.length}；重排权重为 ${cultureRerankWeight}，只调整原 BM25 已通过证据门槛的非案例候选，不扩充候选、不改变案例路由。` : "这说明标注本身仍然有价值，但把所有语义字段直接拼进 BM25 会重复通用词并改变排序。下一轮应测试“Query 主题识别 + 小权重重排”，而不是继续扩长 BM25 文本。"}
`
  : "";

const report = `# ${reportTitle}

> 评测集：\`${evaluation.id}\`（${results.length} 题）
>
> 知识快照：${baseline.knowledgeSnapshot.sources} 份资料、${baseline.knowledgeSnapshot.chunks} 个片段、${baseline.knowledgeSnapshot.cases} 个案例
>
> 生成时间：${baseline.evaluatedAt}

## 1. 结论

当前检索通过 ${passed}/${results.length} 题，综合通过率为 **${percent(baseline.summary.passRate)}**。${comparisonParagraph}本次只运行确定性的检索与路由，不调用 DeepSeek，因此不会产生费用；“生成越界”只记录检索结果可能带来的风险，不把风险写成已经发生的回答错误。

原始 28/54 基线文件保持不变，${isExperiment ? "本实验也不覆盖当前 39/54 控制组" : "当前结果单独保存"}；本轮仍不接入向量库。
${experimentDecisionSection}

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
${usesCultureRerank ? `| Query 文化主线识别 | ${themeDetectionPassed}/${results.length}（${percent(baseline.summary.themeDetectionRate)}） |` : ""}

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

1. **无答案保护。** ${patternSummary.noAnswerNoiseQuestionIds.length ? `仍召回噪声的题为：${renderQuestionList(patternSummary.noAnswerNoiseQuestionIds)}。这些片段可能诱导生成模型用相近资料拼答案。` : "6 道明确缺少结构化资料的问题均被资料充分性闸门拦截，没有把相似片段交给生成模型。"}
2. **对话上下文。** ${patternSummary.failedContextQuestionIds.length ? `仍未正确继承上下文的题为：${renderQuestionList(patternSummary.failedContextQuestionIds)}。` : "评测集中的上下文追问均能继承最近用户话题，并进入预期案例或召回预期片段。"}
3. **错别字会破坏案例路由。** 错别字题中未通过的是：${renderQuestionList(patternSummary.failedTypoQuestionIds)}；例如“鲜鸡旦角黄诉”“红内库”没有命中对应案例别名。
4. **终局意图。** ${patternSummary.failedFinalityIntentQuestionIds.length ? `仍未正确识别的题为：${renderQuestionList(patternSummary.failedFinalityIntentQuestionIds)}。` : "本轮题集中的终局表达已全部正确识别，同时避免把“企业后来怎么解释”误判成终局问题。"}
5. **案例路由总体较稳但仍有缺口。** 错误路由题为：${renderQuestionList(patternSummary.wrongRouteQuestionIds)}，主要集中在追问和错别字，不应通过放宽跨案例检索来弥补。
6. **一般文化问题存在语义错配。** “完整的人”“放权如何兜底”“顾客是否什么都得照办”“为什么不开遍全国”等问题容易被连续双字匹配带到表面相似、实质不支持的片段。

以上是当前算法的真实能力快照，不在本轮通过修改 Query 改写、别名或排序来美化分数。

## 7. 下一步

1. 先根据本报告判断失败属于资料缺口、当前 BM25 能力不足，还是评测题预期需要修订；
2. 只补充明确缺失的文化主线资料，不为提高数量批量抓取；
3. 完成文化知识字段和 Query 改写 V1 后，用同一试卷重跑；
4. 基线可重复且边界测试稳定后，再建立 BM25 + 向量 + 案例路由的混合检索原型。

完整逐题结果见 \`pangdonglai_project/evaluation/${usesCultureRerank ? "rag-culture-bm25-theme-rerank-experiment.json" : includesCultureV1 ? "rag-culture-bm25-culture-v1-experiment.json" : isCurrentEvaluation ? "rag-culture-current-evaluation.json" : "rag-culture-bm25-baseline-v1.json"}\`。
`;

await Promise.all([
  writeFile(resultUrl, `${JSON.stringify(baseline, null, 2)}\n`, "utf8"),
  writeFile(reportUrl, report, "utf8"),
]);

console.log(
  `${usesCultureRerank ? "文化主线重排实验" : includesCultureV1 ? "culture-v1 BM25 实验" : isCurrentEvaluation ? "当前检索评测" : "BM25 基线"}完成：${passed}/${results.length}（${percent(baseline.summary.passRate)}），报告已写入 ${reportUrl.pathname}`,
);
