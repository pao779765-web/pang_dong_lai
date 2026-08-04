import { readFile, writeFile } from "node:fs/promises";
import {
  createTokenHubEmbeddingClient,
  DEFAULT_TOKENHUB_EMBEDDING_ENDPOINT,
  DEFAULT_TOKENHUB_EMBEDDING_MODEL,
} from "../shared/embedding-client.mjs";
import { createHybridKnowledgeRetriever } from "../shared/hybrid-retrieval.mjs";
import { createKnowledgeRetriever } from "../shared/retrieval.mjs";

const questionUrl = new URL("../../evaluation/rag-culture-r5-semantic-shadow-v1.json", import.meta.url);
const knowledgeUrl = new URL("../../knowledge/compiled/knowledge-base.json", import.meta.url);
const vectorIndexUrl = new URL("../../knowledge/vector/r5-general-index.json", import.meta.url);
const resultUrl = new URL("../../evaluation/rag-culture-r5-semantic-shadow-results-v1.json", import.meta.url);
const reportUrl = new URL("../../../docs/RAG_CULTURE_R5_SEMANTIC_SHADOW_V1.md", import.meta.url);

const apiKey = process.env.TENCENT_TOKENHUB_API_KEY ?? process.env.TokenHub_Key;
if (!apiKey) {
  throw new Error("缺少 TENCENT_TOKENHUB_API_KEY 或 TokenHub_Key；影子评测不会使用伪向量。");
}

const [evaluation, knowledgeBase, vectorIndex] = await Promise.all([
  readFile(questionUrl, "utf8").then(JSON.parse),
  readFile(knowledgeUrl, "utf8").then(JSON.parse),
  readFile(vectorIndexUrl, "utf8").then(JSON.parse),
]);
if (!evaluation.frozenBeforeFirstRun) throw new Error("R5B 影子题必须在首次运行前冻结。");

const keywordRetriever = createKnowledgeRetriever(knowledgeBase, {
  queryRewriteV1: true,
  answerPurposeFilterV1: true,
});
const keywordPlans = evaluation.questions.map((question) =>
  keywordRetriever.searchKnowledge(question.question, question.context),
);
const client = createTokenHubEmbeddingClient({
  apiKey,
  endpoint: process.env.TENCENT_TOKENHUB_ENDPOINT ?? DEFAULT_TOKENHUB_EMBEDDING_ENDPOINT,
  model: process.env.TENCENT_TOKENHUB_MODEL ?? DEFAULT_TOKENHUB_EMBEDDING_MODEL,
});
if (client.model !== vectorIndex.model) {
  throw new Error(`查询模型 ${client.model} 与索引模型 ${vectorIndex.model} 不一致。`);
}

const queryTexts = [...new Set(
  keywordPlans
    .filter((plan) => plan.track === "general" && !plan.insufficientReason)
    .map((plan) => plan.queryText),
)];
const queryVectors = new Map();
for (let offset = 0; offset < queryTexts.length; offset += 16) {
  const batch = queryTexts.slice(offset, offset + 16);
  const vectors = await client.embed(batch);
  batch.forEach((text, index) => queryVectors.set(text, vectors[index]));
}

const hybridRetriever = createHybridKnowledgeRetriever({
  knowledgeBase,
  keywordRetriever,
  vectorIndex,
  vectorWeight: 0.65,
  fallbackToKeyword: false,
  embedQuery: async (text) => queryVectors.get(text),
});

