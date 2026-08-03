import { readFile, writeFile } from "node:fs/promises";

const apiKey = process.env.DEEPSEEK_API_KEY;
if (!apiKey) {
  throw new Error("未检测到 DEEPSEEK_API_KEY；真实回答评测不会读取或写入密钥文件。");
}

const r4SetUrl = new URL("../../evaluation/rag-culture-r4-answer-set-v1.json", import.meta.url);
const questionSetUrl = new URL("../../evaluation/rag-culture-questions-v1.json", import.meta.url);
const resultUrl = new URL("../../evaluation/rag-culture-r4-live-answers-v1.json", import.meta.url);
const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("r4-live-evaluation", `${Date.now()}`);

const [r4Set, questionSet, workerModule] = await Promise.all([
  readFile(r4SetUrl, "utf8").then(JSON.parse),
  readFile(questionSetUrl, "utf8").then(JSON.parse),
  import(workerUrl.href),
]);

const questionsById = new Map(questionSet.questions.map((question) => [question.id, question]));
const worker = workerModule.default;
const results = [];

function decodeEvents(body) {
  const decoded = {
    answer: "",
    sources: [],
    error: null,
    done: false,
  };

  for (const block of body.split("\n\n")) {
    for (const line of block.split("\n")) {
      if (!line.startsWith("data:")) continue;
      const raw = line.slice(5).trim();
      if (!raw) continue;
      const event = JSON.parse(raw);
      if (event.type === "delta") decoded.answer += event.content ?? "";
      if (event.type === "sources") decoded.sources = event.sources ?? [];
      if (event.type === "error") decoded.error = event.error ?? "未知流式错误";
      if (event.type === "done") decoded.done = true;
    }
  }

  return decoded;
}

async function saveProgress() {
  const completed = results.filter((result) => result.status === "completed").length;
  const failed = results.length - completed;
  const output = {
    schemaVersion: "1.0",
    evaluationId: r4Set.id,
    generatedAt: new Date().toISOString(),
    configuration: {
      model: "deepseek-v4-flash",
      codeVersion: "local R4 Worker build",
      requestMode: "sequential",
      apiKeyStored: false,
    },
    summary: {
      total: r4Set.questions.length,
      attempted: results.length,
      completed,
      failed,
      humanReviewPending: completed,
    },
    results,
  };
  await writeFile(resultUrl, `${JSON.stringify(output, null, 2)}\n`, "utf8");
}

for (const [index, entry] of r4Set.questions.entries()) {
  const question = questionsById.get(entry.referenceQuestionId);
  if (!question) throw new Error(`${entry.id} 引用了不存在的问题 ${entry.referenceQuestionId}`);

  const messages = [
    ...question.context.map((content) => ({ role: "user", content })),
    { role: "user", content: question.question },
  ];
  const startedAt = Date.now();

  try {
    const response = await worker.fetch(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages }),
      }),
      {
        ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
        DEEPSEEK_API_KEY: apiKey,
      },
      {
        waitUntil() {},
        passThroughOnException() {},
      },
    );

    const body = await response.text();
    if (!response.ok) {
      let error = body;
      try {
        error = JSON.parse(body).error ?? body;
      } catch {}
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const decoded = decodeEvents(body);
    if (decoded.error) throw new Error(decoded.error);
    if (!decoded.done || !decoded.answer.trim()) throw new Error("模型没有返回完整正文");

    results.push({
      id: entry.id,
      referenceQuestionId: entry.referenceQuestionId,
      theme: question.theme,
      expectedMode: entry.expectedMode,
      question: question.question,
      context: question.context,
      reviewFocus: entry.reviewFocus,
      expectedAnswerPoints: question.expectedAnswerPoints,
      forbiddenClaims: question.forbiddenClaims,
      status: "completed",
      elapsedMs: Date.now() - startedAt,
      answer: decoded.answer.trim(),
      sources: decoded.sources,
      humanReview: "pending",
    });
    console.log(`[${index + 1}/${r4Set.questions.length}] ${entry.id} 完成`);
  } catch (error) {
    results.push({
      id: entry.id,
      referenceQuestionId: entry.referenceQuestionId,
      theme: question.theme,
      expectedMode: entry.expectedMode,
      question: question.question,
      context: question.context,
      reviewFocus: entry.reviewFocus,
      expectedAnswerPoints: question.expectedAnswerPoints,
      forbiddenClaims: question.forbiddenClaims,
      status: "failed",
      elapsedMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
      humanReview: "not_applicable",
    });
    console.error(`[${index + 1}/${r4Set.questions.length}] ${entry.id} 失败`);
  }

  await saveProgress();
}

const failed = results.filter((result) => result.status === "failed");
console.log(`R4 真实回答完成：${results.length - failed.length}/${results.length}`);
if (failed.length) process.exitCode = 1;
