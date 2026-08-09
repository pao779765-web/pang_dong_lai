export type HotspotStatus = "企业回应" | "司法处理中" | "持续关注" | "已有结论";

export type HotspotTimelineItem = {
  date: string;
  label: string;
  title: string;
  body: string;
};

export type HotspotSource = {
  title: string;
  publisher: string;
  publishedAt: string;
  type: string;
  url: string;
};

export type HotspotEvent = {
  id: string;
  title: string;
  summary: string;
  status: HotspotStatus;
  happenedAt: string;
  updatedAt: string;
  known: string;
  unknown: string;
  observation: string;
  timeline: HotspotTimelineItem[];
  sources: HotspotSource[];
  followUpPrompt: string;
};

export const featuredHotspot: HotspotEvent = {
  id: "2026-07-17-fake-seminar-speech",
  title: "网传“座谈会发言稿”事件",
  summary:
    "7月17日晚，胖东来商贸集团针对网络流传的“座谈会发言稿”发布情况说明，称相关稿件存在自行编写、拼接和演绎，并非官方发布内容。",
  status: "企业回应",
  happenedAt: "2026-07-17",
  updatedAt: "2026-07-18",
  known:
    "已确认的是：胖东来公开回应了这份网传稿件，并明确否认其官方来源，也否认其为于东来在官方会议或公开场合的真实发言。",
  unknown:
    "在当前已审核资料中，尚未看到针对这份网传稿件的司法或监管终局结论；企业说明也不能自动证明网传内容背后的所有讨论。",
  observation:
    "这件事更适合用来观察信息如何被转述、企业如何回应，而不是用一份网传稿件裁定胖东来的经营制度或文化。",
  timeline: [
    {
      date: "2026.07.17",
      label: "网络传播",
      title: "网传“座谈会发言稿”引发讨论",
      body: "相关文字以“座谈会发言稿”的名义在网络流传，具体传播链条不在当前审核资料范围内。",
    },
    {
      date: "2026.07.17",
      label: "企业回应",
      title: "胖东来发布情况说明",
      body: "胖东来称网传稿件属于虚假杜撰，存在自行编写、拼接和演绎，并非官方发布内容。",
    },
    {
      date: "截至 2026.08.09",
      label: "资料边界",
      title: "当前仍应保留结论边界",
      body: "当前页面只呈现已审核的公开信息；未把企业回应扩写为司法或监管结论。",
    },
  ],
  sources: [
    {
      title: "胖东来发布情况说明",
      publisher: "北京日报",
      publishedAt: "2026-07-18",
      type: "媒体转述企业说明",
      url: "https://xinwen.bjd.com.cn/content/s6a5a6cd0e4b03fa51a81a4ba.html",
    },
  ],
  followUpPrompt:
    "关于“网传座谈会发言稿”事件，目前哪些内容已经得到胖东来回应？哪些内容仍不能确认？",
};

export const hotspotEvents: HotspotEvent[] = [featuredHotspot];
