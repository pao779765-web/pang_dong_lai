export type HotspotStatus = "企业回应" | "内部复议" | "持续关注" | "已有结论";

export type HotspotCredibility = "official" | "media" | "selfMedia" | "rumor" | "boundary";

export type HotspotTimelineItem = {
  date: string;
  label: string;
  credibility: HotspotCredibility;
  title: string;
  body: string;
};

export type HotspotSource = {
  title: string;
  publisher: string;
  publishedAt: string;
  type: string;
  credibility: Exclude<HotspotCredibility, "boundary">;
  note: string;
  url?: string;
};

export type HotspotEvidenceItem = {
  credibility: Exclude<HotspotCredibility, "boundary">;
  label: string;
  title: string;
  detail: string;
};

export type HotspotEvent = {
  id: string;
  title: string;
  summary: string;
  status: HotspotStatus;
  statusNote: string;
  happenedAt: string;
  updatedAt: string;
  known: string;
  unknown: string;
  boundaries: string[];
  observation: string;
  evidence: HotspotEvidenceItem[];
  timeline: HotspotTimelineItem[];
  sources: HotspotSource[];
  followUpPrompt: string;
  quickQuestions: string[];
  aiReady: boolean;
  aiStatusNote: string;
};

export const featuredHotspot: HotspotEvent = {
  id: "2025-01-30-red-underwear-color-libel",
  title: "红色内裤掉色过敏争议与名誉权诉讼",
  summary:
    "顾客反馈“富妮来”品牌红色内裤掉色、穿着后过敏。胖东来先后下架、致歉、发布调查报告，后以名誉权起诉相关博主；2025 年 5 月一审判决公开。本案的民事判决与商品安全、医学因果并不是同一件事。",
  status: "已有结论",
  statusNote: "名誉权纠纷的一审结果已公开；商品安全和医学因果仍无监管终局。",
  happenedAt: "2025-01-30",
  updatedAt: "2025-05-30",
  known:
    "已确认的是：企业曾对涉事系列产品下架、致歉并发布调查报告；2025 年 5 月，媒体所载法院公告记录了一审道歉与 40 万元赔偿结果。",
  unknown:
    "民事判决针对未核实表达侵犯名誉权，并不等于商品质量或医学因果已经获得监管终局认定。",
  boundaries: [
    "民事一审判决不等于商品质量或医学因果的监管终局认定。",
    "双方当庭表示暂不上诉，不能永久证明之后没有程序变化。",
    "报道所记赔偿与费用明细来自法院公告记录，当前未收录裁判文书全文。",
  ],
  observation: "",
  evidence: [
    {
      credibility: "official",
      label: "官方",
      title: "企业曾下架、致歉并发布调查报告",
      detail: "相关官方内容以权威媒体转载和已审核资料呈现；官方原帖、完整报告未全部作为独立页面来源收录。",
    },
    {
      credibility: "media",
      label: "第三方媒体",
      title: "媒体记录一审判决与后续评论",
      detail: "法院公告所载时间线、判决结果及媒体评论需与企业自身说法分开阅读。",
    },
    {
      credibility: "selfMedia",
      label: "自媒体",
      title: "顾客原帖引发争议",
      detail: "顾客抖音原帖或视频未在当前资料中作为独立可核验来源收录。",
    },
    {
      credibility: "rumor",
      label: "传言",
      title: "医学因果不能由网络说法定论",
      detail: "“掉色导致皮炎或过敏”的因果说法未获医学因果或监管终局认定。",
    },
  ],
  timeline: [
    {
      date: "2025.01.30",
      label: "顾客反馈",
      credibility: "media",
      title: "顾客反馈掉色与过敏问题",
      body: "法院公告所载时间线显示，门店曾沟通、致歉、陪同就医并支付医疗费，相关商品陆续下架。",
    },
    {
      date: "2025.02.04–02.14",
      label: "企业处理",
      credibility: "official",
      title: "企业下架、致歉并发布调查报告",
      body: "企业先后称组建调查组、对涉事品牌系列产品下架和复查，并发布涉及检测、内部处理与后续追责表态的调查报告。",
    },
    {
      date: "2025.04.05",
      label: "诉讼公示",
      credibility: "official",
      title: "企业公示名誉权诉讼",
      body: "企业公开表示就“红内裤”事件相关博主提起名誉权诉讼。",
    },
    {
      date: "2025.05.28–05.30",
      label: "一审公开",
      credibility: "media",
      title: "一审判决结果见于法院公告与媒体报道",
      body: "媒体报道援引法院公告：段某发布书面道歉视频并赔偿 40 万元；该结论针对名誉权纠纷，不能扩展为商品安全或医学因果结论。",
    },
  ],
  sources: [
    {
      title: "“红内裤”事件一审判决报道",
      publisher: "观察者网",
      publishedAt: "2025-05-30",
      type: "媒体转述法院公告",
      credibility: "media",
      note: "可核验报道；页面据此呈现一审公开结果，不替代裁判文书全文。",
      url: "https://www.guancha.cn/politics/2025_05_30_777673.shtml",
    },
    {
      title: "于东来回应“红内裤”争议",
      publisher: "每日经济新闻",
      publishedAt: "2025-02-28",
      type: "媒体转述",
      credibility: "media",
      note: "用于核对企业追责表态与当时传播语境。",
      url: "https://www.nbd.com.cn/articles/2025-02-28/3771691.html",
    },
  ],
  followUpPrompt: "关于红色内裤掉色过敏争议与名誉权诉讼，哪些结论来自一审判决，哪些商品质量或医学问题仍不能确认？",
  quickQuestions: [
    "一审判决具体确认了什么，没有确认什么？",
    "为什么名誉权判决不能等同于商品质量结论？",
    "企业的下架和调查报告在这件事里说明了什么？",
  ],
  aiReady: true,
  aiStatusNote: "本事件已在审核知识库中；资料助手会区分企业处理、媒体转述、一审结果与商品安全边界。",
};

const teaFlyHotspot: HotspotEvent = {
  id: "2026-01-05-tea-fly-feedback",
  title: "顾客在抖音平台反馈茶叶中有苍蝇",
  summary:
    "顾客经抖音反馈茶叶有苍蝇类问题后，胖东来发布《情况说明（一）》，称已组建调查组、下架排查并赴厂家复核。截至最近核验日，未见可核验的后续说明或完整最终调查报告。",
  status: "持续关注",
  statusNote: "企业只发布了初步说明；当前未见完整最终调查报告。",
  happenedAt: "2026-01-05",
  updatedAt: "2026-08-01",
  known:
    "已确认的是：企业公开说明过调查、下架排查、访厂复核及客服流程问题；多家媒体在 1 月 6 日跟进了这份说明。",
  unknown:
    "当前资料不能确认茶叶中是否确有异物、异物来源、责任归属或最终处理结果。",
  boundaries: [
    "不能确认茶叶中是否确有苍蝇、异物来源与生产责任。",
    "公开检索未见可核验的情况说明（二）或完整最终调查报告。",
    "企业承认客服流程问题并致歉，不等于商品质量已经被定性。",
  ],
  observation: "",
  evidence: [
    {
      credibility: "official",
      label: "官方",
      title: "企业发布情况说明（一）",
      detail: "企业称已组织专项调查、下架排查和访厂复核；官方抖音原帖 ID 未作为独立来源入库。",
    },
    {
      credibility: "media",
      label: "第三方媒体",
      title: "多家媒体可核对企业说明",
      detail: "人民网河南、澎湃等报道可用于核对公开说明的发布时间与主要内容。",
    },
    {
      credibility: "selfMedia",
      label: "自媒体",
      title: "顾客抖音反馈为事件起点",
      detail: "顾客原帖的永久 ID 未在当前审核资料中收录。",
    },
    {
      credibility: "rumor",
      label: "传言",
      title: "异物来源与责任不能由传播内容定性",
      detail: "在调查报告缺失的情况下，网络讨论不能替代最终调查或监管结论。",
    },
  ],
  timeline: [
    {
      date: "2026.01.05",
      label: "顾客反馈",
      credibility: "selfMedia",
      title: "顾客经抖音反馈茶叶问题",
      body: "事件由顾客社交媒体反馈引发；原帖本身未作为当前页面的独立可核验来源收录。",
    },
    {
      date: "2026.01.05 下午",
      label: "企业说明",
      credibility: "official",
      title: "企业发布情况说明（一）",
      body: "企业称将组建专项调查组、在结果公布前对涉事商品下架排查，并赴厂家对资质、生产与检验流程进行复核。",
    },
    {
      date: "2026.01.06",
      label: "媒体跟进",
      credibility: "media",
      title: "媒体报道企业公开回应",
      body: "人民网河南、澎湃等媒体跟进报道，记录企业的初步说明与客服致歉内容。",
    },
    {
      date: "截至 2026.08.01",
      label: "资料边界",
      credibility: "boundary",
      title: "未见完整最终调查报告",
      body: "当前资料只覆盖企业初步说明，不把初步处理写成最终调查或监管结论。",
    },
  ],
  sources: [
    {
      title: "胖东来回应“茶叶有苍蝇”反馈",
      publisher: "人民网河南",
      publishedAt: "2026-01-06",
      type: "媒体转述企业说明",
      credibility: "media",
      note: "可核对企业情况说明（一）的主要内容；不代表最终调查报告。",
      url: "https://ha.people.com.cn/n2/2026/0106/c351638-41465164.html",
    },
    {
      title: "胖东来回应茶叶异物争议",
      publisher: "澎湃新闻",
      publishedAt: "2026-01-06",
      type: "媒体报道",
      credibility: "media",
      note: "用于交叉核对初步回应与报道时间。",
      url: "https://www.thepaper.cn/newsDetail_forward_32324722",
    },
  ],
  followUpPrompt: "关于顾客反馈茶叶有苍蝇事件，企业已经公开说明了什么？哪些调查结果仍未见公开结论？",
  quickQuestions: [
    "企业情况说明（一）里承诺了哪些处理？",
    "为什么企业初步回应不能当作最终调查结论？",
    "目前哪些关于茶叶异物的说法仍不能确认？",
  ],
  aiReady: true,
  aiStatusNote: "本事件已在审核知识库中；资料助手只会使用企业初步说明和已审核媒体报道，不会补写最终结论。",
};

