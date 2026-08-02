import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const EXPECTED_CHUNK_COUNT = 135;
const ANNOTATION_VERSION = "culture-v1";
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "../..");
const knowledgeDirectory = path.join(projectDirectory, "knowledge");
const chunksDirectory = path.join(knowledgeDirectory, "chunks");
const force = process.argv.includes("--force");

const themeRules = {
  C1: [
    /员工|劳动者|薪酬|工资|福利|休假|休息|工作生活|家庭|婚恋|彩礼|就业|人格|不开心假|员工之家|工时|夜班|招聘|处分|纪律|委屈奖|年假|闭店|生活准则|自由与爱|自由·爱|健全人格|幸福/,
  ],
  C2: [
    /授权|信任|责任|培训|知识库|手册|操作标准|制度|治理|轮值|决策委员会|投票|竞聘|考评|流程|执行|组织|民主|飞轮|管理|协作工具|平台|企业文化|文化理念|文化传承|价值观|信仰|使命|愿景/,
  ],
  C3: [
    /顾客|消费者|服务|退换货|投诉|客服|售后|便民|体验|影城|退票|门店|口碑|购物|母婴室|代驾|宠物寄存/,
  ],
  C4: [
    /商品|品质|质量|供应商|供应链|食品|检测|送检|鸡蛋|茶叶|红内裤|厂家|生产|资质|批次|品控|价格|选品|自有品牌|中央厨房|质价比/,
  ],
  C5: [
    /利润|规模|扩张|经营|关店|营业额|盈利|战略收缩|发展阶段|竞争|增长|成本|价值分配|区域零售|业态|用工规模/,
  ],
  C6: [
    /争议|舆情|裁判|法院|起诉|名誉权|舆论|自媒体|维权|调查报告|最终结论|终局|初步回应|纠错|质疑|道歉|致歉|企业回应|企业说明|公开回应|情绪|不同观点/,
  ],
};

const caseThemeBoosts = {
  "red-underwear-color-libel-2025": ["C6", "C4", "C3"],
  "tea-fly-feedback-2026-01": ["C6", "C4", "C3"],
  "egg-canthaxanthin-feedback-2026-04": ["C6", "C4", "C3"],
  "employee-noodle-tasting-discipline-2024-02": ["C6", "C1", "C2"],
  "employee-bride-price-boundary-2024-11": ["C6", "C1", "C2"],
  "employee-salary-policy-rumor-2026-06": ["C6", "C1", "C2"],
};

const sourceFallbackThemes = {
  "official-store-directory-2026-07-24": ["C3"],
  "official-company-profile-2026-07-27": ["C5"],
  "official-pdl-baike-system-portal": ["C2"],
  "media-pdl-shen-hongli-culture-happiness-handbook-2026": ["C1", "C2"],
  "media-pdl-culture-system-2022-republish": ["C1", "C2"],
  "cnfin-feishu-night-shift-care-2024-12": ["C2", "C1"],
  "jiemian-pdl-freedom-love-origin-handbook-2026": ["C1", "C2"],
  "tsinghua-sem-pdl-freedom-love-csr-2025": ["C1", "C2"],
  "xinhua-book-awakening-pdl-culture-outline-2023": ["C1", "C2"],
  "book-how-to-learn-pdl-wanghuizhong": ["C5"],
};

const contextOnlyIds = new Set([
  "book-learn-pdl-meta-and-boundary",
  "book-learn-pdl-toc-and-structure",
  "company-profile-identity-and-foundation",
  "company-profile-footprint-business-and-employment",
]);

const boundaryPattern =
  /边界|不是|不等于|不能|局限|争议|时效|不同观点|不可照搬|证据|来源|阶段|不具有人口代表性|尚未形成|未形成|资料不足|不能证明|不能改写|不能代替|不预判|时点|只.*不能|不背书|不等于/;
const mechanismPattern =
  /流程|制度|手册|授权|轮值|委员会|投票|竞聘|考评|奖励|分配|飞轮|平台|协作工具|规范|规则|整改|送检|调查组|治理|培训|执行|闭环|排班|知识库|公开分享|决议|复盘|转岗|下架排查|法律程序/;
const practicePattern =
  /员工之家|休息|闭店|不开心假|招聘|退票|退换货|投诉奖|委屈奖|下架|调查|致歉|回应|送检|起诉|判决|赔偿|服务|商品|供应链|利润分享|薪酬|福利|流程|制度|手册|培训|授权|投票|竞聘|转岗|处分|安排|处理|公示|检测|复核|维权|答题|投递通道|删除/;

const valueMeaningByTheme = {
  C1: "可用于理解企业如何看待员工尊严、生活空间与个人成长",
  C2: "可用于理解信任如何通过授权、制度、培训与责任落实",
  C3: "可用于理解企业对顾客体验、真诚服务及服务边界的处理",
  C4: "可用于理解品质、透明、供应链责任与纠错之间的关系",
  C5: "可用于理解利润、规模、品质和长期经营之间的取舍",
  C6: "可用于检验争议处理中公开、事实、尊重、责任与纠错是否一致",
};

const stakeholderRules = [
  ["员工", /员工|劳动者|招聘|薪酬|工资|休假|休息|就业|处分|纪律|工时|夜班|家庭|婚恋|彩礼|员工之家/],
  ["顾客", /顾客|消费者|投诉|客服|服务|退换货|退票|售后|影城|购物|口碑/],
  ["供应商", /供应商|供应链|厂家|品牌|结算|公平定价/],
  ["管理者", /管理|企业回应|企业说明|制度|治理|创始人|于东来|决策|轮值|委员会|调查组|组织|公司|手册/],
  ["公众", /公众|网友|媒体|报道|舆情|舆论|自媒体|网络|社会|社区|IP 属地|平台分布/],
  ["监管与司法", /监管|法院|司法|仲裁|判决|裁判|政府|法律|依法|合规/],
  ["同行企业", /同行|永辉|竞争者|调改|学习胖东来|复制|对标/],
];

