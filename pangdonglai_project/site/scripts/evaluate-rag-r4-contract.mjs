import { readFile, writeFile } from "node:fs/promises";
import { createR4AnswerGuidance } from "../shared/answer-guidance.mjs";
import { createKnowledgeRetriever } from "../shared/retrieval.mjs";

const r4SetUrl = new URL("../../evaluation/rag-culture-r4-answer-set-v1.json", import.meta.url);
const questionSetUrl = new URL("../../evaluation/rag-culture-questions-v1.json", import.meta.url);
const knowledgeUrl = new URL("../../knowledge/compiled/knowledge-base.json", import.meta.url);
const resultUrl = new URL("../../evaluation/rag-culture-r4-contract-evaluation.json", import.meta.url);

const [r4Set, questionSet, knowledgeBase] = await Promise.all([
  readFile(r4SetUrl, "utf8").then(JSON.parse),
  readFile(questionSetUrl, "utf8").then(JSON.parse),
  readFile(knowledgeUrl, "utf8").then(JSON.parse),
]);

const sourceQuestions = new Map(questionSet.questions.map((question) => [question.id, question]));
const retriever = createKnowledgeRetriever(knowledgeBase, {
  queryRewriteV1: true,
  answerPurposeFilterV1: true,
});

function expectedMoves(mode) {
  if (mode === "event") {
    return ["这件事现在知道什么", "企业当时怎么处理", "后来有没有明确结论", "从这件事观察胖东来："];
  }
  if (mode === "insufficient") {
    return ["简单说", "目前能确认什么", "为什么还不能下结论", "还缺什么信息"];
  }
  return ["简单说", "具体来看", "为什么这么做", "还要分清"];
}

const results = r4Set.questions.map((entry) => {
  const question = sourceQuestions.get(entry.referenceQuestionId);
  if (!question) throw new Error(`${entry.id} 引用了不存在的问题 ${entry.referenceQuestionId}`);

  const plan = retriever.searchKnowledge(question.question, question.context);
  const guidance = createR4AnswerGuidance({
    track: plan.track,
    insufficientReason: plan.insufficientReason,
    hasEvidence: plan.retrieved.length > 0,
  });
  const retrievedChunkIds = plan.retrieved.map((item) => item.chunkId);
  const forbiddenHits = question.mustNotRecallChunkIds.filter((id) => retrievedChunkIds.includes(id));
  const recallPass =
    question.mustRecallAnyOf.length === 0 ||
    question.mustRecallAnyOf.some((id) => retrievedChunkIds.includes(id));
  const trackPass = plan.track === question.expectedTrack;
  const casePass =
    question.expectedTrack === "case"
      ? plan.caseRecord?.id === question.expectedCaseId
      : !plan.caseRecord;
  const modePass = guidance.mode === entry.expectedMode;
  const moves = expectedMoves(entry.expectedMode);
  const movesPass =
    JSON.stringify(guidance.requiredMoves) === JSON.stringify(moves) &&
    moves.every((move) => guidance.prompt.includes(move));
  const noInternalTermsPass = !/(L1|L2|caseId|claimType|finality|preliminary_only)/.test(guidance.prompt);
  const retrievalReady = trackPass && casePass && recallPass && forbiddenHits.length === 0;
  const contractPass = retrievalReady && modePass && movesPass && noInternalTermsPass;

  return {
    id: entry.id,
    referenceQuestionId: entry.referenceQuestionId,
    theme: question.theme,
    question: question.question,
    reviewFocus: entry.reviewFocus,
    expectedAnswerPoints: question.expectedAnswerPoints,
    forbiddenClaims: question.forbiddenClaims,
    expectedMode: entry.expectedMode,
    actualMode: guidance.mode,
    requiredMoves: guidance.requiredMoves,
    retrievedChunkIds,
    checks: {
      trackPass,
      casePass,
      recallPass,
      isolationPass: forbiddenHits.length === 0,
      modePass,
      movesPass,
      noInternalTermsPass,
      retrievalReady,
      contractPass,
    },
    forbiddenHits,
    humanAnswerReview: "pending",
  };
});

const contractPassed = results.filter((result) => result.checks.contractPass).length;
const themeDistribution = Object.fromEntries(
  ["C1", "C2", "C3", "C4", "C5", "C6"].map((theme) => [
    theme,
    results.filter((result) => result.theme === theme).length,
  ]),
);
const modeDistribution = Object.fromEntries(
  ["general", "insufficient", "event"].map((mode) => [
    mode,
    results.filter((result) => result.expectedMode === mode).length,
  ]),
);

const output = {
  schemaVersion: "1.0",
  evaluationId: r4Set.id,
  generatedAt: new Date().toISOString(),
  configuration: {
    retriever: "BM25 + Query 改写 V1 + 回答用途过滤 V1",
    answerContract: "R4 大众回答结构",
    modelCalled: false,
  },
  summary: {
    total: results.length,
    contractPassed,
    contractPassRate: results.length ? Number((contractPassed / results.length).toFixed(4)) : 1,
    themeDistribution,
    modeDistribution,
    humanAnswerReviewPending: results.length,
  },
  interpretation: "自动结果只证明 18 道代表题均取得正确检索轨道、隔离边界和对应 R4 回答契约；不代表 DeepSeek 的真实回答已经通过人工内容验收。",
  results,
};

await writeFile(resultUrl, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`R4 回答契约：${contractPassed}/${results.length}`);
console.log(`真实模型回答待人工验收：${results.length}/${results.length}`);

if (contractPassed !== results.length) process.exitCode = 1;