function evaluatePlan(question, plan) {
  const topFive = plan.retrieved.slice(0, 5);
  const topFiveIds = topFive.map((item) => item.chunkId);
  const allRetrievedIds = plan.retrieved.map((item) => item.chunkId);
  const generalPositive = question.expectedTrack === "general" && question.mustRecallAnyOf.length > 0;
  const caseEvidencePass = question.expectedTrack !== "case" ||
    question.mustRecallAnyOf.some((id) => allRetrievedIds.includes(id));
  const hitAt5 = !generalPositive || question.mustRecallAnyOf.some((id) => topFiveIds.includes(id));
  const firstRelevantRank = generalPositive
    ? topFiveIds.findIndex((id) => question.mustRecallAnyOf.includes(id)) + 1
    : 0;
  const reciprocalRankAt5 = firstRelevantRank > 0 ? 1 / firstRelevantRank : 0;
  const trackPass = plan.track === question.expectedTrack;
  const actualCaseId = plan.caseRecord?.id ?? null;
  const casePass = question.expectedTrack === "case"
    ? actualCaseId === question.expectedCaseId
    : actualCaseId === null;
  const forbiddenHits = question.mustNotRecallChunkIds.filter((id) => topFiveIds.includes(id));
  const isolationPass = forbiddenHits.length === 0;
  const finalityIntentPass = plan.asksForFinality === question.asksForFinality;
  const noAnswerSafetyPass =
    !(question.shouldStateInsufficientEvidence && question.mustRecallAnyOf.length === 0) ||
    allRetrievedIds.length === 0;
  const pass =
    trackPass && casePass && caseEvidencePass && hitAt5 && isolationPass &&
    finalityIntentPass && noAnswerSafetyPass;

  return {
    track: plan.track,
    caseId: actualCaseId,
    retrievalMode: plan.retrievalMode ?? "keyword",
    vectorApplied: plan.vectorApplied ?? false,
    insufficientReason: plan.insufficientReason ?? null,
    retrievedChunkIds: topFiveIds,
    checks: {
      trackPass,
      casePass,
      caseEvidencePass,
      hitAt5,
      isolationPass,
      finalityIntentPass,
      noAnswerSafetyPass,
      pass,
    },
    firstRelevantRank: firstRelevantRank || null,
    reciprocalRankAt5,
    forbiddenHits,
  };
}

const results = [];
for (let index = 0; index < evaluation.questions.length; index += 1) {
  const question = evaluation.questions[index];
  const keyword = evaluatePlan(question, keywordPlans[index]);
  const hybridPlan = await hybridRetriever.searchKnowledge(question.question, question.context);
  const hybrid = evaluatePlan(question, hybridPlan);
  results.push({
    id: question.id,
    theme: question.theme,
    forms: question.forms,
    question: question.question,
    expectedTrack: question.expectedTrack,
    expectedCaseId: question.expectedCaseId,
    mustRecallAnyOf: question.mustRecallAnyOf,
    mustNotRecallChunkIds: question.mustNotRecallChunkIds,
    keyword,
    hybrid,
  });
}

function summarize(mode) {
  const modeResults = results.map((result) => result[mode]);
  const generalPositiveResults = results.filter(
    (result) => result.expectedTrack === "general" && result.mustRecallAnyOf.length > 0,
  );
  const caseResults = results.filter((result) => result.expectedTrack === "case");
  const noAnswerResults = results.filter(
    (result) => result.mustRecallAnyOf.length === 0,
  );
  const hitCount = generalPositiveResults.filter((result) => result[mode].checks.hitAt5).length;
  const mrr = generalPositiveResults.reduce(
    (sum, result) => sum + result[mode].reciprocalRankAt5,
    0,
  ) / Math.max(1, generalPositiveResults.length);

  return {
    total: results.length,
    passed: modeResults.filter((result) => result.checks.pass).length,
    failedQuestionIds: results.filter((result) => !result[mode].checks.pass).map((result) => result.id),
    generalPositiveTotal: generalPositiveResults.length,
    hitAt5: hitCount,
    hitAt5Rate: Number((hitCount / Math.max(1, generalPositiveResults.length)).toFixed(4)),
    mrrAt5: Number(mrr.toFixed(4)),
    caseTotal: caseResults.length,
    caseRoutePassed: caseResults.filter((result) => result[mode].checks.casePass).length,
    noAnswerTotal: noAnswerResults.length,
    noAnswerSafetyPassed: noAnswerResults.filter((result) => result[mode].checks.noAnswerSafetyPass).length,
    isolationPassed: modeResults.filter((result) => result.checks.isolationPass).length,
    finalityPassed: modeResults.filter((result) => result.checks.finalityIntentPass).length,
  };
}