function scoreThemes(searchText, caseId, documentId) {
  const scores = new Map(Object.keys(themeRules).map((theme) => [theme, 0]));

  for (const [theme, patterns] of Object.entries(themeRules)) {
    for (const pattern of patterns) {
      const matches = searchText.match(new RegExp(pattern.source, "g"));
      scores.set(theme, (scores.get(theme) ?? 0) + (matches?.length ?? 0));
    }
  }

  for (const [index, theme] of (caseThemeBoosts[caseId] ?? []).entries()) {
    scores.set(theme, (scores.get(theme) ?? 0) + 5 - index);
  }

  const ranked = [...scores.entries()]
    .filter(([, score]) => score > 0)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 3)
    .map(([theme]) => theme);

  if (ranked.length === 0) {
    return sourceFallbackThemes[documentId] ?? [];
  }

  return ranked;
}

function classifyRelevance(chunk, themes, themeSearchText) {
  if (contextOnlyIds.has(chunk.id)) return "context_only";
  if (boundaryPattern.test(themeSearchText)) return "boundary";
  if (themes.length === 0) return "context_only";
  if (practicePattern.test(chunk.title) || mechanismPattern.test(chunk.title)) return "direct";
  return "supporting";
}

function makeAnnotation(chunk, metadata) {
  const topics = chunk.facts?.topics ?? [];
  const themeSearchText = `${chunk.title} ${topics.join(" ")}`;
  const searchText = `${themeSearchText} ${chunk.text}`;
  const cultureTheme = contextOnlyIds.has(chunk.id)
    ? []
    : scoreThemes(themeSearchText, metadata.caseId, metadata.id);
  const relevance = classifyRelevance(chunk, cultureTheme, themeSearchText);
  const isBoundary = relevance === "boundary";
  const hasMechanism =
    mechanismPattern.test(chunk.title) && !contextOnlyIds.has(chunk.id);
  const hasPractice = practicePattern.test(chunk.title) && relevance !== "context_only";
  const stakeholders = stakeholderRules
    .filter(([, pattern]) => pattern.test(searchText))
    .map(([name]) => name);
  if (stakeholders.length === 0 && metadata.id === "official-store-directory-2026-07-24") {
    stakeholders.push("顾客");
  }
  if (stakeholders.length === 0 && metadata.id === "cnfin-feishu-night-shift-care-2024-12") {
    stakeholders.push("员工", "管理者");
  }
  if (stakeholders.length === 0 && /来源|材料|报道|图书|书评/.test(chunk.title)) {
    stakeholders.push("公众");
  }
  const effectiveAt =
    chunk.facts?.period ??
    metadata.source?.publishedAt ??
    metadata.source?.verifiedAt ??
    null;

  return {
    annotationVersion: ANNOTATION_VERSION,
    relevance,
    cultureTheme,
    practice: hasPractice ? chunk.title : null,
    mechanism: hasMechanism ? chunk.title : null,
    valueMeaning:
      cultureTheme.length > 0 && relevance !== "context_only" && !isBoundary
        ? valueMeaningByTheme[cultureTheme[0]]
        : null,
    stakeholders,
    tension: isBoundary ? chunk.title : null,
    effectiveAt,
  };
}

const manifest = JSON.parse(
  await readFile(path.join(knowledgeDirectory, "manifest.json"), "utf8"),
);
const metadataById = new Map();
for (const reference of manifest.sources) {
  const metadata = JSON.parse(
    await readFile(path.join(knowledgeDirectory, reference.metadataPath), "utf8"),
  );
  metadataById.set(metadata.id, metadata);
}

const chunkFiles = (await readdir(chunksDirectory))
  .filter((file) => file.endsWith(".jsonl"))
  .sort();
const files = [];
let chunkCount = 0;

for (const file of chunkFiles) {
  const filePath = path.join(chunksDirectory, file);
  const chunks = (await readFile(filePath, "utf8"))
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));

  for (const chunk of chunks) {
    if (chunk.culture && !force) {
      throw new Error(`${chunk.id} 已存在 culture 标注；如需重建请显式传入 --force。`);
    }
    const metadata = metadataById.get(chunk.documentId);
    if (!metadata) throw new Error(`${chunk.id} 找不到来源元数据。`);
    chunk.culture = makeAnnotation(chunk, metadata);
    chunkCount += 1;
  }

  files.push({ filePath, chunks });
}

if (chunkCount !== EXPECTED_CHUNK_COUNT) {
  throw new Error(`本迁移只适用于当前 ${EXPECTED_CHUNK_COUNT} 个片段，实际读取 ${chunkCount} 个。`);
}

for (const { filePath, chunks } of files) {
  await writeFile(
    filePath,
    `${chunks.map((chunk) => JSON.stringify(chunk)).join("\n")}\n`,
    "utf8",
  );
}

const distribution = {};
for (const { chunks } of files) {
  for (const chunk of chunks) {
    for (const theme of chunk.culture.cultureTheme) {
      distribution[theme] = (distribution[theme] ?? 0) + 1;
    }
  }
}

process.stdout.write(
  `文化标注已写入 ${chunkCount} 个片段：${Object.entries(distribution)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([theme, count]) => `${theme}=${count}`)
    .join("，")}。\n`,
);