const eggCanthaxanthinHotspot: HotspotEvent = {
  id: "2026-04-05-egg-canthaxanthin-feedback",
  title: "鲜鸡蛋角黄素网络争议",
  summary:
    "网络视频对胖东来在售鸡蛋提出角黄素相关质疑。企业公开了多款鸡蛋检测报告，称特定黄天鹅样品的角黄素项目未检出，并表示将依法维权；当前未见监管部门针对本事件的终局结案通报。",
  status: "企业回应",
  statusNote: "企业公开了送检材料；当前未见监管部门终局结案通报。",
  happenedAt: "2026-04-05",
  updatedAt: "2026-08-01",
  known:
    "已确认的是：企业曾就争议发布送检材料与公开说明；媒体报道了企业对特定样品的检测表述和后续维权主张。",
  unknown:
    "企业送检结果不等同于监管终局，不能扩展为全部品牌、全部批次或市场层面的结论。",
  boundaries: [
    "企业自述送检不等于市场监管部门的最终结案通报。",
    "特定黄天鹅样品未检出，不等于全部品牌、全部批次或市场的监管结论。",
    "企业表示将依法维权，不等于法院已经作出侵权判决。",
  ],
  observation: "",
  evidence: [
    {
      credibility: "official",
      label: "官方",
      title: "企业发布检测报告与情况说明",
      detail: "企业对特定送检样品作出检测表述，范围不能扩大为全部产品或市场结论。",
    },
    {
      credibility: "media",
      label: "第三方媒体",
      title: "媒体记录企业回应与背景信息",
      detail: "中国经济网等报道可核对企业回应；其他平台、批次和检测主体的信息只可作为背景。",
    },
    {
      credibility: "selfMedia",
      label: "自媒体",
      title: "网络视频引发角黄素质疑",
      detail: "引发争议的视频发布主体未在当前审核资料中作为独立来源收录。",
    },
    {
      credibility: "rumor",
      label: "传言",
      title: "危害性说法尚无监管确认",
      detail: "“鸡蛋含角黄素有害或致癌”等网络说法不能替代监管认定。",
    },
  ],
  timeline: [
    {
      date: "2026.04.05",
      label: "企业回应",
      credibility: "official",
      title: "企业发布检测报告回应争议",
      body: "企业经官方渠道发布多款在售鸡蛋检测报告，并称特定黄天鹅样品的角黄素项目未检出。",
    },
    {
      date: "2026.04.06",
      label: "媒体报道",
      credibility: "media",
      title: "媒体报道送检说明与企业主张",
      body: "中国经济网、21 世纪经济报道等转述企业回应，并将其他渠道的送检或抽检信息作为需区分样品与批次的背景。",
    },
    {
      date: "至今",
      label: "资料边界",
      credibility: "boundary",
      title: "未见监管终局结案通报",
      body: "当前资料只呈现企业公开送检说明及媒体报道，未将其写成监管部门的最终结论。",
    },
  ],
  sources: [
    {
      title: "胖东来回应鸡蛋角黄素争议",
      publisher: "中国经济网",
      publishedAt: "2026-04-06",
      type: "媒体转述企业说明",
      credibility: "media",
      note: "可核对企业对特定送检样品的公开表述；不代表监管终局。",
      url: "https://www.ce.cn/cysc/sp/info/202604/t20260406_2883752.shtml",
    },
  ],
  followUpPrompt: "关于鲜鸡蛋角黄素网络争议，企业公开送检材料能说明什么，为什么不能作为监管终局？",
  quickQuestions: [
    "企业公开的检测报告针对哪些范围？",
    "为什么特定样品未检出不能代表全部产品？",
    "目前是否有监管部门针对本事件的最终通报？",
  ],
  aiReady: true,
  aiStatusNote: "本事件已在审核知识库中；资料助手会区分企业送检、媒体背景信息与监管终局的边界。",
};

const noodleTastingHotspot: HotspotEvent = {
  id: "2024-02-noodle-tasting-discipline",
  title: "美食城员工尝面违规处分与复议",
  summary:
    "网络视频曝光美食城员工在制作员工餐时试吃操作违规。企业最初解除劳动合同，后经内部民主决议调整为降学习期三个月、调离食品加工岗位并继续留任；这是企业内部复议，不是仲裁、法院或监管结论。",
  status: "内部复议",
  statusNote: "企业已调整内部处理，但这不是仲裁、法院或监管结论。",
  happenedAt: "2024-02",
  updatedAt: "2024-02-23",
  known:
    "已确认的是：初次辞退处理曾引发讨论；企业后续内部处理改为降学习期、转岗非食品加工岗位，并保留员工。",
  unknown:
    "当前资料不能据此判断该处理在劳动法上的合法性，也不能推断企业所有人事处分都会采用同一程序。",
  boundaries: [
    "最终内部处理不等于劳动仲裁、法院或监管结论。",
    "本次民主决议过程不等于企业所有人事处分都采用相同程序。",
    "专家对比例原则的评价，不等于企业文化整体已经通过检验。",
  ],
  observation: "",
  evidence: [
    {
      credibility: "official",
      label: "官方",
      title: "企业先后作出初次处理和内部复议",
      detail: "内部处理内容由工人日报等报道记录；企业报告原文未作为独立来源完整入库。",
    },
    {
      credibility: "media",
      label: "第三方媒体",
      title: "工人日报记录过程与专家观点",
      detail: "报道记录了初次辞退、内部复议及劳动法专业人士对比例原则的讨论。",
    },
    {
      credibility: "selfMedia",
      label: "自媒体",
      title: "曝光视频为事件起点",
      detail: "曝光视频原片未在当前审核资料中作为独立来源收录。",
    },
    {
      credibility: "rumor",
      label: "传言",
      title: "“被开除”是被简化的传播说法",
      detail: "最终已报道的企业内部处理为转岗留任，不能只用“被开除”概括全程。",
    },
  ],
  timeline: [
    {
      date: "2024.02",
      label: "视频曝光",
      credibility: "selfMedia",
      title: "网络视频曝光试吃操作违规",
      body: "员工制作员工餐时的试吃操作被曝光，成为后续企业处理与公共讨论的起点。",
    },
    {
      date: "2024.02 上旬",
      label: "初次处理",
      credibility: "official",
      title: "企业初次解除劳动合同",
      body: "企业对涉事员工作出初次辞退处理；后续处理并未停留在这一阶段。",
    },
    {
      date: "2024.02.17",
      label: "媒体讨论",
      credibility: "media",
      title: "工人日报报道比例原则争议",
      body: "报道援引劳动法专业人士观点，讨论食品安全纪律、过错程度与劳动者权益之间的比例问题。",
    },
    {
      date: "2024.02.19–02.23",
      label: "内部复议",
      credibility: "official",
      title: "企业调整为转岗留任",
      body: "企业内部民主决议后，将处理调整为降学习期三个月、调离食品加工岗位并继续留任；工人日报报道了结果。",
    },
  ],
  sources: [
    {
      title: "尝面员工初次辞退处理与比例原则质疑",
      publisher: "工人日报",
      publishedAt: "2024-02-17",
      type: "媒体报道与专家观点",
      credibility: "media",
      note: "记录初次处理与比例原则讨论，不是仲裁或司法结论。",
      url: "https://www.workercn.cn/c/2024-02-17/8151539.shtml",
    },
    {
      title: "尝面员工由辞退改为转岗的内部复议",
      publisher: "工人日报",
      publishedAt: "2024-02-23",
      type: "媒体报道",
      credibility: "media",
      note: "用于核对企业后续内部处理结果。",
      url: "https://www.workercn.cn/papers/grrb/2024/02/23/5/news-1.html",
    },
  ],
  followUpPrompt: "关于美食城员工尝面违规处分，企业最终内部处理是什么？哪些关于合法性的结论仍不能从现有资料得出？",
  quickQuestions: [
    "员工最终是被辞退还是转岗留任？",
    "工人日报报道中的比例原则讨论意味着什么？",
    "为什么内部复议不能等同于劳动仲裁或法院结论？",
  ],
  aiReady: true,
  aiStatusNote: "本事件已在审核知识库中；资料助手会区分企业内部处理、专家观点与劳动争议终局。",
};

