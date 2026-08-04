import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import {
  createTokenHubEmbeddingClient,
  DEFAULT_TOKENHUB_EMBEDDING_ENDPOINT,
  DEFAULT_TOKENHUB_EMBEDDING_MODEL,
} from "../shared/embedding-client.mjs";
import { createVectorCorpus } from "../shared/hybrid-retrieval.mjs";

const knowledgeUrl = new URL("../../knowledge/compiled/knowledge-base.json", import.meta.url);
const outputUrl = new URL("../../knowledge/vector/r5-general-index.json", import.meta.url);
const batchSize = 64;

const apiKey = process.env.TENCENT_TOKENHUB_API_KEY;
if (!apiKey) {
  throw new Error(
    "缺少 TENCENT_TOKENHUB_API_KEY。请只在本地环境变量中设置，不要写入代码或提交到 Git。",
  );
}

const knowledgeBase = JSON.parse(await readFile(knowledgeUrl, "utf8"));
const corpus = createVectorCorpus(knowledgeBase);
const client = createTokenHubEmbeddingClient({
  apiKey,
  endpoint: process.env.TENCENT_TOKENHUB_ENDPOINT ?? DEFAULT_TOKENHUB_EMBEDDING_ENDPOINT,
  model: process.env.TENCENT_TOKENHUB_MODEL ?? DEFAULT_TOKENHUB_EMBEDDING_MODEL,
});
const entries = [];

for (let offset = 0; offset < corpus.length; offset += batchSize) {
  const batch = corpus.slice(offset, offset + batchSize);
  const vectors = await client.embed(batch.map((item) => item.embeddingText));
  entries.push(
    ...batch.map((item, index) => ({
      chunkId: item.chunkId,
      textHash: createHash("sha256").update(item.embeddingText).digest("hex"),
      embedding: vectors[index],
    })),
  );
  console.log(`已生成 ${entries.length}/${corpus.length} 个文档向量。`);
}

const dimensions = entries[0]?.embedding.length ?? 0;
const corpusHash = createHash("sha256")
  .update(entries.map((entry) => `${entry.chunkId}:${entry.textHash}`).join("\n"))
  .digest("hex");
const index = {
  schemaVersion: "r5-vector-index-v1",
  provider: "tencent-tokenhub",
  model: client.model,
  endpoint: client.endpoint,
  dimensions,
  generatedAt: new Date().toISOString(),
  knowledgeSchemaVersion: knowledgeBase.schemaVersion,
  corpusHash,
  corpusScope: "approved + limited non-case; case-bound limited excluded",
  entryCount: entries.length,
  entries,
};

await mkdir(new URL("../../knowledge/vector/", import.meta.url), { recursive: true });
await writeFile(outputUrl, `${JSON.stringify(index)}\n`, "utf8");
console.log(`向量索引已写入 ${outputUrl.pathname}（${entries.length} 条，${dimensions} 维）。`);
