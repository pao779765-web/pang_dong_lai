import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { createCloudBaseServer } from "../scripts/cloudbase-server.mjs";

let renderSequence = 0;

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
  assert.match(worker, /previousUserQuestions/);
  assert.doesNotMatch(worker, /const BM25_K1/);
  assert.doesNotMatch(worker, /\.\.\/\.\.\/knowledge-base\.json/);
  assert.doesNotMatch(worker, /type ChatSource =/);
  assert.match(sharedChat, /export type ChatRequestMessage/);

  const regions = JSON.parse(storeDirectory);
  assert.equal(regions.flatMap((region) => region.stores).length, 14);
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
  assert.equal(allChunks.length, 135);
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
    "nbd-bride-price-boundary-2024-11",
    "jiemian-salary-policy-clarification-2026-06",
  ]) {
    const document = backfilledDocuments.get(documentId);
    assert.equal(document?.ingestion.contentStatus, "partial_text");
    assert.ok(document.chunks.every((chunk) => chunk.contentKind === "source_text"));
    assert.ok(document.chunks.every((chunk) => chunk.sourceSpans.length > 0));
  }
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
    "employee-bride-price-boundary-2024-11",
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
  assert.equal(current.summary.passed, 39);
  assert.equal(current.summary.finalityIntentPassed, 54);
  assert.equal(current.summary.noAnswerSafetyPassed, 6);
  assert.deepEqual(current.comparisonToBaseline.regressedQuestionIds, []);
  assert.match(currentReport, /当前检索通过 39\/54 题/);
  assert.match(packageJson.scripts["rag:evaluate"], /evaluate-rag-baseline\.mjs/);
  assert.match(packageJson.scripts["rag:evaluate"], /--current/);
});

test("keeps the culture-v1 BM25 expansion experimental when it regresses", async () => {
  const [current, experiment, report, packageJson] = await Promise.all([
    readFile(new URL("../../evaluation/rag-culture-current-evaluation.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../../evaluation/rag-culture-bm25-culture-v1-experiment.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../../../docs/RAG_CULTURE_BM25_CULTURE_V1_EXPERIMENT.md", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8").then(JSON.parse),
  ]);

  assert.equal(current.summary.passed, 39);
  assert.equal(experiment.summary.passed, 38);
  assert.equal(experiment.comparisonToBaseline.baselineId, current.id);
  assert.deepEqual(experiment.comparisonToBaseline.newlyPassedQuestionIds, ["C5-02"]);
  assert.deepEqual(experiment.comparisonToBaseline.regressedQuestionIds, ["C4-02", "C6-02"]);
  assert.equal(experiment.summary.noAnswerSafetyPassed, current.summary.noAnswerSafetyPassed);
  assert.equal(experiment.summary.finalityIntentPassed, current.summary.finalityIntentPassed);
  assert.ok(experiment.summary.isolationPassed < current.summary.isolationPassed);
  assert.equal(experiment.experimentDecision.recommendedForProduction, false);
  assert.match(experiment.retrievalConfiguration.cultureAnnotationSearch, /non-case culture-v1/);
  assert.match(report, /不启用到网站正式检索/);
  assert.match(packageJson.scripts["rag:evaluate:culture-v1"], /--culture-v1/);
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

  for (const question of [
    "请给我一份胖东来 2026 年每个岗位最新工资和奖金表。",
    "胖东来每个岗位分别能自主赔付多少元？请列出权限表。",
    "请列出胖东来当前所有供应商的审核分数和淘汰名单。",
    "胖东来今年净利润率多少，未来三年准备开多少家店？",
    "胖东来历史上所有投诉最后分别是谁对谁错？",
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
  assert.match(html, /href="#explore"/);
  assert.match(html, /href="#ai-dialogue"/);
  assert.match(html, /aria-controls="store-directory"/);
  assert.match(html, /与胖东来对话/);
  assert.match(html, /id="explore"/);
  assert.match(html, /id="ai-dialogue"/);
  assert.match(html, /id="store-directory"/);
  assert.match(html, /aria-hidden="true"/);
  assert.match(html, /BM25 本地检索/);
  assert.match(html, /输入你的问题/);
  for (const storeName of ["许昌天使城", "许昌时代广场", "许昌生活广场", "许昌大众服饰", "许昌金三角店", "许昌云鼎店", "许昌北海店", "许昌金汇店", "许昌劳动店", "许昌人民店", "禹州店", "新乡大胖", "新乡二胖", "新乡三胖"]) {
    assert.match(html, new RegExp(storeName));
  }
  assert.equal((html.match(/<img[^>]+alt="[^"]*官方门店照片"/g) ?? []).length, 14);
  assert.equal((html.match(/href="https:\/\/web\.azpdl\.cn\/"/g) ?? []).length, 14);
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
    assert.match(deepseekRequest.messages[0].content, /只能依据下方“检索到的资料”回答具体事实/);
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

test("keeps the bride-price discussion at the proposal-not-policy stage", async () => {
  const originalFetch = globalThis.fetch;
  let deepseekRequest;

  globalThis.fetch = async (input, init) => {
    if (String(input) === "https://api.deepseek.com/chat/completions") {
      deepseekRequest = JSON.parse(init.body);
      return new Response(
        'data: {"choices":[{"delta":{"content":"倡议边界"}}]}\n\ndata: [DONE]\n\n',
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
        body: JSON.stringify({ messages: [{ role: "user", content: "胖东来不让员工收彩礼已经是正式制度了吗？" }] }),
      },
      { DEEPSEEK_API_KEY: "test-key" },
    );

    assert.equal(response.status, 200);
    const prompt = deepseekRequest.messages[0].content;
    assert.match(prompt, /员工彩礼倡议与私人生活边界讨论/);
    assert.match(prompt, /尚未形成企业规章制度/);
    assert.match(prompt, /私人生活|合法福利|制度形成程序/);
    assert.doesNotMatch(prompt, /尝面员工|大幅降薪|茶叶苍蝇/);
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