const salaryCutHotspot: HotspotEvent = {
  id: "2026-06-salary-cut-rumor",
  title: "员工降薪传言与企业公开澄清",
  summary:
    "网络出现“大幅降薪”“员工不值这么多钱”等讨论后，胖东来发布说明称从未作出降薪决定。界面新闻记录了事件起因与企业关于收入、创造价值和培训的公开解释；当前没有劳动监管、仲裁或法院结论。",
  status: "企业回应",
  statusNote: "企业已公开澄清；当前没有劳动监管、仲裁或法院结论。",
  happenedAt: "2026-06-12",
  updatedAt: "2026-06-12",
  known:
    "已确认的是：企业公开表示从未作出调降工资决定，界面新闻记录了该澄清及企业对薪酬与价值匹配的解释。",
  unknown:
    "企业澄清不能证明每一名员工的工资、奖金或岗位收入从未变化，当前也没有劳动监管、仲裁或法院结论。",
  boundaries: [
    "企业澄清不能证明每名员工的实际工资、奖金或岗位收入从未变化。",
    "当前没有劳动监管、仲裁或法院对工资变化作出结论。",
    "报道延伸数字未逐项核验，不能作为本事件的回答证据。",
  ],
  observation: "",
  evidence: [
    {
      credibility: "official",
      label: "官方",
      title: "企业公开称从未作出降薪决定",
      detail: "企业公开立场可用于确认其澄清内容，不能外推为全部个体收入事实。",
    },
    {
      credibility: "media",
      label: "第三方媒体",
      title: "界面新闻记录传播语境与回应",
      detail: "报道呈现网络讨论、企业澄清与薪酬价值解释，应与劳动争议终局结论区分。",
    },
    {
      credibility: "selfMedia",
      label: "自媒体",
      title: "内部分享视频的传播语境未完全审核",
      detail: "社交平台传播者与转述路径不在当前资料的完整审核范围内。",
    },
    {
      credibility: "rumor",
      label: "传言",
      title: "“大幅降薪”等说法未经证实",
      detail: "网络讨论本身不能替代工资事实、仲裁或监管结论。",
    },
  ],
  timeline: [
    {
      date: "2026.06",
      label: "网络讨论",
      credibility: "rumor",
      title: "“大幅降薪”等说法在网络流传",
      body: "讨论与企业公开的内部分享视频及其传播语境有关，但网络讨论不能直接证明工资事实。",
    },
    {
      date: "2026.06",
      label: "企业澄清",
      credibility: "official",
      title: "企业称从未作出调降工资决定",
      body: "企业发布说明，公开表示从未作出降薪决定，并要求外界不要误读。",
    },
    {
      date: "2026.06.12",
      label: "媒体报道",
      credibility: "media",
      title: "界面新闻记录回应与薪酬解释",
      body: "报道记录了企业关于收入与创造价值匹配、通过培训帮助员工提升的公开解释。",
    },
    {
      date: "至今",
      label: "资料边界",
      credibility: "boundary",
      title: "无劳动争议终局结论",
      body: "当前仅能确认企业澄清与媒体转述，不能据此断言每名员工实际收入变化情况。",
    },
  ],
  sources: [
    {
      title: "降薪传言与企业公开澄清",
      publisher: "界面新闻",
      publishedAt: "2026-06-12",
      type: "媒体报道",
      credibility: "media",
      note: "可核对企业公开澄清与报道语境；不代表监管、仲裁或法院结论。",
      url: "https://www.jiemian.com/article/14575217.html",
    },
  ],
  followUpPrompt: "关于员工降薪传言，企业公开澄清了什么？为什么不能由此判断每名员工的实际收入没有变化？",
  quickQuestions: [
    "企业对“降薪”传言作出了什么公开回应？",
    "为什么企业澄清不能代表每名员工收入从未变化？",
    "目前是否有劳动仲裁、法院或监管结论？",
  ],
  aiReady: true,
  aiStatusNote: "本事件已在审核知识库中；资料助手会区分企业澄清、网络传言与个体收入事实的边界。",
};

const approvedHotspotAiStatusNote = "本事件已进入审核知识库；资料助手会结合事件上下文回答，并保留来源归因与结论边界。";

const noodleSkinHotspot: HotspotEvent = {
  id: "2024-06-25-noodle-skin-food-safety",
  title: "新乡“擀面皮”卫生环境事件",
  summary:
    "2024年6月25日，网友发视频投诉新乡胖东来联营餐饮“擀面皮”加工场所卫生环境差。胖东来随后关停排查并发布调查报告，说明相关人员处理、商户撤柜、举报奖励和退款补偿安排。",
  status: "已有结论",
  statusNote: "企业调查报告和退款补偿已经公开，但这仍是企业自查结论，不等于市场监管部门的终局认定。",
  happenedAt: "2024-06-25",
  updatedAt: "2024-06-27",
  known:
    "已确认的是：胖东来于6月26日声明关停排查，6月27日发布调查报告，涉及辞退或免职、取消年终福利、商户解约撤柜、奖励举报顾客10万元，以及对指定购买日期内的擀面皮和香辣面顾客退款补偿8833份、合计833.3万元。",
  unknown:
    "当前页面呈现的是企业调查报告和媒体转载的处理结果；加工场所卫生问题的具体细节以及监管部门是否另有终局认定，不能仅凭企业报告补写。",
  boundaries: [
    "调查报告是企业自查结论，不等于市场监管部门的终局认定。",
    "加工场所卫生问题的具体细节以报告为准，当前未逐项核验原文。",
    "退款补偿的公开数量和金额不代表所有后续责任已经被完整裁定。",
  ],
  observation: "这件事可以观察企业如何把卫生投诉转化为关停排查、人员处理和消费者补偿，但不宜把企业处理直接扩展为监管结论。",
  evidence: [
    {
      credibility: "official",
      label: "官方",
      title: "胖东来发布调查报告并执行退款补偿",
      detail: "企业报告记录了停业排查、人员处理、商户撤柜、举报奖励和消费者退款补偿。",
    },
    {
      credibility: "media",
      label: "第三方媒体",
      title: "川观新闻、大众日报等转载调查报告",
      detail: "媒体报道用于核对公开时间线和报告中披露的处理数字，不能替代监管原始文书。",
    },
    {
      credibility: "selfMedia",
      label: "自媒体",
      title: "网友视频首先提出卫生环境投诉",
      detail: "具体原帖未核验，页面只保留其作为事件起点的作用。",
    },
    {
      credibility: "rumor",
      label: "传言",
      title: "当前资料未保留额外传言",
      detail: "事实判断以企业调查报告和可核验媒体转载为边界，不补充未经证实的卫生细节。",
    },
  ],
  timeline: [
    {
      date: "2024.06.25",
      label: "网友投诉",
      credibility: "selfMedia",
      title: "网友视频投诉加工场所卫生环境",
      body: "网友发布视频，指出新乡胖东来联营餐饮“擀面皮”加工场所卫生环境较差。具体原帖未在当前资料中独立核验。",
    },
    {
      date: "2024.06.26",
      label: "企业处理",
      credibility: "official",
      title: "胖东来声明关停排查",
      body: "胖东来公开声明对相关餐饮商户关停并开展排查。",
    },
    {
      date: "2024.06.27 凌晨",
      label: "调查报告",
      credibility: "official",
      title: "企业发布调查报告和补偿安排",
      body: "报告说明相关人员辞退或免职、取消年终福利，商户解除合同并撤柜，奖励举报顾客10万元，并对指定购买日期内的顾客退款补偿8833份、合计833.3万元。",
    },
    {
      date: "2024.06.27",
      label: "媒体报道",
      credibility: "media",
      title: "川观新闻、大众日报等跟进报道",
      body: "第三方媒体转载或报道企业调查报告，页面将媒体转述与企业原始处理分开呈现。",
    },
    {
      date: "截至 2026.08.12",
      label: "资料边界",
      credibility: "boundary",
      title: "监管终局不由企业报告自动替代",
      body: "当前页面不把企业自查报告扩写为市场监管部门的最终认定。",
    },
  ],
  sources: [
    {
      title: "关于新乡胖东来“擀面皮”调查报告的报道",
      publisher: "川观新闻（正文来源：闪电新闻）",
      publishedAt: "2024-06-27",
      type: "媒体转述企业调查报告",
      credibility: "media",
      note: "可直接打开核对媒体报道；企业公众号原文未作为独立链接保存。",
      url: "https://cbgc.scol.com.cn/news/5138676",
    },
    {
      title: "新乡胖东来擀面皮事件处理情况",
      publisher: "大众日报",
      publishedAt: "2024-06-29",
      type: "第三方媒体报道",
      credibility: "media",
      note: "用于核对调查报告、举报奖励和退款补偿的公开转述。",
      url: "https://baijiahao.baidu.com/s?id=1803163360734720565",
    },
    {
      title: "“擀面皮”事件的媒体评论",
      publisher: "百家号“观澜亭”",
      publishedAt: "2024-06",
      type: "媒体评论",
      credibility: "media",
      note: "评论材料仅用于观察讨论，不作为企业处理事实的唯一依据。",
      url: "https://baijiahao.baidu.com/s?id=1803081040556085571",
    },
  ],
  followUpPrompt: "关于新乡“擀面皮”卫生环境事件，企业调查报告确认了哪些处理？哪些内容仍不能扩展为监管结论？",
  quickQuestions: [
    "企业调查报告具体公布了哪些处理和补偿？",
    "为什么企业调查报告不等于监管部门终局认定？",
    "这件事能说明胖东来怎样处理食品安全投诉吗？",
  ],
  aiReady: true,
  aiStatusNote: approvedHotspotAiStatusNote,
};

