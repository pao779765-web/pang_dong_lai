import {
  detectAnswerPurposes,
  isSearchableInGeneralTrack,
  supportsAnswerPurposes,
} from "./retrieval.mjs";

const DEFAULT_RRF_K = 60;

function cultureText(culture) {
  if (!culture || culture.annotationVersion !== "culture-v1") return "";
  return [
    ...(culture.cultureTheme ?? []),
    culture.practice,
    culture.mechanism,
    culture.valueMeaning,
    ...(culture.stakeholders ?? []),
    culture.tension,
  ]
    .filter(Boolean)
    .join("\n");
}

export function createVectorCorpus(knowledgeBase) {
  return knowledgeBase.documents
    .flatMap((document) =>
      document.chunks.map((chunk) => {
        const content = `${document.title}\n${chunk.title}\n${chunk.text}`;
        const annotations = document.caseId ? "" : cultureText(chunk.culture);
        const embeddingText = [content, JSON.stringify(chunk.facts ?? {}), annotations]
          .filter(Boolean)
          .join("\n");

        return {
          chunkId: chunk.id,
          embeddingText,
          searchableInGeneralTrack: isSearchableInGeneralTrack(document),
          result: {
            chunkId: chunk.id,
            chunkTitle: chunk.title,
            content,
            sourceTitle: document.title,
            sourceUrl: document.source.url,
            verifiedAt: document.source.verifiedAt,
            evidenceLevel: document.evidenceLevel,
            evidenceLabel: document.evidenceLabel,
            answerMode: document.answerMode,
            answeringRules: document.answeringRules,
            caseId: document.caseId,
            claimType: document.claimType,
            finality: document.finality,
            claims: chunk.claims ?? [],
            cultureRelevance: chunk.culture?.relevance ?? null,
            evidenceText: `${content}\n${JSON.stringify(chunk.facts ?? {})}\n${annotations}`,
            score: 0,
            baseScore: 0,
          },
        };
      }),
    );
}

export function cosineSimilarity(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length === 0 || left.length !== right.length) {
    throw new Error("余弦相似度要求两个非空且维度一致的向量。");
  }

  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    if (!Number.isFinite(left[index]) || !Number.isFinite(right[index])) {
      throw new Error("向量包含非有限数值。");
    }
    dot += left[index] * right[index];
    leftNorm += left[index] ** 2;
    rightNorm += right[index] ** 2;
  }
  if (leftNorm === 0 || rightNorm === 0) return 0;
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

export function reciprocalRankFusion(rankings, options = {}) {
  const rrfK = options.rrfK ?? DEFAULT_RRF_K;
  const weights = options.weights ?? rankings.map(() => 1);
  if (!Number.isFinite(rrfK) || rrfK < 1) throw new Error("rrfK 必须是不小于 1 的有限数值。");
  if (weights.length !== rankings.length || weights.some((weight) => !Number.isFinite(weight) || weight < 0)) {
    throw new Error("融合权重必须与排名列表一一对应且不能为负数。");
  }

  const scores = new Map();
  rankings.forEach((ranking, rankingIndex) => {
    ranking.forEach((item, itemIndex) => {
      const id = typeof item === "string" ? item : item.chunkId;
      if (!id) return;
      scores.set(id, (scores.get(id) ?? 0) + weights[rankingIndex] / (rrfK + itemIndex + 1));
    });
  });

  return [...scores.entries()]
    .map(([chunkId, score]) => ({ chunkId, score }))
    .sort((left, right) => right.score - left.score || left.chunkId.localeCompare(right.chunkId));
}

function validateVectorIndex(vectorIndex) {
  if (vectorIndex?.schemaVersion !== "r5-vector-index-v1" || !Array.isArray(vectorIndex.entries)) {
    throw new Error("向量索引格式无效。");
  }
  const dimensions = vectorIndex.dimensions;
  const ids = new Set();
  for (const entry of vectorIndex.entries) {
    if (!entry.chunkId || ids.has(entry.chunkId)) throw new Error("向量索引包含空或重复的 chunkId。");
    ids.add(entry.chunkId);
    if (!Array.isArray(entry.embedding) || entry.embedding.length !== dimensions) {
      throw new Error(`片段 ${entry.chunkId} 的向量维度无效。`);
    }
    if (!entry.embedding.every(Number.isFinite)) throw new Error(`片段 ${entry.chunkId} 的向量含非法数值。`);
  }
}

