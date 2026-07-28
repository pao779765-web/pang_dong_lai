"use client";

/* eslint-disable @next/next/no-img-element -- 门店照片直接来自胖东来官网，避免额外图片代理。 */

import type { CSSProperties, FormEvent, MouseEvent } from "react";
import { useEffect, useRef, useState } from "react";

type Keyword = {
  label: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  duration: number;
  delay: number;
  tone: "paper" | "copper" | "smoke";
};

type ChatRole = "user" | "assistant";

type ChatSource = {
  title: string;
  url: string;
  verifiedAt: string;
  caseTitle?: string;
  claimType?: string;
  finality?: string;
};

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  sources?: ChatSource[];
  isStreaming?: boolean;
};

type Store = {
  name: string;
  address: string;
  tuesdayOpen: boolean;
  photoUrl: string;
};

const keywords: Keyword[] = [
  { label: "商超天花板？", x: 5, y: 16, dx: 14, dy: -10, duration: 17, delay: -4, tone: "paper" },
  { label: "神仙工作？", x: 77, y: 17, dx: -12, dy: 9, duration: 19, delay: -12, tone: "copper" },
  { label: "6A级景区？", x: 23, y: 9, dx: 9, dy: 13, duration: 22, delay: -7, tone: "smoke" },
  { label: "服务天花板？", x: 84, y: 34, dx: -15, dy: -8, duration: 18, delay: -2, tone: "paper" },
  { label: "自由与爱？", x: 4, y: 43, dx: 12, dy: 11, duration: 21, delay: -15, tone: "copper" },
  { label: "被过度神化？", x: 69, y: 8, dx: -10, dy: 12, duration: 24, delay: -5, tone: "smoke" },
  { label: "反内卷？", x: 12, y: 70, dx: 14, dy: -12, duration: 16, delay: -9, tone: "paper" },
  { label: "管理边界？", x: 78, y: 73, dx: -12, dy: -10, duration: 20, delay: -3, tone: "smoke" },
  { label: "不盲目扩张？", x: 3, y: 86, dx: 16, dy: -9, duration: 23, delay: -17, tone: "copper" },
  { label: "行业教科书？", x: 70, y: 89, dx: -13, dy: -11, duration: 18, delay: -8, tone: "paper" },
  { label: "员工幸福感？", x: 42, y: 11, dx: 11, dy: 8, duration: 25, delay: -14, tone: "paper" },
  { label: "透明定价？", x: 88, y: 56, dx: -13, dy: 12, duration: 20, delay: -10, tone: "copper" },
  { label: "不可复制？", x: 22, y: 88, dx: 10, dy: -12, duration: 17, delay: -6, tone: "smoke" },
  { label: "一店带火一城？", x: 80, y: 47, dx: -15, dy: 8, duration: 26, delay: -11, tone: "paper" },
  { label: "委屈奖？", x: 4, y: 58, dx: 13, dy: 9, duration: 19, delay: -16, tone: "smoke" },
  { label: "民办公务员？", x: 45, y: 88, dx: -10, dy: -11, duration: 21, delay: -4, tone: "copper" },
  { label: "购物安心？", x: 86, y: 87, dx: -14, dy: -8, duration: 24, delay: -18, tone: "paper" },
  { label: "商业理想主义？", x: 8, y: 29, dx: 12, dy: -9, duration: 22, delay: -13, tone: "paper" },
  { label: "高薪高福利？", x: 73, y: 28, dx: -11, dy: 10, duration: 18, delay: -1, tone: "copper" },
  { label: "服务细节？", x: 88, y: 8, dx: -13, dy: 11, duration: 20, delay: -6, tone: "smoke" },
  { label: "区域主义？", x: 30, y: 16, dx: 10, dy: -8, duration: 23, delay: -9, tone: "smoke" },
  { label: "网红朝圣地？", x: 18, y: 78, dx: 12, dy: 10, duration: 25, delay: -19, tone: "paper" },
];

