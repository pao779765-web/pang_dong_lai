import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateClaimV1 } from "../shared/answer-control.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "../..");
const knowledgeDirectory = path.join(projectDirectory, "knowledge");
const manifestPath = path.join(knowledgeDirectory, "manifest.json");
const cultureThemes = new Set(["C1", "C2", "C3", "C4", "C5", "C6"]);
const cultureRelevance = new Set(["direct", "supporting", "context_only", "boundary"]);
const cultureStakeholders = new Set([
  "员工",
  "顾客",
  "供应商",
  "管理者",
  "公众",
  "监管与司法",
  "同行企业",
]);

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

function validateCultureAnnotation(chunk) {
  const annotation = chunk.culture;
  if (!annotation || annotation.annotationVersion !== "culture-v1") {
    throw new Error(`片段缺少 culture-v1 标注：${chunk.id}`);
  }
  if (!cultureRelevance.has(annotation.relevance)) {
    throw new Error(`片段文化关联级别无效：${chunk.id}`);
  }
  if (
    !Array.isArray(annotation.cultureTheme) ||
    annotation.cultureTheme.some((theme) => !cultureThemes.has(theme)) ||
    new Set(annotation.cultureTheme).size !== annotation.cultureTheme.length
  ) {
    throw new Error(`片段文化主线标注无效：${chunk.id}`);
  }
  if (
    !Array.isArray(annotation.stakeholders) ||
    annotation.stakeholders.some((stakeholder) => !cultureStakeholders.has(stakeholder)) ||
    new Set(annotation.stakeholders).size !== annotation.stakeholders.length
  ) {
    throw new Error(`片段利益相关者标注无效：${chunk.id}`);
  }
  for (const field of ["practice", "mechanism", "valueMeaning", "tension", "effectiveAt"]) {
    if (!(field in annotation) || (annotation[field] !== null && typeof annotation[field] !== "string")) {
      throw new Error(`片段文化字段 ${field} 无效：${chunk.id}`);
    }
  }
  if (annotation.relevance === "boundary" && !annotation.tension) {
    throw new Error(`边界材料必须说明现实张力：${chunk.id}`);
  }
  if (annotation.valueMeaning && !/^可用于(?:理解|检验)/.test(annotation.valueMeaning)) {
    throw new Error(`文化含义必须保持解释性措辞：${chunk.id}`);
  }
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
const seenClaimIds = new Set();
const documents = [];
let chunkCount = 0;
let claimCount = 0;

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
    validateCultureAnnotation(chunk);
    if (!Array.isArray(chunk.claims) || chunk.claims.length !== 1) {
      throw new Error(`claim-v1 首版要求每个片段恰好包含一个 Claim：${chunk.id}`);
    }
    for (const claim of chunk.claims) {
      validateClaimV1(claim, { chunkId: chunk.id, document: metadata, caseIds: seenCaseIds });
      if (seenClaimIds.has(claim.id)) throw new Error(`Claim id 重复：${claim.id}`);
      seenClaimIds.add(claim.id);
      claimCount += 1;
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
  claims: claimCount,
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
  `知识索引已生成：${actualCounts.sources} 份资料、${actualCounts.chunks} 个片段、${actualCounts.claims} 个 Claim、${actualCounts.cases} 个案例。\n`,
);