const storeAssaultHotspot: HotspotEvent = {
  id: "2025-11-02-store-assault-case",
  title: "许昌生活广场商场内伤人案",
  summary:
    "2025年11月2日下午，许昌市魏都区南大街胖东来生活广场发生伤人事件。警方通报转述称，冯某某因纠纷致伤一对夫妻，嫌疑人被抓获，两名伤者伤情稳定，案件仍在侦办中。",
  status: "持续关注",
  statusNote: "警方已经通报初步处置信息，但案件仍在侦办中，当前没有判决结论。",
  happenedAt: "2025-11-02",
  updatedAt: "2025-11-03",
  known:
    "已确认的是：2025年11月2日下午，许昌生活广场一楼大厅入门处发生伤人事件；警方通报转述称冯某某被抓获并送医，两名伤者伤情稳定。",
  unknown:
    "当前公开资料主要是警方通报转述，尚不能补写案件后续侦办、起诉或判决结果。",
  boundaries: [
    "警方通报属于初步处置信息，不等于法院判决。",
    "案件仍在侦办，责任认定和最终处理结果以司法程序为准。",
    "该事件发生在商场公共空间，不应据此推导胖东来的经营或企业文化结论。",
  ],
  observation: "这是一宗商场公共空间治安事件，阅读重点应放在警方已通报的事实和案件尚未终结的边界。",
  evidence: [
    {
      credibility: "official",
      label: "官方",
      title: "当前未收录企业官方资料",
      detail: "现有公开材料以警方通报经媒体发布为主，未将商场内部材料补写为官方结论。",
    },
    {
      credibility: "media",
      label: "第三方媒体",
      title: "媒体转述警方通报",
      detail: "澎湃新闻、川观新闻等报道记录案发、抓获和伤者情况。",
    },
    {
      credibility: "selfMedia",
      label: "自媒体",
      title: "现场视频和网络讨论未核验",
      detail: "相关现场视频或讨论未作为独立可核验来源收录。",
    },
    {
      credibility: "rumor",
      label: "传言",
      title: "当前以警方通报为事实边界",
      detail: "页面不补充警方通报之外的动机、伤情或责任判断。",
    },
  ],
  timeline: [
    {
      date: "2025.11.02 下午",
      label: "案发",
      credibility: "media",
      title: "生活广场一楼大厅发生伤人事件",
      body: "警方通报转述称，冯某某因纠纷致伤吴某某和徐某某夫妻二人。",
    },
    {
      date: "2025.11.02",
      label: "现场处置",
      credibility: "media",
      title: "巡逻警力与商场保安抓获嫌疑人",
      body: "巡逻警力与商场保安将嫌疑人抓获并送医，两名伤者伤情稳定。",
    },
    {
      date: "2025.11.03",
      label: "警方通报",
      credibility: "media",
      title: "许昌日报“许昌时刻”发布警方通报",
      body: "澎湃新闻等媒体转载警方通报，案件进入进一步侦办阶段。",
    },
    {
      date: "截至 2026.08.12",
      label: "资料边界",
      credibility: "boundary",
      title: "当前没有判决或最终处理结论",
      body: "页面只呈现已公开的初步通报，不把侦办中的案件写成已经定案。",
    },
  ],
  sources: [
    {
      title: "许昌生活广场伤人案警方通报转述",
      publisher: "澎湃新闻（来源：许昌日报“许昌时刻”）",
      publishedAt: "2025-11-03",
      type: "媒体转述警方通报",
      credibility: "media",
      note: "可直接打开核对媒体报道；页面不将其扩展为司法终局。",
      url: "http://www.thepaper.cn/newsDetail_forward_31884361",
    },
    {
      title: "许昌生活广场商场内伤人事件报道",
      publisher: "川观新闻",
      publishedAt: "2025-11",
      type: "第三方媒体报道",
      credibility: "media",
      note: "作为警方通报转述的交叉来源。",
      url: "https://cbgc.scol.com.cn/news/6921261",
    },
  ],
  followUpPrompt: "关于许昌生活广场商场内伤人案，警方通报确认了什么？为什么现在不能说案件已经有最终结论？",
  quickQuestions: [
    "警方通报目前确认了哪些事实？",
    "为什么这起案件不能写成已经定案？",
    "这起公共空间治安事件与胖东来经营有什么边界？",
  ],
  aiReady: true,
  aiStatusNote: approvedHotspotAiStatusNote,
};