const lenses = [
  {
    number: "01",
    kicker: "看见",
    title: "标签如何形成",
    copy: "先保留赞美，也保留质疑。把热搜、报道与口耳相传放在同一张桌面上。",
  },
  {
    number: "02",
    kicker: "追问",
    title: "做法如何落地",
    copy: "从服务细节进入制度现场：员工、顾客、管理与城市之间，究竟发生了什么？",
  },
  {
    number: "03",
    kicker: "核验",
    title: "证据来自哪里",
    copy: "让每个结论都能回到公开报道、实地资料与可追溯的来源，而不是停在传说里。",
  },
];

const storeRegions: { city: string; stores: Store[] }[] = [
  {
    city: "许昌及禹州",
    stores: [
      { name: "许昌天使城", address: "许昌市魏都区八龙路与建安大道交汇处东北角", tuesdayOpen: true, photoUrl: "https://web.azpdl.cn/upload/PMIzb714NouyFRxUbRKcwLJDn6f_22222.jpg" },
      { name: "许昌时代广场", address: "许昌市魏都区七一路277号", tuesdayOpen: false, photoUrl: "https://web.azpdl.cn/upload/Odb7bViVCoZEuVxJ8ABcbiwEnXg_xc_shidai.jpg" },
      { name: "许昌生活广场", address: "许昌市魏都区南关大街42号", tuesdayOpen: false, photoUrl: "https://web.azpdl.cn/upload/BiTtbu5Ceojcugxx5gvccPYenIc_xc_shenghuo.jpg" },
      { name: "许昌大众服饰", address: "河南省许昌市颍昌路838号", tuesdayOpen: true, photoUrl: "https://web.azpdl.cn/upload/HhLqbWvN7or9AhxQdS2c5kPBnLb_%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20250102195205.webp" },
      { name: "许昌金三角店", address: "许昌市新许路与文兴路交叉口新合作广场", tuesdayOpen: true, photoUrl: "https://web.azpdl.cn/upload/JRAub2w0Jo8fyoxNf7gcuns3nSN_xc_jinsanjiao.jpg" },
      { name: "许昌云鼎店", address: "许昌市东城区魏文路与学府街交叉口云鼎广场3号楼一层", tuesdayOpen: false, photoUrl: "https://web.azpdl.cn/upload/XKp8b0LTloG8CGx8G5kcFIUvnTb_xc_yunding.jpg" },
      { name: "许昌北海店", address: "许昌市建安区镜水路36号", tuesdayOpen: true, photoUrl: "https://web.azpdl.cn/upload/ZFNDbu6AHogLo9xsCPIcNEqKn4b_xc_beihai.jpg" },
      { name: "许昌金汇店", address: "许昌市魏都区八一路与北大街交汇处东北角", tuesdayOpen: true, photoUrl: "https://web.azpdl.cn/upload/MDvlbGhI3olHtFxWSaXcluAInUh_DSC01163.webp" },
      { name: "许昌劳动店", address: "许昌市魏都区劳动南路与西湖北街交叉口东南50米", tuesdayOpen: false, photoUrl: "https://web.azpdl.cn/upload/SvsebfBHVoktLkxzTIHcXDFxnfc_xc_laodong.jpg" },
      { name: "许昌人民店", address: "许昌市魏都区劳动路与人民路交叉口恒达魏源广场5号楼负一层", tuesdayOpen: false, photoUrl: "https://web.azpdl.cn/upload/KyrVbjYrQorU9SxrZbxciHP1nVb_xc_renmin.jpg" },
      { name: "禹州店", address: "禹州市颍河大街568号（老体育公园负一层）", tuesdayOpen: true, photoUrl: "https://web.azpdl.cn/upload/PMdmb6Mdyo9PL1xzg0kcmiQxnHb_%E7%A6%B9%E5%B7%9E%E5%BA%97.webp" },
    ],
  },
  {
    city: "新乡",
    stores: [
      { name: "新乡大胖", address: "新乡市红旗区人民中路199号", tuesdayOpen: false, photoUrl: "https://web.azpdl.cn/upload/Q8OcbzJXhoc0nnxyNQ2cbeVvnRf_xx_dapang.jpg" },
      { name: "新乡二胖", address: "新乡市卫滨区健康路31号", tuesdayOpen: false, photoUrl: "https://web.azpdl.cn/upload/Ol65bCdoLozJxRxmJlZc65X1ngc_%E5%B0%8F%E8%83%96.webp" },
      { name: "新乡三胖", address: "河南省新乡市红旗区牧野路（中）199号", tuesdayOpen: true, photoUrl: "https://web.azpdl.cn/upload/sanpang.jpg" },
    ],
  },
];

