const BM25_K1 = 1.2;
const BM25_B = 0.75;

export function makeSearchTerms(value) {
  const text = value.toLowerCase().replace(/[^\u4e00-\u9fff0-9a-z]/g, "");

  if (text.length < 2) {
    return text ? [text] : [];
  }

  const terms = [];
  for (let index = 0; index < text.length - 1; index += 1) {
    terms.push(text.slice(index, index + 2));
  }

  return terms;
}

const GENERIC_BRAND_TERMS = new Set(makeSearchTerms("胖东来"));

/**
 * Bigrams that appear in many Chinese questions but are not topical evidence.
 * Without this, phrases like「怎么样」「是否闭店」false-match book text that happens
 * to contain「怎么学」「是否学不来」as the sole source of those bigrams.
 */
const NON_DISTINCTIVE_TERMS = new Set([
  ...GENERIC_BRAND_TERMS,
  ...makeSearchTerms(
    [
      "怎么",
      "怎样",
      "如何",
      "是否",
      "什么",
      "为何",
      "为什么",
      "可以",
      "不能",
      "不是",
      "就是",
      "还是",
      "或者",
      "以及",
      "如果",
      "因为",
      "所以",
      "这个",
      "那个",
      "这些",
      "那些",
      "我们",
      "你们",
      "他们",
      "对于",
      "关于",
      "进行",
      "通过",
      "一个",
      "没有",
      "有没有",
      "怎么样",
      "什么样",
      "够吗",
      "吗",
      "呢",
      "吧",
    ].join(""),
  ),
]);

function isDistinctiveQueryTerm(term) {
  return !NON_DISTINCTIVE_TERMS.has(term);
}

function scoreBm25(queryTerms, documentTerms, documentFrequencies, totalDocuments, averageDocumentLength) {
  const termCounts = new Map();
  for (const term of documentTerms) {
    termCounts.set(term, (termCounts.get(term) ?? 0) + 1);
  }

  let score = 0;
  for (const term of new Set(queryTerms)) {
    const termFrequency = termCounts.get(term) ?? 0;
    if (termFrequency === 0) continue;

    const documentsContainingTerm = documentFrequencies.get(term) ?? 0;
    const inverseDocumentFrequency = Math.log(
      1 + (totalDocuments - documentsContainingTerm + 0.5) / (documentsContainingTerm + 0.5),
    );
    const lengthNormalization = 1 - BM25_B + BM25_B * (documentTerms.length / averageDocumentLength);

    score +=
      (inverseDocumentFrequency * termFrequency * (BM25_K1 + 1)) /
      (termFrequency + BM25_K1 * lengthNormalization);
  }

  return score;
}

export function createKnowledgeRetriever(knowledgeBase) {
  function toRetrievedChunk(document, chunk, score, caseRecord) {
    const content = `${document.title}\n${chunk.title}\n${chunk.text}`;
    return {
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
      caseTitle: caseRecord?.title,
      claimType: document.claimType,
      finality: document.finality,
      score,
    };
  }

  function findCase(question) {
    const normalized = question.toLowerCase();
    return knowledgeBase.cases.find((caseRecord) =>
      caseRecord.aliases.some((alias) => normalized.includes(alias.toLowerCase())),
    );
  }

  function asksForFinality(question) {
    return /最终|结论|定性|查清|结案|调查结果|监管认定/.test(question);
  }

  function searchCase(caseRecord) {
    return knowledgeBase.documents
      .filter(
        (document) =>
          document.caseId === caseRecord.id && ["approved", "limited"].includes(document.status),
      )
      .flatMap((document) =>
        document.chunks.map((chunk) => toRetrievedChunk(document, chunk, 1, caseRecord)),
      );
  }

  /** Approved facts + limited non-case materials. Case-bound limited stays on case track only. */
  function isSearchableInGeneralTrack(document) {
    if (document.status === "approved") return true;
    if (document.status === "limited" && !document.caseId) return true;
    return false;
  }

  function searchGeneralKnowledge(question) {
    const queryTerms = makeSearchTerms(question);
    if (queryTerms.length === 0) return [];

    const indexedChunks = knowledgeBase.documents
      .filter(isSearchableInGeneralTrack)
      .flatMap((document) =>
        document.chunks.map((chunk) => {
          const content = `${document.title}\n${chunk.title}\n${chunk.text}`;
          const searchContent = `${content}\n${JSON.stringify(chunk.facts)}`;
          const evidenceContent = `${chunk.title}\n${chunk.text}\n${JSON.stringify(chunk.facts)}`;

          return {
            ...toRetrievedChunk(document, chunk, 0),
            terms: makeSearchTerms(searchContent),
            evidenceTerms: makeSearchTerms(evidenceContent),
          };
        }),
      );

    if (indexedChunks.length === 0) return [];

    const documentFrequencies = new Map();
    const sourceFrequencies = new Map();
    for (const item of indexedChunks) {
      for (const term of new Set(item.terms)) {
        documentFrequencies.set(term, (documentFrequencies.get(term) ?? 0) + 1);
      }
      for (const term of new Set(item.evidenceTerms)) {
        const sources = sourceFrequencies.get(term) ?? new Set();
        sources.add(item.sourceUrl);
        sourceFrequencies.set(term, sources);
      }
    }

    const averageDocumentLength =
      indexedChunks.reduce((sum, item) => sum + item.terms.length, 0) / indexedChunks.length;

    return indexedChunks
      .map(({ terms, evidenceTerms, ...item }) => {
        const matchingDistinctiveTerms = queryTerms.filter(
          (term) => isDistinctiveQueryTerm(term) && evidenceTerms.includes(term),
        );
        const hasUniqueDistinctiveTerm = matchingDistinctiveTerms.some(
          (term) => sourceFrequencies.get(term)?.size === 1,
        );
        const hasDistinctiveEvidence =
          matchingDistinctiveTerms.length > 0 &&
          (hasUniqueDistinctiveTerm || matchingDistinctiveTerms.length >= 2);

        return {
          ...item,
          score: scoreBm25(
            queryTerms,
            terms,
            documentFrequencies,
            indexedChunks.length,
            averageDocumentLength,
          ),
          hasDistinctiveEvidence,
        };
      })
      .filter((item) => item.score > 0 && item.hasDistinctiveEvidence)
      .sort((left, right) => right.score - left.score)
      .slice(0, 5);
  }

  function searchKnowledge(question) {
    const caseRecord = findCase(question);
    if (caseRecord) {
      return {
        track: "case",
        caseRecord,
        asksForFinality: asksForFinality(question),
        retrieved: searchCase(caseRecord),
      };
    }

    return {
      track: "general",
      asksForFinality: asksForFinality(question),
      retrieved: searchGeneralKnowledge(question),
    };
  }

  return { searchKnowledge };
}