const dignityViolationHotspot: HotspotEvent = {
  id: "2026-08-10-dignity-violation-disclosure",
  title: "首期“人格尊严侵权”案例公示",
  summary:
    "2026年8月10日，胖东来官方账号发布首期“人格尊严侵权行为”公示，公开两起顾客侵害员工案例及处置结果，3名员工合计获得7万元补偿。",
  status: "已有结论",
  statusNote: "企业已经公示两起案例的处置和补偿，但其中一起民事诉讼结果仍未公开。",
  happenedAt: "2026-02-11",
  updatedAt: "2026-08-10",
  known:
    "已确认的是：公示涉及新乡员工被顾客驾车顶撞、许昌员工劝阻违规充电后遭侵害两起案例；前一起顾客被行政拘留6日并致歉，后一起企业启动民事诉讼并永久取消会员资格，3名员工合计获补偿7万元。",
  unknown:
    "两起案例的细节主要来自企业公示，当前未逐项核验原始法律文书；第二起民事诉讼的结果也尚未公开。",
  boundaries: [
    "企业公示的处置结果不等于所有法律程序都已经结束。",
    "顾客因精神分裂症免于行政处罚是企业公示表述，不能替代完整法律文书。",
    "2025年33起、39.2万元等汇总数字来自企业公示，未独立核验。",
  ],
  observation: "这组公示可以观察企业如何公开回应员工人格尊严受到侵害的案例，但单次公示不能直接证明整套文化已经形成或不存在问题。",
  evidence: [
    {
      credibility: "official",
      label: "官方",
      title: "胖东来公示两起人格尊严侵权案例",
      detail: "官方公示记录案情、行政处置、民事诉讼安排、会员处理和员工补偿。",
    },
    {
      credibility: "media",
      label: "第三方媒体",
      title: "腾讯、搜狐、新浪跟进报道",
      detail: "媒体报道转述企业公示，需与企业原始公示的责任范围分开阅读。",
    },
    {
      credibility: "selfMedia",
      label: "自媒体",
      title: "相关讨论帖未核验",
      detail: "网络讨论可能使用“员工自曝被侵犯”等标题，页面不把标题当作事实来源。",
    },
    {
      credibility: "rumor",
      label: "传言",
      title: "“员工自曝被侵犯”等表述容易造成误读",
      detail: "当前事件档案以企业主动公示的顾客侵害员工案例为准，不补充未经核验的叙述。",
    },
  ],
  timeline: [
    {
      date: "2026.02.11",
      label: "新乡案例",
      credibility: "official",
      title: "员工劝阻违规插队时遭顾客驾车顶撞",
      body: "企业公示称，涉事顾客被行政拘留6日并当面致歉，员工武某某获得1万元补偿。",
    },
    {
      date: "2026.04.15",
      label: "许昌案例",
      credibility: "official",
      title: "员工劝阻消防通道充电后遭顾客侵害",
      body: "企业公示称，李某某遭辱骂、掌掴和衣物抽打，前来帮忙的常某某也被拍打；企业启动民事诉讼并永久取消涉事顾客会员资格。",
    },
    {
      date: "2026.08.10 晚/深夜",
      label: "企业公示",
      credibility: "official",
      title: "首期公示公开处置结果和7万元补偿",
      body: "公示称3名员工共获7万元补偿：武某某1万元、常某某1万元、李某某5万元。",
    },
    {
      date: "2026.08.11",
      label: "媒体报道",
      credibility: "media",
      title: "多家媒体跟进转述企业公示",
      body: "腾讯新闻、搜狐、新浪等媒体报道了公示内容。",
    },
    {
      date: "截至 2026.08.12",
      label: "资料边界",
      credibility: "boundary",
      title: "第二起民事诉讼结果仍未公开",
      body: "页面保留企业公示的处置状态，不把民事诉讼安排写成已经获得法院终局裁判。",
    },
  ],
  sources: [
    {
      title: "首期“人格尊严侵权行为”公示",
      publisher: "胖东来官方账号",
      publishedAt: "2026-08-10",
      type: "官方公示",
      credibility: "official",
      note: "企业官方账号原帖没有稳定网页直链；处置与补偿以媒体转述核验，不伪造链接。",
    },
    {
      title: "胖东来公布两起侵犯员工人格尊严案例",
      publisher: "极目新闻 / 凤凰网",
      publishedAt: "2026-08-11",
      type: "媒体转述企业公示",
      credibility: "media",
      note: "转述官方账号8月10日公示及3名员工合计7万元补偿；不替代企业原帖或法律文书。",
      url: "https://news.ifeng.com/c/8vUvhKns5Cw",
    },
    {
      title: "顾客辱骂掌掴员工后企业启动民事诉讼",
      publisher: "扬子晚报",
      publishedAt: "2026-08-11",
      type: "第三方媒体报道",
      credibility: "media",
      note: "交叉核对企业公示中的处置与补偿口径，不把媒体标题写成司法终局。",
      url: "https://www.163.com/dy/article/L42G7FON05345ARG.html",
    },
  ],
  followUpPrompt: "关于胖东来首期人格尊严侵权案例公示，企业公开了哪些处置和补偿？哪些法律结果仍不能确认？",
  quickQuestions: [
    "两起案例分别公开了什么处理结果？",
    "3名员工获得的7万元补偿具体如何构成？",
    "为什么企业公示不能替代第二起民事诉讼结果？",
  ],
  aiReady: true,
  aiStatusNote: approvedHotspotAiStatusNote,
};

const prisonerRecruitmentHotspot: HotspotEvent = {
  id: "2026-08-14-prisoner-recruitment",
  title: "胖东来郑州店计划招聘刑释人员",
  summary:
    "胖东来郑州店在 2026 年 8 月的招聘安排中计划招募 20 名刑期 5 年以上刑释人员。企业随后回应招聘并非无门槛接纳；截至 2026 年 8 月 26 日，公开资料仍未确认第二批实际录取、入职和试用结果。",
  status: "持续关注",
  statusNote: "企业已说明招聘初衷和部分边界，但第二批正式报名、录取、岗位与试用期结果仍待后续公开信息核验。",
  happenedAt: "2026-08-14",
  updatedAt: "2026-08-26",
  known:
    "已确认的是：胖东来在 2025 年曾为刑释人员设置专项招聘安排，媒体报道首批 30 人面试后全部录用并进入 6 个月双向试用；2026 年 8 月郑州店又提出招聘 20 名刑期 5 年以上刑释人员的计划，并通过媒体转述说明并非无门槛接纳。",
  unknown:
    "截至 2026 年 8 月 26 日，尚不能确认第二批实际报名人数、正式录取人数、具体岗位、入职情况、试用期结果，也不能由首批 30 人的企业表态推断所有刑释人员的就业结果。",
  boundaries: [
    "‘计划招聘20人’不等于已经录取、入职或完成试用；第二批结果仍是未知。",
    "‘刑期5年以上’不能自动推断具体罪名、危险程度或个人品格。",
    "‘并非无门槛’以及性侵、严重暴力等排除性说法目前主要由媒体转述，不能冒充完整官方招聘细则或法律清单。",
    "首批30人‘无一离职’是企业或创始人的公开说法，公开资料未披露完整岗位、试用期转化和长期留任数据。",
    "平等就业权不等于所有职业无条件开放，岗位仍受法定限制和必要风险管理约束。",
    "这是一个现实样本，不足以证明整套企业文化或就业帮扶对所有人都有同样结果。",
  ],
  observation:
    "这件事适合观察企业怎样把就业再融入、岗位匹配、试用期和公众安全放进同一套招聘机制；不要把一次专项招聘直接裁定为整套企业文化的证明。",
  evidence: [
    {
      credibility: "official",
      label: "官方",
      title: "企业招聘公告与账号口径",
      detail: "郑州店招聘计划、招聘初衷和首批人员状态均有企业渠道口径，但当前主要通过媒体转述核验，原始完整链接仍待补充。",
    },
    {
      credibility: "media",
      label: "第三方媒体",
      title: "澎湃、上观、南方周末等跟进报道",
      detail: "媒体分别记录招聘计划、首批30人、专家观点和第二批状态；报道之间的事实、观点和候选人个案需要分开阅读。",
    },
    {
      credibility: "selfMedia",
      label: "自媒体",
      title: "于东来关于首批人员的公开表态",
      detail: "创始人公开表态可作为人物口径使用，但不等于完整企业人事统计、监管结论或司法文书。",
    },
    {
      credibility: "rumor",
      label: "传言",
      title: "‘招犯人’或‘无门槛接纳’等简化说法",
      detail: "这些说法容易把计划、边界和结果混成一句话；页面不把标题化表达当作已核验事实。",
    },
  ],
  timeline: [
    {
      date: "2025.08",
      label: "首次专项招聘",
      credibility: "media",
      title: "新乡‘三胖’招聘设置刑释人员专项通道",
      body: "媒体报道胖东来在 2025 年的特定招聘批次中设置刑释人员专项投递安排；这是当时的批次，不自动代表所有岗位。",
    },
    {
      date: "2025.08.10",
      label: "企业说明",
      credibility: "official",
      title: "企业账号说明招聘刑释人员的初衷",
      body: "企业公开口径经媒体转述称，刑满释放人员仍是平等公民，并会从较轻罪责人员开始逐步扩大范围。",
    },
    {
      date: "2025.09.17",
      label: "首批结果",
      credibility: "media",
      title: "报道：30名候选人面试后全部录用",
      body: "解放日报·上观报道首批 30 人全部录用，并进入 6 个月双向试用期；具体长期留任数据未完整公开。",
    },
    {
      date: "2026.08.14",
      label: "郑州店计划",
      credibility: "official",
      title: "计划招聘20名刑期5年以上刑释人员",
      body: "郑州店提前公告提出招聘 20 名刑期 5 年以上刑释人员，并设置相应招聘通道；具体细则待后续公告。",
    },
    {
      date: "2026.08.15",
      label: "创始人表态",
      credibility: "selfMedia",
      title: "于东来称首批30人无一离职",
      body: "于东来公开表示首批 30 人无一离职，并以稳定、幸福、健康描述其状态；这属于公开表态，不是完整人事统计。",
    },
    {
      date: "2026.08.19",
      label: "媒体转述澄清",
      credibility: "media",
      title: "招聘并非无门槛接纳",
      body: "媒体转述企业说明，申请审核和面试按统一流程，设置 6 个月双向试用期，首批主要进入后勤、仓储、物流等后台岗位。",
    },
    {
      date: "2026.08.22",
      label: "跟进报道",
      credibility: "media",
      title: "潜在应聘者经历不能证明第二批结果",
      body: "南方周末记录了潜在应聘者的求职过程，但公开资料仍不足以确认正式录取、入职和试用结果。",
    },
    {
      date: "截至 2026.08.26",
      label: "资料边界",
      credibility: "boundary",
      title: "第二批实际招聘结果尚未公开确认",
      body: "页面把招聘计划、首批样本和第二批结果分开呈现，不把‘招犯人’等标题化表达写成事实。",
    },
  ],
  sources: [
    {
      title: "郑州店招聘公告与企业账号相关口径",
      publisher: "胖东来企业渠道",
      publishedAt: "2025-08 ~ 2026-08",
      type: "企业公开口径",
      credibility: "official",
      note: "企业招聘公告原帖没有稳定网页直链；计划人数与初衷以已收录的媒体转述核验。",
    },
    {
      title: "郑州店计划招聘20名刑期5年以上刑释人员",
      publisher: "澎湃新闻",
      publishedAt: "2026-08-14",
      type: "媒体报道",
      credibility: "media",
      note: "支持招聘计划、专项通道和待发布细则的阶段判断。",
      url: "https://www.thepaper.cn/newsDetail_forward_33781961",
    },
    {
      title: "胖东来招聘刑释人员的初衷与首批状态",
      publisher: "每日经济新闻 / 川观",
      publishedAt: "2026-08-19 ~ 2026-08-20",
      type: "媒体转述企业与创始人表态",
      credibility: "media",
      note: "保留企业账号和于东来表态的归因边界。",
      url: "https://www.nbd.com.cn/articles/2026-08-20/4547776.html",
    },
    {
      title: "媒体转述招聘并非无门槛接纳",
      publisher: "川观 / 荔枝新闻",
      publishedAt: "2026-08-19",
      type: "媒体转述企业澄清",
      credibility: "media",
      note: "统一流程、双向试用期和岗位安排均按媒体归因使用。",
      url: "https://cbgc.scol.com.cn/news/7862061",
    },
    {
      title: "30名刑释人员面试后全部录用与双向试用",
      publisher: "解放日报·上观",
      publishedAt: "2025-09-27",
      type: "首批招聘报道",
      credibility: "media",
      note: "首批30人是现实样本，不能替代完整人事数据。",
      url: "https://www.shobserver.com/journal/article/share?id=463268",
    },
    {
      title: "专家：首批30人是现实样本，不宜神化",
      publisher: "澎湃新闻",
      publishedAt: "2026-08-17",
      type: "专家分析",
      credibility: "media",
      note: "作为观点和资料缺口提示，不作为监管或司法结论。",
      url: "https://www.thepaper.cn/newsDetail_forward_33795425",
    },
    {
      title: "第二批招聘进展跟进",
      publisher: "南方周末",
      publishedAt: "2026-08-22",
      type: "跟进报道",
      credibility: "media",
      note: "记录潜在应聘者经历与截至核验日仍缺少第二批结果。",
      url: "https://news.southcn.com/node_64549305f1/4e5acb751a.shtml",
    },
    {
      title: "于东来关于首批30人的公开表态",
      publisher: "于东来个人公开账号",
      publishedAt: "2026-08-15",
      type: "创始人公开表态",
      credibility: "selfMedia",
      note: "创始人社交账号原帖没有稳定网页直链；‘无一离职’等表述须保留人物归因，不改写为独立统计。",
    },
    {
      title: "刑满释放人员平等就业的法律背景",
      publisher: "国务院公报 / 教育部法规页面",
      publishedAt: "1994-12-29 / 2026-04-30",
      type: "官方法律背景",
      credibility: "official",
      note: "用于解释法律语境；现行法与 2026-11-01 生效的修订法必须区分。",
      url: "https://www.gov.cn/gongbao/shuju/1994/gwyb199431.pdf",
    },
  ],
  followUpPrompt:
    "关于胖东来招聘刑释人员这件事，请区分企业计划、首批30人样本和第二批尚未公开的结果，说明已确认事实、企业回应、法律背景与当前不能确认的部分。",
  quickQuestions: [
    "郑州店计划招聘的20名刑释人员目前确认到哪一步？",
    "首批30名刑释人员的招聘和试用结果是什么？",
    "胖东来所说的‘并非无门槛’具体应该怎样理解？",
    "这件事与刑满释放人员平等就业的法律背景有什么关系？",
    "为什么不能把‘首批30人无一离职’写成普遍结论？",
  ],
  aiReady: true,
  aiStatusNote: "本事件已进入 limited 审核知识库；资料助手会区分企业口径、媒体转述、个人经历、法律背景和未知结果。",
};

