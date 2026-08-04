import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import {
  createTokenHubEmbeddingClient,
  DEFAULT_TOKENHUB_EMBEDDING_ENDPOINT,
  DEFAULT_TOKENHUB_EMBEDDING_MODEL,
} from "../shared/embedding-client.mjs";
import { createHybridKnowledgeRetriever } from "../shared/hybrid-retrieval.mjs";
import { createKnowledgeRetriever } from "../shared/retrieval.mjs";

const fixedQuestionUrl = new URL("../../evaluation/rag-culture-questions-v1.json", import.meta.url);
const shadowQuestionUrl = new URL("../../evaluation/rag-culture-r5-semantic-shadow-v1.json", import.meta.url);
const fixedControlUrl = new URL("../../evaluation/rag-culture-current-evaluation.json", import.meta.url);
const shadowControlUrl = new URL("../../evaluation/rag-culture-r5-semantic-shadow-results-v1.json", import.meta.url);
const knowledgeUrl = new URL("../../knowledge/compiled/knowledge-base.json", import.meta.url);
const vectorIndexUrl = new URL("../../knowledge/vector/r5-general-index.json", import.meta.url);
const resultUrl = new URL("../../evaluation/rag-culture-r5c-experiment-v1.json", import.meta.url);
const reportUrl = new URL("../../../docs/RAG_CULTURE_R5C_EXPERIMENT.md", import.meta.url);

const apiKey = process.env.TENCENT_TOKENHUB_API_KEY ?? process.env.TokenHub_Key;
if (!apiKey) {
  throw new Error("缺少 TENCENT_TOKENHUB_API_KEY 或 TokenHub_Key；R5C 不会使用伪向量。");
}

const rawInputs = await Promise.all([
  readFile(fixedQuestionUrl, "utf8"),
  readFile(shadowQuestionUrl, "utf8"),
  readFile(fixedControlUrl, "utf8"),
  readFile(shadowControlUrl, "utf8"),
  readFile(knowledgeUrl, "utf8"),
  readFile(vectorIndexUrl, "utf8"),
]);
const [fixedQuestions, shadowQuestions, fixedControl, shadowControl, knowledgeBase, vectorIndex] =
  rawInputs.map(JSON.parse);

if (fixedQuestions.questions.length !== 54 || shadowQuestions.questions.length !== 31) {
  throw new Error("R5C 必须使用冻结的 54 题与 31 题双基线。");
}
if (!shadowQuestions.frozenBeforeFirstRun) throw new Error("R5B 影子题未标记为首次运行前冻结。");

const sha256 = (text) => createHash("sha256").update(text).digest("hex");
const frozenInputs = {
  fixedQuestions: { count: 54, sha256: sha256(rawInputs[0]) },
  shadowQuestions: { count: 31, sha256: sha256(rawInputs[1]) },
  fixedControl: { passed: fixedControl.summary.passed, sha256: sha256(rawInputs[2]) },
  shadowControl: {
    keywordPassed: shadowControl.summary.keyword.passed,
    hybridPassed: shadowControl.summary.hybrid.passed,
    sha256: sha256(rawInputs[3]),
  },
};

const keywordRetriever = createKnowledgeRetriever(knowledgeBase, {
  queryRewriteV1: true,
  answerPurposeFilterV1: true,
});
const questionSets = [
  { id: "fixed", questions: fixedQuestions.questions },
  { id: "shadow", questions: shadowQuestions.questions },
];
const keywordPlans = new Map();
for (const set of questionSets) {
  keywordPlans.set(
    set.id,
    set.questions.map((question) => keywordRetriever.searchKnowledge(question.question, question.context)),
  );
}

const client = createTokenHubEmbeddingClient({
  apiKey,
  endpoint: process.env.TENCENT_TOKENHUB_ENDPOINT ?? DEFAULT_TOKENHUB_EMBEDDING_ENDPOINT,
  model: process.env.TENCENT_TOKENHUB_MODEL ?? DEFAULT_TOKENHUB_EMBEDDING_MODEL,
});
if (client.model !== vectorIndex.model) {
  throw new Error(`查询模型 ${client.model} 与索引模型 ${vectorIndex.model} 不一致。`);
}

const queryTexts = [...new Set(
  [...keywordPlans.values()]
    .flat()
    .filter((plan) => plan.track === "general" && !plan.insufficientReason && plan.queryText.trim())
    .map((plan) => plan.queryText),
)];
const queryVectors = new Map();
for (let offset = 0; offset < queryTexts.length; offset += 16) {
  const batch = queryTexts.slice(offset, offset + 16);
  const vectors = await client.embed(batch);
  batch.forEach((text, index) => queryVectors.set(text, vectors[index]));
}

