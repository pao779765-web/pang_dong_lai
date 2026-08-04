import { readFile, writeFile } from "node:fs/promises";
import {
  createTokenHubEmbeddingClient,
  DEFAULT_TOKENHUB_EMBEDDING_ENDPOINT,
  DEFAULT_TOKENHUB_EMBEDDING_MODEL,
} from "../shared/embedding-client.mjs";
import { createHybridKnowledgeRetriever } from "../shared/hybrid-retrieval.mjs";
import { createKnowledgeRetriever } from "../shared/retrieval.mjs";

const evaluationUrl = new URL("../../evaluation/rag-culture-questions-v1.json", import.meta.url);
const knowledgeUrl = new URL("../../knowledge/compiled/knowledge-base.json", import.meta.url);
const controlUrl = new URL("../../evaluation/rag-culture-current-evaluation.json", import.meta.url);
const vectorIndexUrl = new URL("../../knowledge/vector/r5-general-index.json", import.meta.url);
const resultUrl = new URL("../../evaluation/rag-culture-r5-hybrid-experiment.json", import.meta.url);
const reportUrl = new URL("../../../docs/RAG_CULTURE_R5_HYBRID_EXPERIMENT.md", import.meta.url);
const vectorWeightArgument = process.argv.find((argument) => argument.startsWith("--vector-weight="));
const vectorWeight = vectorWeightArgument ? Number(vectorWeightArgument.split("=")[1]) : 0.65;

const apiKey = process.env.TENCENT_TOKENHUB_API_KEY ?? process.env.TokenHub_Key;
if (!apiKey) {
  throw new Error("缺少 TENCENT_TOKENHUB_API_KEY 或 TokenHub_Key；真实 R5 对照评测不会使用伪向量代替。 ");
}

const [evaluation, knowledgeBase, control, vectorIndex] = await Promise.all([
  readFile(evaluationUrl, "utf8").then(JSON.parse),
  readFile(knowledgeUrl, "utf8").then(JSON.parse),
  readFile(controlUrl, "utf8").then(JSON.parse),
  readFile(vectorIndexUrl, "utf8").then(JSON.parse),
]);
const keywordRetriever = createKnowledgeRetriever(knowledgeBase, {
  queryRewriteV1: true,
  answerPurposeFilterV1: true,
});
const client = createTokenHubEmbeddingClient({
  apiKey,
  endpoint: process.env.TENCENT_TOKENHUB_ENDPOINT ?? DEFAULT_TOKENHUB_EMBEDDING_ENDPOINT,
  model: process.env.TENCENT_TOKENHUB_MODEL ?? DEFAULT_TOKENHUB_EMBEDDING_MODEL,
});

if (client.model !== vectorIndex.model) {
  throw new Error(`查询模型 ${client.model} 与索引模型 ${vectorIndex.model} 不一致。`);
}

const keywordPlans = evaluation.questions.map((question) =>
  keywordRetriever.searchKnowledge(question.question, question.context),
);
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

const retriever = createHybridKnowledgeRetriever({
  knowledgeBase,
  keywordRetriever,
  vectorIndex,
  vectorWeight,
  fallbackToKeyword: false,
  embedQuery: async (text) => queryVectors.get(text),
});

function evaluate(question, plan) {
  const retrievedChunkIds = plan.retrieved.map((item) => item.chunkId);
  const forbiddenHits = question.mustNotRecallChunkIds.filter((id) => retrievedChunkIds.includes(id));
  const trackPass = plan.track === question.expectedTrack;
  const actualCaseId = plan.caseRecord?.id ?? null;
  const casePass = question.expectedTrack === "case"
    ? actualCaseId === question.expectedCaseId
    : actualCaseId === null;
  const positiveRecallPass = question.mustRecallAnyOf.length === 0 ||
    question.mustRecallAnyOf.some((id) => retrievedChunkIds.includes(id));
  const isolationPass = forbiddenHits.length === 0;
  const finalityIntentPass = plan.asksForFinality === question.asksForFinality;
  const noAnswerSafetyPass =
    !(question.shouldStateInsufficientEvidence && question.mustRecallAnyOf.length === 0) ||
    retrievedChunkIds.length === 0;
  const baselinePass =
    trackPass && casePass && positiveRecallPass && isolationPass && finalityIntentPass && noAnswerSafetyPass;
  return {
    id: question.id,
    question: question.question,
    actual: {
      retrievalMode: plan.retrievalMode,
      vectorApplied: plan.vectorApplied,
      track: plan.track,
      caseId: actualCaseId,
      retrievedChunkIds,
      retrieved: plan.retrieved.map((item) => ({
        chunkId: item.chunkId,
        score: Number(item.score.toFixed(8)),
        baseScore: Number((item.baseScore ?? 0).toFixed(8)),
        vectorScore: item.vectorScore === null || item.vectorScore === undefined
          ? null
          : Number(item.vectorScore.toFixed(8)),
        bm25Rank: item.bm25Rank ?? null,
        vectorRank: item.vectorRank ?? null,
      })),
    },
    checks: { trackPass, casePass, positiveRecallPass, isolationPass, finalityIntentPass, noAnswerSafetyPass, baselinePass },
    forbiddenHits,
  };
}

const results = [];
for (const question of evaluation.questions) {
  results.push(evaluate(question, await retriever.searchKnowledge(question.question, question.context)));
}
const controlById = new Map(control.results.map((result) => [result.id, result]));
const regressions = results.filter((result) => controlById.get(result.id)?.checks.baselinePass && !result.checks.baselinePass);
const improvements = results.filter((result) => !controlById.get(result.id)?.checks.baselinePass && result.checks.baselinePass);
const severeRegressions = regressions.filter((result) =>
  !result.checks.trackPass || !result.checks.casePass || !result.checks.isolationPass ||
  !result.checks.finalityIntentPass || !result.checks.noAnswerSafetyPass,
);
const passed = results.filter((result) => result.checks.baselinePass).length;
const experiment = {
  id: "rag-culture-r5-hybrid-experiment",
  generatedAt: new Date().toISOString(),
  configuration: {
    control: control.id,
    provider: vectorIndex.provider,
    model: vectorIndex.model,
    dimensions: vectorIndex.dimensions,
    vectorWeight,
    rrfK: 60,
    apiKeyStored: false,
  },
  summary: {
    total: results.length,
    passed,
    regressions: regressions.map((result) => result.id),
    improvements: improvements.map((result) => result.id),
    severeRegressions: severeRegressions.map((result) => result.id),
    safetyGatePass: severeRegressions.length === 0 && regressions.length === 0,
  },
  results,
};
const report = `# R5 混合检索对照实验\n\n- 控制组：${control.summary.passed}/${control.summary.total}\n- 混合检索：${passed}/${results.length}\n- 回归：${regressions.length ? regressions.map((item) => item.id).join("、") : "0"}\n- 严重回归：${severeRegressions.length ? severeRegressions.map((item) => item.id).join("、") : "0"}\n- 安全门槛：${experiment.summary.safetyGatePass ? "通过" : "未通过"}\n\n当前 54 题用于确认混合检索没有破坏既有能力；由于控制组已经是 54/54，向量召回的新增收益还需要另一套冻结的语义改写题验证。实验达标前不接入 Worker、不部署。\n`;

await Promise.all([
  writeFile(resultUrl, `${JSON.stringify(experiment, null, 2)}\n`, "utf8"),
  writeFile(reportUrl, report, "utf8"),
]);
console.log(`R5 混合检索：${passed}/${results.length}；回归 ${regressions.length}；严重回归 ${severeRegressions.length}。`);
