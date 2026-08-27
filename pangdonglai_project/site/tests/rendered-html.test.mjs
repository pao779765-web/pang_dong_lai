import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { createCloudBaseServer } from "../scripts/cloudbase-server.mjs";
import {
  claimCoversPremise,
  collectFactualNumberTokens,
  createAnswerPlan,
  extractVerifiablePremises,
  formatDateInTimeZone,
  isDistinctiveCaseAlias,
  makeSafeFallback,
  validateAnswer,
} from "../shared/answer-control.mjs";
import { createTokenHubEmbeddingClient } from "../shared/embedding-client.mjs";
import {
  cosineSimilarity,
  createHybridKnowledgeRetriever,
  createVectorCorpus,
  reciprocalRankFusion,
} from "../shared/hybrid-retrieval.mjs";

let renderSequence = 0;

test("validates TokenHub embedding responses without exposing the key", async () => {
  const requests = [];
  const client = createTokenHubEmbeddingClient({
    apiKey: "test-secret-key",
    fetchImpl: async (url, init) => {
      requests.push({ url, init });
      return new Response(JSON.stringify({
        data: [
          { index: 1, embedding: [0, 1] },
          { index: 0, embedding: [1, 0] },
        ],
      }));
    },
  });
  assert.deepEqual(await client.embed(["员工尊严", "顾客服务"]), [[1, 0], [0, 1]]);
  assert.equal(JSON.parse(requests[0].init.body).model, "kinfra-text-embedding-4b");
  assert.equal(requests[0].init.headers.authorization, "Bearer test-secret-key");
  assert.doesNotMatch(JSON.stringify(JSON.parse(requests[0].init.body)), /test-secret-key/);

  let attempts = 0;
  const retryingClient = createTokenHubEmbeddingClient({
    apiKey: "retry-test-key",
    maxRetries: 1,
    retryBaseDelayMs: 0,
    fetchImpl: async () => {
      attempts += 1;
      if (attempts === 1) return new Response("upstream timeout", { status: 504 });
      return new Response(JSON.stringify({ data: [{ index: 0, embedding: [1, 0] }] }));
    },
  });
  assert.deepEqual(await retryingClient.embed(["重试测试"]), [[1, 0]]);
  assert.equal(attempts, 2);
});

test("fuses keyword and vector rankings while preserving safety routes", async () => {
  const knowledgeBase = {
    documents: [
      {
        id: "approved-general",
        title: "员工生活设施",
        status: "approved",
        caseId: null,
        claimType: "practice",
        finality: "not_applicable",
        evidenceLevel: "L1",
        evidenceLabel: "可核验",
        answerMode: "fact_with_source",
        answeringRules: [],
        source: { url: "https://example.com/general", verifiedAt: "2026-08-04" },
        chunks: [{ id: "general-1", title: "生活设施", text: "设置休息区和洗衣房。", facts: {}, claims: [] }],
      },
      {
        id: "limited-case",
        title: "案例初步回应",
        status: "limited",
        caseId: "case-1",
        claimType: "company_response",
        finality: "preliminary",
        evidenceLevel: "L2",
        evidenceLabel: "有限使用",
        answerMode: "case_only",
        answeringRules: [],
        source: { url: "https://example.com/case", verifiedAt: "2026-08-04" },
        chunks: [{ id: "case-1-chunk", title: "初步回应", text: "尚无最终结论。", facts: {}, claims: [] }],
      },
    ],
  };
  assert.deepEqual(createVectorCorpus(knowledgeBase).map((item) => item.chunkId), [
    "general-1",
    "case-1-chunk",
  ]);
  assert.deepEqual(
    createVectorCorpus(knowledgeBase).map((item) => item.searchableInGeneralTrack),
    [true, false],
  );
  assert.equal(cosineSimilarity([1, 0], [1, 0]), 1);
  assert.deepEqual(
    reciprocalRankFusion([["keyword"], ["vector"]], { weights: [1, 0.5] }).map((item) => item.chunkId),
    ["keyword", "vector"],
  );

  let embeddingCalls = 0;
  const keywordResult = {
    chunkId: "general-1",
    chunkTitle: "生活设施",
    content: "员工生活设施\n生活设施\n设置休息区和洗衣房。",
    sourceTitle: "员工生活设施",
    sourceUrl: "https://example.com/general",
    score: 2,
    baseScore: 2,
  };
  const keywordRetriever = {
    searchKnowledge(question) {
      if (question === "案例问题") return { track: "case", queryText: question, retrieved: [], answerCandidates: [] };
      if (question === "缺资料") {
        return { track: "general", queryText: question, insufficientReason: "资料不足", retrieved: [], answerCandidates: [] };
      }
      return {
        track: "general",
        queryText: question,
        detectedAnswerPurposes: [],
        retrieved: [keywordResult],
        answerCandidates: [keywordResult],
      };
    },
  };
  const retriever = createHybridKnowledgeRetriever({
    knowledgeBase,
    keywordRetriever,
    vectorIndex: {
      schemaVersion: "r5-vector-index-v1",
      model: "test-model",
      dimensions: 2,
      entries: [
        { chunkId: "general-1", embedding: [1, 0] },
        { chunkId: "case-1-chunk", embedding: [1, 0] },
      ],
    },
    embedQuery: async () => {
      embeddingCalls += 1;
      return [1, 0];
    },
    fallbackToKeyword: false,
  });

  const hybrid = await retriever.searchKnowledge("怎么尊重员工");
  assert.equal(hybrid.retrievalMode, "hybrid-rrf");
  assert.deepEqual(hybrid.retrieved.map((item) => item.chunkId), ["general-1"]);
  assert.equal((await retriever.searchKnowledge("案例问题")).vectorApplied, false);
  assert.equal((await retriever.searchKnowledge("缺资料")).vectorApplied, false);
  assert.equal(embeddingCalls, 1);
});

test("recalls five BM25 chunks and five embedding chunks for a total of ten", async () => {
  const { BM25_RECALL_K, EMBEDDING_RECALL_K, TOTAL_RECALL_K } = await import("../shared/retrieval.mjs");
  const keywordIds = ["kw-1", "kw-2", "kw-3", "kw-4", "kw-5", "kw-6"];
  const vectorIds = ["vec-1", "vec-2", "vec-3", "vec-4", "vec-5", "vec-6"];
  const makeDocument = (id, embeddingAxis) => ({
    id,
    title: id,
    status: "approved",
    caseId: null,
    claimType: "practice",
    finality: "not_applicable",
    evidenceLevel: "L1",
    evidenceLabel: "可核验",
    answerMode: "fact_with_source",
    answeringRules: [],
    source: { url: `https://example.com/${id}`, verifiedAt: "2026-08-23" },
    chunks: [{
      id,
      title: id,
      text: `${id} 员工生活设施`,
      facts: {},
      claims: [],
      culture: { annotationVersion: "culture-v1", relevance: "direct" },
    }],
    embeddingAxis,
  });
  const documents = [
    ...keywordIds.map((id) => makeDocument(id, "keyword")),
    ...vectorIds.map((id) => makeDocument(id, "vector")),
  ];
  const knowledgeBase = { documents, cases: [] };
  const keywordResults = keywordIds.map((id, index) => ({
    chunkId: id,
    chunkTitle: id,
    content: `${id} 员工生活设施`,
    sourceTitle: id,
    sourceUrl: `https://example.com/${id}`,
    score: 10 - index,
    baseScore: 10 - index,
  }));
  const keywordRetriever = {
    searchKnowledge() {
      return {
        track: "general",
        queryText: "怎么尊重员工",
        detectedAnswerPurposes: [],
        retrieved: keywordResults,
        answerCandidates: keywordResults,
      };
    },
  };
  const retriever = createHybridKnowledgeRetriever({
    knowledgeBase,
    keywordRetriever,
    vectorIndex: {
      schemaVersion: "r5-vector-index-v1",
      model: "test-model",
      dimensions: 2,
      entries: documents.map((document) => ({
        chunkId: document.id,
        embedding: document.embeddingAxis === "keyword" ? [1, 0] : [0, 1],
      })),
    },
    embedQuery: async () => [0, 1],
    fallbackToKeyword: false,
  });

  const hybrid = await retriever.searchKnowledge("怎么尊重员工");
  const retrievedIds = hybrid.retrieved.map((item) => item.chunkId);
  assert.equal(hybrid.retrievalMode, "hybrid-rrf");
  assert.equal(retrievedIds.length, TOTAL_RECALL_K);
  assert.equal(hybrid.answerCandidates.length, TOTAL_RECALL_K);
  assert.deepEqual(retrievedIds.filter((id) => id.startsWith("kw-")).sort(), keywordIds.slice(0, BM25_RECALL_K));
  assert.deepEqual(retrievedIds.filter((id) => id.startsWith("vec-")).sort(), vectorIds.slice(0, EMBEDDING_RECALL_K));
  assert.ok(!retrievedIds.includes("kw-6"));
  assert.ok(!retrievedIds.includes("vec-6"));
});

test("uses semantic case routing before RRF without mixing case evidence into general retrieval", async () => {
  const knowledgeBase = {
    documents: [
      {
        id: "general",
        title: "一般文化",
        status: "approved",
        caseId: null,
        claimType: "practice",
        finality: "not_applicable",
        evidenceLevel: "L1",
        evidenceLabel: "可核验",
        answerMode: "fact_with_source",
        answeringRules: [],
        source: { url: "https://example.com/general", verifiedAt: "2026-08-04" },
        chunks: [{ id: "general", title: "一般文化", text: "尊重员工。", facts: {}, claims: [] }],
      },
      {
        id: "case",
        title: "具体事件",
        status: "limited",
        caseId: "case-1",
        claimType: "company_response",
        finality: "preliminary",
        evidenceLevel: "L2",
        evidenceLabel: "有限使用",
        answerMode: "case_only",
        answeringRules: [],
        source: { url: "https://example.com/case", verifiedAt: "2026-08-04" },
        chunks: [{ id: "case", title: "事件处理", text: "企业公布了处理情况。", facts: {}, claims: [] }],
      },
    ],
  };
  const generalResult = {
    chunkId: "general",
    content: "一般文化",
    sourceTitle: "一般文化",
    sourceUrl: "https://example.com/general",
    score: 1,
    baseScore: 1,
  };
  const keywordRetriever = {
    searchKnowledge(question, context, options = {}) {
      if (options.forcedCaseId) {
        return {
          track: "case",
          caseRecord: { id: options.forcedCaseId },
          queryText: question,
          retrieved: [{ chunkId: "case", caseId: options.forcedCaseId, score: 1 }],
          answerCandidates: [{ chunkId: "case", caseId: options.forcedCaseId, score: 1 }],
        };
      }
      return {
        track: "general",
        queryText: question,
        detectedAnswerPurposes: [],
        retrieved: [generalResult],
        answerCandidates: [generalResult],
      };
    },
  };
  const retriever = createHybridKnowledgeRetriever({
    knowledgeBase,
    keywordRetriever,
    vectorIndex: {
      schemaVersion: "r5-vector-index-v1",
      model: "test-model",
      dimensions: 2,
      entries: [
        { chunkId: "general", embedding: [1, 0] },
        { chunkId: "case", embedding: [0, 1] },
      ],
    },
    embedQuery: async () => [0, 1],
    semanticCaseRouting: true,
    caseRouteMinScore: 0.5,
    caseRouteMinMargin: 0.1,
    fallbackToKeyword: false,
  });

  const result = await retriever.searchKnowledge("这件事后来是怎么处理的？");
  assert.equal(result.track, "case");
  assert.equal(result.caseRecord.id, "case-1");
  assert.equal(result.retrievalMode, "semantic-case-route");
  assert.deepEqual(result.retrieved.map((item) => item.chunkId), ["case"]);
});

test("freezes the R5B semantic shadow set before its first model run", async () => {
  const [shadowSet, knowledgeBase, packageJson] = await Promise.all([
    readFile(new URL("../../evaluation/rag-culture-r5-semantic-shadow-v1.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../../knowledge/compiled/knowledge-base.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../package.json", import.meta.url), "utf8").then(JSON.parse),
  ]);
  const chunkIds = new Set(
    knowledgeBase.documents.flatMap((document) => document.chunks.map((chunk) => chunk.id)),
  );
  const questionIds = shadowSet.questions.map((question) => question.id);

  assert.equal(shadowSet.frozenBeforeFirstRun, true);
  assert.equal(shadowSet.questions.length, 31);
  assert.equal(new Set(questionIds).size, questionIds.length);
  assert.deepEqual(shadowSet.themeDistribution, { C1: 5, C2: 5, C3: 5, C4: 5, C5: 5, C6: 6 });
  assert.ok(
    shadowSet.questions.every((question) =>
      [...question.mustRecallAnyOf, ...question.mustNotRecallChunkIds].every((id) => chunkIds.has(id)),
    ),
  );
  const userQuestion = shadowSet.questions.find((question) => question.forms.includes("user_supplied"));
  assert.equal(
    userQuestion.question,
    "胖东来因为红裤头事件开除相关员工，这件事是否和企业文化相冲突？",
  );
  assert.equal(userQuestion.expectedCaseId, "red-underwear-color-libel-2025");
  assert.ok(userQuestion.mustNotRecallChunkIds.includes("noodle-initial-dismissal"));
  assert.match(packageJson.scripts["rag:evaluate:r5-shadow"], /evaluate-rag-r5-shadow/);
});

