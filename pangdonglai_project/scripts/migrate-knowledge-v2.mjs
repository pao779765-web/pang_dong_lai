import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const knowledgeDirectory = path.join(projectDirectory, "knowledge");
const legacyFile = path.join(knowledgeDirectory, "legacy", "knowledge-base.v2.json");
const migrationDate = "2026-07-31";

if (!process.argv.includes("--force-from-v2-snapshot")) {
  throw new Error(
    "这是一次性迁移脚本。当前目录化知识库已经生效；只有明确需要从 v2 只读快照完全重建时，才可传入 --force-from-v2-snapshot。",
  );
}

if (!process.argv.includes("--force-from-v2-snapshot")) {
  throw new Error(
    "这是一次性迁移脚本。当前目录化知识库已经生效；只有明确需要从 v2 只读快照完全重建时，才可传入 --force-from-v2-snapshot。",
  );
}

function assertSafeId(id, label) {
  if (typeof id !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(id)) {
    throw new Error(`${label} 使用了不安全的 id：${String(id)}`);
  }
}

function toPosixPath(...segments) {
  return segments.join("/");
}

function renderCurrentContent(document) {
  const sections = document.chunks
    .map((chunk) => `## ${chunk.title}\n\n${chunk.text}`)
    .join("\n\n");

  return [
    `# ${document.title}`,
    "",
    "> 当前覆盖状态：`summary_only`",
    ">",
    "> 本文件由旧知识库中的已审核摘要无损迁移而来，目前不是报道或文献的完整原文。后续只有在来源许可和审核规则允许时，才能逐篇补入规范化正文。",
    "",
    `- 文档 ID：\`${document.id}\``,
    `- 原始来源：${document.source.url}`,
    `- 发布者：${document.source.publisher}`,
    `- 核验日期：${document.source.verifiedAt}`,
    "",
    "## 当前已审核内容",
    "",
    sections,
  ].join("\n");
}

const rawLegacy = await readFile(legacyFile, "utf8");
const legacy = JSON.parse(rawLegacy);

if (!Array.isArray(legacy.cases) || !Array.isArray(legacy.documents)) {
  throw new Error("旧知识库缺少 cases 或 documents。");
}

await mkdir(path.join(knowledgeDirectory, "legacy"), { recursive: true });
await mkdir(path.join(knowledgeDirectory, "cases"), { recursive: true });
await mkdir(path.join(knowledgeDirectory, "sources"), { recursive: true });
await mkdir(path.join(knowledgeDirectory, "chunks"), { recursive: true });

await writeFile(
  path.join(knowledgeDirectory, "legacy", "knowledge-base.v2.json"),
  `${JSON.stringify(legacy, null, 2)}\n`,
  "utf8",
);

const caseReferences = [];
for (const caseRecord of legacy.cases) {
  assertSafeId(caseRecord.id, "案例");
  const relativePath = toPosixPath("cases", `${caseRecord.id}.json`);
  await writeFile(
    path.join(knowledgeDirectory, ...relativePath.split("/")),
    `${JSON.stringify(caseRecord, null, 2)}\n`,
    "utf8",
  );
  caseReferences.push({ id: caseRecord.id, path: relativePath });
}

const sourceReferences = [];
let chunkCount = 0;

for (const document of legacy.documents) {
  assertSafeId(document.id, "资料");
  const { chunks, ...documentMetadata } = document;
  const sourceDirectory = path.join(knowledgeDirectory, "sources", document.id);
  const metadataPath = toPosixPath("sources", document.id, "metadata.json");
  const contentPath = toPosixPath("sources", document.id, "content.md");
  const chunksPath = toPosixPath("chunks", `${document.id}.jsonl`);

  await mkdir(sourceDirectory, { recursive: true });

  const metadata = {
    ...documentMetadata,
    ingestion: {
      contentStatus: "summary_only",
      fullTextAllowed: "unknown",
      contentFormat: "markdown",
      contentPath,
      chunksPath,
      sourceSnapshotHash: null,
      migratedAt: migrationDate,
      notes: "由 schema 2.0 摘要知识库无损迁移；尚未取得或核验完整正文。",
    },
  };

  await writeFile(
    path.join(knowledgeDirectory, ...metadataPath.split("/")),
    `${JSON.stringify(metadata, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(knowledgeDirectory, ...contentPath.split("/")),
    `${renderCurrentContent(document)}\n`,
    "utf8",
  );

  const chunkLines = chunks.map((chunk) =>
    JSON.stringify({
      documentId: document.id,
      contentKind: "reviewed_summary",
      sourceSpans: [],
      ...chunk,
    }),
  );
  await writeFile(
    path.join(knowledgeDirectory, ...chunksPath.split("/")),
    `${chunkLines.join("\n")}\n`,
    "utf8",
  );

  chunkCount += chunks.length;
  sourceReferences.push({
    id: document.id,
    metadataPath,
    contentPath,
    chunksPath,
  });
}

const manifest = {
  schemaVersion: "3.0",
  collection: legacy.collection,
  description:
    "目录化知识库：来源元数据、可回填正文、检索切片与案例分开维护；compiled/knowledge-base.json 仅为构建产物。",
  sourceOfTruth: "directory",
  generatedIndex: "compiled/knowledge-base.json",
  counts: {
    cases: caseReferences.length,
    sources: sourceReferences.length,
    chunks: chunkCount,
  },
  cases: caseReferences,
  sources: sourceReferences,
};

await writeFile(
  path.join(knowledgeDirectory, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);

process.stdout.write(
  `已迁移 ${sourceReferences.length} 份资料、${chunkCount} 个片段、${caseReferences.length} 个案例。\n`,
);