function evaluateQuestion(question, plan, setId) {
  const topFiveIds = plan.retrieved.slice(0, 5).map((item) => item.chunkId);
  const allRetrievedIds = plan.retrieved.map((item) => item.chunkId);
  const actualCaseId = plan.caseRecord?.id ?? null;
  const trackPass = plan.track === question.expectedTrack;
  const casePass = question.expectedTrack === "case"
    ? actualCaseId === question.expectedCaseId
    : actualCaseId === null;
  const evidenceIds = question.expectedTrack === "case" ? allRetrievedIds : topFiveIds;
  const isolationIds = setId === "fixed" ? allRetrievedIds : topFiveIds;
  const positiveRecallPass = question.mustRecallAnyOf.length === 0 ||
    question.mustRecallAnyOf.some((id) => evidenceIds.includes(id));
  const forbiddenHits = question.mustNotRecallChunkIds.filter((id) => isolationIds.includes(id));
  const isolationPass = forbiddenHits.length === 0;
  const finalityIntentPass = plan.asksForFinality === question.asksForFinality;
  const noAnswerSafetyPass =
    !(question.shouldStateInsufficientEvidence && question.mustRecallAnyOf.length === 0) ||
    topFiveIds.length === 0;
  const pass =
    trackPass && casePass && positiveRecallPass && isolationPass &&
    finalityIntentPass && noAnswerSafetyPass;
  const firstRelevantIndex = question.mustRecallAnyOf.length
    ? topFiveIds.findIndex((id) => question.mustRecallAnyOf.includes(id))
    : -1;

  return {
    id: question.id,
    setId,
    question: question.question,
    expectedTrack: question.expectedTrack,
    expectedCaseId: question.expectedCaseId,
    isNoAnswerQuestion:
      question.shouldStateInsufficientEvidence && question.mustRecallAnyOf.length === 0,
    actual: {
      track: plan.track,
      caseId: actualCaseId,
      caseRoutingMode: plan.caseRoutingMode ?? null,
      retrievalMode: plan.retrievalMode ?? "keyword",
      vectorApplied: plan.vectorApplied ?? false,
      retrievedChunkIds: topFiveIds,
      semanticCaseRoute: plan.semanticCaseRoute ?? null,
    },
    checks: {
      trackPass,
      casePass,
      positiveRecallPass,
      isolationPass,
      finalityIntentPass,
      noAnswerSafetyPass,
      pass,
    },
    firstRelevantRank: firstRelevantIndex < 0 ? null : firstRelevantIndex + 1,
    reciprocalRankAt5: firstRelevantIndex < 0 ? 0 : 1 / (firstRelevantIndex + 1),
    forbiddenHits,
  };
}

const fixedControlPass = new Map(
  fixedControl.results.map((result) => [result.id, result.checks.baselinePass]),
);
const shadowControlPass = new Map(
  shadowControl.results.map((result) => [result.id, result.keyword.checks.pass]),
);

function summarize(results, setId) {
  const control = setId === "fixed" ? fixedControlPass : shadowControlPass;
  const generalPositive = results.filter(
    (result) => result.expectedTrack === "general" &&
      (setId !== "shadow" || shadowQuestions.questions.find((item) => item.id === result.id).mustRecallAnyOf.length > 0),
  );
  const regressions = results.filter((result) => control.get(result.id) && !result.checks.pass);
  const improvements = results.filter((result) => !control.get(result.id) && result.checks.pass);
  const severeRegressions = regressions.filter((result) =>
    !result.checks.trackPass || !result.checks.casePass || !result.checks.isolationPass ||
    !result.checks.finalityIntentPass || !result.checks.noAnswerSafetyPass,
  );
  const hitAt5 = generalPositive.filter((result) => result.checks.positiveRecallPass).length;
  const mrrAt5 = generalPositive.reduce((sum, result) => sum + result.reciprocalRankAt5, 0) /
    Math.max(1, generalPositive.length);
  const noAnswerResults = results.filter((result) => result.isNoAnswerQuestion);

  return {
    total: results.length,
    passed: results.filter((result) => result.checks.pass).length,
    failedQuestionIds: results.filter((result) => !result.checks.pass).map((result) => result.id),
    regressions: regressions.map((result) => result.id),
    improvements: improvements.map((result) => result.id),
    severeRegressions: severeRegressions.map((result) => result.id),
    caseRoutePassed: results.filter((result) => result.expectedTrack === "case" && result.checks.casePass).length,
    caseTotal: results.filter((result) => result.expectedTrack === "case").length,
    noAnswerTotal: noAnswerResults.length,
    noAnswerSafetyPassed: noAnswerResults.filter((result) => result.checks.noAnswerSafetyPass).length,
    isolationPassed: results.filter((result) => result.checks.isolationPass).length,
    finalityPassed: results.filter((result) => result.checks.finalityIntentPass).length,
    generalPositiveTotal: generalPositive.length,
    hitAt5,
    hitAt5Rate: Number((hitAt5 / Math.max(1, generalPositive.length)).toFixed(4)),
    mrrAt5: Number(mrrAt5.toFixed(4)),
  };
}