test("records the first frozen R5B comparison without hiding regressions", async () => {
  const result = await readFile(
    new URL("../../evaluation/rag-culture-r5-semantic-shadow-results-v1.json", import.meta.url),
    "utf8",
  ).then(JSON.parse);

  assert.equal(result.frozenBeforeFirstRun, true);
  assert.equal(result.summary.keyword.passed, 17);
  assert.equal(result.summary.hybrid.passed, 19);
  assert.deepEqual(result.summary.improvements, ["S-C3-04", "S-C5-02"]);
  assert.deepEqual(result.summary.regressions, []);
  assert.equal(result.summary.hybrid.noAnswerSafetyPassed, 2);
  assert.equal(result.summary.hybrid.isolationPassed, 31);
  assert.deepEqual(result.summary.userSuppliedQuestion, {
    id: "S-C6-06",
    keywordPass: false,
    hybridPass: false,
    keywordTrack: "general",
    hybridTrack: "general",
    keywordForbiddenHits: [],
    hybridForbiddenHits: [],
  });
});

test("records R5C dual-baseline acceptance with real RRF and semantic case routing", async () => {
  const [result, report, packageJson, liveRunner, liveResult] = await Promise.all([
    readFile(new URL("../../evaluation/rag-culture-r5c-experiment-v1.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../../../docs/RAG_CULTURE_R5C_EXPERIMENT.md", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../scripts/evaluate-rag-r5c-worker-live.mjs", import.meta.url), "utf8"),
    readFile(new URL("../../evaluation/rag-culture-r5c-worker-live-v1.json", import.meta.url), "utf8").then(JSON.parse),
  ]);
  const selected = result.experiments.find(
    (experiment) => experiment.configuration.id === result.selectedConfigurationId,
  );
  const userQuestion = result.selectedResults.shadow.find((item) => item.id === "S-C6-06");

  assert.equal(result.acceptance.pass, true);
  assert.equal(result.selectedConfigurationId, "rrf-v0-65-g0");
  assert.equal(selected.configuration.keywordGuardWeight, 0);
  assert.equal(selected.summaries.fixed.passed, 54);
  assert.deepEqual(selected.summaries.fixed.regressions, []);
  assert.equal(selected.summaries.shadow.passed, 24);
  assert.deepEqual(selected.summaries.shadow.regressions, []);
  assert.equal(selected.summaries.shadow.caseRoutePassed, 5);
  assert.equal(selected.summaries.shadow.noAnswerTotal, 2);
  assert.equal(selected.summaries.shadow.noAnswerSafetyPassed, 2);
  assert.equal(selected.summaries.shadow.isolationPassed, 31);
  assert.equal(selected.summaries.shadow.finalityPassed, 31);
  assert.equal(userQuestion.checks.pass, true);
  assert.equal(userQuestion.actual.caseId, "red-underwear-color-libel-2025");
  assert.equal(userQuestion.actual.caseRoutingMode, "forced-semantic");
  assert.match(report, /固定题：54\/54，回归 0/);
  assert.match(packageJson.scripts["rag:evaluate:r5c"], /evaluate-rag-r5c/);
  assert.match(packageJson.scripts["rag:evaluate:r5c-worker-live"], /evaluate-rag-r5c-worker-live/);
  assert.match(liveRunner, /process\.env\.DEEPSEEK_API_KEY/);
  assert.match(liveRunner, /process\.env\.TENCENT_TOKENHUB_API_KEY \?\? process\.env\.TokenHub_Key/);
  assert.match(liveRunner, /apiKeyStored: false/);
  assert.doesNotMatch(liveRunner, /writeFile\([^\n]+apiKey/);
  assert.deepEqual(liveResult.summary, { total: 3, passed: 3, failed: 0 });
  assert.equal(liveResult.humanReviewSummary, undefined);
  assert.equal(liveResult.configuration.apiKeyStored, false);
  assert.equal(liveResult.results[0].calls.tokenHub, 1);
  assert.equal(liveResult.results[1].humanReview, "pending");
  assert.equal(liveResult.results[2].calls.tokenHub, 0);
  assert.doesNotMatch(JSON.stringify(liveResult), /DEEPSEEK_API_KEY|TokenHub_Key/);
});

async function render(path = "/", init = {}, env = {}, workerCacheKey) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set(
    "test",
    workerCacheKey ?? `${process.pid}-${Date.now()}-${renderSequence++}`,
  );
  const { default: worker } = await import(workerUrl.href);

  const headers = new Headers(init.headers);
  headers.set("accept", "text/html");

  return worker.fetch(
    new Request(`http://localhost${path}`, { ...init, headers }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
      ...env,
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("keeps store content and chat contract outside their UI and Worker entrypoints", async () => {
  const [page, worker, storeDirectory, sharedChat] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../worker/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../data/store-directory.json", import.meta.url), "utf8"),
    readFile(new URL("../shared/chat.ts", import.meta.url), "utf8"),
  ]);

  assert.match(page, /@\/data\/stores/);
  assert.match(page, /@\/shared\/chat/);
  assert.doesNotMatch(page, /const storeRegions/);
  assert.match(worker, /from "\.\.\/shared\/chat"/);
  assert.match(worker, /knowledge\/compiled\/knowledge-base\.json/);
  assert.match(worker, /createKnowledgeRetriever/);
  assert.match(worker, /createHybridKnowledgeRetriever/);
  assert.match(worker, /RAG_RETRIEVAL_MODE/);
  assert.match(worker, /vectorWeight: 0\.65/);
  assert.match(worker, /keywordGuardWeight: 0/);
  assert.match(worker, /vectorTopK: EMBEDDING_RECALL_K/);
  assert.match(worker, /semanticCaseRouting: true/);
  assert.match(worker, /queryRewriteV1: true/);
  assert.match(worker, /answerPurposeFilterV1: true/);
  assert.match(worker, /previousUserQuestions/);
  assert.doesNotMatch(worker, /const BM25_K1/);
  assert.doesNotMatch(worker, /\.\.\/\.\.\/knowledge-base\.json/);
  assert.doesNotMatch(worker, /type ChatSource =/);
  assert.match(sharedChat, /export type ChatRequestMessage/);

  const regions = JSON.parse(storeDirectory);
  assert.equal(regions.flatMap((region) => region.stores).length, 14);
});

test("keeps every rendered hotspot follow-up contextual and source-graded", async () => {
  const [page, hotspots, styles] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../data/hotspots.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(hotspots, /fake-seminar-speech|bride-price-initiative/);
  const hotspotList = hotspots.slice(hotspots.indexOf("export const hotspotEvents"));
  assert.match(hotspotList, /prisonerRecruitmentHotspot/);
  assert.ok(
    hotspotList.indexOf("prisonerRecruitmentHotspot") < hotspotList.indexOf("featuredHotspot"),
    "刑释人员招聘应排在热点索引第一位",
  );
  assert.match(hotspots, /red-underwear-color-libel/);
  assert.match(hotspots, /tea-fly-feedback/);
  assert.match(hotspots, /顾客在抖音平台反馈茶叶中有苍蝇/);
  assert.doesNotMatch(hotspots, /title: "顾客抖音反馈茶叶有苍蝇"/);
  assert.match(hotspots, /egg-canthaxanthin-feedback/);
  assert.match(hotspots, /noodle-tasting-discipline/);
  assert.match(hotspots, /salary-cut-rumor/);
  assert.match(hotspots, /noodle-skin-food-safety/);
  assert.match(hotspots, /store-assault-case/);
  assert.match(hotspots, /dignity-violation-disclosure/);
  assert.match(hotspots, /zhengzhou-store/);
  assert.match(hotspots, /staff-turnover-data/);
  assert.match(hotspots, /life-plaza-closure/);
  assert.match(hotspots, /dream-city-project/);
  assert.doesNotMatch(hotspots, /cctv-economy-30-report/);
  assert.match(hotspots, /statusNote/);
  assert.match(hotspots, /credibility: "official"/);
  assert.match(hotspots, /credibility: "media"/);
  assert.match(hotspots, /credibility: "selfMedia"/);
  assert.match(hotspots, /credibility: "rumor"/);
  assert.match(hotspots, /aiReady: true/);
  assert.doesNotMatch(hotspots, /aiReady: false/);
  assert.doesNotMatch(hotspots, /pendingHotspotAiStatusNote/);
  assert.match(hotspots, /工人日报/);
  assert.match(page, /HOTSPOT_QUESTION_EVENT/);
  assert.match(page, /questionFormRef\.current\?\.requestSubmit\(\)/);
  assert.match(page, /askHotspotQuestion\(question\)/);
  assert.match(page, /selectedHotspot\.followUpPrompt/);
  assert.match(page, /补充追问：/);
  assert.match(page, /hotspot-question-panel hotspot-question-feature/);
  assert.match(page, /hotspot-detail-return[\s\S]*hotspot-question-panel hotspot-question-feature/);
  assert.match(styles, /hotspot-evidence-ledger/);
  assert.match(styles, /NEWS-UI-01/);
  assert.match(styles, /NEWS-UI-02/);
  assert.match(styles, /NEWS-UI-04/);
  assert.match(styles, /NEWS-UI-05/);
  assert.match(styles, /NEWS-UI-07/);
  assert.match(styles, /hotspot-question-feature/);
  assert.match(styles, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(styles, /display: grid;\s+width: min\(100%, 1180px\)/);
  assert.match(styles, /width: min\(100%, 1180px\)/);
  assert.match(styles, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(page, /hotspot-evidence-source-list/);
  assert.match(page, /hotspot-evidence-source-link/);
  assert.match(page, /打开来源/);
  assert.match(styles, /\.hotspot-evidence-source-action \{[\s\S]*font-size: 0\.98rem/);
  assert.match(styles, /\.hotspot-evidence-source-action \{[\s\S]*background: linear-gradient/);
  assert.match(page, /无稳定网页链接/);
  assert.doesNotMatch(page, /链接待核验/);
  assert.match(page, /function hotspotLedgerItems/);
  assert.match(page, /item.credibility === "rumor"/);
  assert.match(page, /item.credibility === "selfMedia"/);
  assert.match(page, /hotspotLedgerItems\(selectedHotspot\)\.map/);
  assert.match(hotspots, /www\.nbd\.com\.cn\/articles\/2026-07-27\/4517131\.html/);
  assert.match(hotspots, /www\.bbtnews\.com\.cn\/2026\/0809\/601678\.shtml/);
  assert.match(hotspots, /www\.henan\.gov\.cn\/2025\/03-20\/3138572\.html/);
  assert.doesNotMatch(hotspots, /sogou\.com\/web\?query=/);
  assert.doesNotMatch(hotspots, /so\.com\/s\?q=/);
  assert.match(page, /<h4>总体事件流程：<\/h4>/);
  assert.doesNotMatch(page, /<h4>目前能确认的事实<\/h4>/);
  assert.match(page, /selectedHotspot\.known\.replace\(\/\^已确认的是：\//);
  assert.doesNotMatch(page, /hotspot-source-block/);
});

test("defines and validates the R4 answer contract across all six culture themes", async () => {
  const [guidance, r4Set, evaluation, packageJson] = await Promise.all([
    import("../shared/answer-guidance.mjs"),
    readFile(new URL("../../evaluation/rag-culture-r4-answer-set-v1.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../../evaluation/rag-culture-r4-contract-evaluation.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../package.json", import.meta.url), "utf8").then(JSON.parse),
  ]);

  assert.deepEqual(guidance.R4_GENERAL_FLOW, ["简单说", "具体来看", "为什么这么做", "还要分清"]);
  assert.deepEqual(guidance.R4_EVENT_FLOW, [
    "这件事现在知道什么",
    "企业当时怎么处理",
    "后来有没有明确结论",
    "从这件事观察胖东来：",
  ]);

  const general = guidance.createR4AnswerGuidance({ track: "general", hasEvidence: true });
  assert.equal(general.mode, "general");
  assert.match(general.prompt, /一至三个最相关、可核验的做法或例子/);
  assert.match(general.prompt, /不是必须逐字显示的四个标题/);

  const insufficient = guidance.createR4AnswerGuidance({ track: "general", hasEvidence: false });
  assert.equal(insufficient.mode, "insufficient");
  assert.match(insufficient.prompt, /还缺什么信息/);
  assert.match(insufficient.prompt, /不得用相近主题、历史数字、一般理念或常识猜测/);

  const event = guidance.createR4AnswerGuidance({ track: "case", hasEvidence: true });
  assert.equal(event.mode, "event");
  assert.match(event.prompt, /不能用文化口号裁定客诉真伪/);

  assert.equal(r4Set.questions.length, 18);
  assert.deepEqual(evaluation.summary.themeDistribution, {
    C1: 3,
    C2: 3,
    C3: 3,
    C4: 3,
    C5: 3,
    C6: 3,
  });
  assert.equal(evaluation.summary.contractPassed, 18);
  assert.equal(evaluation.summary.humanAnswerReviewPending, 18);
  assert.ok(evaluation.results.every((result) => result.checks.contractPass));
  assert.match(packageJson.scripts["rag:evaluate:r4-contract"], /evaluate-rag-r4-contract/);
});

test("records the real R4 model run without storing the API key", async () => {
  const [answers, review, runner, packageJson] = await Promise.all([
    readFile(new URL("../../evaluation/rag-culture-r4-live-answers-v1.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../../evaluation/rag-culture-r4-human-review-v1.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../scripts/evaluate-rag-r4-live.mjs", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8").then(JSON.parse),
  ]);

  assert.equal(answers.summary.completed, 18);
  assert.equal(answers.summary.failed, 0);
  assert.equal(answers.configuration.apiKeyStored, false);
  assert.ok(answers.results.every((result) => result.answer && result.humanReview === "pending"));
  assert.doesNotMatch(JSON.stringify(answers), /DEEPSEEK_API_KEY/);
  assert.equal(review.runRound, 3);
  assert.equal(review.summary.pass, 15);
  assert.equal(review.summary.revise, 3);
  assert.equal(review.summary.byMode.general.pass, 7);
  assert.equal(review.summary.byMode.insufficient.pass, 3);
  assert.equal(review.summary.byMode.event.pass, 5);
  assert.deepEqual(review.summary.safeFallbacks, [
    "R4-C1-01",
  ]);
  assert.equal(review.reviews.length, 18);
  assert.match(runner, /process\.env\.DEEPSEEK_API_KEY/);
  assert.doesNotMatch(runner, /writeFile\([^\n]+apiKey/);
  assert.match(packageJson.scripts["rag:evaluate:r4-live"], /evaluate-rag-r4-live/);
});

test("builds the RAG index from the directory knowledge source of truth", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("../../knowledge/manifest.json", import.meta.url), "utf8"),
  );
  const compiled = JSON.parse(
    await readFile(new URL("../../knowledge/compiled/knowledge-base.json", import.meta.url), "utf8"),
  );

  assert.equal(manifest.schemaVersion, "3.0");
  assert.equal(manifest.sourceOfTruth, "directory");
  assert.equal(manifest.sources.length, manifest.counts.sources);
  assert.equal(manifest.cases.length, manifest.counts.cases);
  assert.equal(compiled.generatedFrom, "knowledge/manifest.json");
  assert.equal(compiled.documents.length, manifest.counts.sources);
  assert.equal(compiled.cases.length, manifest.counts.cases);
  assert.equal(
    compiled.documents.reduce((count, document) => count + document.chunks.length, 0),
    manifest.counts.chunks,
  );

  const cultureThemes = new Set(["C1", "C2", "C3", "C4", "C5", "C6"]);
  const cultureRelevance = new Set(["direct", "supporting", "context_only", "boundary"]);
  const allChunks = compiled.documents.flatMap((document) => document.chunks);
  assert.equal(allChunks.length, manifest.counts.chunks);
  assert.equal(manifest.counts.claims, manifest.counts.chunks);
  const allClaims = allChunks.flatMap((chunk) => chunk.claims);
  assert.equal(allClaims.length, manifest.counts.claims);
  assert.equal(new Set(allClaims.map((claim) => claim.id)).size, manifest.counts.claims);
  for (const chunk of allChunks) {
    assert.equal(chunk.culture.annotationVersion, "culture-v1");
    assert.ok(cultureRelevance.has(chunk.culture.relevance));
    assert.ok(chunk.culture.cultureTheme.every((theme) => cultureThemes.has(theme)));
    assert.equal(
      new Set(chunk.culture.cultureTheme).size,
      chunk.culture.cultureTheme.length,
    );
    if (chunk.culture.relevance === "boundary") {
      assert.ok(chunk.culture.tension);
    }
    if (chunk.culture.valueMeaning) {
      assert.match(chunk.culture.valueMeaning, /^可用于(?:理解|检验)/);
    }
    assert.equal(chunk.claims.length, 1);
    assert.equal(chunk.claims[0].annotationVersion, "claim-v1");
    assert.equal(chunk.claims[0].statement, chunk.text);
    assert.ok(chunk.claims[0].canSupport.length > 0);
    assert.ok(chunk.claims[0].cannotSupport.length > 0);
  }
  for (const theme of cultureThemes) {
    assert.ok(
      allChunks.filter((chunk) => chunk.culture.cultureTheme.includes(theme)).length >= 10,
      `${theme} 的文化标注覆盖不足`,
    );
  }
  assert.ok(
    allChunks.some(
      (chunk) =>
        chunk.culture.relevance === "context_only" &&
        chunk.culture.cultureTheme.length === 0,
    ),
  );
  for (const document of compiled.documents.filter((item) => item.caseId)) {
    assert.ok(document.chunks.every((chunk) => chunk.culture.cultureTheme.includes("C6")));
  }

  for (const source of manifest.sources) {
    const [metadata, content, chunks] = await Promise.all([
      readFile(new URL(`../../knowledge/${source.metadataPath}`, import.meta.url), "utf8"),
      readFile(new URL(`../../knowledge/${source.contentPath}`, import.meta.url), "utf8"),
      readFile(new URL(`../../knowledge/${source.chunksPath}`, import.meta.url), "utf8"),
    ]);
    const parsedMetadata = JSON.parse(metadata);
    const parsedChunks = chunks.trim().split(/\r?\n/).map((line) => JSON.parse(line));

    assert.equal(parsedMetadata.id, source.id);
    assert.ok(
      ["metadata_only", "summary_only", "partial_text", "full_text"].includes(
        parsedMetadata.ingestion.contentStatus,
      ),
    );
    if (parsedMetadata.ingestion.contentStatus === "summary_only") {
      assert.match(content, /目前不是报道或文献的完整原文/);
    }
    assert.ok(parsedChunks.length > 0);
    assert.ok(parsedChunks.every((chunk) => chunk.documentId === source.id));
    assert.ok(parsedChunks.every((chunk) => typeof chunk.contentKind === "string"));
  }

  const backfilledDocuments = new Map(
    compiled.documents.map((document) => [document.id, document]),
  );
  for (const documentId of [
    "official-company-profile-2026-07-27",
    "official-store-directory-2026-07-24",
    "peoples-daily-yudonglai-interview-2025-08-19",
    "xinhua-qianbilou-pdl-6a-scenic-2025-03",
    "xinhua-book-awakening-pdl-culture-outline-2023",
    "tsinghua-sem-pdl-freedom-love-csr-2025",
    "jiemian-pdl-freedom-love-origin-handbook-2026",
    "media-pdl-weiqu-award-company-response",
    "xinhua-pdl-yonghui-learning-reform-2025",
    "jiemian-pdl-cinema-half-refund-2023-04",
    "thepaper-red-underwear-judgment-commentary-2025-05",
    "media-yudonglai-rationality-red-underwear-2025-02",
    "civiw-red-underwear-sentiment-monitor-2025-05",
    "media-pdl-culture-system-2022-republish",
    "media-red-underwear-civil-judgment-2025-05",
    "media-tea-fly-preliminary-response-2026-01",
    "media-egg-canthaxanthin-company-response-2026-04",
    "xinhua-employee-home-rest-2025-04",
    "zhengzhou-pdl-recruitment-life-2025-08",
    "cnfin-feishu-night-shift-care-2024-12",
    "workercn-noodle-dismissal-critique-2024-02-17",
    "workercn-noodle-reconsideration-2024-02-23",
    "jiemian-salary-policy-clarification-2026-06",
    "media-ctdsb-pdl-leave-policy-2026-08",
    "media-nbd-unhappy-leave-announce-2024-03",
    "media-nbd-leave-vs-pay-vote-2026-03",
    "media-nbd-leave-cannot-refuse-2023-12",
    "media-daxiang-pdl-salary-9886-2025-03",
    "media-dazhong-pdl-salary-principles-2026-05",
    "official-pdl-turnover-2026-h1",
    "media-pdl-shen-hongli-culture-happiness-handbook-2026",
    "official-pdl-jewelry-aftersales-2025-04",
    "official-pdl-nephrite-return-2025-05",
    "pdl-weighing-dispute-report-2023-06",
    "media-chinanews-hn-pdl-return-promise-2024-01",
    "media-pdl-salmon-overnight-2024-08",
    "media-nbd-pdl-margin-caps-2025-04",
    "media-dahe-pdl-price-tag-cost-2021-03",
    "media-pdl-bu-jingchao-suppliers-lab-2026-04",
    "media-jschina-weidu-nephrite-inspection-2025-05",
    "media-dahe-pdl-supplier-interviews-2026-03",
  ]) {
    const document = backfilledDocuments.get(documentId);
    assert.equal(document?.ingestion.contentStatus, "partial_text");
    assert.ok(document.chunks.every((chunk) => chunk.contentKind === "source_text"));
    assert.ok(document.chunks.every((chunk) => chunk.sourceSpans.length > 0));
  }
});

test("builds a generic AnswerPlan and validates answers without per-question patches", () => {
  const cases = [
    { id: "case-a", title: "甲事件", aliases: ["甲事件"], finality: "preliminary", culturalLens: "观察回应" },
    { id: "case-b", title: "乙方事件", aliases: ["乙方事件"], finality: "no_regulatory_final", culturalLens: "观察边界" },
  ];
  const ordinaryClaim = {
    annotationVersion: "claim-v1",
    id: "chunk-1--claim-1",
    statement: "资料显示员工每年可以使用 10 天相关假期。",
    sourceRole: "reported_account",
    effectiveAt: "2026-01-01",
    caseId: null,
    mentionedCaseIds: [],
    claimType: "media_observation",
    canSupport: ["员工休假"],
    cannotSupport: ["不能外推为所有门店当前安排。"],
    distinctions: [],
    topics: ["员工"],
  };
  const searchPlan = {
    track: "general",
    asksForFinality: false,
    contextApplied: false,
    originalQueryText: "目前员工休假怎么安排？",
    queryText: "目前员工休假怎么安排？",
    retrieved: [{
      chunkId: "chunk-1",
      chunkTitle: "员工假期",
      sourceTitle: "测试来源",
      sourceUrl: "https://example.com",
      verifiedAt: "2026-01-01",
      evidenceLabel: "媒体记录",
      claims: [ordinaryClaim],
    }],
  };
  const plan = createAnswerPlan(searchPlan, cases, "2026-08-03");
  assert.equal(plan.schemaVersion, "answer-plan-v1");
  assert.equal(plan.answerability, "supported");
  assert.equal(plan.timeTarget, "current");
  assert.deepEqual(plan.allowedClaimIds, [ordinaryClaim.id]);
  assert.match(plan.requiredDistinctions.join(""), /不能外推/);

  const grounded = validateAnswer("据资料显示，员工每年可以使用 10 天相关假期。", plan, cases);
  assert.equal(grounded.passed, true);
  const inventedNumber = validateAnswer("据资料显示，员工每年可以使用 20 天相关假期。", plan, cases);
  assert.equal(inventedNumber.passed, false);
  assert.ok(inventedNumber.violations.some((item) => item.code === "unsupported_number"));
  const wrongTime = validateAnswer("2026 年尚未到来，所以没有最新信息。", plan, cases);
  assert.ok(wrongTime.violations.some((item) => item.code === "wrong_current_date"));
  const unrelatedCase = validateAnswer("这也可以参考乙方事件。", plan, cases);
  assert.ok(unrelatedCase.violations.some((item) => item.code === "unexpected_case"));
});

test("validates factual numbers, negated verdicts, Beijing dates and grounded fallbacks", () => {
  assert.equal(
    formatDateInTimeZone(new Date("2026-08-03T16:30:00Z")),
    "2026-08-04",
  );
  assert.deepEqual(
    collectFactualNumberTokens("1. 第一项\n2、第二项\n2026年8月4日，500元，49.5%"),
    ["2026", "8", "4", "500", "49.5%"],
  );

  const claim = {
    id: "test-claim",
    statement: "企业公布了鸡蛋样品送检结果。",
    sourceTitle: "测试来源",
    effectiveAt: "2026-04-18",
    verifiedAt: "2026-04-18",
  };
  const plan = {
    question: "企业送检能证明最终没问题吗？",
    currentDate: "2026-08-04",
    answerability: "supported",
    track: "general",
    binaryVerdict: true,
    allowedClaims: [claim],
  };
  const numberedAnswer = "1. 企业公布了鸡蛋样品送检结果。\n2. 这不能说监管已经证明所有鸡蛋没问题。";
  assert.equal(validateAnswer(numberedAnswer, plan, []).passed, true);
  const unsupportedVerdict = validateAnswer("监管已经证明所有鸡蛋没问题。", plan, []);
  assert.ok(unsupportedVerdict.violations.some((item) => item.code === "unsupported_verdict"));

  const fallback = makeSafeFallback(plan);
  assert.equal(fallback, "企业公布了鸡蛋样品送检结果。");
  assert.doesNotMatch(fallback, /目前能确认的是/);
  assert.doesNotMatch(fallback, /不能把单条报道或单次争议写成整套文化的最终结论/);
});

test("does not treat generic culture phrases as unexpected hotspot cases", () => {
  assert.equal(isDistinctiveCaseAlias("人格尊严"), false);
  assert.equal(isDistinctiveCaseAlias("维权依法"), false);
  assert.equal(isDistinctiveCaseAlias("人格尊严公示"), true);
  assert.equal(isDistinctiveCaseAlias("茶叶苍蝇"), true);

  const cases = [
    {
      id: "dignity-violation-disclosure-2026-08",
      title: "首期「人格尊严侵权」案例公示",
      aliases: ["人格尊严", "人格尊严公示", "人格尊严侵权"],
    },
    {
      id: "tea-fly-feedback-2026-01",
      title: "顾客在抖音平台反馈茶叶中有苍蝇",
      aliases: ["茶叶苍蝇", "茶叶苍蝇事件"],
    },
  ];
  const plan = {
    question: "胖东来的企业文化体现在哪些方面？",
    currentDate: "2026-08-23",
    answerability: "supported",
    track: "general",
    binaryVerdict: false,
    allowedClaims: [{
      id: "culture-claim",
      statement: "新华社文章把胖东来的吸引力与企业文化、服务质量和员工状态联系起来。",
      sourceTitle: "新华社千笔楼",
      effectiveAt: "2025-03",
      mentionedCaseIds: [],
    }],
  };

  const cultureAnswer = validateAnswer(
    "公开资料里，胖东来文化常落到员工人格尊严、一线授权、顾客服务和经营节制这几方面，这些是媒体与管理层表述，不能写成独立审计结论。",
    plan,
    cases,
  );
  assert.equal(cultureAnswer.passed, true);

  const hotspotAnswer = validateAnswer("这就是人格尊严公示里写的那件事。", plan, cases);
  assert.equal(hotspotAnswer.passed, false);
  assert.ok(hotspotAnswer.violations.some((item) => item.code === "unexpected_case"));
});

test("makes an insufficient AnswerPlan refuse similar retrieval noise", () => {
  const plan = createAnswerPlan({
    track: "general",
    asksForFinality: false,
    contextApplied: false,
    originalQueryText: "请给我完整最新工资表",
    queryText: "请给我完整最新工资表",
    insufficientReason: "当前资料库没有完整、最新的岗位薪酬表。",
    retrieved: [],
  }, [], "2026-08-03");
  assert.equal(plan.answerability, "insufficient");
  assert.deepEqual(plan.allowedClaimIds, []);
  assert.equal(validateAnswer("目前没有足够信息回答这个问题。", plan, []).passed, true);
  assert.equal(validateAnswer("我推测每月工资大约 9000 元。", plan, []).passed, false);
});

test("keeps the first culture question set balanced and linked to real chunks", async () => {
  const [evaluation, compiled] = await Promise.all([
    readFile(new URL("../../evaluation/rag-culture-questions-v1.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../../knowledge/compiled/knowledge-base.json", import.meta.url), "utf8").then(JSON.parse),
  ]);

  assert.equal(evaluation.schemaVersion, "1.0");
  assert.equal(evaluation.questions.length, 54);
  assert.equal(new Set(evaluation.questions.map((question) => question.id)).size, 54);

  const counts = Object.fromEntries(
    Object.keys(evaluation.themeDistribution).map((theme) => [
      theme,
      evaluation.questions.filter((question) => question.theme === theme).length,
    ]),
  );
  assert.deepEqual(counts, evaluation.themeDistribution);
  assert.ok(Object.values(counts).every((count) => count >= 6));

  const chunkIds = new Set(
    compiled.documents.flatMap((document) => document.chunks.map((chunk) => chunk.id)),
  );
  for (const question of evaluation.questions) {
    for (const chunkId of [...question.mustRecallAnyOf, ...question.mustNotRecallChunkIds]) {
      assert.ok(chunkIds.has(chunkId), `${question.id} 引用了不存在的片段 ${chunkId}`);
    }
  }

  for (const caseId of [
    "employee-noodle-tasting-discipline-2024-02",
    "employee-salary-policy-rumor-2026-06",
  ]) {
    assert.ok(evaluation.questions.some((question) => question.expectedCaseId === caseId));
  }
});

test("records a reproducible BM25 baseline against the culture question set", async () => {
  const [evaluation, baseline, current, report, currentReport, packageJson] = await Promise.all([
    readFile(new URL("../../evaluation/rag-culture-questions-v1.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../../evaluation/rag-culture-bm25-baseline-v1.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../../evaluation/rag-culture-current-evaluation.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../../../docs/RAG_CULTURE_BASELINE_V1.md", import.meta.url), "utf8"),
    readFile(new URL("../../../docs/RAG_CULTURE_CURRENT_EVALUATION.md", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8").then(JSON.parse),
  ]);

  assert.equal(baseline.schemaVersion, "1.0");
  assert.equal(baseline.evaluationSet, evaluation.id);
  assert.equal(baseline.summary.total, evaluation.questions.length);
  assert.deepEqual(
    baseline.results.map((result) => result.id),
    evaluation.questions.map((question) => question.id),
  );
  assert.equal(baseline.knowledgeSnapshot.sources, 30);
  assert.equal(baseline.knowledgeSnapshot.chunks, 135);
  assert.equal(baseline.knowledgeSnapshot.cases, 6);
  assert.equal(baseline.retrievalConfiguration.queryRewrite, "none");
  assert.match(baseline.retrievalConfiguration.answerGeneration, /not executed/);
  assert.ok(baseline.results.every((result) => typeof result.checks.baselinePass === "boolean"));
  assert.match(report, /当前 BM25 基线通过 28\/54 题/);
  assert.equal(current.comparisonToBaseline.baselinePassed, 28);
  assert.equal(current.summary.passed, 54);
  assert.equal(current.summary.finalityIntentPassed, 54);
  assert.equal(current.summary.noAnswerSafetyPassed, 6);
  assert.deepEqual(current.comparisonToBaseline.regressedQuestionIds, []);
  assert.match(current.retrievalConfiguration.queryRewriteV1, /reviewed fixed typo corrections/);
  assert.equal(current.summary.isolationPassed, 54);
  assert.match(currentReport, /当前检索通过 54\/54 题/);
  assert.match(packageJson.scripts["rag:evaluate"], /evaluate-rag-baseline\.mjs/);
  assert.match(packageJson.scripts["rag:evaluate"], /--current/);
  assert.match(packageJson.scripts["rag:evaluate"], /--adopt-query-rewrite-v1/);
  assert.match(packageJson.scripts["rag:evaluate"], /--adopt-answer-purpose-filter-v1/);
});

test("keeps the culture-v1 BM25 expansion experimental when it regresses", async () => {
  const [control, experiment, report, packageJson] = await Promise.all([
    readFile(new URL("../../evaluation/rag-culture-pre-query-rewrite-control.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../../evaluation/rag-culture-bm25-culture-v1-experiment.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../../../docs/RAG_CULTURE_BM25_CULTURE_V1_EXPERIMENT.md", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8").then(JSON.parse),
  ]);

  assert.equal(control.summary.passed, 39);
  assert.equal(experiment.summary.passed, 38);
  assert.equal(experiment.comparisonToBaseline.baselineId, control.id);
  assert.deepEqual(experiment.comparisonToBaseline.newlyPassedQuestionIds, ["C5-02"]);
  assert.deepEqual(experiment.comparisonToBaseline.regressedQuestionIds, ["C4-02", "C6-02"]);
  assert.equal(experiment.summary.noAnswerSafetyPassed, control.summary.noAnswerSafetyPassed);
  assert.equal(experiment.summary.finalityIntentPassed, control.summary.finalityIntentPassed);
  assert.ok(experiment.summary.isolationPassed < control.summary.isolationPassed);
  assert.equal(experiment.experimentDecision.recommendedForProduction, false);
  assert.match(experiment.retrievalConfiguration.cultureAnnotationSearch, /non-case culture-v1/);
  assert.match(report, /不启用到网站正式检索/);
  assert.match(packageJson.scripts["rag:evaluate:culture-v1"], /--culture-v1/);
});

test("keeps culture theme reranking experimental when it does not improve recall", async () => {
  const [evaluation, control, experiment, report, packageJson, retrieval] = await Promise.all([
    readFile(new URL("../../evaluation/rag-culture-questions-v1.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../../evaluation/rag-culture-pre-query-rewrite-control.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../../evaluation/rag-culture-bm25-theme-rerank-experiment.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../../../docs/RAG_CULTURE_BM25_THEME_RERANK_EXPERIMENT.md", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8").then(JSON.parse),
    import("../shared/retrieval.mjs"),
  ]);

  for (const question of evaluation.questions) {
    const detected = retrieval.detectCultureThemes(
      [...question.context, question.question].join("\n"),
    );
    assert.ok(detected.includes(question.theme), `${question.id} 未识别到 ${question.theme}`);
  }
  assert.equal(experiment.summary.themeDetectionPassed, 54);
  assert.equal(experiment.summary.passed, control.summary.passed);
  assert.equal(experiment.summary.isolationPassed, control.summary.isolationPassed);
  assert.deepEqual(experiment.comparisonToBaseline.newlyPassedQuestionIds, []);
  assert.deepEqual(experiment.comparisonToBaseline.regressedQuestionIds, []);
  assert.equal(experiment.experimentDecision.recommendedForProduction, false);
  assert.match(experiment.retrievalConfiguration.cultureThemeRerank, /multiplier 0\.05/);
  assert.match(report, /不启用到网站正式检索/);
  assert.match(packageJson.scripts["rag:evaluate:theme-rerank"], /--culture-rerank=0\.05/);
});

test("adopts auditable Query rewrite V1 only after a zero-regression experiment", async () => {
  const [control, current, experiment, report, packageJson, retrieval, compiled] = await Promise.all([
    readFile(new URL("../../evaluation/rag-culture-pre-query-rewrite-control.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../../evaluation/rag-culture-current-evaluation.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../../evaluation/rag-culture-query-rewrite-v1-experiment.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../../../docs/RAG_CULTURE_QUERY_REWRITE_V1_EXPERIMENT.md", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8").then(JSON.parse),
    import("../shared/retrieval.mjs"),
    readFile(new URL("../../knowledge/compiled/knowledge-base.json", import.meta.url), "utf8").then(JSON.parse),
  ]);

  const rewrite = retrieval.rewriteKnowledgeQuery("鲜鸡旦角黄诉和红内库，不要忙目判断");
  assert.equal(rewrite.corrected, "鲜鸡蛋角黄素和红内裤，不要盲目判断");
  assert.deepEqual(rewrite.corrections, [
    { from: "鸡旦", to: "鸡蛋" },
    { from: "角黄诉", to: "角黄素" },
    { from: "红内库", to: "红内裤" },
    { from: "忙目", to: "盲目" },
  ]);

  const retriever = retrieval.createKnowledgeRetriever(compiled, { queryRewriteV1: true });
  const egg = retriever.searchKnowledge("鲜鸡旦角黄诉那件事，胖东来公开怎么说的？");
  assert.equal(egg.track, "case");
  assert.equal(egg.caseRecord.id, "egg-canthaxanthin-feedback-2026-04");
  assert.equal(egg.originalQueryText, "鲜鸡旦角黄诉那件事，胖东来公开怎么说的？");
  assert.ok(egg.queryCorrections.length >= 2);
  const expansion = retriever.searchKnowledge("买回去不喜欢，胖东来是不是啥都给退？");
  assert.ok(expansion.queryExpansions.some((item) => item.ruleId === "returns-colloquial"));
  assert.ok(expansion.retrieved.some((item) => item.chunkId === "interview-trust-returns-and-complaints"));

  assert.equal(control.summary.passed, 39);
  assert.equal(experiment.summary.passed, 50);
  assert.equal(current.summary.passed, 54);
  assert.deepEqual(experiment.comparisonToBaseline.regressedQuestionIds, []);
  assert.equal(experiment.summary.isolationPassed, control.summary.isolationPassed);
  assert.equal(experiment.summary.finalityIntentPassed, control.summary.finalityIntentPassed);
  assert.equal(experiment.summary.noAnswerSafetyPassed, control.summary.noAnswerSafetyPassed);
  assert.equal(experiment.experimentDecision.recommendedForProduction, true);
  assert.deepEqual(experiment.queryRewriteSummary.correctedQuestionIds, [
    "C1-05", "C2-05", "C3-05", "C4-05", "C5-05", "C6-05",
  ]);
  assert.match(report, /建议进入本地正式检索/);
  assert.match(packageJson.scripts["rag:evaluate:query-rewrite-v1"], /--query-rewrite-v1/);
});

test("adopts answer-purpose filtering after improving all remaining boundary questions", async () => {
  const [control, current, experiment, report, packageJson, retrieval, compiled] = await Promise.all([
    readFile(new URL("../../evaluation/rag-culture-pre-purpose-filter-control.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../../evaluation/rag-culture-current-evaluation.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../../evaluation/rag-culture-answer-purpose-filter-v1-experiment.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../../../docs/RAG_CULTURE_ANSWER_PURPOSE_FILTER_V1_EXPERIMENT.md", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8").then(JSON.parse),
    import("../shared/retrieval.mjs"),
    readFile(new URL("../../knowledge/compiled/knowledge-base.json", import.meta.url), "utf8").then(JSON.parse),
  ]);

  assert.deepEqual(
    retrieval.detectAnswerPurposes("工资高、福利好就能叫自由与爱了吗？"),
    ["employee-culture-beyond-compensation"],
  );
  assert.deepEqual(
    retrieval.detectAnswerPurposes("永辉照着胖东来改店，能证明授权文化可以直接复制吗？"),
    ["replication-proof-boundary"],
  );
  assert.deepEqual(
    retrieval.detectAnswerPurposes("永辉学胖东来后生意变好，能证明谁学都成功吗？"),
    [],
  );

  const retriever = retrieval.createKnowledgeRetriever(compiled, {
    queryRewriteV1: true,
    answerPurposeFilterV1: true,
  });
  const replication = retriever.searchKnowledge(
    "永辉照着胖东来改店，能证明这套授权文化可以直接复制吗？",
  );
  assert.ok(replication.retrieved.some((item) => item.chunkId === "xinhua-yonghui-replication-boundary"));
  assert.ok(!replication.retrieved.some((item) => item.chunkId === "xinhua-yonghui-performance-boundary"));
  assert.ok(replication.purposeFilteredOutChunkIds.includes("xinhua-yonghui-performance-boundary"));

  const customerAward = retriever.searchKnowledge("现在投诉胖东来一次，顾客固定能拿多少奖励？");
  const customerAwardIds = customerAward.retrieved.map((item) => item.chunkId);
  assert.ok(customerAwardIds.includes("interview-trust-returns-and-complaints"));
  assert.ok(customerAwardIds.includes("weighing-report-500-customer-complaint-award"));
  assert.ok(!customerAwardIds.includes("weiqu-award-office-response"));
  assert.ok(!customerAwardIds.includes("red-underwear-report-customer-and-legal"));
  assert.ok(customerAward.purposeFilteredOutChunkIds.includes("weiqu-award-office-response"));
  assert.ok(customerAward.purposeFilteredOutChunkIds.includes("red-underwear-report-customer-and-legal"));
  assert.ok(!customerAwardIds.includes("salmon-overnight-reward-and-refund"));

  const marginCaps = retriever.searchKnowledge("胖东来民生商品的毛利率限定标准是多少？");
  assert.ok(!marginCaps.insufficientReason);
  assert.ok(
    marginCaps.retrieved.some((item) => item.chunkId === "nbd-margin-cap-livelihood-private-label"),
  );

  const qualityDept = retriever.searchKnowledge("胖东来品质管理部是独立的吗？");
  assert.ok(
    qualityDept.retrieved.some((item) => item.chunkId === "shen-quality-dept-independent"),
  );

  const inspectionVsSelfTest = retriever.searchKnowledge(
    "企业自己送检和市场监管日常检查有什么区别？",
  );
  assert.ok(
    inspectionVsSelfTest.retrieved.some(
      (item) => item.chunkId === "weidu-inspection-not-lab-or-verdict",
    ),
  );

  const salmon = retriever.searchKnowledge("新乡胖东来隔夜三文鱼刺身怎么处理的？");
  assert.equal(salmon.track, "case");
  assert.equal(salmon.caseRecord.id, "salmon-overnight-sashimi-2024-08");
  assert.ok(salmon.retrieved.some((item) => item.chunkId === "salmon-overnight-reward-and-refund"));
  assert.ok(!salmon.retrieved.some((item) => String(item.chunkId).startsWith("noodle-skin")));

  const selfTesting = retriever.searchKnowledge("企业自己送检、自己公布结果，这能算最终结论吗？");
  assert.equal(selfTesting.retrieved.length, 0);
  assert.match(selfTesting.insufficientReason, /不能单独构成监管或司法最终结论/);

  const businessOutcome = retriever.searchKnowledge(
    "永辉学胖东来后生意变好，是否证明这套模式谁学都能成功？",
  );
  assert.ok(businessOutcome.retrieved.some((item) => item.chunkId === "xinhua-yonghui-performance-boundary"));

  assert.equal(control.summary.passed, 50);
  assert.equal(experiment.summary.passed, 54);
  assert.equal(current.summary.passed, 54);
  assert.deepEqual(experiment.comparisonToBaseline.newlyPassedQuestionIds, [
    "C1-06", "C2-07", "C3-08", "C4-06",
  ]);
  assert.deepEqual(experiment.comparisonToBaseline.regressedQuestionIds, []);
  assert.equal(experiment.summary.isolationPassed, 54);
  assert.equal(experiment.summary.finalityIntentPassed, 54);
  assert.equal(experiment.summary.noAnswerSafetyPassed, 6);
  assert.equal(experiment.experimentDecision.recommendedForProduction, true);
  assert.deepEqual(experiment.answerPurposeFilterSummary.detectedQuestionIds, [
    "C1-06", "C2-07", "C3-08",
  ]);
  assert.match(report, /建议进入本地正式检索/);
  assert.match(packageJson.scripts["rag:evaluate:answer-purpose-filter-v1"], /--answer-purpose-filter-v1/);
});

test("builds R4 AnswerPlans from ten recalled chunks without a hidden extra candidate pool", async () => {
  const [{ createKnowledgeRetriever, TOTAL_RECALL_K }, compiled] = await Promise.all([
    import("../shared/retrieval.mjs"),
    readFile(new URL("../../knowledge/compiled/knowledge-base.json", import.meta.url), "utf8").then(JSON.parse),
  ]);
  const retriever = createKnowledgeRetriever(compiled, {
    queryRewriteV1: true,
    answerPurposeFilterV1: true,
  });

  const retirementSearch = retriever.searchKnowledge(
    "所谓‘信任员工’会不会只是老板个人魅力，老板退休就没了？",
  );
  assert.equal(retirementSearch.retrieved.length, TOTAL_RECALL_K);
  assert.equal(retirementSearch.answerCandidates.length, retirementSearch.retrieved.length);
  const retirementPlan = createAnswerPlan(retirementSearch, compiled.cases, "2026-08-04");
  assert.ok(retirementPlan.allowedClaimIds.includes("jiemian-rotation-governance--claim-1"));

  const complaintPlan = createAnswerPlan(
    retriever.searchKnowledge("现在投诉胖东来一次，顾客固定能拿多少奖励？"),
    compiled.cases,
    "2026-08-04",
  );
  assert.match(complaintPlan.requiredDistinctions.join("\n"), /顾客投诉奖励、员工委屈奖励和法院判决赔偿/);

  const disputePlan = createAnswerPlan(
    retriever.searchKnowledge("一场客诉争议，能不能检验胖东来的‘自由与爱’？"),
    compiled.cases,
    "2026-08-04",
  );
  assert.equal(disputePlan.allowedClaimIds[0], "jiemian-culture-boundary-and-disputes--claim-1");
});

test("forces premise-covering claims into AnswerPlan when safe candidates already have them", () => {
  const premises = extractVerifiablePremises(
    "企业因为客诉事件开除相关员工，这件事是否和企业文化相冲突？",
  );
  assert.ok(premises.some((item) => item.family === "staff_disposition"));
  assert.equal(extractVerifiablePremises("员工是否被当作完整的人？").length, 0);

  const staffClaim = {
    id: "staff-handling--claim-1",
    statement: "企业公开报告称对相关岗位作出免职等处理，并对管理岗位给予降级等连带处理。",
    chunkTitle: "内部处理要点",
    canSupport: ["内部处理"],
    topics: ["免职", "降级"],
    caseId: "case-a",
    mentionedCaseIds: ["case-a"],
    distinctions: [],
    cannotSupport: ["不能外推为当前状态"],
    sourceRole: "official_record",
    claimType: "company_report",
  };
  const boundaryClaim = {
    id: "culture-boundary--claim-1",
    statement: "单案争议不能证明整套文化真伪，需要分清责任、公开与边界。",
    chunkTitle: "文化边界",
    canSupport: ["边界", "争议", "责任", "公开", "尊重", "不能证明"],
    topics: ["争议", "边界", "张力", "纠错"],
    caseId: "case-a",
    mentionedCaseIds: ["case-a"],
    distinctions: [],
    cannotSupport: ["不能裁定客诉真伪"],
    sourceRole: "third_party_analysis",
    claimType: "analysis",
  };
  // More than case-track limit (8) so pure score ranking can drop the staff claim.
  const noiseClaims = Array.from({ length: 10 }, (_, index) => ({
    id: `noise-${index}--claim-1`,
    statement: `公开资料讨论责任、争议边界与公开纠错第${index + 1}点。`,
    chunkTitle: `争议边界资料${index + 1}`,
    canSupport: ["争议", "边界", "责任", "公开", "纠错", "尊重", "不能证明"],
    topics: ["争议", "边界", "张力"],
    caseId: "case-a",
    mentionedCaseIds: ["case-a"],
    distinctions: [],
    cannotSupport: [],
    sourceRole: "reported_account",
    claimType: "report",
  }));

  assert.equal(
    claimCoversPremise(staffClaim, premises.find((item) => item.family === "staff_disposition")),
    true,
  );
  assert.equal(
    claimCoversPremise(boundaryClaim, premises.find((item) => item.family === "staff_disposition")),
    false,
  );

  const plan = createAnswerPlan({
    track: "case",
    originalQueryText: "企业因为客诉事件开除相关员工，这件事是否和企业文化相冲突？",
    queryText: "企业因为客诉事件开除相关员工，这件事是否和企业文化相冲突？",
    caseRecord: { id: "case-a", finality: "company_clarification_only" },
    retrieved: [
      {
        chunkId: "boundary",
        chunkTitle: boundaryClaim.chunkTitle,
        score: 20,
        claims: [boundaryClaim],
      },
      ...noiseClaims.map((claim, index) => ({
        chunkId: `noise-${index}`,
        chunkTitle: claim.chunkTitle,
        score: 19 - index,
        claims: [claim],
      })),
      {
        chunkId: "staff-handling",
        chunkTitle: staffClaim.chunkTitle,
        score: 12,
        claims: [staffClaim],
      },
    ],
  }, [{ id: "case-a", aliases: ["客诉事件"] }, { id: "case-b", aliases: ["另一事件"] }], "2026-08-04");

  assert.ok(
    plan.allowedClaimIds.includes(staffClaim.id),
    "staff disposition premise must keep a direct supporting or correcting claim",
  );
  assert.ok(plan.allowedClaimIds.length <= 8);
  assert.ok(!plan.forbiddenCaseIds.includes("case-a"));

  const noPremisePlan = createAnswerPlan({
    track: "general",
    originalQueryText: "员工是否被当作完整的人？",
    queryText: "员工是否被当作完整的人？",
    retrieved: [{
      chunkId: "ordinary",
      chunkTitle: "员工假期",
      score: 10,
      claims: [{
        id: "ordinary--claim-1",
        statement: "员工每年可以使用相关假期。",
        canSupport: ["假期"],
        topics: ["员工"],
        mentionedCaseIds: [],
        distinctions: [],
        cannotSupport: [],
      }],
    }],
  }, [], "2026-08-04");
  assert.deepEqual(noPremisePlan.allowedClaimIds, ["ordinary--claim-1"]);
});

test("keeps staff-disposition premise claims after hybrid case routing without live APIs", async () => {
  const [{ createKnowledgeRetriever }, compiled, vectorIndex] = await Promise.all([
    import("../shared/retrieval.mjs"),
    readFile(new URL("../../knowledge/compiled/knowledge-base.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../../knowledge/vector/r5-general-index.json", import.meta.url), "utf8").then(JSON.parse),
  ]);
  const staffEntry = vectorIndex.entries.find(
    (entry) => entry.chunkId === "red-underwear-report-testing-and-staff",
  );
  assert.ok(staffEntry, "vector index must include staff-handling chunk");

  const keywordRetriever = createKnowledgeRetriever(compiled, {
    queryRewriteV1: true,
    answerPurposeFilterV1: true,
  });
  const hybrid = createHybridKnowledgeRetriever({
    knowledgeBase: compiled,
    keywordRetriever,
    vectorIndex,
    semanticCaseRouting: true,
    vectorWeight: 0.65,
    keywordGuardWeight: 0,
    embedQuery: async () => staffEntry.embedding,
  });

  const question = "胖东来因为红裤头事件开除相关员工，这件事是否和企业文化相冲突？";
  const search = await hybrid.searchKnowledge(question);
  assert.equal(search.track, "case");
  assert.equal(search.caseRecord?.id, "red-underwear-color-libel-2025");
  assert.ok(
    (search.answerCandidates ?? search.retrieved).some(
      (item) => item.chunkId === "red-underwear-report-testing-and-staff",
    ),
  );

  const plan = createAnswerPlan(search, compiled.cases, "2026-08-04");
  assert.ok(
    plan.allowedClaimIds.includes("red-underwear-report-testing-and-staff--claim-1"),
    "AnswerPlan must keep the claim that corrects or supports the staff-handling premise",
  );
  assert.ok(plan.allowedClaims.some((claim) => /免职|降级/.test(claim.statement ?? "")));
  assert.ok(!plan.allowedClaims.some((claim) => claim.caseId && claim.caseId !== "red-underwear-color-libel-2025"));
  assert.doesNotMatch(plan.allowedClaims.map((claim) => claim.statement).join("\n"), /美食城员工制作员工餐|尝面/);
});

test("uses recent user context only when a follow-up needs it", async () => {
  const [{ createKnowledgeRetriever }, compiled] = await Promise.all([
    import("../shared/retrieval.mjs"),
    readFile(new URL("../../knowledge/compiled/knowledge-base.json", import.meta.url), "utf8").then(JSON.parse),
  ]);
  const retriever = createKnowledgeRetriever(compiled);

  const teaFollowUp = retriever.searchKnowledge("后来到底查清没有？", [
    "茶叶反馈后，企业发布了情况说明（一）。",
  ]);
  assert.equal(teaFollowUp.track, "case");
  assert.equal(teaFollowUp.caseRecord.id, "tea-fly-feedback-2026-01");
  assert.equal(teaFollowUp.contextApplied, true);
  assert.equal(teaFollowUp.asksForFinality, true);

  const generalFollowUp = retriever.searchKnowledge("那要是他判断错了呢？", [
    "为什么一线员工可以直接处理顾客问题？",
  ]);
  assert.equal(generalFollowUp.track, "general");
  assert.equal(generalFollowUp.contextApplied, true);
  assert.ok(
    generalFollowUp.retrieved.some((item) =>
      ["interview-frontline-trust-responsibility-and-society", "interview-operating-manuals-and-execution"].includes(item.chunkId),
    ),
  );

  const unrelatedQuestion = retriever.searchKnowledge("胖东来为什么不盲目扩张？", [
    "茶叶反馈后，企业发布了情况说明（一）。",
  ]);
  assert.equal(unrelatedQuestion.track, "general");
  assert.equal(unrelatedQuestion.contextApplied, false);
});

test("recognizes natural finality intent and blocks known unsupported detail requests", async () => {
  const [{ createKnowledgeRetriever }, compiled] = await Promise.all([
    import("../shared/retrieval.mjs"),
    readFile(new URL("../../knowledge/compiled/knowledge-base.json", import.meta.url), "utf8").then(JSON.parse),
  ]);
  const retriever = createKnowledgeRetriever(compiled);

  assert.equal(
    retriever.searchKnowledge("尝面员工后来还是被开除了吗？").asksForFinality,
    true,
  );
  assert.equal(
    retriever.searchKnowledge("企业后来怎么解释降薪传言？").asksForFinality,
    false,
  );
  assert.equal(
    retriever.searchKnowledge("那是不是监管部门已经证明这些鸡蛋没问题？", [
      "胖东来公布了鲜鸡蛋样品的送检结果。",
    ]).asksForFinality,
    true,
  );
  assert.equal(
    retriever.searchKnowledge("监管部门已经盖章了吗？").asksForFinality,
    true,
  );
  assert.equal(
    retriever.searchKnowledge("法院公开的一审结果究竟处理了什么？").asksForFinality,
    true,
  );

  for (const question of [
    "请给我一份胖东来 2026 年每个岗位最新工资和奖金表。",
    "胖东来每个岗位分别能自主赔付多少元？请列出权限表。",
    "请列出胖东来当前所有供应商的审核分数和淘汰名单。",
    "胖东来今年净利润率多少，未来三年准备开多少家店？",
    "胖东来历史上所有投诉最后分别是谁对谁错？",
    "胖东来不让员工收彩礼已经是正式制度了吗？这不侵犯自由吗？",
  ]) {
    const plan = retriever.searchKnowledge(question);
    assert.equal(plan.track, "general");
    assert.equal(plan.retrieved.length, 0);
    assert.ok(plan.insufficientReason);
  }
});

test("serves the built site through the CloudBase-compatible Node entrypoint", async (context) => {
  const server = await createCloudBaseServer({
    env: { DEEPSEEK_API_KEY: undefined },
  });
  await new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", rejectListen);
      resolveListen();
    });
  });
  context.after(() => new Promise((resolveClose, rejectClose) => {
    server.close((error) => (error ? rejectClose(error) : resolveClose()));
  }));

  const address = server.address();
  assert.ok(address && typeof address === "object");
  const origin = `http://127.0.0.1:${address.port}`;

  const health = await fetch(`${origin}/healthz`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: "ok" });

  const homepage = await fetch(origin);
  assert.equal(homepage.status, 200);
  const html = await homepage.text();
  assert.match(html, /<html lang="zh-CN">/i);

  const assetPath = html.match(/(?:href|src)="(\/assets\/[^"]+\.(?:css|js))"/)?.[1];
  assert.ok(assetPath);
  const asset = await fetch(`${origin}${assetPath}`);
  assert.equal(asset.status, 200);
  assert.match(asset.headers.get("cache-control") ?? "", /immutable/);

  const chat = await fetch(`${origin}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "你好" }] }),
  });
  assert.equal(chat.status, 503);
});

test("packages a non-root CloudBase container without local secret files", async () => {
  const [dockerfile, dockerignore] = await Promise.all([
    readFile(new URL("../../Dockerfile", import.meta.url), "utf8"),
    readFile(new URL("../../.dockerignore", import.meta.url), "utf8"),
  ]);

  assert.match(dockerfile, /RUN npm run build/);
  assert.match(dockerfile, /COPY knowledge \/app\/knowledge/);
  assert.match(dockerfile, /USER site/);
  assert.match(dockerfile, /EXPOSE 3000/);
  assert.doesNotMatch(dockerfile, /DEEPSEEK_API_KEY\s*=/);
  assert.match(dockerignore, /^site\/\.dev\.vars$/m);
  assert.match(dockerignore, /^site\/\.env\.\*$/m);
  assert.match(dockerignore, /^!knowledge\/$/m);
  assert.match(dockerignore, /^knowledge\/legacy$/m);
  assert.doesNotMatch(dockerignore, /^site\/\.openai$/m);
});

test("server-renders the Pangdonglai culture homepage", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="zh-CN">/i);
  assert.match(html, /<title>胖东来文化数字馆｜从理解人开始<\/title>/i);
  assert.match(html, /不要只停留在表面——/);
  assert.match(html, /理解胖东来/);
  assert.match(html, /从理解人开始/);
  assert.doesNotMatch(html, /从标签走向理解|hero-eyebrow/);
  assert.match(html, /href="#explore"/);
  assert.match(html, /href="#ai-dialogue"/);
  assert.match(html, /aria-controls="store-directory"/);
  assert.match(html, /aria-controls="hotspot-archive"/);
  assert.match(html, /chapter-body/);
  assert.match(html, /chapter-copy/);
  assert.match(html, /chapter-lede/);
  assert.match(html, />各个门店</);
  assert.match(html, />热点事件</);
  assert.match(html, /信息、位置等具体情况/);
  assert.match(html, /来源、时间线与边界/);
  assert.match(html, /aria-label="查看各个门店信息、位置等具体情况"/);
  assert.match(html, /aria-label="查看热点事件"/);
  assert.doesNotMatch(html, /入馆体验|五分钟入馆|hall-tour|mobile-nav-dock/);
  assert.doesNotMatch(html, /查看热点<br|查看各个门店<br/);
  assert.match(html, /class="chapter-arrow"/);
  assert.match(html, /<svg viewBox="0 0 24 24"/);
  assert.doesNotMatch(html, /chapter-arrow[^>]*>[↗↘↑↓]/);
  assert.match(html, /与胖东来对话/);
  assert.match(html, /id="explore"/);
  assert.doesNotMatch(html, /标签如何形成|做法如何落地|证据来自哪里/);
  assert.doesNotMatch(html, /座谈会发言稿|员工彩礼倡议/);
  assert.doesNotMatch(html, /lens-grid|lens-card/);
  assert.match(html, /id="ai-dialogue"/);
  assert.match(html, /id="store-directory"/);
  assert.match(html, /aria-hidden="true"/);
  assert.match(html, /基于已审核资料回答/);
  assert.match(html, /输入你的问题/);
  assert.match(html, /跳到正文内容/);
  for (const storeName of ["许昌天使城", "许昌时代广场", "许昌生活广场", "许昌大众服饰", "许昌金三角店", "许昌云鼎店", "许昌北海店", "许昌金汇店", "许昌劳动店", "许昌人民店", "禹州店", "新乡大胖", "新乡二胖", "新乡三胖"]) {
    assert.match(html, new RegExp(storeName));
  }
  assert.equal((html.match(/<img[^>]+alt="[^"]*官方门店照片"/g) ?? []).length, 14);
  assert.equal((html.match(/href="https:\/\/web\.azpdl\.cn\/"/g) ?? []).length, 14);
  assert.equal((html.match(/src="\/stores\/[^"]+"/g) ?? []).length, 14);
  assert.match(html, /sizes=/);
  // 一期移动端：viewport 与安全区/防 iOS 放大相关声明应存在于页面或样式中
  assert.match(html, /viewport|device-width/i);
  assert.doesNotMatch(html, /结构示例|问答功能将在资料库完成后开放/);
});

test("ships phase-1 mobile CSS baselines for touch and iOS inputs", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /@media \(max-width: 390px\)/);
  assert.match(css, /safe-area-inset/);
  assert.match(css, /font-size:\s*16px/);
  assert.match(css, /min-height:\s*48px/);
  assert.match(css, /chat-suggest-chip[\s\S]*?min-height:\s*44px/);
  assert.doesNotMatch(css, /\.lens-grid|\.lens-card|\.lens-meta/);
  assert.match(css, /\.chapter-body/);
  assert.match(css, /\.chapter-copy/);
  assert.match(css, /\.chapter-lede/);
  assert.match(css, /\.chapter-index[\s\S]*?clamp\(6rem/);
  assert.match(css, /\.chapter-arrow svg/);
});

test("ships phase-2 mobile product polish for chat shell and fab", async () => {
  const [css, page] = await Promise.all([
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(css, /\.dialogue-window:not\(\.dialogue-window-prototype\)\s*\{[\s\S]*?flex-direction:\s*column/);
  assert.match(css, /70dvh|72dvh|78dvh/);
  assert.match(css, /\.mobile-chat-fab/);
  assert.match(css, /@media \(max-width: 480px\)/);
  assert.match(css, /orientation:\s*landscape/);
  assert.match(css, /@media \(hover: none\)/);
  assert.match(css, /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(css, /dialogue-window-prototype[\s\S]*?display:\s*none\s*!important/);
  assert.match(page, /mobile-chat-fab/);
  assert.match(page, /dialogueBodyRef/);
  assert.match(page, /showChatFab/);
  assert.doesNotMatch(page, /dialogue-window-prototype|结构示例|问答功能将在资料库完成后开放/);
  assert.doesNotMatch(page, /HallTour|mobile-nav-dock|hall-tour/);
});

test("ships phase-3 mobile QA polish for a11y and store images", async () => {
  const [css, page, checklist] = await Promise.all([
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../../docs/MOBILE_QA_CHECKLIST.md", import.meta.url), "utf8"),
  ]);
  assert.match(page, /className="skip-link"/);
  assert.match(page, /sizes="\(max-width: 760px\) 92vw/);
  assert.match(page, /width=\{800\}/);
  assert.match(page, /height=\{500\}/);
  assert.match(css, /\.skip-link/);
  assert.match(css, /content-visibility:\s*auto/);
  assert.match(css, /aspect-ratio:\s*8\s*\/\s*5/);
  assert.match(css, /\.store-map-link:focus-visible/);
  assert.match(css, /\.chat-suggest-chip:focus-visible/);
  assert.match(checklist, /移动端验收清单/);
  assert.match(checklist, /结构示例/);
  assert.match(checklist, /\/stores\//);
});

test("hides lower hero keywords on mobile so CTAs stay clear", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  // Within max-width 760 block, indices 5+ must be display:none and field clipped
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*data-index="5"[\s\S]*display:\s*none\s*!important/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.keyword-field[\s\S]*clip-path:\s*inset\(0 0 48% 0\)/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.hero-actions[\s\S]*z-index:\s*5/);
});

test("streams BM25-grounded DeepSeek tokens and verified sources", async () => {
  const originalFetch = globalThis.fetch;
  let deepseekRequest;

  globalThis.fetch = async (input, init) => {
    if (String(input) === "https://api.deepseek.com/chat/completions") {
      deepseekRequest = JSON.parse(init.body);
      return new Response(
        [
          'data: {"choices":[{"delta":{"content":"测试"}}]}\n\n',
          'data: {"choices":[{"delta":{"content":"回答"}}]}\n\n',
          "data: [DONE]\n\n",
        ].join(""),
        { headers: { "content-type": "text/event-stream" } },
      );
    }
    return originalFetch(input, init);
  };

  try {
    const response = await render(
      "/api/chat",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: "胖东来周二是否闭店？" }] }),
      },
      { DEEPSEEK_API_KEY: "test-key" },
    );

    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /^text\/event-stream\b/i);
    const body = await response.text();
    assert.match(body, /"type":"delta","content":"测试"/);
    assert.match(body, /"type":"delta","content":"回答"/);
    assert.match(body, /"type":"sources"/);
    assert.match(body, /胖东来各门店信息/);
    assert.match(body, /web\.azpdl\.cn\/contact/);
    assert.match(body, /"type":"done"/);
    assert.equal(deepseekRequest.stream, true);
    assert.match(deepseekRequest.messages[0].content, /DeepSeek 模型 deepseek-v4-flash/);
    assert.match(deepseekRequest.messages[0].content, /常规营业安排与周二闭店说明/);
    assert.match(deepseekRequest.messages[0].content, /只能依据下方“本题允许使用的事实”回答具体事实/);
    assert.match(deepseekRequest.messages[0].content, /【本题回答提纲】/);
    assert.match(deepseekRequest.messages[0].content, /今天的日期：\d{4}-\d{2}-\d{2}/);
    assert.match(deepseekRequest.messages[0].content, /【本题允许使用的事实】/);
    assert.match(deepseekRequest.messages[0].content, /简单说/);
    assert.match(deepseekRequest.messages[0].content, /具体来看/);
    assert.match(deepseekRequest.messages[0].content, /为什么这么做/);
    assert.match(deepseekRequest.messages[0].content, /还要分清/);
    assert.match(deepseekRequest.messages[0].content, /不是必须逐字显示的四个标题/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("uses the accepted R5C hybrid retriever when the local switch is enabled", async () => {
  const originalFetch = globalThis.fetch;
  const vectorIndex = await readFile(
    new URL("../../knowledge/vector/r5-general-index.json", import.meta.url),
    "utf8",
  ).then(JSON.parse);
  const matchingEntry = vectorIndex.entries.find(
    (entry) => entry.chunkId === "red-underwear-report-testing-and-staff",
  );
  assert.ok(matchingEntry);

  let embeddingRequest;
  let deepseekRequest;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url === "https://tokenhub.tencentmaas.com/v1/embeddings") {
      embeddingRequest = {
        authorization: new Headers(init.headers).get("authorization"),
        body: JSON.parse(init.body),
      };
      return new Response(JSON.stringify({
        data: [{ index: 0, embedding: matchingEntry.embedding }],
      }), {
        headers: { "content-type": "application/json" },
      });
    }
    if (url === "https://api.deepseek.com/chat/completions") {
      deepseekRequest = JSON.parse(init.body);
      const content = "企业公开报告提到的是对相关员工免职或降级，不等于开除；单个事件也不能直接证明整套企业文化的真伪。";
      return new Response(
        `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\ndata: [DONE]\n\n`,
        { headers: { "content-type": "text/event-stream" } },
      );
    }
    return originalFetch(input, init);
  };

  try {
    const response = await render(
      "/api/chat",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: "胖东来因为红裤头事件开除相关员工，这件事是否和企业文化相冲突？",
          }],
        }),
      },
      {
        DEEPSEEK_API_KEY: "test-deepseek-key",
        RAG_RETRIEVAL_MODE: "hybrid",
        TENCENT_TOKENHUB_API_KEY: "test-tokenhub-key",
      },
    );

    assert.equal(response.status, 200);
    const body = await response.text();
    assert.match(body, /免职或降级/);
    assert.match(body, /红色内裤掉色过敏争议与名誉权诉讼/);
    assert.equal(embeddingRequest.authorization, "Bearer test-tokenhub-key");
    assert.equal(embeddingRequest.body.model, vectorIndex.model);
    assert.equal(embeddingRequest.body.input.length, 1);
    assert.match(deepseekRequest.messages[0].content, /事件：红色内裤掉色过敏争议与名誉权诉讼/);
    assert.match(deepseekRequest.messages[0].content, /报告要点：对顾客措施与拟依法追责/);
    assert.match(deepseekRequest.messages[0].content, /免职/);
    assert.match(deepseekRequest.messages[0].content, /不得引用其他案例/);
    assert.doesNotMatch(deepseekRequest.messages[0].content, /尝面员工|美食城员工制作员工餐/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("falls back to BM25 when hybrid mode has no TokenHub key", async () => {
  const originalFetch = globalThis.fetch;
  let tokenHubCalled = false;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url === "https://tokenhub.tencentmaas.com/v1/embeddings") {
      tokenHubCalled = true;
      throw new Error("TokenHub should not be called without a key");
    }
    if (url === "https://api.deepseek.com/chat/completions") {
      return new Response(
        'data: {"choices":[{"delta":{"content":"官网门店资料列出了周二闭店安排。"}}]}\n\ndata: [DONE]\n\n',
        { headers: { "content-type": "text/event-stream" } },
      );
    }
    return originalFetch(input, init);
  };

  try {
    const response = await render(
      "/api/chat",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: "胖东来周二是否闭店？" }] }),
      },
      {
        DEEPSEEK_API_KEY: "test-key",
        RAG_RETRIEVAL_MODE: "hybrid",
      },
    );

    assert.equal(response.status, 200);
    assert.equal(tokenHubCalled, false);
    assert.match(await response.text(), /胖东来各门店信息/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("repairs a generated answer once when AnswerValidation finds an unsupported fact", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (input, init) => {
    if (String(input) === "https://api.deepseek.com/chat/completions") {
      requests.push(JSON.parse(init.body));
      const content = requests.length === 1 ? "周二有 999 家门店闭店。" : "官网门店资料列出了周二闭店安排。";
      return new Response(
        `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\ndata: [DONE]\n\n`,
        { headers: { "content-type": "text/event-stream" } },
      );
    }
    return originalFetch(input, init);
  };

  try {
    const response = await render(
      "/api/chat",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: "胖东来周二是否闭店？" }] }),
      },
      { DEEPSEEK_API_KEY: "test-key" },
    );
    const body = await response.text();
    assert.equal(requests.length, 2);
    assert.match(requests[1].messages[0].content, /上一次草稿未通过回答边界检查/);
    assert.doesNotMatch(body, /999/);
    assert.match(body, /官网门店资料列出了周二闭店安排/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("uses a safe fallback when the repaired answer still exceeds its AnswerPlan", async () => {
  const originalFetch = globalThis.fetch;
  let requestCount = 0;
  globalThis.fetch = async (input) => {
    if (String(input) === "https://api.deepseek.com/chat/completions") {
      requestCount += 1;
      return new Response(
        'data: {"choices":[{"delta":{"content":"我猜这款酱油售价 99 元。"}}]}\n\ndata: [DONE]\n\n',
        { headers: { "content-type": "text/event-stream" } },
      );
    }
    return originalFetch(input);
  };

  try {
    const response = await render(
      "/api/chat",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: "胖东来酱油怎么样？" }] }),
      },
      { DEEPSEEK_API_KEY: "test-key" },
    );
    const body = await response.text();
    assert.equal(requestCount, 2);
    assert.doesNotMatch(body, /99/);
    assert.match(body, /目前没有足够信息回答这个问题/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("does not attach store sources when only the generic brand name matches", async () => {
  const originalFetch = globalThis.fetch;
  let deepseekRequest;

  globalThis.fetch = async (input, init) => {
    if (String(input) === "https://api.deepseek.com/chat/completions") {
      deepseekRequest = JSON.parse(init.body);
      return new Response(
        'data: {"choices":[{"delta":{"content":"资料不足"}}]}\n\ndata: [DONE]\n\n',
        { headers: { "content-type": "text/event-stream" } },
      );
    }
    return originalFetch(input, init);
  };

  try {
    const response = await render(
      "/api/chat",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: "胖东来酱油怎么样？" }] }),
      },
      { DEEPSEEK_API_KEY: "test-key" },
    );

    const body = await response.text();
    assert.match(deepseekRequest.messages[0].content, /本次检索没有命中任何已审核资料/);
    assert.match(deepseekRequest.messages[0].content, /目前能确认什么/);
    assert.match(deepseekRequest.messages[0].content, /为什么还不能下结论/);
    assert.match(deepseekRequest.messages[0].content, /还缺什么信息/);
    assert.doesNotMatch(body, /"type":"sources"/);
    assert.match(body, /"type":"done"/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("retrieves Xinhua 6A scenic feature for spring-festival crowd questions", async () => {
  const originalFetch = globalThis.fetch;
  let deepseekRequest;

  globalThis.fetch = async (input, init) => {
    if (String(input) === "https://api.deepseek.com/chat/completions") {
      deepseekRequest = JSON.parse(init.body);
      return new Response(
        'data: {"choices":[{"delta":{"content":"据新华社报道"}}]}\n\ndata: [DONE]\n\n',
        { headers: { "content-type": "text/event-stream" } },
      );
    }
    return originalFetch(input, init);
  };

  try {
    const response = await render(
      "/api/chat",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "胖东来为什么被称为6A级景区？春节客流怎么样？" }],
        }),
      },
      { DEEPSEEK_API_KEY: "test-key" },
    );

    assert.equal(response.status, 200);
    const prompt = deepseekRequest.messages[0].content;
    assert.match(prompt, /新华社|千笔楼|6A/);
    assert.match(prompt, /客流|春节/);
    const body = await response.text();
    assert.match(body, /"type":"sources"/);
    assert.match(body, /news\.cn|6A级景区/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("retrieves Yonghui reform material without treating it as Pangdonglai policy", async () => {
  const originalFetch = globalThis.fetch;
  let deepseekRequest;

  globalThis.fetch = async (input, init) => {
    if (String(input) === "https://api.deepseek.com/chat/completions") {
      deepseekRequest = JSON.parse(init.body);
      return new Response(
        'data: {"choices":[{"delta":{"content":"这是永辉的调改实践"}}]}\n\ndata: [DONE]\n\n',
        { headers: { "content-type": "text/event-stream" } },
      );
    }
    return originalFetch(input, init);
  };

  try {
    const response = await render(
      "/api/chat",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "永辉鲁谷店学胖东来改了什么？这能说明学会自由与爱了吗？" }],
        }),
      },
      { DEEPSEEK_API_KEY: "test-key" },
    );

    assert.equal(response.status, 200);
    const prompt = deepseekRequest.messages[0].content;
    assert.match(prompt, /永辉|鲁谷店|调改|照顾.*员工|服务.*顾客/);
    assert.match(prompt, /不能证明|文化内核|组织条件|实施版本/);
    assert.doesNotMatch(prompt, /本次检索没有命中任何已审核资料/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("retrieves limited cinema half-refund media chunk", async () => {
  const originalFetch = globalThis.fetch;
  let deepseekRequest;

  globalThis.fetch = async (input, init) => {
    if (String(input) === "https://api.deepseek.com/chat/completions") {
      deepseekRequest = JSON.parse(init.body);
      return new Response(
        'data: {"choices":[{"delta":{"content":"据报道"}}]}\n\ndata: [DONE]\n\n',
        { headers: { "content-type": "text/event-stream" } },
      );
    }
    return originalFetch(input, init);
  };

  try {
    const response = await render(
      "/api/chat",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "胖东来影城电影难看可以退一半票吗？" }],
        }),
      },
      { DEEPSEEK_API_KEY: "test-key" },
    );

    assert.equal(response.status, 200);
    const prompt = deepseekRequest.messages[0].content;
    assert.match(prompt, /影城|退一半|20\s*分钟|难看/);
    assert.match(prompt, /界面|据.*报道|转述/);
    const body = await response.text();
    assert.match(body, /"type":"sources"/);
    assert.match(body, /jiemian\.com|影城/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("retrieves limited L3 book chunks for how-to-learn questions", async () => {
  const originalFetch = globalThis.fetch;
  let deepseekRequest;

  globalThis.fetch = async (input, init) => {
    if (String(input) === "https://api.deepseek.com/chat/completions") {
      deepseekRequest = JSON.parse(init.body);
      return new Response(
        'data: {"choices":[{"delta":{"content":"据书中讨论"}}]}\n\ndata: [DONE]\n\n',
        { headers: { "content-type": "text/event-stream" } },
      );
    }
    return originalFetch(input, init);
  };

  try {
    const response = await render(
      "/api/chat",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "怎么学胖东来？只学高福利和服务话术够吗？" }],
        }),
      },
      { DEEPSEEK_API_KEY: "test-key" },
    );

    assert.equal(response.status, 200);
    const prompt = deepseekRequest.messages[0].content;
    assert.match(prompt, /胖东来，你要怎么学/);
    assert.match(prompt, /高福利|服务话术|表面/);
    assert.match(prompt, /作者观点|书中讨论|第三方图书/);
    assert.doesNotMatch(prompt, /本次检索没有命中任何已审核资料/);
    const body = await response.text();
    assert.match(body, /"type":"sources"/);
    assert.match(body, /胖东来，你要怎么学|book\.douban\.com/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects chat payloads longer than the server message cap with a clear error", async () => {
  const longHistory = Array.from({ length: 17 }, (_, index) => ({
    role: index % 2 === 0 ? "user" : "assistant",
    content: `消息${index + 1}`,
  }));
  // Ensure last is user
  longHistory[longHistory.length - 1] = { role: "user", content: "最后一问" };

  const response = await render(
    "/api/chat",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: longHistory }),
    },
    { DEEPSEEK_API_KEY: "test-key" },
  );

  assert.equal(response.status, 400);
  const data = await response.json();
  assert.match(String(data.error), /最多 16 条/);
});

test("rejects oversized chat request bodies before calling the model", async () => {
  const originalFetch = globalThis.fetch;
  let modelWasCalled = false;
  globalThis.fetch = async (input, init) => {
    if (String(input) === "https://api.deepseek.com/chat/completions") {
      modelWasCalled = true;
    }
    return originalFetch(input, init);
  };

  try {
    const response = await render(
      "/api/chat",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "问".repeat(30_000) }],
        }),
      },
      { DEEPSEEK_API_KEY: "test-key" },
    );

    assert.equal(response.status, 413);
    assert.equal(modelWasCalled, false);
    assert.match(String((await response.json()).error), /内容过多/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("limits repeated chat requests from the same client address", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    if (String(input) === "https://api.deepseek.com/chat/completions") {
      return new Response(
        'data: {"choices":[{"delta":{"content":"ok"}}]}\n\ndata: [DONE]\n\n',
        { headers: { "content-type": "text/event-stream" } },
      );
    }
    return originalFetch(input, init);
  };

  try {
    const workerCacheKey = `rate-limit-${process.pid}-${Date.now()}`;
    const requestInit = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.10",
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: "胖东来的文化是什么？" }],
      }),
    };

    for (let index = 0; index < 6; index += 1) {
      const response = await render(
        "/api/chat",
        requestInit,
        { DEEPSEEK_API_KEY: "test-key" },
        workerCacheKey,
      );
      assert.equal(response.status, 200);
      assert.match(await response.text(), /"type":"done"/);
    }

    const limited = await render(
      "/api/chat",
      requestInit,
      { DEEPSEEK_API_KEY: "test-key" },
      workerCacheKey,
    );
    assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers.get("retry-after")) >= 1);
    assert.match(String((await limited.json()).error), /发送得有些快/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("accepts a 12-message sliding window that ends with a user turn", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    if (String(input) === "https://api.deepseek.com/chat/completions") {
      return new Response(
        'data: {"choices":[{"delta":{"content":"ok"}}]}\n\ndata: [DONE]\n\n',
        { headers: { "content-type": "text/event-stream" } },
      );
    }
    return originalFetch(input);
  };

  try {
    const messages = [];
    for (let i = 0; i < 5; i += 1) {
      messages.push({ role: "user", content: `问${i + 1}` });
      messages.push({ role: "assistant", content: `答${i + 1}` });
    }
    messages.push({ role: "user", content: "问6" });

    const response = await render(
      "/api/chat",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages }),
      },
      { DEEPSEEK_API_KEY: "test-key" },
    );

    assert.equal(response.status, 200);
    assert.match(await response.text(), /"type":"done"/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("marks approved media interview evidence as an attributed claim", async () => {
  const originalFetch = globalThis.fetch;
  let deepseekRequest;

  globalThis.fetch = async (input, init) => {
    if (String(input) === "https://api.deepseek.com/chat/completions") {
      deepseekRequest = JSON.parse(init.body);
      return new Response(
        'data: {"choices":[{"delta":{"content":"访谈摘要"}}]}\n\ndata: [DONE]\n\n',
        { headers: { "content-type": "text/event-stream" } },
      );
    }
    return originalFetch(input, init);
  };

  try {
    const response = await render(
      "/api/chat",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: "胖东来为什么不盲目扩张？" }] }),
      },
      { DEEPSEEK_API_KEY: "test-key" },
    );

    const body = await response.text();
    const prompt = deepseekRequest.messages[0].content;
    assert.match(prompt, /公开访谈中的受访者表述/);
    assert.match(prompt, /据《人民日报》2025 年访谈/);
    assert.doesNotMatch(prompt, /L2|attributed_claim/);
    assert.match(body, /人民日报于东来访谈/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("retrieves freedom-and-love culture materials for core culture questions", async () => {
  const originalFetch = globalThis.fetch;
  let deepseekRequest;

  globalThis.fetch = async (input, init) => {
    if (String(input) === "https://api.deepseek.com/chat/completions") {
      deepseekRequest = JSON.parse(init.body);
      return new Response(
        'data: {"choices":[{"delta":{"content":"据资料"}}]}\n\ndata: [DONE]\n\n',
        { headers: { "content-type": "text/event-stream" } },
      );
    }
    return originalFetch(input, init);
  };

  try {
    const response = await render(
      "/api/chat",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "自由与爱是谁提出的？胖东来怎么解释？委屈奖是什么？" }],
        }),
      },
      { DEEPSEEK_API_KEY: "test-key" },
    );

    assert.equal(response.status, 200);
    const prompt = deepseekRequest.messages[0].content;
    assert.match(prompt, /自由·爱|自由与爱|培训大纲|卢梭|清华|委屈奖|百科|企业文化制度|幸福生命/);
    assert.doesNotMatch(prompt, /本次检索没有命中任何已审核资料/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("retrieves red-underwear opinion materials for media-commentary questions", async () => {
  const originalFetch = globalThis.fetch;
  let deepseekRequest;

  globalThis.fetch = async (input, init) => {
    if (String(input) === "https://api.deepseek.com/chat/completions") {
      deepseekRequest = JSON.parse(init.body);
      return new Response(
        'data: {"choices":[{"delta":{"content":"据评论"}}]}\n\ndata: [DONE]\n\n',
        { headers: { "content-type": "text/event-stream" } },
      );
    }
    return originalFetch(input, init);
  };

  try {
    const response = await render(
      "/api/chat",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "红内裤事件判决后媒体和舆论怎么看？于东来怎么说理性？" }],
        }),
      },
      { DEEPSEEK_API_KEY: "test-key" },
    );

    assert.equal(response.status, 200);
    const prompt = deepseekRequest.messages[0].content;
    assert.match(prompt, /红色内裤掉色过敏争议与名誉权诉讼/);
    assert.match(prompt, /澎湃|马上评|维权依法|言论边界/);
    assert.match(prompt, /理性|放大.*情绪|于东来/);
    assert.match(prompt, /15\.7\s*万|49\.5%|商业监测|识微/);
    assert.doesNotMatch(prompt, /茶叶苍蝇/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("retrieves red-underwear case with L1 company materials and civil judgment stage", async () => {
  const originalFetch = globalThis.fetch;
  let deepseekRequest;

  globalThis.fetch = async (input, init) => {
    if (String(input) === "https://api.deepseek.com/chat/completions") {
      deepseekRequest = JSON.parse(init.body);
      return new Response(
        'data: {"choices":[{"delta":{"content":"分阶段说明"}}]}\n\ndata: [DONE]\n\n',
        { headers: { "content-type": "text/event-stream" } },
      );
    }
    return originalFetch(input, init);
  };

  try {
    const response = await render(
      "/api/chat",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "红内裤事件调查报告怎么说的？法院最后怎么判的？" }],
        }),
      },
      { DEEPSEEK_API_KEY: "test-key" },
    );

    assert.equal(response.status, 200);
    const prompt = deepseekRequest.messages[0].content;
    assert.match(prompt, /【这次问题的回答边界】/);
    assert.match(prompt, /红色内裤掉色过敏争议与名誉权诉讼/);
    assert.match(prompt, /民事一审判决|企业调查报告|不同阶段/);
    assert.match(prompt, /调查报告|合格|富妮来/);
    assert.match(prompt, /40\s*万|道歉/);
    assert.doesNotMatch(prompt, /人民日报于东来访谈/);
    assert.doesNotMatch(prompt, /茶叶/);
    const body = await response.text();
    assert.match(body, /"type":"sources"/);
    assert.match(body, /红内裤|调查报告|判决|civil_judgment|40/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("keeps a limited event response inside its case and forbids finality language", async () => {
  const originalFetch = globalThis.fetch;
  let deepseekRequest;

  globalThis.fetch = async (input, init) => {
    if (String(input) === "https://api.deepseek.com/chat/completions") {
      deepseekRequest = JSON.parse(init.body);
      return new Response(
        'data: {"choices":[{"delta":{"content":"企业初步回应"}}]}\n\ndata: [DONE]\n\n',
        { headers: { "content-type": "text/event-stream" } },
      );
    }
    return originalFetch(input, init);
  };

  try {
    const response = await render(
      "/api/chat",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: "茶叶苍蝇反馈后企业公开怎么说的？是最终结论吗？" }] }),
      },
      { DEEPSEEK_API_KEY: "test-key" },
    );

    const body = await response.text();
    const prompt = deepseekRequest.messages[0].content;
    assert.match(prompt, /【这次问题的回答边界】/);
    assert.match(prompt, /顾客反馈茶叶问题后的企业公开初步说明/);
    assert.match(prompt, /目前能看到的是企业当时的公开回应，后续调查结论尚未见到/);
    assert.match(prompt, /用户是否在问后续结论：是/);
    assert.match(prompt, /不得引用其他案例或企业理念资料来裁定本案例事实/);
    assert.match(prompt, /这件事现在知道什么/);
    assert.match(prompt, /企业当时怎么处理/);
    assert.match(prompt, /后来有没有明确结论/);
    assert.match(prompt, /从这件事观察胖东来：/);
    assert.match(prompt, /不能用文化口号裁定客诉真伪/);
    assert.doesNotMatch(prompt, /人民日报于东来访谈/);
    assert.doesNotMatch(prompt, /胖东来简介/);
    assert.doesNotMatch(prompt, /L1|L2|caseId|claimType|finality|preliminary_only|资料说明/);
    assert.match(body, /顾客抖音反馈茶叶问题后的企业公开初步说明/);
    assert.match(body, /"claimType":"company_preliminary_response"/);
    assert.match(body, /"finality":"preliminary"/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("keeps company egg testing separate from a regulatory final conclusion", async () => {
  const originalFetch = globalThis.fetch;
  let deepseekRequest;

  globalThis.fetch = async (input, init) => {
    if (String(input) === "https://api.deepseek.com/chat/completions") {
      deepseekRequest = JSON.parse(init.body);
      return new Response(
        'data: {"choices":[{"delta":{"content":"企业送检回应"}}]}\n\ndata: [DONE]\n\n',
        { headers: { "content-type": "text/event-stream" } },
      );
    }
    return originalFetch(input, init);
  };

  try {
    const response = await render(
      "/api/chat",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: "胖东来鸡蛋角黄素怎么回应的，监管最终结案了吗？" }] }),
      },
      { DEEPSEEK_API_KEY: "test-key" },
    );

    const body = await response.text();
    const prompt = deepseekRequest.messages[0].content;
    assert.match(prompt, /鲜鸡蛋角黄素网络争议中的企业公开回应/);
    assert.match(prompt, /企业送检|黄天鹅|华测检测|角黄素/);
    assert.match(prompt, /监管.*最终|监管.*结案|市场监管/);
    assert.match(prompt, /不得引用其他案例或企业理念资料来裁定本案例事实/);
    assert.doesNotMatch(prompt, /茶叶苍蝇|人民日报于东来访谈/);
    assert.match(body, /"finality":"no_regulatory_final"/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("retrieves 2026 customer-service leave numbers on the general track", async () => {
  const originalFetch = globalThis.fetch;
  let deepseekRequest;

  globalThis.fetch = async (input, init) => {
    if (String(input) === "https://api.deepseek.com/chat/completions") {
      deepseekRequest = JSON.parse(init.body);
      return new Response(
        'data: {"choices":[{"delta":{"content":"年假口径"}}]}\n\ndata: [DONE]\n\n',
        { headers: { "content-type": "application/json" } },
      );
    }
    return originalFetch(input, init);
  };

  try {
    const response = await render(
      "/api/chat",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: "胖东来工龄满一年有多少天年假和不开心假？" }] }),
      },
      { DEEPSEEK_API_KEY: "test-key" },
    );

    assert.equal(response.status, 200);
    const prompt = deepseekRequest.messages[0].content;
    assert.match(prompt, /极目新闻：官方客服确认现行年假与自由假口径/);
    assert.match(prompt, /40 天假期|30 天年假|10 天自由假/);
    assert.doesNotMatch(prompt, /【这次问题的回答边界】/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("retrieves newly approved employee rest practices on the general track", async () => {
  const originalFetch = globalThis.fetch;
  let deepseekRequest;

  globalThis.fetch = async (input, init) => {
    if (String(input) === "https://api.deepseek.com/chat/completions") {
      deepseekRequest = JSON.parse(init.body);
      return new Response(
        'data: {"choices":[{"delta":{"content":"员工休息安排"}}]}\n\ndata: [DONE]\n\n',
        { headers: { "content-type": "text/event-stream" } },
      );
    }
    return originalFetch(input, init);
  };

  try {
    const response = await render(
      "/api/chat",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: "胖东来员工不开心假和下班后的生活边界具体怎么做？" }] }),
      },
      { DEEPSEEK_API_KEY: "test-key" },
    );

    assert.equal(response.status, 200);
    const prompt = deepseekRequest.messages[0].content;
    assert.match(prompt, /新华社民营经济观察：胖东来员工之家与工作生活边界/);
    assert.match(prompt, /10 天不开心假|下班后不允许给员工打工作电话/);
    assert.doesNotMatch(prompt, /【这次问题的回答边界】/);
    assert.doesNotMatch(prompt, /尝面员工|员工彩礼|降薪传言/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("keeps the noodle-employee discipline timeline inside its own case", async () => {
  const originalFetch = globalThis.fetch;
  let deepseekRequest;

  globalThis.fetch = async (input, init) => {
    if (String(input) === "https://api.deepseek.com/chat/completions") {
      deepseekRequest = JSON.parse(init.body);
      return new Response(
        'data: {"choices":[{"delta":{"content":"处分与复议"}}]}\n\ndata: [DONE]\n\n',
        { headers: { "content-type": "text/event-stream" } },
      );
    }
    return originalFetch(input, init);
  };

  try {
    const response = await render(
      "/api/chat",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: "尝面员工后来还是被开除了吗？最终怎么处理的？" }] }),
      },
      { DEEPSEEK_API_KEY: "test-key" },
    );

    assert.equal(response.status, 200);
    const prompt = deepseekRequest.messages[0].content;
    assert.match(prompt, /美食城员工试吃操作违规后的处分与复议/);
    assert.match(prompt, /后续内部复议结果/);
    assert.match(prompt, /降学习期三个月|转为非食品加工岗位/);
    assert.match(prompt, /尚未见到劳动仲裁或法院结论/);
    assert.doesNotMatch(prompt, /红内裤|茶叶苍蝇|员工彩礼/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("does not retrieve removed bride-price or seminar-speech materials", async () => {
  const originalFetch = globalThis.fetch;
  let deepseekRequest;

  globalThis.fetch = async (input, init) => {
    if (String(input) === "https://api.deepseek.com/chat/completions") {
      deepseekRequest = JSON.parse(init.body);
      return new Response(
        'data: {"choices":[{"delta":{"content":"资料不足"}}]}\n\ndata: [DONE]\n\n',
        { headers: { "content-type": "text/event-stream" } },
      );
    }
    return originalFetch(input, init);
  };

  try {
    for (const content of [
      "胖东来不让员工收彩礼已经是正式制度了吗？",
      "网传座谈会发言稿是真的吗？",
    ]) {
      const response = await render(
        "/api/chat",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ messages: [{ role: "user", content }] }),
        },
        { DEEPSEEK_API_KEY: "test-key" },
      );

      assert.equal(response.status, 200);
      const prompt = deepseekRequest.messages[0].content;
      assert.doesNotMatch(prompt, /员工彩礼倡议与私人生活边界讨论|座谈会发言稿|尚未形成企业规章制度|长安街知事/);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("treats the no-pay-cut statement as a company clarification only", async () => {
  const originalFetch = globalThis.fetch;
  let deepseekRequest;

  globalThis.fetch = async (input, init) => {
    if (String(input) === "https://api.deepseek.com/chat/completions") {
      deepseekRequest = JSON.parse(init.body);
      return new Response(
        'data: {"choices":[{"delta":{"content":"工资澄清"}}]}\n\ndata: [DONE]\n\n',
        { headers: { "content-type": "text/event-stream" } },
      );
    }
    return originalFetch(input, init);
  };

  try {
    const response = await render(
      "/api/chat",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: "胖东来真的大幅降薪了吗，企业怎么回应的？" }] }),
      },
      { DEEPSEEK_API_KEY: "test-key" },
    );

    assert.equal(response.status, 200);
    const prompt = deepseekRequest.messages[0].content;
    assert.match(prompt, /员工降薪传言与企业公开澄清/);
    assert.match(prompt, /从未作出降薪决定|未作出调降工资决定/);
    assert.match(prompt, /不能证明每名员工实际薪酬从未变化/);
    assert.doesNotMatch(prompt, /尝面员工|员工彩礼|红内裤/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("keeps the DeepSeek key on the server", async () => {
  const response = await render("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "你好" }] }),
  });

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "本地尚未配置 DeepSeek API Key。" });
});

test("removes disposable starter-preview code and metadata", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(page, /SkeletonPreview|codex-preview|react-loading-skeleton/);
  assert.doesNotMatch(layout, /Starter Project|codex-preview|next\/font\/google/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await Promise.all([
    assert.rejects(
      access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)),
    ),
    assert.rejects(
      access(new URL("../app/_sites-preview/preview.css", import.meta.url)),
    ),
  ]);
});
