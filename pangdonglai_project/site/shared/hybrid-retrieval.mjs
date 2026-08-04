import {
  detectAnswerPurposes,
  isSearchableInGeneralTrack,
  isSoftAnswerPurpose,
  supportsAnswerPurposes,
} from "./retrieval.mjs";

const DEFAULT_RRF_K = 60;
const DEFAULT_CASE_ROUTE_MIN_SCORE = 0.66;
const DEFAULT_CASE_ROUTE_MIN_MARGIN = 0.025;

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

function hasConcreteCaseSignal(value) {
  const normalized = value.toLowerCase().replace(/\s+/g, "");
  return /事件|这件事|那件事|争议|反馈|样品|送检|检测|异物|掉色|过敏|传言|谣言|相关员工|开除|辞退|免职|降级|处理员工|客服处理|法院|判决|一审|终审|监管|当时|后来|最后/.test(
    normalized,
  );
}

function distinctiveCaseCharacters(value) {
  const normalized = value
    .toLowerCase()
    .replace(/胖东来|事件|争议|反馈|相关员工|这件事|那件事|企业|公司|文化|是否|怎么|如何|后来|最后/g, "")
    .replace(/[^\u4e00-\u9fff0-9a-z]/g, "");
  return new Set(normalized);
}

function caseLexicalAffinity(question, caseRecord) {
  if (!caseRecord) return 0;
  const questionCharacters = distinctiveCaseCharacters(question);
  if (questionCharacters.size === 0) return 0;
  return Math.max(
    0,
    ...[caseRecord.title, ...caseRecord.aliases].map((label) => {
      const labelCharacters = distinctiveCaseCharacters(label);
      if (labelCharacters.size === 0) return 0;
      const overlap = [...labelCharacters].filter((character) => questionCharacters.has(character)).length;
      return overlap / labelCharacters.size;
    }),
  );
}

function scoreSemanticCaseRoutes(question, queryVector, caseEntries, caseRecords) {
  return [...caseEntries.entries()]
    .map(([caseId, entries]) => {
      const similarities = entries
        .map((entry) => cosineSimilarity(queryVector, entry.embedding))
        .sort((left, right) => right - left);
      const top = similarities.slice(0, Math.min(3, similarities.length));
      const averageTop = top.reduce((sum, score) => sum + score, 0) / top.length;
      return {
        caseId,
        score: top[0] * 0.7 + averageTop * 0.3,
        bestChunkScore: top[0],
        lexicalAffinity: caseLexicalAffinity(question, caseRecords.get(caseId)),
      };
    })
    .sort((left, right) => right.score - left.score || left.caseId.localeCompare(right.caseId));
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
  keywordGuardWeight = 0,
  vectorTopK = 12,
  semanticCaseRouting = false,
  caseRouteMinScore = DEFAULT_CASE_ROUTE_MIN_SCORE,
  caseRouteMinMargin = DEFAULT_CASE_ROUTE_MIN_MARGIN,
  fallbackToKeyword = true,
}) {
  if (!keywordRetriever || typeof keywordRetriever.searchKnowledge !== "function") {
    throw new Error("混合检索需要现有关键词检索器作为控制组。");
  }
  if (typeof embedQuery !== "function") throw new Error("混合检索缺少查询向量函数。");
  if (!Number.isFinite(vectorWeight) || vectorWeight < 0 || vectorWeight > 2) {
    throw new Error("vectorWeight 必须是 0 到 2 之间的有限数值。");
  }
  if (!Number.isFinite(keywordGuardWeight) || keywordGuardWeight < 0 || keywordGuardWeight > 2) {
    throw new Error("keywordGuardWeight 必须是 0 到 2 之间的有限数值。");
  }
  if (!Number.isFinite(caseRouteMinScore) || caseRouteMinScore < -1 || caseRouteMinScore > 1) {
    throw new Error("caseRouteMinScore 必须是 -1 到 1 之间的有限数值。");
  }
  if (!Number.isFinite(caseRouteMinMargin) || caseRouteMinMargin < 0 || caseRouteMinMargin > 2) {
    throw new Error("caseRouteMinMargin 必须是 0 到 2 之间的有限数值。");
  }
  validateVectorIndex(vectorIndex);

  const corpusById = new Map(createVectorCorpus(knowledgeBase).map((item) => [item.chunkId, item]));
  const safeVectorEntries = vectorIndex.entries.filter(
    (entry) => corpusById.get(entry.chunkId)?.searchableInGeneralTrack,
  );
  const caseEntries = new Map();
  const caseRecords = new Map((knowledgeBase.cases ?? []).map((item) => [item.id, item]));
  for (const entry of vectorIndex.entries) {
    const caseId = corpusById.get(entry.chunkId)?.result.caseId;
    if (!caseId) continue;
    const entries = caseEntries.get(caseId) ?? [];
    entries.push(entry);
    caseEntries.set(caseId, entries);
  }

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

      let semanticCaseRoute = null;
      if (semanticCaseRouting && hasConcreteCaseSignal(question) && caseEntries.size > 0) {
        const caseScores = scoreSemanticCaseRoutes(question, queryVector, caseEntries, caseRecords);
        const bestCase = caseScores[0];
        const secondScore = caseScores[1]?.score ?? -1;
        const margin = bestCase.score - secondScore;
        const semanticThresholdPass = bestCase.score >= caseRouteMinScore;
        const fuzzyNameThresholdPass =
          bestCase.lexicalAffinity >= 0.6 && bestCase.score >= caseRouteMinScore - 0.08;
        const accepted =
          margin >= caseRouteMinMargin && (semanticThresholdPass || fuzzyNameThresholdPass);
        semanticCaseRoute = {
          caseId: bestCase.caseId,
          score: bestCase.score,
          margin,
          secondCaseId: caseScores[1]?.caseId ?? null,
          secondScore,
          lexicalAffinity: bestCase.lexicalAffinity,
          accepted,
        };
        if (accepted) {
          const casePlan = keywordRetriever.searchKnowledge(question, context, {
            forcedCaseId: bestCase.caseId,
          });
          return {
            ...casePlan,
            retrievalMode: "semantic-case-route",
            vectorApplied: true,
            vectorModel: vectorIndex.model,
            semanticCaseRoute,
          };
        }
      }

      const purposes = keywordPlan.detectedAnswerPurposes?.length
        ? keywordPlan.detectedAnswerPurposes
        : detectAnswerPurposes(keywordPlan.queryText);
      const hardPurposes = purposes.filter((purpose) => !isSoftAnswerPurpose(purpose));
      const softPurposes = purposes.filter(isSoftAnswerPurpose);
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
      const fused = reciprocalRankFusion([keywordRanking, vectorRanking, keywordPlan.retrieved], {
        weights: [1, vectorWeight, keywordGuardWeight],
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
      const retrieved = fusedResults.slice(0, 5);
      const answerCandidates = fusedResults.slice(0, 12);

      return {
        ...keywordPlan,
        retrievalMode: keywordGuardWeight > 0 ? "hybrid-rrf-safety-guarded" : "hybrid-rrf",
        vectorApplied: true,
        vectorModel: vectorIndex.model,
        vectorWeight,
        keywordGuardWeight,
        semanticCaseRoute,
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