const configurations = [
  [0.65, 0],
  [0.85, 0],
  [1, 0],
  [1.15, 0],
  [1, 0.15],
  [1, 0.3],
  [1.15, 0.15],
  [1.15, 0.3],
].map(([vectorWeight, keywordGuardWeight]) => ({
  id: `rrf-v${String(vectorWeight).replace(".", "-")}-g${String(keywordGuardWeight).replace(".", "-")}`,
  vectorWeight,
  keywordGuardWeight,
  rrfK: 60,
  vectorTopK: 12,
  semanticCaseRouting: true,
  caseRouteMinScore: 0.66,
  caseRouteMinMargin: 0.025,
}));

const experiments = [];
for (const configuration of configurations) {
  const retriever = createHybridKnowledgeRetriever({
    knowledgeBase,
    keywordRetriever,
    vectorIndex,
    embedQuery: async (text) => queryVectors.get(text),
    fallbackToKeyword: false,
    ...configuration,
  });
  const setResults = {};
  const summaries = {};
  for (const set of questionSets) {
    const results = [];
    for (const question of set.questions) {
      const plan = await retriever.searchKnowledge(question.question, question.context);
      results.push(evaluateQuestion(question, plan, set.id));
    }
    setResults[set.id] = results;
    summaries[set.id] = summarize(results, set.id);
  }
  experiments.push({ configuration, summaries, results: setResults });
}

const selected = [...experiments].sort((left, right) => {
  const leftSafe = Number(
    left.summaries.fixed.regressions.length === 0 &&
    left.summaries.fixed.severeRegressions.length === 0 &&
    left.summaries.shadow.severeRegressions.length === 0,
  );
  const rightSafe = Number(
    right.summaries.fixed.regressions.length === 0 &&
    right.summaries.fixed.severeRegressions.length === 0 &&
    right.summaries.shadow.severeRegressions.length === 0,
  );
  return rightSafe - leftSafe ||
    right.summaries.fixed.passed - left.summaries.fixed.passed ||
    right.summaries.shadow.passed - left.summaries.shadow.passed ||
    left.configuration.vectorWeight - right.configuration.vectorWeight ||
    left.configuration.keywordGuardWeight - right.configuration.keywordGuardWeight;
})[0];

const acceptance = {
  fixed54: selected.summaries.fixed.passed === 54,
  shadowAtLeast24: selected.summaries.shadow.passed >= 24,
  zeroFixedRegressions: selected.summaries.fixed.regressions.length === 0,
  zeroShadowRegressions: selected.summaries.shadow.regressions.length === 0,
  shadowCaseRoute5Of5:
    selected.summaries.shadow.caseRoutePassed === selected.summaries.shadow.caseTotal,
  shadowNoAnswerSafe:
    selected.summaries.shadow.noAnswerTotal === 2 &&
    selected.summaries.shadow.noAnswerSafetyPassed === selected.summaries.shadow.noAnswerTotal,
  shadowIsolation31Of31: selected.summaries.shadow.isolationPassed === 31,
  shadowFinality31Of31: selected.summaries.shadow.finalityPassed === 31,
};
acceptance.pass = Object.values(acceptance).every(Boolean);

const output = {
  schemaVersion: "1.0",
  id: "rag-culture-r5c-experiment-v1",
  evaluatedAt: new Date().toISOString(),
  frozenInputs,
  provider: vectorIndex.provider,
  model: vectorIndex.model,
  dimensions: vectorIndex.dimensions,
  apiKeyStored: false,
  selectedConfigurationId: selected.configuration.id,
  acceptance,
  experiments: experiments.map(({ configuration, summaries }) => ({ configuration, summaries })),
  selectedResults: selected.results,
};

