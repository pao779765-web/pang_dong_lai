import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "../..");
const knowledgeDirectory = path.join(projectDirectory, "knowledge");
const manifestPath = path.join(knowledgeDirectory, "manifest.json");

function resolveKnowledgePath(relativePath) {
  if (
    typeof relativePath !== "string" ||
    path.isAbsolute(relativePath) ||
    relativePath.split(/[\\/]/).includes("..")
  ) {
    throw new Error(`知识库路径不安全：${String(relativePath)}`);
  }

  return path.join(knowledgeDirectory, ...relativePath.split("/"));
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(resolveKnowledgePath(relativePath), "utf8"));
}

async function readJsonLines(relativePath) {
  const raw = await readFile(resolveKnowledgePath(relativePath), "utf8");
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`${relativePath} 第 ${index + 1} 行不是有效 JSON：${error.message}`);
      }
    });
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

if (manifest.schemaVersion !== "3.0" || manifest.sourceOfTruth !== "directory") {
  throw new Error("knowledge/manifest.json 不是受支持的目录化知识库。");
}

const seenCaseIds = new Set();
const cases = [];
for (const reference of manifest.cases) {
  const caseRecord = await readJson(reference.path);
  if (caseRecord.id !== reference.id || seenCaseIds.has(caseRecord.id)) {
    throw new Error(`案例引用无效或重复：${reference.id}`);
  }
  seenCaseIds.add(caseRecord.id);
  cases.push(caseRecord);
}

const seenDocumentIds = new Set();
const seenChunkIds = new Set();
const documents = [];
let chunkCount = 0;

for (const reference of manifest.sources) {
  const metadata = await readJson(reference.metadataPath);
  await readFile(resolveKnowledgePath(reference.contentPath), "utf8");
  const chunks = await readJsonLines(reference.chunksPath);

  if (metadata.id !== reference.id || seenDocumentIds.has(metadata.id)) {
    throw new Error(`资料引用无效或重复：${reference.id}`);
  }
  if (!["approved", "limited"].includes(metadata.status)) {
    throw new Error(`正式知识库不得编译 ${metadata.status} 资料：${metadata.id}`);
  }
  if (
    !["metadata_only", "summary_only", "partial_text", "full_text"].includes(
      metadata.ingestion?.contentStatus,
    )
  ) {
    throw new Error(`资料正文覆盖状态无效：${metadata.id}`);
  }
  if (
    metadata.ingestion.contentPath !== reference.contentPath ||
    metadata.ingestion.chunksPath !== reference.chunksPath
  ) {
    throw new Error(`资料路径与 manifest 不一致：${metadata.id}`);
  }
  if (metadata.caseId && !seenCaseIds.has(metadata.caseId)) {
    throw new Error(`资料引用了不存在的案例：${metadata.id} -> ${metadata.caseId}`);
  }

  for (const chunk of chunks) {
    if (chunk.documentId !== metadata.id) {
      throw new Error(`片段 documentId 与资料不一致：${chunk.id}`);
    }
    if (seenChunkIds.has(chunk.id)) {
      throw new Error(`片段 id 重复：${chunk.id}`);
    }
    seenChunkIds.add(chunk.id);
  }

  seenDocumentIds.add(metadata.id);
  chunkCount += chunks.length;
  documents.push({ ...metadata, chunks });
}

const actualCounts = {
  cases: cases.length,
  sources: documents.length,
  chunks: chunkCount,
};

for (const [key, value] of Object.entries(actualCounts)) {
  if (manifest.counts?.[key] !== value) {
    throw new Error(`manifest 计数不一致：${key} 应为 ${value}`);
  }
}

const compiled = {
  schemaVersion: manifest.schemaVersion,
  collection: manifest.collection,
  description: manifest.description,
  generatedFrom: "knowledge/manifest.json",
  cases,
  documents,
};
const outputPath = resolveKnowledgePath(manifest.generatedIndex);

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(compiled, null, 2)}\n`, "utf8");

process.stdout.write(
  `知识索引已生成：${actualCounts.sources} 份资料、${actualCounts.chunks} 个片段、${actualCounts.cases} 个案例。\n`,
);