const zhengzhouStoreHotspot: HotspotEvent = {
  id: "2025-02-23-zhengzhou-store",
  title: "宣布进驻郑州开首店",
  summary:
    "胖东来曾宣布进驻郑州，首店位于郑州高铁东站西广场经纬华悦广场。项目原计划于2026年五一开业，2026年3月于东来公开表示因项目质量要求可能推迟至10月，截至核验日尚未开业。",
  status: "持续关注",
  statusNote: "郑州项目已有创始人表态和省级政府信息确认，但截至2026年8月12日尚未开业，最终日期仍以官方后续公告为准。",
  happenedAt: "2025-02-23",
  updatedAt: "2026-08-12",
  known:
    "已确认的是：郑州首店计划位于高铁东站西广场经纬华悦广场；河南发布曾确认五一开业预期和高铁驿站、购物直通车安排；于东来随后表示因引入国际设计团队、强化项目质量，开业可能推迟至10月。",
  unknown:
    "截至核验日尚未开业，10月是否如期、具体业态和项目面积仍不能从现有资料确定。",
  boundaries: [
    "于东来个人表态不等于企业正式公告。",
    "五一开业计划已经推迟，10月只是最新公开预期，不是已经兑现的开业事实。",
    "高铁驿站由郑州交运集团筹备，与胖东来门店本身是不同主体。",
  ],
  observation: "这个事件适合观察胖东来从许昌、新乡走向郑州时的项目节奏和质量要求，但不能把计划时间当成实际开业结果。",
  evidence: [
    {
      credibility: "official",
      label: "官方",
      title: "河南发布确认郑州店筹备信息",
      detail: "省级政府信息确认五一开业预期、高铁驿站和购物直通车安排。",
    },
    {
      credibility: "media",
      label: "第三方媒体",
      title: "观点网等媒体跟进郑州开店计划",
      detail: "媒体记录项目位置、开店计划和后续延期口径，不能替代最终开业公告。",
    },
    {
      credibility: "selfMedia",
      label: "自媒体",
      title: "于东来公开透露并说明延期原因",
      detail: "创始人个人社交账号内容属于人格发言，应与企业正式公告区分。",
    },
    {
      credibility: "rumor",
      label: "传言",
      title: "“胖东来要开全国分店”等解读无充分依据",
      detail: "当前资料只支持郑州首店项目，不支持大规模全国扩张的推断。",
    },
  ],
  timeline: [
    {
      date: "2025.02.23",
      label: "开店计划",
      credibility: "selfMedia",
      title: "于东来透露郑州开店计划",
      body: "于东来公开透露胖东来将进驻郑州，位置为郑州高铁东站西广场经纬华悦广场。",
    },
    {
      date: "2025.02.23–24",
      label: "媒体报道",
      credibility: "media",
      title: "多家媒体报道郑州首店计划",
      body: "观点网、搜狐、今日头条、新浪财经等媒体跟进报道。",
    },
    {
      date: "2026.01.16–22",
      label: "政府信息",
      credibility: "official",
      title: "河南发布确认五一开业预期和配套服务",
      body: "河南发布公布郑州店预计五一开业，并介绍高铁驿站、商品代购代发、行李寄存和购物直通车等安排。",
    },
    {
      date: "2026.03.13",
      label: "延期口径",
      credibility: "selfMedia",
      title: "于东来称开业可能推迟到10月",
      body: "于东来公开表示因引入国际设计团队、强化项目质量，开业时间可能推迟至10月。",
    },
    {
      date: "截至 2026.08.12",
      label: "资料边界",
      credibility: "boundary",
      title: "郑州店尚未开业",
      body: "最新公开口径为预计2026年10月，但是否如期仍需后续官方信息核验。",
    },
  ],
  sources: [
    {
      title: "河南发布关于郑州店筹备和配套服务的信息",
      publisher: "河南省政府办公厅“河南发布”",
      publishedAt: "2026-01-22",
      type: "省级政府发布",
      credibility: "official",
      note: "高铁驿站等配套信息目前没有找到可长期打开的政府原文页；页面保留发布主体和日期，不伪造链接。",
    },
    {
      title: "省政府网站转载：郑州首店确定高铁东站东广场",
      publisher: "河南省人民政府门户网站 / 河南日报",
      publishedAt: "2025-03-20",
      type: "政府网站转载报道",
      credibility: "official",
      note: "用于核对选址公开信息；开业日期仍以后续官方口径为准。",
      url: "https://www.henan.gov.cn/2025/03-20/3138572.html",
    },
    {
      title: "胖东来进驻郑州首店计划报道",
      publisher: "每日经济新闻",
      publishedAt: "2025-02-23",
      type: "第三方媒体报道",
      credibility: "media",
      note: "用于核对于东来宣布进驻郑州及当时选址讨论，不能写成已经开业。",
      url: "https://www.nbd.com.cn/articles/2025-02-23/3761153.html",
    },
    {
      title: "媒体转述：郑州店开业调整至2026年10月",
      publisher: "快科技",
      publishedAt: "2026-03-13",
      type: "媒体转述创始人表态",
      credibility: "media",
      note: "转述于东来社交账号关于延期和国际设计团队的说明；不等于企业正式公告，10月仍是计划。",
      url: "https://www.163.com/dy/article/KNU271KF0511CPVM.html",
    },
    {
      title: "郑州项目延期至10月的公开表态",
      publisher: "于东来个人社交账号",
      publishedAt: "2026-03-13",
      type: "创始人公开表态",
      credibility: "selfMedia",
      note: "社交账号原帖没有稳定网页直链；这是创始人个人公开表态，不等于企业正式公告。",
    },
  ],
  followUpPrompt: "关于胖东来进驻郑州开首店，目前哪些计划已经得到公开信息确认？为什么10月仍不是最终开业结论？",
  quickQuestions: [
    "郑州首店目前确认了哪些位置和配套信息？",
    "五一推迟到10月的原因是什么？",
    "为什么10月仍然不能当作已经确定的开业日期？",
  ],
  aiReady: true,
  aiStatusNote: approvedHotspotAiStatusNote,
};