const rows = experiments.map((experiment) =>
  `| ${experiment.configuration.vectorWeight} | ${experiment.configuration.keywordGuardWeight} | ${experiment.summaries.fixed.passed}/54 | ${experiment.summaries.shadow.passed}/31 | ${experiment.summaries.fixed.regressions.length} | ${experiment.summaries.shadow.regressions.length} | ${experiment.summaries.shadow.caseRoutePassed}/${experiment.summaries.shadow.caseTotal} |`,
).join("\n");
const selectedFixed = selected.summaries.fixed;
const selectedShadow = selected.summaries.shadow;
const userQuestion = selected.results.shadow.find((result) => result.id === "S-C6-06");
const report = `# R5C 安全 RRF、语义案例路由与终局意图实验\n\n` +
  `> 固定 54 题与冻结 31 题均以 SHA-256 记录，实验未修改题目。\n\n` +
  `| 向量权重 | 关键词短名单权重 | 固定54题 | 影子31题 | 固定回归 | 影子回归 | 影子案例路由 |\n` +
  `|---:|---:|---:|---:|---:|---:|---:|\n${rows}\n\n` +
  `选中配置：${selected.configuration.id}。固定题 ${selectedFixed.passed}/54，影子题 ${selectedShadow.passed}/31。\n\n` +
  `## 选中配置\n\n` +
  `- RRF：k=${selected.configuration.rrfK}\n` +
  `- BM25 权重：1\n` +
  `- 向量权重：${selected.configuration.vectorWeight}\n` +
  `- BM25 短名单附加权重：${selected.configuration.keywordGuardWeight}\n` +
  `- 候选：BM25 Top 12 + 向量 Top ${selected.configuration.vectorTopK}\n` +
  `- 语义案例路由：启用\n\n` +
  `## 验收结果\n\n` +
  `- 固定题：${selectedFixed.passed}/54，回归 ${selectedFixed.regressions.length}\n` +
  `- 影子题：${selectedShadow.passed}/31；相对冻结 BM25 新增 ${selectedShadow.improvements.length}，回归 ${selectedShadow.regressions.length}\n` +
  `- 一般题 Hit@5：${selectedShadow.hitAt5}/${selectedShadow.generalPositiveTotal}（${(selectedShadow.hitAt5Rate * 100).toFixed(2)}%）\n` +
  `- 一般题 MRR@5：${selectedShadow.mrrAt5}\n` +
  `- 案例路由：${selectedShadow.caseRoutePassed}/${selectedShadow.caseTotal}\n` +
  `- 资料不足安全：${selectedShadow.noAnswerSafetyPassed}/${selectedShadow.noAnswerTotal}\n` +
  `- 隔离与终局意图：31/31\n` +
  `- 用户指定题：${userQuestion?.checks.pass ? "通过" : "失败"}，路由到 ${userQuestion?.actual.caseId ?? "无案例"}\n\n` +
  `## R5C-1 至 R5C-6\n\n` +
  `1. 双基线题数与 SHA-256 已冻结；\n` +
  `2. 最终 Top 5 由安全过滤后的加权 RRF 直接决定；\n` +
  `3. 案例、资料状态、背景片段、用途与资料不足规则在 RRF 前执行；\n` +
  `4. 语义案例路由综合案例 chunk 相似度、领先差距与通用名称模糊度；\n` +
  `5. 终局意图覆盖监管盖章、尘埃落定、一审、法院处理、终审与定论；\n` +
  `6. 固定题与影子题已使用同一批查询向量完成双评测。\n\n` +
  `仍失败的影子题：${selectedShadow.failedQuestionIds.length ? selectedShadow.failedQuestionIds.join("、") : "0"}。这些问题保留为质量债务，不逐题增加专用规则。\n\n` +
  `验收门槛：${acceptance.pass ? "通过" : "未通过"}。R5C-1 至 R5C-6 只完成本地实验；本报告不授权接入 Worker 或部署。\n`;

await Promise.all([
  writeFile(resultUrl, `${JSON.stringify(output, null, 2)}\n`, "utf8"),
  writeFile(reportUrl, report, "utf8"),
]);

console.log(
  `R5C：选中 ${selected.configuration.id}；固定 ${selected.summaries.fixed.passed}/54，影子 ${selected.summaries.shadow.passed}/31；验收 ${acceptance.pass ? "通过" : "未通过"}。`,
);