export function createHybridKnowledgeRetriever({
  knowledgeBase,
  keywordRetriever,
  vectorIndex,
  embedQuery,
  vectorWeight = 0.65,
  vectorTopK = 12,
  fallbackToKeyword = true,
}) {
  if (!keywordRetriever || typeof keywordRetriever.searchKnowledge !== "function") {
    throw new Error("混合检索需要现有关键词检索器作为控制组。");
  }
  if (typeof embedQuery !== "function") throw new Error("混合检索缺少查询向量函数。");
  if (!Number.isFinite(vectorWeight) || vectorWeight < 0 || vectorWeight > 2) {
    throw new Error("vectorWeight 必须是 0 到 2 之间的有限数值。");
  }
  validateVectorIndex(vectorIndex);

  const corpusById = new Map(createVectorCorpus(knowledgeBase).map((item) => [item.chunkId, item]));
  const safeVectorEntries = vectorIndex.entries.filter(
    (entry) => corpusById.get(entry.chunkId)?.searchableInGeneralTrack,
  );

  async function searchKnowledge(question, context = []) {
    const keywordPlan = keywordRetriever.searchKnowledge(question, context);
    if (keywordPlan.track !== "general" || keywordPlan.insufficientReason || !keywordPlan.queryText.trim()) {
      return { ...keywordPlan, retrievalMode: "keyword-safety-route", vectorApplied: false };
    }

    try {
      const queryVector = await embedQuery(keywordPlan.queryText);
      if (!Array.isArray(queryVector) || queryVector.length !== vectorIndex.dimensions) {
        throw new Error("查询向量维度与文档索引不一致。");
      }

      const purposes = keywordPlan.detectedAnswerPurposes?.length
        ? keywordPlan.detectedAnswerPurposes
        : detectAnswerPurposes(keywordPlan.queryText);
      const hardPurposes = purposes.filter((purpose) => purpose !== "employee-culture-beyond-compensation");
      const softPurposes = purposes.filter((purpose) => purpose === "employee-culture-beyond-compensation");
      const filteredOut = [];
      const vectorRanking = safeVectorEntries
        .map((entry) => {
          const corpusItem = corpusById.get(entry.chunkId);
          return {
            chunkId: entry.chunkId,
            vectorScore: cosineSimilarity(queryVector, entry.embedding),
            supportsSoftPurpose: softPurposes.length > 0 && supportsAnswerPurposes(corpusItem.result, softPurposes),
          };
        })
        .filter((entry) => {
          const corpusResult = corpusById.get(entry.chunkId).result;
          const allowed =
            corpusResult.cultureRelevance !== "context_only" &&
            (hardPurposes.length === 0 || supportsAnswerPurposes(corpusResult, hardPurposes));
          if (!allowed) filteredOut.push(entry.chunkId);
          return allowed;
        })
        .sort((left, right) =>
          Number(right.supportsSoftPurpose) - Number(left.supportsSoftPurpose) ||
          right.vectorScore - left.vectorScore ||
          left.chunkId.localeCompare(right.chunkId),
        )
        .slice(0, vectorTopK);

      const keywordRanking = keywordPlan.answerCandidates ?? keywordPlan.retrieved;
      const fused = reciprocalRankFusion([keywordRanking, vectorRanking], {
        weights: [1, vectorWeight],
      });
      const keywordById = new Map(keywordRanking.map((item, index) => [item.chunkId, { item, rank: index + 1 }]));
      const vectorById = new Map(vectorRanking.map((item, index) => [item.chunkId, { ...item, rank: index + 1 }]));
      const fusedResults = fused.map(({ chunkId, score }) => {
        const keyword = keywordById.get(chunkId);
        const vector = vectorById.get(chunkId);
        const base = keyword?.item ?? corpusById.get(chunkId).result;
        const result = {
          ...base,
          score,
          baseScore: keyword?.item.baseScore ?? keyword?.item.score ?? 0,
          vectorScore: vector?.vectorScore ?? null,
          bm25Rank: keyword?.rank ?? null,
          vectorRank: vector?.rank ?? null,
        };
        delete result.evidenceText;
        delete result.cultureRelevance;
        return result;
      });
      const fusedById = new Map(fusedResults.map((item) => [item.chunkId, item]));
      const keywordRetrievedIds = new Set(keywordPlan.retrieved.map((item) => item.chunkId));
      const keywordCandidateIds = new Set(keywordRanking.map((item) => item.chunkId));
      const retrieved = [
        ...keywordPlan.retrieved.map((item) => fusedById.get(item.chunkId) ?? item),
        ...fusedResults.filter((item) => !keywordRetrievedIds.has(item.chunkId)),
      ].slice(0, 5);
      const answerCandidates = [
        ...keywordRanking.map((item) => fusedById.get(item.chunkId) ?? item),
        ...fusedResults.filter((item) => !keywordCandidateIds.has(item.chunkId)),
      ].slice(0, 12);

      return {
        ...keywordPlan,
        retrievalMode: "hybrid-rrf-keyword-anchored",
        vectorApplied: true,
        vectorModel: vectorIndex.model,
        vectorWeight,
        purposeFilteredOutChunkIds: [
          ...new Set([...(keywordPlan.purposeFilteredOutChunkIds ?? []), ...filteredOut]),
        ],
        retrieved,
        answerCandidates,
      };
    } catch (error) {
      if (!fallbackToKeyword) throw error;
      return {
        ...keywordPlan,
        retrievalMode: "keyword-fallback",
        vectorApplied: false,
        vectorError: error instanceof Error ? error.message : "未知向量错误",
      };
    }
  }

  return { searchKnowledge };
}