const staffTurnoverHotspot: HotspotEvent = {
  id: "2026-07-27-staff-turnover-data",
  title: "官方公布2026上半年人员流失数据",
  summary:
    "胖东来官网公布2026年上半年集团人员流失数据：1月至6月共流失员工52名，人员流失率0.50%，管理层无一人流失；媒体还转述了2026年1月至3月员工平均工资9598元的信息。",
  status: "已有结论",
  statusNote: "52名、0.50%和管理层零流失已经有官网公布出处；统计口径和岗位细分仍需以官网原文为准。",
  happenedAt: "2026-01-01",
  updatedAt: "2026-07-27",
  known:
    "已确认的是：胖东来官网公布的集团口径数据显示，2026年1月至6月流失员工52名，人员流失率0.50%，管理层无一人流失；媒体另有2026年1月至3月平均工资9598元的转述。",
  unknown:
    "现有资料未展开各门店、岗位和离职类型，也未逐字核验流失率的分母口径；平均工资9598元是媒体转述的1月至3月数据，不是全年结论。",
  boundaries: [
    "数据是集团整体口径，不代表每个门店或岗位的情况。",
    "流失率0.50%的分母和统计范围以官网原文为准，当前未逐字核验。",
    "平均工资9598元属于2026年1月至3月口径，不应写成全年平均工资。",
  ],
  observation: "这组官方数据可以帮助观察人员稳定性，但不能单凭流失率或平均工资推导员工体验、管理质量或企业文化的完整结论。",
  evidence: [
    {
      credibility: "official",
      label: "官方",
      title: "胖东来官网公布集团人员流失数据",
      detail: "官网公布52名、0.50%和管理层零流失等集团数据，是当前核心事实来源。",
    },
    {
      credibility: "media",
      label: "第三方媒体",
      title: "媒体跟进转述数据和平均工资",
      detail: "媒体报道补充了2026年1月至3月平均工资9598元的转述，但不替代官网原文。",
    },
    {
      credibility: "selfMedia",
      label: "自媒体",
      title: "早期自媒体传播已被官方数据部分核对",
      detail: "早期传播文章未作为独立事实来源，当前以官网公布数据为准。",
    },
    {
      credibility: "rumor",
      label: "传言",
      title: "当前没有保留额外传言数字",
      detail: "页面不把未经官方或媒体来源支持的岗位细分、原因和趋势补写出来。",
    },
  ],
  timeline: [
    {
      date: "2026.01–06",
      label: "统计期间",
      credibility: "official",
      title: "集团统计流失员工52名",
      body: "官网数据记录上半年流失员工52名，人员流失率0.50%，管理层无一人流失。",
    },
    {
      date: "2026.05",
      label: "官方披露",
      credibility: "official",
      title: "官方账号披露2025年全年相关数据",
      body: "胖东来官方账号披露了2025年全年全业态相关数据，和本次上半年集团口径需要分开阅读。",
    },
    {
      date: "2026.07.27 前后",
      label: "官网公布",
      credibility: "official",
      title: "官网公开2026年上半年人员流失数据",
      body: "官网公布52名、0.50%和管理层零流失等数据。",
    },
    {
      date: "2026.07.27–29",
      label: "媒体报道",
      credibility: "media",
      title: "多家媒体跟进报道",
      body: "媒体报道转述流失数据，并提及2026年1月至3月平均工资9598元。",
    },
    {
      date: "截至 2026.08.12",
      label: "资料边界",
      credibility: "boundary",
      title: "统计口径和岗位细分仍需查阅官网原文",
      body: "当前页面保留集团层面的公开数据，不补写分母、岗位和离职原因。",
    },
  ],
  sources: [
    {
      title: "2026年1—6月集团人员流失数据",
      publisher: "胖东来官网",
      publishedAt: "2026-07-27 前后",
      type: "官网数据公布",
      credibility: "official",
      note: "官网原文页当前没有单独收录的稳定直链；52名、0.50%等数字以已核验媒体转述为准。",
    },
    {
      title: "胖东来上半年人员流失数据报道",
      publisher: "每日经济新闻",
      publishedAt: "2026-07-27",
      type: "媒体转述官方数据",
      credibility: "media",
      note: "转述官网公布的52名、0.50%、管理层零流失，以及1月至3月平均工资9598元口径。",
      url: "https://www.nbd.com.cn/articles/2026-07-27/4517131.html",
    },
    {
      title: "大河报转述上半年流失数据与平均工资",
      publisher: "大河报·豫视频",
      publishedAt: "2026-07-27",
      type: "媒体转述官方数据",
      credibility: "media",
      note: "交叉核对企业公布口径；平均工资仍是1月至3月，不能写成全年。",
      url: "https://news.dahebao.cn/dahe/appcommunity/2288865?newsId=2288865",
    },
    {
      title: "2025年全年相关数据传播记录",
      publisher: "胖东来官方账号",
      publishedAt: "2026-05 起",
      type: "官方披露",
      credibility: "selfMedia",
      note: "官方账号原帖没有稳定网页直链；用于区分不同统计期间，不作为本事件52名数据的唯一来源。",
    },
  ],
  followUpPrompt: "关于胖东来2026年上半年人员流失数据，官网确认了哪些数字？哪些统计口径仍不能补写？",
  quickQuestions: [
    "52名和0.50%分别说明什么？",
    "为什么9598元不能当作全年平均工资？",
    "这组数据能否直接证明员工体验或企业文化？",
  ],
  aiReady: true,
  aiStatusNote: approvedHotspotAiStatusNote,
};

