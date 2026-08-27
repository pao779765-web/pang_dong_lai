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
const resultUrl = new URL("../../evaluation/rag-culture-vector-rebuild-2026-08-27.json", import.meta.url);
const reportUrl = new URL("../../../docs/RAG_VECTOR_REBUILD_2026-08-27.md", import.meta.url);

const apiKey = process.env.TENCENT_TOKENHUB_API_KEY ?? process.env.TokenHub_Key;
if (!apiKey) {
  throw new Error("缺少 TENCENT_TOKENHUB_API_KEY 或 TokenHub_Key；重建对照不会使用伪向量。");
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
  throw new Error("重建对照必须使用冻结的 54 题与 31 题。");
}

const sha256 = (text) => createHash("sha256").update(text).digest("hex");
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
  console.log(`已生成查询向量 ${Math.min(offset + batch.length, queryTexts.length)}/${queryTexts.length}。`);
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
      retrievalMode: plan.retrievalMode ?? "keyword",
      vectorApplied: plan.vectorApplied ?? false,
      retrievedChunkIds: topFiveIds,
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

  return {
    total: results.length,
    passed: results.filter((result) => result.checks.pass).length,
    failedQuestionIds: results.filter((result) => !result.checks.pass).map((result) => result.id),
    regressions: regressions.map((result) => result.id),
    improvements: improvements.map((result) => result.id),
    severeRegressions: severeRegressions.map((result) => result.id),
    caseRoutePassed: results.filter((result) => result.expectedTrack === "case" && result.checks.casePass).length,
    caseTotal: results.filter((result) => result.expectedTrack === "case").length,
    isolationPassed: results.filter((result) => result.checks.isolationPass).length,
    finalityPassed: results.filter((result) => result.checks.finalityIntentPass).length,
    noAnswerTotal: results.filter((result) => result.isNoAnswerQuestion).length,
    noAnswerSafetyPassed: results.filter((result) => result.isNoAnswerQuestion && result.checks.noAnswerSafetyPass).length,
    generalPositiveTotal: generalPositive.length,
    hitAt5: generalPositive.filter((result) => result.checks.positiveRecallPass).length,
  };
}

const retriever = createHybridKnowledgeRetriever({
  knowledgeBase,
  keywordRetriever,
  vectorIndex,
  embedQuery: async (text) => queryVectors.get(text),
  fallbackToKeyword: false,
  vectorWeight: 0.65,
  keywordGuardWeight: 0,
  rrfK: 60,
  vectorTopK: 12,
  semanticCaseRouting: true,
  caseRouteMinScore: 0.66,
  caseRouteMinMargin: 0.025,
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

const acceptance = {
  fixed54: summaries.fixed.passed === 54,
  zeroFixedRegressions: summaries.fixed.regressions.length === 0,
  zeroFixedSevereRegressions: summaries.fixed.severeRegressions.length === 0,
  zeroShadowSevereRegressions: summaries.shadow.severeRegressions.length === 0,
  shadowIsolation31Of31: summaries.shadow.isolationPassed === 31,
  shadowFinality31Of31: summaries.shadow.finalityPassed === 31,
};
acceptance.pass = Object.values(acceptance).every(Boolean);

const output = {
  schemaVersion: "1.0",
  id: "rag-culture-vector-rebuild-2026-08-27",
  evaluatedAt: new Date().toISOString(),
  apiKeyStored: false,
  vectorIndex: {
    entryCount: vectorIndex.entryCount,
    generalTrackEntryCount: vectorIndex.generalTrackEntryCount,
    caseRestrictedEntryCount: vectorIndex.caseRestrictedEntryCount,
    corpusHash: vectorIndex.corpusHash,
    generatedAt: vectorIndex.generatedAt,
    model: vectorIndex.model,
  },
  frozenInputs: {
    fixedQuestionsSha256: sha256(rawInputs[0]),
    shadowQuestionsSha256: sha256(rawInputs[1]),
  },
  configuration: {
    vectorWeight: 0.65,
    keywordGuardWeight: 0,
    rrfK: 60,
    vectorTopK: 12,
    semanticCaseRouting: true,
  },
  acceptance,
  summaries,
  failed: {
    fixed: setResults.fixed.filter((result) => !result.checks.pass).map((result) => ({
      id: result.id,
      question: result.question,
      checks: result.checks,
      retrievedChunkIds: result.actual.retrievedChunkIds,
    })),
    shadow: setResults.shadow.filter((result) => !result.checks.pass).map((result) => ({
      id: result.id,
      question: result.question,
      checks: result.checks,
      retrievedChunkIds: result.actual.retrievedChunkIds,
    })),
  },
};

await writeFile(resultUrl, `${JSON.stringify(output, null, 2)}\n`, "utf8");

const report = `# 向量索引重建对照（2026-08-27）

> 使用现网 R5C 配置（BM25 1 : 向量 0.65，k=60，语义案例路由）。未改题目，未覆盖历史 R5C 实验文件。

- 文档向量：${vectorIndex.entryCount}（一般轨 ${vectorIndex.generalTrackEntryCount}，案例受限 ${vectorIndex.caseRestrictedEntryCount}）
- 模型：\`${vectorIndex.model}\`
- 索引生成时间：${vectorIndex.generatedAt}

| 题集 | 通过 | 相对控制组回归 | 严重回归 |
|---|---:|---:|---:|
| 固定 54 题 | ${summaries.fixed.passed}/54 | ${summaries.fixed.regressions.length} | ${summaries.fixed.severeRegressions.length} |
| 影子 31 题 | ${summaries.shadow.passed}/31 | ${summaries.shadow.regressions.length} | ${summaries.shadow.severeRegressions.length} |

固定题失败：${summaries.fixed.failedQuestionIds.join("、") || "无"}  
影子题失败：${summaries.shadow.failedQuestionIds.join("、") || "无"}  
固定题回归：${summaries.fixed.regressions.join("、") || "无"}  
影子题严重回归：${summaries.shadow.severeRegressions.join("、") || "无"}

**验收：** ${acceptance.pass ? "通过（固定 54/54、无固定回归、无严重回归）" : "未通过"}。未部署 CloudBase。
`;
await writeFile(reportUrl, report, "utf8");

console.log(JSON.stringify({
  acceptance,
  summaries: {
    fixed: summaries.fixed,
    shadow: summaries.shadow,
  },
  entryCount: vectorIndex.entryCount,
}, null, 2));
if (!acceptance.pass) {
  process.exitCode = 2;
}
