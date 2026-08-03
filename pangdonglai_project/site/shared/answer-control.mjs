export const CLAIM_ANNOTATION_VERSION = "claim-v1";
export const ANSWER_PLAN_SCHEMA_VERSION = "answer-plan-v1";
export const ANSWER_VALIDATION_SCHEMA_VERSION = "answer-validation-v1";

const SOURCE_ROLES = new Set([
  "official_record",
  "public_record",
  "reported_account",
  "attributed_statement",
  "third_party_analysis",
  "commercial_observation",
]);

function uniqueStrings(values) {
  return [...new Set(values.filter((value) => typeof value === "string" && value.trim()).map((value) => value.trim()))];
}

export function deriveSourceRole(metadata) {
  if (metadata.answerMode === "attributed_claim") return "attributed_statement";
  if (metadata.source?.sourceType === "official") return "official_record";
  if (metadata.source?.sourceType === "government") return "public_record";
  if (["academic", "book"].includes(metadata.source?.sourceType)) return "third_party_analysis";
  if (metadata.source?.sourceType === "commercial_monitor") return "commercial_observation";
  return "reported_account";
}

function buildGenericBoundaries(metadata, chunk) {
  const boundaries = [...(metadata.answeringRules ?? [])];
  if (chunk.culture?.tension) boundaries.push(chunk.culture.tension);
  if (metadata.answerMode === "attributed_claim") {
    boundaries.push("只能作为被采访者、作者或报道对象的归因性表述，不能改写成独立核验事实。");
  }
  if (metadata.finality && !["not_applicable", "civil_judgment_public"].includes(metadata.finality)) {
    boundaries.push("不能据此使用“最终结论”“已查清”或“已定性”等终局表述。");
  }
  if (chunk.culture?.effectiveAt || metadata.source?.verifiedAt) {
    boundaries.push("只能说明资料所对应时间的情况，不能自动外推为当前最新状态。");
  }
  return uniqueStrings(boundaries);
}

export function createClaimV1(metadata, chunk, cases = []) {
  const searchableText = `${chunk.title}\n${chunk.text}`.toLowerCase();
  const mentionedCaseIds = cases
    .filter((caseRecord) =>
      caseRecord.id === metadata.caseId ||
      caseRecord.aliases
        .filter((alias) => alias.replace(/\s+/g, "").length >= 4)
        .some((alias) => searchableText.includes(alias.toLowerCase())),
    )
    .map((caseRecord) => caseRecord.id);
  const effectiveAt = chunk.culture?.effectiveAt ?? chunk.facts?.verifiedAt ??
    metadata.source?.publishedAt ?? metadata.source?.verifiedAt ?? null;

  return {
    annotationVersion: CLAIM_ANNOTATION_VERSION,
    id: `${chunk.id}--claim-1`,
    statement: chunk.text,
    sourceRole: deriveSourceRole(metadata),
    effectiveAt,
    caseId: metadata.caseId ?? null,
    mentionedCaseIds: uniqueStrings(mentionedCaseIds),
    claimType: metadata.claimType,
    canSupport: uniqueStrings([
      chunk.title,
      ...(metadata.scope ?? []),
      chunk.culture?.practice,
      chunk.culture?.mechanism,
      chunk.culture?.valueMeaning,
    ]),
    cannotSupport: buildGenericBoundaries(metadata, chunk),
    topics: uniqueStrings([
      ...(chunk.facts?.topics ?? []),
      ...(chunk.culture?.cultureTheme ?? []),
      ...(chunk.culture?.stakeholders ?? []),
    ]),
  };
}

export function validateClaimV1(claim, { chunkId, document, caseIds }) {
  if (!claim || claim.annotationVersion !== CLAIM_ANNOTATION_VERSION) {
    throw new Error(`片段缺少 claim-v1 标注：${chunkId}`);
  }
  if (claim.id !== `${chunkId}--claim-1` || typeof claim.statement !== "string" || !claim.statement.trim()) {
    throw new Error(`片段 Claim 身份或陈述无效：${chunkId}`);
  }
  if (!SOURCE_ROLES.has(claim.sourceRole)) throw new Error(`片段 Claim 来源角色无效：${chunkId}`);
  if (claim.effectiveAt !== null && typeof claim.effectiveAt !== "string") {
    throw new Error(`片段 Claim 时间无效：${chunkId}`);
  }
  if (claim.caseId !== (document.caseId ?? null) || claim.claimType !== document.claimType) {
    throw new Error(`片段 Claim 与资料元数据不一致：${chunkId}`);
  }
  for (const field of ["mentionedCaseIds", "canSupport", "cannotSupport", "topics"]) {
    if (!Array.isArray(claim[field]) || claim[field].some((value) => typeof value !== "string" || !value.trim())) {
      throw new Error(`片段 Claim 字段 ${field} 无效：${chunkId}`);
    }
  }
  if (claim.mentionedCaseIds.some((caseId) => !caseIds.has(caseId))) {
    throw new Error(`片段 Claim 引用了不存在的案例：${chunkId}`);
  }
}