const lifePlazaClosureHotspot: HotspotEvent = {
  id: "2026-08-07-life-plaza-closure",
  title: "许昌生活广场店2026年底关闭",
  summary:
    "2026年8月7日，于东来在直播中宣布胖东来生活广场店将于2026年12月关闭，8月9日进一步说明原因涉及租约失误和硬件老化；该店2026年上半年销售额和全年预计销售额由媒体报道转述。",
  status: "持续关注",
  statusNote: "关闭计划来自创始人公开宣布，尚未到关闭日期，是否如期执行仍需后续核验。",
  happenedAt: "2026-08-07",
  updatedAt: "2026-08-09",
  known:
    "已确认的是：于东来公开宣布生活广场店计划于2026年12月关闭，并说明该店2002年开业、租约问题和硬件老化等原因；媒体还转述了销售额、利润等经营数据。",
  unknown:
    "关闭是否如期执行、租约细节和销售利润数据的完整口径，当前不能仅凭创始人表态和媒体报道补写。",
  boundaries: [
    "2026年12月是创始人宣布的计划日期，不是已经完成的关闭事实。",
    "年销20亿元、利润超1亿元等数字来自媒体报道，未经企业财报独立核验。",
    "租约问题细节以于东来公开回应为准，当前未核验原始合同。",
  ],
  observation: "这件事可以观察老店经营调整、公平租约和硬件更新之间的张力，但单店关闭不等于胖东来整体撤离或经营失败。",
  evidence: [
    {
      credibility: "official",
      label: "官方",
      title: "暂未看到企业正式公告",
      detail: "当前关闭计划主要来自创始人直播和社交平台回应，不把它包装成企业正式公告。",
    },
    {
      credibility: "media",
      label: "第三方媒体",
      title: "北京商报、新浪新闻等跟进报道",
      detail: "媒体报道记录关闭原因和销售数据，但经营数字仍需和企业正式披露区分。",
    },
    {
      credibility: "selfMedia",
      label: "自媒体",
      title: "于东来直播和社交平台回应",
      detail: "创始人公开表态是当前关闭计划的主要出处，属于人格发言。",
    },
    {
      credibility: "rumor",
      label: "传言",
      title: "“胖东来要倒闭”属于过度解读",
      detail: "现有资料只支持单店经营调整，不支持撤离许昌或整体倒闭的推断。",
    },
  ],
  timeline: [
    {
      date: "2026.08.07",
      label: "直播宣布",
      credibility: "selfMedia",
      title: "于东来宣布生活广场店计划年底关闭",
      body: "于东来在直播中公开表示，生活广场店将于2026年12月关闭。",
    },
    {
      date: "2026.08.09",
      label: "原因回应",
      credibility: "selfMedia",
      title: "于东来说明租约和硬件老化原因",
      body: "公开回应提到2015年租约处理未按公司规定统一签订、个别租户租金上涨，以及硬件老化等因素。",
    },
    {
      date: "2026.08.09–11",
      label: "媒体报道",
      credibility: "media",
      title: "媒体跟进关闭计划和经营数据",
      body: "北京商报、新浪新闻等媒体报道关闭原因，并转述上半年销售额、全年预计销售额和利润等数字。",
    },
    {
      date: "截至 2026.08.12",
      label: "资料边界",
      credibility: "boundary",
      title: "关闭尚未发生，计划仍待后续核验",
      body: "页面不把创始人宣布的计划日期写成已经完成的关闭结果。",
    },
  ],
  sources: [
    {
      title: "生活广场店2026年底关闭的公开宣布",
      publisher: "于东来直播与社交平台",
      publishedAt: "2026-08-07 / 08-09",
      type: "创始人公开表态",
      credibility: "selfMedia",
      note: "直播和社交原帖没有稳定网页直链；关闭计划以媒体转述核验，这不是企业正式公告。",
    },
    {
      title: "胖东来生活广场店关闭原因报道",
      publisher: "北京商报",
      publishedAt: "2026-08-09",
      type: "第三方媒体报道",
      credibility: "media",
      note: "转述于东来关于租约失误、公平原则和计划关店的说明；销售额等数字未经企业财报独立核验。",
      url: "https://www.bbtnews.com.cn/2026/0809/601678.shtml",
    },
    {
      title: "于东来宣布年底关闭生活广场店",
      publisher: "每日经济新闻",
      publishedAt: "2026-08-08",
      type: "媒体转述创始人表态",
      credibility: "media",
      note: "记录8月7日直播宣布及门店当时仍正常营业；2026年12月是计划日期，不是已经关闭。",
      url: "https://www.nbd.com.cn/articles/2026-08-08/4535808.html",
    },
  ],
  followUpPrompt: "关于许昌生活广场店2026年底关闭，目前哪些内容是创始人公开宣布？哪些经营数字和日期仍需后续核验？",
  quickQuestions: [
    "生活广场店为什么计划关闭？",
    "为什么单店关闭不等于胖东来整体撤离？",
    "2026年12月是否已经是确定的关闭结果？",
  ],
  aiReady: true,
  aiStatusNote: approvedHotspotAiStatusNote,
};

const dreamCityHotspot: HotspotEvent = {
  id: "2026-05-20-dream-city-project",
  title: "“梦之城”超大型综合体项目",
  summary:
    "“梦之城”是胖东来品牌成立以来投资规模较大的单体项目，2026年5月20日开工，计划2029年9月落成。现有公开信息提到约65亿元投资、约60万平方米建筑面积，以及总部、商业综合体、文化街区和剧院等规划内容。",
  status: "持续关注",
  statusNote: "项目已经开工并处于建设中，但规模数字、正式规划和2029年9月落成时间仍需后续官方文件核验。",
  happenedAt: "2026-05-20",
  updatedAt: "2026-07-24",
  known:
    "已确认的是：于东来公开发布了梦之城效果视频和开工信息，项目于2026年5月20日开工；现有公开口径提到约65亿元建设和装修投资、约60万平方米建筑面积，以及总部办公塔楼、商业综合体、文化街区、讲堂、广场和剧院等内容。",
  unknown:
    "正式规划文件、最终建设规模、住宅小区是否落地以及2029年9月是否如期落成，当前不能从公开表态和媒体报道中确定。",
  boundaries: [
    "65亿元、60万平方米等数字来自创始人公开发布和媒体报道，未核验正式规划文件。",
    "2029年9月是计划时间，不是已经兑现的落成结果。",
    "住宅小区属于“条件允许将建设”的表态，不是已确定规划。",
  ],
  observation: "这个项目可以观察胖东来如何把商业、文化和员工生活放进同一长期建设计划，但规划愿景不能替代最终工程和运营结果。",
  evidence: [
    {
      credibility: "official",
      label: "官方",
      title: "暂未看到企业正式公告",
      detail: "当前项目主要依据创始人公开发布的效果图、视频和开工信息，不把其包装成正式规划批复。",
    },
    {
      credibility: "media",
      label: "第三方媒体",
      title: "新浪财经等媒体报道项目进展",
      detail: "媒体报道转述投资规模、建筑面积和功能规划，最终数字仍需正式文件核验。",
    },
    {
      credibility: "selfMedia",
      label: "自媒体",
      title: "于东来发布效果图、视频和开工合影",
      detail: "创始人账号内容是项目公开信息的主要出处，属于公开人格发言。",
    },
    {
      credibility: "rumor",
      label: "传言",
      title: "当前没有把规划愿景当成既成事实",
      detail: "页面不补充未经来源支持的招商、住宅和落成细节。",
    },
  ],
  timeline: [
    {
      date: "2026.03.14 前后",
      label: "项目公开",
      credibility: "selfMedia",
      title: "于东来发布梦之城效果视频",
      body: "公开信息提到约60万平方米建筑面积、约65亿元投资、4月动工和2029年9月落成等计划。",
    },
    {
      date: "2026.05.20",
      label: "开工",
      credibility: "selfMedia",
      title: "于东来发布项目开工信息",
      body: "于东来在社交账号发布工地合影，条幅显示梦之城项目开工。",
    },
    {
      date: "2026.05.25",
      label: "媒体报道",
      credibility: "media",
      title: "媒体报道项目投资规模和综合体定位",
      body: "媒体称梦之城是胖东来投资规模较大的单体项目，建设和装修投资约65亿元。",
    },
    {
      date: "2026.07.23–24",
      label: "项目进展",
      credibility: "media",
      title: "媒体跟进功能规划和效果图信息",
      body: "报道提到总部办公塔楼、商业综合体、文化街区、讲堂、广场、剧院和“自由大道”等规划内容。",
    },
    {
      date: "截至 2026.08.12",
      label: "资料边界",
      credibility: "boundary",
      title: "项目建设中，正式规划和落成时间仍待核验",
      body: "页面只确认项目已开工，不把计划规模和2029年9月写成最终工程结果。",
    },
  ],
  sources: [
    {
      title: "梦之城效果图、效果视频和开工合影",
      publisher: "于东来社交账号",
      publishedAt: "2026-03–05",
      type: "创始人公开发布",
      credibility: "selfMedia",
      note: "社交账号原帖没有稳定网页直链；投资规模和落成时间应与正式规划文件区分。",
    },
    {
      title: "梦之城投资规模、业态与住宅表态报道",
      publisher: "每日经济新闻",
      publishedAt: "2026-05-26",
      type: "第三方媒体报道",
      credibility: "media",
      note: "转述约65亿元投资、综合体业态及‘条件允许将建小区’的表态；不是已建成结论。",
      url: "https://www.nbd.com.cn/articles/2026-05-26/4408641.html",
    },
    {
      title: "梦之城一期取得建筑工程施工许可证",
      publisher: "证券时报 / 人民财讯",
      publishedAt: "2026-08-25",
      type: "第三方媒体报道",
      credibility: "media",
      note: "企查查记录的施工许可信息，用于核验项目已进入实体施工；2029年9月仍是计划时间。",
      url: "https://stcn.com/article/detail/4115562.html",
    },
  ],
  followUpPrompt: "关于胖东来“梦之城”项目，目前哪些建设信息已经公开？哪些规模和落成时间仍只是计划？",
  quickQuestions: [
    "梦之城项目目前确认了哪些建设内容？",
    "65亿元和60万平方米是否已经是最终规划？",
    "为什么2029年9月仍然只是计划时间？",
  ],
  aiReady: true,
  aiStatusNote: approvedHotspotAiStatusNote,
};

export const hotspotEvents: HotspotEvent[] = [
  featuredHotspot,
  teaFlyHotspot,
  eggCanthaxanthinHotspot,
  noodleTastingHotspot,
  salaryCutHotspot,
  noodleSkinHotspot,
  storeAssaultHotspot,
  dignityViolationHotspot,
  prisonerRecruitmentHotspot,
  zhengzhouStoreHotspot,
  staffTurnoverHotspot,
  lifePlazaClosureHotspot,
  dreamCityHotspot,
];
