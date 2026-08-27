import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createTokenHubEmbeddingClient } from "../shared/embedding-client.mjs";
import { createHybridKnowledgeRetriever } from "../shared/hybrid-retrieval.mjs";
import { createKnowledgeRetriever } from "../shared/retrieval.mjs";

const siteRoot = fileURLToPath(new URL("..", import.meta.url));

function parseDotDevVars(raw) {
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index < 0) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const localEnv = parseDotDevVars(await readFile(resolve(siteRoot, ".dev.vars"), "utf8"));
const mode = (localEnv.RAG_RETRIEVAL_MODE ?? "").trim().toLowerCase();
const apiKey = (localEnv.TENCENT_TOKENHUB_API_KEY ?? localEnv.TokenHub_Key ?? "").trim();
const model = (localEnv.TENCENT_TOKENHUB_MODEL ?? "kinfra-text-embedding-4b").trim();
const endpoint = (localEnv.TENCENT_TOKENHUB_ENDPOINT ?? "").trim();

if (mode !== "hybrid") {
  throw new Error(`RAG_RETRIEVAL_MODE 当前是 ${mode || "(空)"}，需要 hybrid。`);
}
if (!apiKey) throw new Error("缺少 TENCENT_TOKENHUB_API_KEY。");

const [knowledgeBase, vectorIndex] = await Promise.all([
  readFile(new URL("../../knowledge/compiled/knowledge-base.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../../knowledge/vector/r5-general-index.json", import.meta.url), "utf8").then(JSON.parse),
]);
if (model !== vectorIndex.model) {
  throw new Error(`模型 ${model} 与索引 ${vectorIndex.model} 不一致。`);
}

const keywordRetriever = createKnowledgeRetriever(knowledgeBase, {
  queryRewriteV1: true,
  answerPurposeFilterV1: true,
});
const embeddingClient = createTokenHubEmbeddingClient({
  apiKey,
  endpoint: endpoint || undefined,
  model,
  timeoutMs: 15_000,
  maxRetries: 1,
});
const hybridRetriever = createHybridKnowledgeRetriever({
  knowledgeBase,
  keywordRetriever,
  vectorIndex,
  embedQuery: async (queryText) => (await embeddingClient.embed([queryText]))[0],
  vectorWeight: 0.65,
  keywordGuardWeight: 0,
  semanticCaseRouting: true,
  fallbackToKeyword: false,
});

const question = "员工休假怎么安排？";
const plan = await hybridRetriever.searchKnowledge(question);
const retrieved = plan.retrieved ?? [];

console.log(JSON.stringify({
  question,
  retrievalMode: plan.retrievalMode,
  vectorApplied: plan.vectorApplied,
  vectorModel: plan.vectorModel ?? vectorIndex.model,
  track: plan.track,
  recalled: retrieved.length,
  chunks: retrieved.map((item, index) => ({
    rank: index + 1,
    chunkId: item.chunkId,
    bm25Rank: item.bm25Rank ?? null,
    vectorRank: item.vectorRank ?? null,
    title: item.chunkTitle,
  })),
}, null, 2));
