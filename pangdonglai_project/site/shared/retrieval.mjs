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

  function isContextDependent(question) {
    const normalized = question.replace(/\s+/g, "");
    return /^(那|那么|后来|然后|所以|它|这个|这件事|该事件|还|又)/.test(normalized) ||
      /那是不是|那要是|又该怎么|后来到底|后续怎么样|接下来呢/.test(normalized);
  }

  function asksForFinality(question) {
    const normalized = question.replace(/\s+/g, "");
    return /最终|结论|定性|查清|结案|调查结果|监管认定|怎么判|如何判|判的|正式制度|正式生效|已经生效|已经证明|谁对谁错|监管部门.{0,6}(?:证明|认定)/.test(
      normalized,
    ) || /还(?:是|会|有没有).*?(?:开除|辞退|处理|处罚)/.test(normalized);
  }

  function detectKnownEvidenceGap(question) {
    const normalized = question.replace(/\s+/g, "");

    if (
      /(工资|薪酬|奖金)/.test(normalized) &&
      /(每个岗位|各个岗位|全部岗位|最新|明细|表)/.test(normalized)
    ) {
      return "当前资料库没有完整、最新的岗位薪酬与奖金表。";
    }
    if (
      /(权限|赔付)/.test(normalized) &&
      /(每个岗位|分别|多少|金额|明细|权限表)/.test(normalized)
    ) {
      return "当前资料库没有各岗位的完整赔付权限与金额表。";
    }
    if (
      /自有品牌/.test(normalized) &&
      /(内部|流程|到底怎么|如何).*(调查|查|审核)/.test(normalized)
    ) {
      return "当前资料库没有适用于全部自有商品的完整内部调查流程。";
    }
    if (
      /供应商/.test(normalized) &&
      /(审核分数|评分|淘汰名单|全部名单|所有.*名单)/.test(normalized)
    ) {
      return "当前资料库没有完整的供应商审核分数或淘汰名单。";
    }
    if (
      /净利润率|利润率/.test(normalized) ||
      /(?:未来|今后).{0,6}(?:三年|3年).{0,10}(?:开店|多少家|计划)/.test(normalized)
    ) {
      return "当前资料库没有最新净利润率或未来三年开店计划。";
    }
    if (
      /(?:所有|全部|历史上).{0,8}(?:投诉|客诉).{0,12}(?:谁对谁错|结果|结论)/.test(
        normalized,
      )
    ) {
      return "当前资料库不覆盖历史上的全部投诉，不能逐一判断谁对谁错。";
    }

    return null;
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

  function searchKnowledge(question, context = []) {
    const contextQuestions = context
      .filter((item) => typeof item === "string" && item.trim())
      .map((item) => item.trim())
      .slice(-2);
    const contextDependent = isContextDependent(question);
    const directCaseRecord = findCase(question);
    const contextualCaseRecord = contextDependent
      ? [...contextQuestions].reverse().map(findCase).find(Boolean)
      : undefined;
    const caseRecord = directCaseRecord ?? contextualCaseRecord;
    if (caseRecord) {
      return {
        track: "case",
        caseRecord,
        asksForFinality: asksForFinality(question),
        contextApplied: !directCaseRecord && Boolean(contextualCaseRecord),
        queryText: question,
        retrieved: searchCase(caseRecord),
      };
    }

    const insufficientReason = detectKnownEvidenceGap(question);
    if (insufficientReason) {
      return {
        track: "general",
        asksForFinality: asksForFinality(question),
        contextApplied: false,
        queryText: question,
        insufficientReason,
        retrieved: [],
      };
    }

    const queryText = contextDependent && contextQuestions.length
      ? `${contextQuestions.join("\n")}\n${question}`
      : question;

    return {
      track: "general",
      asksForFinality: asksForFinality(question),
      contextApplied: queryText !== question,
      queryText,
      retrieved: searchGeneralKnowledge(queryText),
    };
  }

  return { searchKnowledge };
}