function formatStoreHours(tuesdayOpen: boolean) {
  return `夏季（6–8月）09:30–21:30；其他月份：周一、三、四、日 09:30–21:00，周五、六 09:30–21:30；周二${tuesdayOpen ? "正常营业" : "闭店"}`;
}

const suggestedQuestions = ["胖东来周二是否闭店？", "茶叶反馈后企业公开怎么说的？是最终结论吗？", "新乡三胖在哪里？"];

function readSources(value: unknown): ChatSource[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (
      !item ||
      typeof item !== "object" ||
      typeof (item as ChatSource).title !== "string" ||
      typeof (item as ChatSource).url !== "string" ||
      typeof (item as ChatSource).verifiedAt !== "string" ||
      ("caseTitle" in item && typeof (item as ChatSource).caseTitle !== "string") ||
      ("claimType" in item && typeof (item as ChatSource).claimType !== "string") ||
      ("finality" in item && typeof (item as ChatSource).finality !== "string")
    ) {
      return [];
    }

    return [item as ChatSource];
  });
}

function RagChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "assistant-welcome",
      role: "assistant",
      content: "我会把具体事件的证据与文化理解分开回答：企业初步回应不等于最终结论，文化观点也不能裁定客诉真伪。",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || isSending) return;

    const assistantId = `assistant-${Date.now()}`;
    const nextMessages: ChatMessage[] = [
      ...messages,
      { id: `user-${Date.now()}`, role: "user", content },
      { id: assistantId, role: "assistant", content: "", isStreaming: true },
    ];
    setMessages(nextMessages);
    setDraft("");
    setChatError("");
    setIsSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages
            .filter((message) => message.content.trim())
            .map(({ role, content: messageContent }) => ({ role, content: messageContent })),
        }),
      });
      if (!response.ok) {
        const data: { error?: unknown } = await response.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" ? data.error : "暂时无法获得回答，请稍后重试。");
      }

      if (!response.body) {
        throw new Error("浏览器未能接收流式回答，请稍后重试。");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const applyEvent = (event: string) => {
        const data = event
          .split("\n")
          .find((line) => line.startsWith("data:"))
          ?.slice(5)
          .trim();
        if (!data) return;

        let payload: { type?: unknown; content?: unknown; sources?: unknown; error?: unknown };
        try {
          payload = JSON.parse(data);
        } catch {
          return;
        }

        if (payload.type === "delta" && typeof payload.content === "string") {
          setMessages((current) => current.map((message) => (
            message.id === assistantId
              ? { ...message, content: message.content + payload.content }
              : message
          )));
        }

        if (payload.type === "sources") {
          setMessages((current) => current.map((message) => (
            message.id === assistantId
              ? { ...message, sources: readSources(payload.sources) }
              : message
          )));
        }

        if (payload.type === "error") {
          throw new Error(typeof payload.error === "string" ? payload.error : "生成回答时出现问题，请稍后重试。");
        }

        if (payload.type === "done") {
          setMessages((current) => current.map((message) => (
            message.id === assistantId ? { ...message, isStreaming: false } : message
          )));
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        events.forEach(applyEvent);
      }

      if (buffer.trim()) applyEvent(buffer);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "暂时无法获得回答，请稍后重试。");
      setMessages((current) => current.map((message) => (
        message.id === assistantId ? { ...message, isStreaming: false } : message
      )));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="dialogue-window" aria-label="胖东来文化资料问答">
      <header className="dialogue-bar">
        <h2 id="dialogue-title" className="dialogue-title-sr">
          与胖东来对话
        </h2>
        <span className="dialogue-disclaimer">
          <span className="dialogue-dot" aria-hidden="true" />
          非官方资料助手 · BM25 本地检索
        </span>
      </header>

      <div className="dialogue-body" aria-live="polite" aria-busy={isSending}>
        {messages.length === 1 && messages[0].id === "assistant-welcome" ? (
          <div className="chat-empty-state">
            <article className="message message-assistant">
              <span className="message-label">资料助手</span>
              <div className="message-content">
                <p>{messages[0].content}</p>
                <p className="message-footnote">可以从企业公开回应、访谈和具体案例聊起。</p>
              </div>
            </article>
            <div className="chat-suggest" aria-label="推荐问题">
              {suggestedQuestions.map((question) => (
                <button className="chat-suggest-chip" onClick={() => setDraft(question)} type="button" key={question}>
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
              <article className={`message message-${message.role}${message.isStreaming ? " message-streaming" : ""}`} key={message.id}>
                <span className="message-label">{message.role === "user" ? "你" : "资料助手"}</span>
                <div className="message-content">
                  <p>{message.content}</p>
                  {message.role === "assistant" && message.sources?.length ? (
                    <div className="message-sources" aria-label="相关资料">
                      <strong>相关资料</strong>
                      {message.sources.map((source) => (
                        <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>
                          {source.title} · 更新于 {source.verifiedAt}
                          {source.caseTitle ? (
                            <span className="message-source-context">
                              {source.caseTitle} · {source.claimType === "company_preliminary_response" ? "企业初步回应" : source.claimType} · {source.finality === "preliminary" ? "非最终结论" : source.finality === "no_regulatory_final" ? "未见监管终局" : source.finality}
                            </span>
                          ) : null}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              </article>
            ))
        )}
        {isSending ? (
          <div className="chat-pending" aria-live="polite">
            <span className="chat-pending-dots" aria-hidden="true" />
            正在检索资料并生成回答…
          </div>
        ) : null}
      </div>

      <form className="question-shell" onSubmit={handleSubmit}>
        <label htmlFor="chat-question">输入你的问题</label>
        <div className="question-row">
          <input
            id="chat-question"
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="例如：胖东来周二是否闭店？"
            disabled={isSending}
          />
          <button type="submit" disabled={isSending || !draft.trim()}>{isSending ? "检索中" : "发送"}</button>
        </div>
        {chatError ? <p className="chat-error" role="alert">{chatError}</p> : null}
        <small>非官方 AI 对话 · 会结合当前可用资料回答</small>
      </form>
    </div>
  );
}

function getKeywordStyle(keyword: Keyword, index: number) {
  return {
    "--x": `${keyword.x}%`,
    "--y": `${keyword.y}%`,
    "--dx": `${keyword.dx}px`,
    "--dy": `${keyword.dy}px`,
    "--duration": `${keyword.duration}s`,
    "--delay": `${keyword.delay}s`,
    "--intro-delay": `${0.12 + Math.floor(index / 6) * 0.42 + (index % 6) * 0.08}s`,
    "--sway-duration": `${8 + (index % 5) * 1.25}s`,
  } as CSSProperties;
}

export default function Home() {
  const heroRef = useRef<HTMLElement>(null);
  const storeDirectoryRef = useRef<HTMLElement>(null);
  const [storesOpen, setStoresOpen] = useState(false);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || !("IntersectionObserver" in window)) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        hero.dataset.active = entry.isIntersecting ? "true" : "false";
      },
      { threshold: 0.08 },
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  function handleAnchorClick(event: MouseEvent<HTMLAnchorElement>) {
    const href = event.currentTarget.getAttribute("href");
    if (!href?.startsWith("#")) {
      return;
    }

    const target = document.querySelector<HTMLElement>(href);
    if (!target) {
      return;
    }

    event.preventDefault();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    window.history.replaceState(null, "", href);
    window.setTimeout(() => target.focus({ preventScroll: true }), reducedMotion ? 0 : 650);
  }

  function openStoreDirectory() {
    setStoresOpen(true);
    window.requestAnimationFrame(() => {
      const target = storeDirectoryRef.current;
      if (!target) return;

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
      window.history.replaceState(null, "", "#store-directory");
      window.setTimeout(() => target.focus({ preventScroll: true }), reducedMotion ? 0 : 650);
    });
  }

  return (
    <main>
      <section
        ref={heroRef}
        className="hero"
        data-active="true"
        aria-labelledby="hero-title"
      >
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-glow hero-glow-one" aria-hidden="true" />
        <div className="hero-glow hero-glow-two" aria-hidden="true" />

        <header className="site-header">
          <a className="wordmark" href="#top" aria-label="返回首页顶部">
            <span className="wordmark-index">PDL</span>
            <span className="wordmark-name">文化数字馆</span>
          </a>
          <p className="site-note">一个非官方的文化观察项目</p>
        </header>

        <div id="top" className="hero-core">
          <p className="hero-eyebrow">
            <span>01</span>
            从标签走向理解
          </p>
          <h1 id="hero-title" className="hero-title">
            <span className="title-question">不要只停留在表面——</span>
            <span>理解胖东来</span>
            <span className="title-answer">从理解人开始。</span>
          </h1>
          <p className="hero-intro">
            网络给了它无数标签。我们试着把标签拆开，
            <br className="desktop-break" />
            看见制度、选择，以及身处其中的人。
          </p>

          <nav className="hero-actions" aria-label="首页快速入口">
            <a className="anchor-link anchor-primary" href="#explore" onClick={handleAnchorClick}>
              <span className="anchor-code" aria-hidden="true">A</span>
              <span className="anchor-copy">
                <small>越过标签</small>
                向下探索
              </span>
              <span className="anchor-arrow" aria-hidden="true">↓</span>
            </a>
            <a className="anchor-link anchor-dialogue" href="#ai-dialogue" onClick={handleAnchorClick}>
              <span className="anchor-code" aria-hidden="true">B</span>
              <span className="anchor-copy">
                <small>提出你的问题</small>
                与胖东来对话
              </span>
              <span className="anchor-arrow" aria-hidden="true">↘</span>
            </a>
          </nav>
        </div>

        <div className="keyword-field" aria-hidden="true">
          {keywords.map((keyword, index) => (
            <span
              key={keyword.label}
              className="keyword-entry"
              data-index={index + 1}
              style={getKeywordStyle(keyword, index)}
            >
              <span className="keyword-drift">
                <span className={`keyword keyword-${keyword.tone}`}>
                  {keyword.label.slice(0, -1)}
                  <b>？</b>
                </span>
              </span>
            </span>
          ))}
        </div>

        <div className="scroll-cue" aria-hidden="true">
          <span>SCROLL TO UNLEARN</span>
          <i />
        </div>
      </section>

      <section id="explore" className="explore-section" tabIndex={-1} aria-label="探索主题">
        <div className="section-shell">
          <div className="lens-grid">
            {lenses.map((lens) => (
              <article className="lens-card" key={lens.number}>
                <div className="lens-meta">
                  <span>{lens.number}</span>
                  <span>{lens.kicker}</span>
                </div>
                <h3>{lens.title}</h3>
                <p>{lens.copy}</p>
              </article>
            ))}
          </div>

          <aside className="next-chapters" aria-label="内容板块">
            <button className="chapter-card chapter-card-link" type="button" onClick={openStoreDirectory} aria-expanded={storesOpen} aria-controls="store-directory">
              <span className="chapter-index">01</span>
              <h3>查看各个门店<br />信息、位置等具体情况</h3>
              <span className="chapter-arrow" aria-hidden="true">{storesOpen ? "↑" : "↘"}</span>
            </button>
            <article className="chapter-card">
              <span className="chapter-index">02</span>
              <h3>查看热点事件</h3>
            </article>
          </aside>
        </div>
      </section>

      <section ref={storeDirectoryRef} id="store-directory" className={`store-section${storesOpen ? " is-open" : ""}`} tabIndex={-1} aria-labelledby="store-directory-title" aria-hidden={!storesOpen}>
        <div className="section-shell">
          <div className="store-heading">
            <div>
              <p>STORE DIRECTORY</p>
              <h2 id="store-directory-title">门店地图</h2>
            </div>
            <p>共 14 家门店。查看地址、营业时间与官方门店照片。</p>
          </div>

          <p className="store-notice">营业时间可能因节假日、天气或现场安排调整，请以门店当天提示为准。</p>

          {storeRegions.map((region, regionIndex) => {
            const regionOffset = storeRegions.slice(0, regionIndex).reduce((total, previousRegion) => total + previousRegion.stores.length, 0);

            return (
            <div className="store-region" key={region.city}>
              <h3>{region.city}</h3>
              <div className="store-grid">
                {region.stores.map((store, storeIndex) => (
                  <article className="store-card" key={store.name} style={{ "--store-delay": `${(regionOffset + storeIndex) * 85}ms` } as CSSProperties}>
                    <a className="store-photo-link" href="https://web.azpdl.cn/" target="_blank" rel="noreferrer" aria-label={`前往胖东来官网了解${store.name}`}>
                      <img src={store.photoUrl} alt={`${store.name}官方门店照片`} loading="lazy" />
                      <span>前往官网 ↗</span>
                    </a>
                    <div className="store-card-body">
                      <h4>{store.name}</h4>
                      <dl>
                        <div>
                          <dt>营业时间</dt>
                          <dd>{formatStoreHours(store.tuesdayOpen)}</dd>
                        </div>
                        <div>
                          <dt>位置</dt>
                          <dd>{store.address}</dd>
                        </div>
                      </dl>
                      <a className="store-map-link" href={`https://map.baidu.com/search/${encodeURIComponent(store.address)}`} target="_blank" rel="noreferrer">
                        在地图中查看 ↗
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </div>
            );
          })}

          <p className="store-credit">门店地址、营业规则与图片来自胖东来官网。</p>
        </div>
      </section>

      <section
        id="ai-dialogue"
        className="dialogue-section"
        tabIndex={-1}
        aria-labelledby="dialogue-title"
      >
        <div className="section-shell dialogue-layout">
          <h2 id="dialogue-title" className="dialogue-title-sr">
            与胖东来对话
          </h2>

          <RagChat />

          <div className="dialogue-window dialogue-window-prototype" aria-label="AI 问答概念界面">
            <div className="dialogue-bar">
              <span>PDL CULTURE / ASK</span>
              <span className="dialogue-state">结构示例</span>
            </div>
            <div className="message message-user">
              <span>你的问题</span>
              <p>“自由与爱”在具体管理制度里，意味着什么？</p>
            </div>
            <div className="message message-ai">
              <span>文化馆回答</span>
              <p>
                我会先区分企业表达、媒体叙述与员工体验，再把能被核验的制度与案例列出来。
              </p>
              <div className="answer-structure">
                <span>01 / 概念背景</span>
                <span>02 / 现实做法</span>
                <span>03 / 来源与争议</span>
              </div>
            </div>
            <div className="question-shell">
              <label htmlFor="prototype-question">继续追问</label>
              <div>
                <input
                  id="prototype-question"
                  type="text"
                  value="问一个关于胖东来文化的问题…"
                  readOnly
                  aria-describedby="prototype-help"
                />
                <button type="button" disabled aria-label="发送功能开发中">发送</button>
              </div>
              <small id="prototype-help">问答功能将在资料库完成后开放</small>
            </div>
          </div>
        </div>

        <footer className="site-footer">
          <span>胖东来文化数字馆 / PDL CULTURE ARCHIVE</span>
          <a href="#top" onClick={handleAnchorClick}>回到表面 ↑</a>
        </footer>
      </section>
    </main>
  );
}
