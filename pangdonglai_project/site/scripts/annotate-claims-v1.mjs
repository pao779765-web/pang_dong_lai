import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClaimV1, validateClaimV1 } from "../shared/answer-control.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "../..");
const knowledgeDirectory = path.join(projectDirectory, "knowledge");

function resolveKnowledgePath(relativePath) {
  if (typeof relativePath !== "string" || path.isAbsolute(relativePath) || relativePath.split(/[\\/]/).includes("..")) {
    throw new Error(`知识库路径不安全：${String(relativePath)}`);
  }
  return path.join(knowledgeDirectory, ...relativePath.split("/"));
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(resolveKnowledgePath(relativePath), "utf8"));
}

async function readJsonLines(relativePath) {
  return (await readFile(resolveKnowledgePath(relativePath), "utf8"))
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

const manifest = await readJson("manifest.json");
if (manifest.schemaVersion !== "3.0" || manifest.sourceOfTruth !== "directory") {
  throw new Error("knowledge/manifest.json 不是受支持的目录化知识库。");
}

const cases = await Promise.all(manifest.cases.map((reference) => readJson(reference.path)));
const caseIds = new Set(cases.map((caseRecord) => caseRecord.id));
const seenClaimIds = new Set();
let claimCount = 0;

for (const reference of manifest.sources) {
  const metadata = await readJson(reference.metadataPath);
  const chunks = await readJsonLines(reference.chunksPath);
  const annotated = chunks.map((chunk) => {
    const claim = createClaimV1(metadata, chunk, cases);
    validateClaimV1(claim, { chunkId: chunk.id, document: metadata, caseIds });
    if (seenClaimIds.has(claim.id)) throw new Error(`Claim id 重复：${claim.id}`);
    seenClaimIds.add(claim.id);
    claimCount += 1;
    return { ...chunk, claims: [claim] };
  });
  await writeFile(
    resolveKnowledgePath(reference.chunksPath),
    `${annotated.map((chunk) => JSON.stringify(chunk)).join("\n")}\n`,
    "utf8",
  );
}

if (claimCount !== manifest.counts.chunks) {
  throw new Error(`首版要求每个片段恰好生成一个 Claim：片段 ${manifest.counts.chunks}，Claim ${claimCount}`);
}

process.stdout.write(`claim-v1 标注完成：${manifest.counts.sources} 份资料、${claimCount} 个 Claim。\n`);
