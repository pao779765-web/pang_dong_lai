import { writeFile } from "node:fs/promises";

const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
const tokenHubApiKey = process.env.TENCENT_TOKENHUB_API_KEY ?? process.env.TokenHub_Key;
if (!deepseekApiKey) throw new Error("缺少 DEEPSEEK_API_KEY；不会使用伪回答代替真实验收。");
if (!tokenHubApiKey) {
  throw new Error("缺少 TENCENT_TOKENHUB_API_KEY 或 TokenHub_Key；不会使用伪向量代替真实验收。");
}

const questions = [
  {
    id: "R5C-WORKER-01",
    question: "一家企业如果真把员工当人而不是耗材，公开材料里能看到哪些安排？",
    expectsVector: true,
    answerPattern: /员工之家|休息|生活|下班|不开心假/,
  },
  {
    id: "R5C-WORKER-02",
    question: "胖东来因为红裤头事件开除相关员工，这件事是否和企业文化相冲突？",
    expectsVector: true,
    answerPattern: /免职|降级/,
  },
  {
    id: "R5C-WORKER-03",
    question: "请给我一份胖东来 2026 年每个岗位最新工资和奖金表。",
    expectsVector: false,
    answerPattern: /没有足够|无法提供|不能提供|尚无/,
  },
];

function parseEvents(body) {
  const answer = [];
  let sources = [];
  let done = false;
  for (const event of body.split("\n\n")) {
    for (const line of event.split("\n")) {
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data) continue;
      const payload = JSON.parse(data);
      if (payload.type === "delta" && typeof payload.content === "string") answer.push(payload.content);
      if (payload.type === "sources" && Array.isArray(payload.sources)) sources = payload.sources;
      if (payload.type === "done") done = true;
    }
  }
  return { answer: answer.join(""), sources, done };
}

const nativeFetch = globalThis.fetch;
let activeCounters = null;
globalThis.fetch = async (input, init) => {
  const url = String(input);
  if (url === "https://tokenhub.tencentmaas.com/v1/embeddings") activeCounters.tokenHub += 1;
  if (url === "https://api.deepseek.com/chat/completions") activeCounters.deepseek += 1;
  return nativeFetch(input, init);
};

const workerUrl = new URL(`../dist/server/index.js?live=${Date.now()}`, import.meta.url);
const { default: worker } = await import(workerUrl.href);
const runtimeEnv = {
  ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  DEEPSEEK_API_KEY: deepseekApiKey,
  RAG_RETRIEVAL_MODE: "hybrid",
  TENCENT_TOKENHUB_API_KEY: tokenHubApiKey,
  TENCENT_TOKENHUB_ENDPOINT: process.env.TENCENT_TOKENHUB_ENDPOINT,
  TENCENT_TOKENHUB_MODEL: process.env.TENCENT_TOKENHUB_MODEL,
};
const executionContext = {
  waitUntil() {},
  passThroughOnException() {},
};

const results = [];
try {
  for (const item of questions) {
    activeCounters = { tokenHub: 0, deepseek: 0 };
    const startedAt = Date.now();
    const response = await worker.fetch(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: item.question }] }),
      }),
      runtimeEnv,
      executionContext,
    );
    const body = await response.text();
    const parsed = response.ok ? parseEvents(body) : { answer: body, sources: [], done: false };
    const checks = {
      responseOk: response.ok,
      streamCompleted: parsed.done,
      answerPresent: Boolean(parsed.answer.trim()),
      answerPatternPass: item.answerPattern.test(parsed.answer),
      vectorCallPass: item.expectsVector ? activeCounters.tokenHub === 1 : activeCounters.tokenHub === 0,
      deepseekCallPass: activeCounters.deepseek >= 1,
    };
    results.push({
      id: item.id,
      question: item.question,
      expectsVector: item.expectsVector,
      durationMs: Date.now() - startedAt,
      status: response.status,
      calls: activeCounters,
      answer: parsed.answer,
      sources: parsed.sources,
      checks: { ...checks, pass: Object.values(checks).every(Boolean) },
      humanReview: "pending",
    });
  }
} finally {
  globalThis.fetch = nativeFetch;
}

const output = {
  schemaVersion: "rag-culture-r5c-worker-live-v1",
  evaluatedAt: new Date().toISOString(),
  configuration: {
    retrievalMode: "hybrid",
    vectorWeight: 0.65,
    keywordWeight: 1,
    keywordGuardWeight: 0,
    semanticCaseRouting: true,
    apiKeyStored: false,
  },
  summary: {
    total: results.length,
    passed: results.filter((result) => result.checks.pass).length,
    failed: results.filter((result) => !result.checks.pass).length,
  },
  results,
};

const outputUrl = new URL("../../evaluation/rag-culture-r5c-worker-live-v1.json", import.meta.url);
await writeFile(outputUrl, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`R5C Worker 真实验收：${output.summary.passed}/${output.summary.total}；结果已写入 ${outputUrl.pathname}`);
if (output.summary.failed > 0) process.exitCode = 1;