function detectTimeTarget(question) {
  const normalized = question.replace(/\s+/g, "");
  if (/现在|当前|目前|最新|今天|今年|截至|至今/.test(normalized)) return "current";
  if (/当时|那时|过去|此前|历史|\b(?:19|20)\d{2}年/.test(normalized)) return "historical";
  return "unspecified";
}

function asksForExamples(question) {
  return /举例|例子|案例|事件|比如|哪些争议|哪件事/.test(question.replace(/\s+/g, ""));
}

function asksForBinaryVerdict(question) {
  return /真假|是不是|到底是.{0,12}还是|能不能证明|有没有能力|谁对谁错|是否说明|是否证明/.test(
    question.replace(/\s+/g, ""),
  );
}

function describeFinalityBoundary(finality) {
  const descriptions = {
    preliminary: "企业公开初步回应，尚未见到后续调查终局",
    no_regulatory_final: "企业公开回应，尚未见到监管部门最终公开结论",
    company_internal_reconsideration: "企业内部复议结果，尚未见到劳动仲裁或法院结论",
    proposal_not_policy: "讨论或倡议阶段，不能表述为已经生效的正式制度",
    company_clarification_only: "企业公开澄清，不能外推到每名员工的实际情况",
    civil_judgment_public: "公开民事判决阶段，不能外推为监管、食安或医学因果终局",
  };
  return descriptions[finality] ?? "现有资料所对应的证据阶段";
}

export function createAnswerPlan(searchPlan, cases, currentDate = new Date().toISOString().slice(0, 10)) {
  const question = searchPlan.originalQueryText ?? searchPlan.queryText ?? "";
  const directCaseIds = cases
    .filter((caseRecord) => caseRecord.aliases.some((alias) => question.toLowerCase().includes(alias.toLowerCase())))
    .map((caseRecord) => caseRecord.id);
  const allowCaseExamples = asksForExamples(question);
  const retrievedClaims = searchPlan.retrieved.flatMap((item) =>
    (item.claims ?? []).map((claim) => ({
      ...claim,
      chunkId: item.chunkId,
      chunkTitle: item.chunkTitle,
      sourceTitle: item.sourceTitle,
      sourceUrl: item.sourceUrl,
      verifiedAt: item.verifiedAt,
      evidenceLabel: item.evidenceLabel,
    })),
  );
  const allowedClaims = searchPlan.insufficientReason
    ? []
    : retrievedClaims.filter((claim) => {
        if (searchPlan.track === "case") return claim.caseId === searchPlan.caseRecord?.id;
        if (!claim.mentionedCaseIds?.length) return true;
        return allowCaseExamples || claim.mentionedCaseIds.some((caseId) => directCaseIds.includes(caseId));
      });
  const allowedClaimIds = allowedClaims.map((claim) => claim.id);
  const allowedChunkIds = new Set(allowedClaims.map((claim) => claim.chunkId));
  const answerability = allowedClaims.length === 0 ? "insufficient" :
    allowedClaims.length < retrievedClaims.length ? "partial" : "supported";
  const requiredDistinctions = uniqueStrings(allowedClaims.flatMap((claim) => claim.cannotSupport)).slice(0, 8);
  const binaryVerdict = asksForBinaryVerdict(question);
  const maxConclusion = answerability === "insufficient"
    ? "只能自然说明目前没有足够信息，不能补写数字、名单、事件或结论。"
    : binaryVerdict
      ? "除非允许使用的事实直接给出判断，否则只能说明现有资料支持到哪一步，不能替用户二选一或下绝对结论。"
      : searchPlan.track === "case" && searchPlan.caseRecord
        ? `结论不得超出：${describeFinalityBoundary(searchPlan.caseRecord.finality)}。`
        : "结论不得超出允许使用的事实及其时间范围。";

  return {
    schemaVersion: ANSWER_PLAN_SCHEMA_VERSION,
    currentDate,
    question,
    track: searchPlan.track,
    answerability,
    timeTarget: detectTimeTarget(question),
    requestedCaseId: searchPlan.caseRecord?.id ?? null,
    allowedClaimIds,
    allowedChunkIds: [...allowedChunkIds],
    forbiddenCaseIds: cases
      .map((caseRecord) => caseRecord.id)
      .filter((caseId) => !allowedClaims.some((claim) => claim.caseId === caseId)),
    requiredDistinctions,
    missingInformation: answerability === "insufficient"
      ? (searchPlan.insufficientReason ?? "检索结果中没有能直接支持当前问题的事实。")
      : null,
    maxConclusion,
    binaryVerdict,
    allowedClaims,
  };
}