const keywordSummary = summarize("keyword");
const hybridSummary = summarize("hybrid");
const improvements = results
  .filter((result) => !result.keyword.checks.pass && result.hybrid.checks.pass)
  .map((result) => result.id);
const regressions = results
  .filter((result) => result.keyword.checks.pass && !result.hybrid.checks.pass)
  .map((result) => result.id);
const userQuestion = results.find((result) => result.forms.includes("user_supplied"));

const output = {
  schemaVersion: "1.0",
  id: "rag-culture-r5-semantic-shadow-results-v1",
  evaluatedAt: new Date().toISOString(),
  evaluationSet: evaluation.id,
  frozenBeforeFirstRun: evaluation.frozenBeforeFirstRun,
  configuration: {
    provider: vectorIndex.provider,
    model: vectorIndex.model,
    dimensions: vectorIndex.dimensions,
    vectorWeight: 0.65,
    apiKeyStored: false,
  },
  summary: {
    keyword: keywordSummary,
    hybrid: hybridSummary,
    improvements,
    regressions,
    userSuppliedQuestion: userQuestion
      ? {
          id: userQuestion.id,
          keywordPass: userQuestion.keyword.checks.pass,
          hybridPass: userQuestion.hybrid.checks.pass,
          keywordTrack: userQuestion.keyword.track,
          hybridTrack: userQuestion.hybrid.track,
          keywordForbiddenHits: userQuestion.keyword.forbiddenHits,
          hybridForbiddenHits: userQuestion.hybrid.forbiddenHits,
        }
      : null,
  },
  results,
};

const report = `# R5B 语义改写影子评测\n\n` +
  `> 题集在首次运行前冻结：${evaluation.frozenBeforeFirstRun ? "是" : "否"}\n\n` +
  `| 指标 | BM25 | BM25 + 向量 |\n|---|---:|---:|\n` +
  `| 总体通过 | ${keywordSummary.passed}/${keywordSummary.total} | ${hybridSummary.passed}/${hybridSummary.total} |\n` +
  `| 一般问题 Hit@5 | ${keywordSummary.hitAt5}/${keywordSummary.generalPositiveTotal} | ${hybridSummary.hitAt5}/${hybridSummary.generalPositiveTotal} |\n` +
  `| 一般问题 MRR@5 | ${keywordSummary.mrrAt5} | ${hybridSummary.mrrAt5} |\n` +
  `| 案例路由 | ${keywordSummary.caseRoutePassed}/${keywordSummary.caseTotal} | ${hybridSummary.caseRoutePassed}/${hybridSummary.caseTotal} |\n` +
  `| 资料不足安全 | ${keywordSummary.noAnswerSafetyPassed}/${keywordSummary.noAnswerTotal} | ${hybridSummary.noAnswerSafetyPassed}/${hybridSummary.noAnswerTotal} |\n` +
  `| 隔离 | ${keywordSummary.isolationPassed}/${keywordSummary.total} | ${hybridSummary.isolationPassed}/${hybridSummary.total} |\n\n` +
  `- 向量新增通过：${improvements.length ? improvements.join("、") : "0"}\n` +
  `- 向量回归：${regressions.length ? regressions.join("、") : "0"}\n` +
  `- 用户指定题：${userQuestion ? `BM25 ${userQuestion.keyword.checks.pass ? "通过" : "失败"}，混合检索 ${userQuestion.hybrid.checks.pass ? "通过" : "失败"}` : "未找到"}\n\n` +
  `完整逐题结果见 \`pangdonglai_project/evaluation/rag-culture-r5-semantic-shadow-results-v1.json\`。\n`;

await Promise.all([
  writeFile(resultUrl, `${JSON.stringify(output, null, 2)}\n`, "utf8"),
  writeFile(reportUrl, report, "utf8"),
]);
console.log(
  `R5B：BM25 ${keywordSummary.passed}/${keywordSummary.total}，混合检索 ${hybridSummary.passed}/${hybridSummary.total}；新增 ${improvements.length}，回归 ${regressions.length}。`,
);