function collectNumberTokens(value) {
  return value.match(/\d+(?:\.\d+)?%?/g) ?? [];
}

export function validateAnswer(answer, answerPlan, cases) {
  const violations = [];
  const normalized = typeof answer === "string" ? answer.trim() : "";
  if (!normalized) violations.push({ code: "empty_answer", message: "回答为空。" });

  if (answerPlan.answerability === "insufficient") {
    if (!/目前.{0,12}(?:没有|缺少|不足).{0,12}(?:信息|资料)|目前没有足够信息回答这个问题/.test(normalized)) {
      violations.push({ code: "missing_insufficiency", message: "资料不足时必须直接说明目前没有足够信息。" });
    }
    if (normalized.length > 180) {
      violations.push({ code: "insufficient_overreach", message: "资料不足回答仍包含过多延伸内容。" });
    }
  }

  const groundedText = [answerPlan.question, answerPlan.currentDate, ...answerPlan.allowedClaims.map((claim) => claim.statement)].join("\n");
  const groundedNumbers = new Set(collectNumberTokens(groundedText));
  for (const token of collectNumberTokens(normalized)) {
    if (!groundedNumbers.has(token)) {
      violations.push({ code: "unsupported_number", message: `回答使用了允许事实中没有的数字：${token}` });
    }
  }

  const allowedCaseIds = new Set(answerPlan.allowedClaims.flatMap((claim) => [claim.caseId, ...(claim.mentionedCaseIds ?? [])]).filter(Boolean));
  for (const caseRecord of cases) {
    if (allowedCaseIds.has(caseRecord.id)) continue;
    const unexpectedAlias = caseRecord.aliases
      .filter((alias) => alias.replace(/\s+/g, "").length >= 4 && !answerPlan.question.includes(alias))
      .find((alias) => normalized.includes(alias));
    if (unexpectedAlias) {
      violations.push({ code: "unexpected_case", message: `回答引入了本题未允许的案例：${caseRecord.title}` });
    }
  }

  if (answerPlan.timeTarget === "current") {
    const currentYear = answerPlan.currentDate.slice(0, 4);
    if (new RegExp(`${currentYear}[^。！？]{0,18}(?:尚未到来|还没到|属于未来|未来数据)`).test(normalized)) {
      violations.push({ code: "wrong_current_date", message: `回答把当前年份 ${currentYear} 误当成未来。` });
    }
  }
  if (answerPlan.binaryVerdict && /(?:肯定|一定|必然|毫无疑问|已经证明|足以证明|就是假的|不是假的|绝对)/.test(normalized)) {
    violations.push({ code: "unsupported_verdict", message: "回答作出了证据边界之外的绝对判断。" });
  }
  if (answerPlan.track === "case" && answerPlan.requestedCaseId &&
      /(?:最终结论是|已经查清|已经定性|监管已经认定)/.test(normalized) &&
      !answerPlan.allowedClaims.some((claim) => claim.sourceRole === "public_record")) {
    violations.push({ code: "unsupported_finality", message: "回答使用了当前案例证据不能支持的终局表述。" });
  }

  return {
    schemaVersion: ANSWER_VALIDATION_SCHEMA_VERSION,
    passed: violations.length === 0,
    violations,
    action: violations.length === 0 ? "accept" : "regenerate",
  };
}

export function buildRepairInstruction(validation) {
  const reasons = validation.violations.map((item) => `- ${item.message}`).join("\n");
  return `上一次草稿未通过回答边界检查。请重新回答，并修正以下问题：\n${reasons}\n只输出面向用户的最终回答，不解释检查过程。`;
}

export function makeSafeFallback(answerPlan) {
  if (answerPlan.answerability === "insufficient") return "目前没有足够信息回答这个问题。";
  return "目前能确认的资料还不足以支持一个稳妥的完整结论，我先不作进一步推断。";
}
