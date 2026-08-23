"use client";

/* eslint-disable @next/next/no-img-element -- 门店照片托管在 public/stores，避免官网图床防盗链。 */

import type { CSSProperties, FormEvent, MouseEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { hotspotEvents } from "@/data/hotspots";
import type { HotspotCredibility, HotspotEvent } from "@/data/hotspots";
import { storeRegions } from "@/data/stores";
import type { ChatRequestMessage, ChatSource } from "@/shared/chat";

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

type ChatMessage = ChatRequestMessage & {
  id: string;
  sources?: ChatSource[];
  isStreaming?: boolean;
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

function formatStoreHours(tuesdayOpen: boolean) {
  return `夏季（6–8月）09:30–21:30；其他月份：周一、三、四、日 09:30–21:00，周五、六 09:30–21:30；周二${tuesdayOpen ? "正常营业" : "闭店"}`;
}

function ChapterArrow({ expanded }: { expanded: boolean }) {
  return (
    <span className="chapter-arrow" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        {expanded ? <path d="M5 14.5 12 7.5l7 7" /> : <path d="M7 17 17 7M9 7h8v8" />}
      </svg>
    </span>
  );
}

const suggestedQuestions = ["胖东来周二是否闭店？", "茶叶反馈后企业公开怎么说的？是最终结论吗？", "新乡三胖在哪里？"];

const credibilityLabels: Record<HotspotCredibility, string> = {
  official: "官方",
  media: "第三方媒体",
  selfMedia: "自媒体",
  rumor: "传言",
  boundary: "资料边界",
};

const HOTSPOT_QUESTION_EVENT = "pdl:hotspot-question";

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

/** UI may keep full history; only this many non-empty messages are sent to the API (under server cap of 16). */
const CHAT_API_HISTORY_WINDOW = 12;

function toApiMessages(history: ChatMessage[]) {
  return history
    .filter((message) => message.content.trim())
    .map(({ role, content: messageContent }) => ({ role, content: messageContent }))
    .slice(-CHAT_API_HISTORY_WINDOW);
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
  const dialogueBodyRef = useRef<HTMLDivElement>(null);
  const questionFormRef = useRef<HTMLFormElement>(null);
  const pendingHotspotQuestionRef = useRef<string | null>(null);

  useEffect(() => {
    const body = dialogueBodyRef.current;
    if (!body) return;
    body.scrollTo({ top: body.scrollHeight, behavior: "smooth" });
  }, [messages, isSending]);

  useEffect(() => {
    const handleHotspotQuestion = (event: Event) => {
      const question = (event as CustomEvent<unknown>).detail;
      if (typeof question !== "string" || !question.trim()) return;

      const normalizedQuestion = question.trim();
      setDraft(normalizedQuestion);
      pendingHotspotQuestionRef.current = normalizedQuestion;
    };

    window.addEventListener(HOTSPOT_QUESTION_EVENT, handleHotspotQuestion);
    return () => window.removeEventListener(HOTSPOT_QUESTION_EVENT, handleHotspotQuestion);
  }, []);

  useEffect(() => {
    const pendingQuestion = pendingHotspotQuestionRef.current;
    if (!pendingQuestion || isSending || draft !== pendingQuestion) return;

    pendingHotspotQuestionRef.current = null;
    questionFormRef.current?.requestSubmit();
  }, [draft, isSending]);

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

    const requestController = new AbortController();
    const requestTimeout = window.setTimeout(() => requestController.abort(), 50_000);

    try {
      const apiMessages = toApiMessages(nextMessages);
      if (apiMessages.length === 0 || apiMessages.at(-1)?.role !== "user") {
        throw new Error("请先输入一个有效的问题。");
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
        }),
        signal: requestController.signal,
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
      let message = "暂时无法获得回答，请稍后重试。";
      if (error instanceof DOMException && error.name === "AbortError") {
        message = "这次回答等待时间过长，请稍后重试。";
      } else if (error instanceof TypeError) {
        // Browser "Failed to fetch" when dev server is down, wrong port, or network blocked.
        message = "无法连接本地问答接口。请确认已在 site 目录运行 npm run dev，页面地址为 http://localhost:3000，然后刷新重试。";
      } else if (error instanceof Error && error.message) {
        message = error.message;
      }
      setChatError(message);
      setMessages((current) => current.map((message) => (
        message.id === assistantId ? { ...message, isStreaming: false } : message
      )));
    } finally {
      window.clearTimeout(requestTimeout);
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
          非官方资料助手 · 基于已审核资料回答
        </span>
      </header>

      <div ref={dialogueBodyRef} className="dialogue-body" aria-live="polite" aria-busy={isSending}>
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
                              {source.caseTitle} · {source.claimType === "company_preliminary_response" ? "企业初步回应" : source.claimType === "company_investigation_report" ? "企业调查报告" : source.claimType === "company_litigation_notice" ? "企业诉讼公示" : source.claimType === "court_civil_judgment_report" ? "民事判决报道" : source.claimType === "social_party_claim" ? "社交平台表述" : source.claimType} · {source.finality === "preliminary" ? "非最终结论" : source.finality === "no_regulatory_final" ? "未见监管终局" : source.finality === "civil_judgment_public" ? "民事判决已公开" : source.finality === "company_report_stage" ? "企业报告阶段" : source.finality === "litigation_stage" ? "诉讼阶段" : source.finality}
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

      <form ref={questionFormRef} className="question-shell" onSubmit={handleSubmit}>
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
  const chaptersRef = useRef<HTMLElement>(null);
  const storeDirectoryRef = useRef<HTMLElement>(null);
  const hotspotArchiveRef = useRef<HTMLElement>(null);
  const hotspotIndexRef = useRef<HTMLDivElement>(null);
  const hotspotDetailRef = useRef<HTMLDivElement>(null);
  const storeToggleRef = useRef<HTMLButtonElement>(null);
  const hotspotToggleRef = useRef<HTMLButtonElement>(null);
  const [storesOpen, setStoresOpen] = useState(false);
  const [storesClosing, setStoresClosing] = useState(false);
  const [hotspotOpen, setHotspotOpen] = useState(false);
  const [hotspotClosing, setHotspotClosing] = useState(false);
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotEvent | null>(null);
  const [showChatFab, setShowChatFab] = useState(false);

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

  // 二期移动端：对话区不在视口时显示底部快捷入口
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const dialogue = document.getElementById("ai-dialogue");
    if (!dialogue) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowChatFab(!entry.isIntersecting);
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(dialogue);
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

  function askHotspotQuestion(question: string) {
    const dialogue = document.getElementById("ai-dialogue");
    if (!dialogue) return;

    const contextualQuestion = selectedHotspot
      ? `${selectedHotspot.followUpPrompt}\n\n补充追问：${question}`
      : question;
    window.dispatchEvent(new CustomEvent(HOTSPOT_QUESTION_EVENT, { detail: contextualQuestion }));
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    dialogue.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    window.history.replaceState(null, "", "#ai-dialogue");
  }

  function openStoreDirectory() {
    if (storesOpen && !storesClosing) {
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      setStoresClosing(true);
      storeToggleRef.current?.focus({ preventScroll: true });
      chaptersRef.current?.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "center",
      });
      window.history.replaceState(null, "", "#explore");
      window.setTimeout(() => {
        setStoresOpen(false);
        setStoresClosing(false);
      }, reducedMotion ? 0 : 760);
      return;
    }

    if (storesClosing) return;

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

  function openHotspotArchive() {
    if (hotspotOpen && !hotspotClosing) {
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      setHotspotClosing(true);
      hotspotToggleRef.current?.focus({ preventScroll: true });
      chaptersRef.current?.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "center",
      });
      window.history.replaceState(null, "", "#explore");
      window.setTimeout(() => {
        setHotspotOpen(false);
        setHotspotClosing(false);
        setSelectedHotspot(null);
      }, reducedMotion ? 0 : 620);
      return;
    }

    if (hotspotClosing) return;

    setHotspotOpen(true);
    window.requestAnimationFrame(() => {
      const target = hotspotArchiveRef.current;
      if (!target) return;

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
      window.history.replaceState(null, "", "#hotspot-archive");
      window.setTimeout(() => target.focus({ preventScroll: true }), reducedMotion ? 0 : 560);
    });
  }

  function selectHotspot(event: HotspotEvent) {
    if (hotspotClosing) return;

    setSelectedHotspot(event);
    window.requestAnimationFrame(() => {
      const target = hotspotDetailRef.current;
      if (!target) return;

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
      window.history.replaceState(null, "", `#hotspot-${event.id}`);
      window.setTimeout(() => target.focus({ preventScroll: true }), reducedMotion ? 0 : 520);
    });
  }

  function showHotspotIndex() {
    if (hotspotClosing) return;

    setSelectedHotspot(null);
    window.requestAnimationFrame(() => {
      const target = hotspotIndexRef.current;
      if (!target) return;

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
      window.history.replaceState(null, "", "#hotspot-archive");
      window.setTimeout(() => target.focus({ preventScroll: true }), reducedMotion ? 0 : 420);
    });
  }

  return (
    <main>
      <a className="skip-link" href="#explore">
        跳到正文内容
      </a>
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
          <aside ref={chaptersRef} className="next-chapters" aria-label="内容板块">
            <button ref={storeToggleRef} className={`chapter-card chapter-card-link${storesOpen && !storesClosing ? " is-expanded" : ""}`} type="button" onClick={openStoreDirectory} aria-expanded={storesOpen && !storesClosing} aria-controls="store-directory">
              <span className="chapter-index" aria-hidden="true">01</span>
              <span className="chapter-body">
                <h3>{storesOpen && !storesClosing ? <>收起门店<br />信息</> : <>查看各个门店<br />信息、位置等具体情况</>}</h3>
                <ChapterArrow expanded={storesOpen && !storesClosing} />
              </span>
            </button>
            <button
              ref={hotspotToggleRef}
              className={`chapter-card chapter-card-link hotspot-chapter-card${hotspotOpen && !hotspotClosing ? " is-expanded" : ""}`}
              type="button"
              onClick={openHotspotArchive}
              aria-expanded={hotspotOpen && !hotspotClosing}
              aria-controls="hotspot-archive"
            >
              <span className="chapter-index" aria-hidden="true">02</span>
              <span className="chapter-body">
                <h3>{hotspotOpen && !hotspotClosing ? <>收起热点<br />档案</> : <>查看热点<br />事件</>}</h3>
                <ChapterArrow expanded={hotspotOpen && !hotspotClosing} />
              </span>
            </button>
          </aside>
        </div>
      </section>

      <section
        ref={hotspotArchiveRef}
        id="hotspot-archive"
        className={`hotspot-section${hotspotOpen ? " is-open" : ""}${hotspotClosing ? " is-closing" : ""}${selectedHotspot ? " has-detail" : " has-index"}`}
        tabIndex={-1}
        aria-labelledby="hotspot-archive-title"
        aria-hidden={!hotspotOpen || hotspotClosing}
        inert={!hotspotOpen || hotspotClosing ? true : undefined}
      >
        <div className="hotspot-section-clip">
          <div className="hotspot-section-inner">
            <div className="section-shell">
              <h2 id="hotspot-archive-title" className="visually-hidden">热点档案</h2>

              {selectedHotspot ? (
                <>
                  <div ref={hotspotDetailRef} className="hotspot-detail-view" tabIndex={-1}>
                  <div className="hotspot-detail-toolbar">
                    <button type="button" className="hotspot-back-link" onClick={showHotspotIndex}>
                      <span aria-hidden="true">←</span> 返回事件索引
                    </button>
                    <div className="hotspot-file-meta" aria-label="档案信息">
                      <span>资料更新至 {selectedHotspot.updatedAt.replaceAll("-", ".")}</span>
                      <span>{selectedHotspot.sources.length} 个已审核来源</span>
                    </div>
                  </div>

                  <article className="hotspot-featured">
                    <div className="hotspot-featured-copy">
                      <div className="hotspot-meta-row">
                        <span className="hotspot-status">{selectedHotspot.status}</span>
                      </div>
                      <h3>{selectedHotspot.title}</h3>
                      <time className="hotspot-title-date" dateTime={selectedHotspot.happenedAt}>
                        事件日期 {selectedHotspot.happenedAt.replaceAll("-", ".")}
                      </time>
                      <p className="hotspot-summary">{selectedHotspot.summary}</p>
                      <div className="hotspot-known">
                        <h4>目前能确认的事实</h4>
                        <p>{selectedHotspot.known}</p>
                      </div>
                    </div>

                    <aside className="hotspot-status-card" aria-label="事件资料状态">
                      <span>当前结论级别</span>
                      <strong>{selectedHotspot.status}</strong>
                      <p>{selectedHotspot.statusNote}</p>
                      <dl className="hotspot-status-facts">
                        <div>
                          <dt>事件发生</dt>
                          <dd>{selectedHotspot.happenedAt.replaceAll("-", ".")}</dd>
                        </div>
                        <div>
                          <dt>资料更新</dt>
                          <dd>{selectedHotspot.updatedAt.replaceAll("-", ".")}</dd>
                        </div>
                      </dl>
                    </aside>
                  </article>

                  <section className="hotspot-evidence" aria-label="来源类型">
                    <dl className="hotspot-evidence-ledger">
                      {selectedHotspot.evidence.map((item) => {
                        const sources = selectedHotspot.sources.filter((source) => source.credibility === item.credibility);

                        return (
                          <div className={`hotspot-evidence-row is-${item.credibility}`} key={item.credibility}>
                            <dt>
                              <span className="hotspot-credibility-dot" aria-hidden="true" />
                              {item.label}
                            </dt>
                            <dd>
                              <strong>{item.title}</strong>
                              <p>{item.detail}</p>
                              <div className="hotspot-evidence-source-list" aria-label={`${item.label}来源链接`}>
                                {sources.length > 0 ? sources.map((source) => source.url ? (
                                  <a
                                    className="hotspot-evidence-source-link"
                                    key={source.url}
                                    href={source.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    aria-label={`打开来源：${source.title}`}
                                  >
                                    <span className="hotspot-evidence-source-name">{source.title}</span>
                                    <span className="hotspot-evidence-source-meta">{source.publisher} · {source.type} · {source.publishedAt}</span>
                                    <span className="hotspot-evidence-source-action">打开来源</span>
                                  </a>
                                ) : (
                                  <span className="hotspot-evidence-source-link is-pending" key={source.title}>
                                    <span className="hotspot-evidence-source-name">{source.title}</span>
                                    <span className="hotspot-evidence-source-meta">{source.publisher} · {source.type} · {source.publishedAt}</span>
                                    <span className="hotspot-evidence-source-action">链接待核验</span>
                                  </span>
                                )) : (
                                  <span className="hotspot-evidence-source-empty">当前没有单独收录的来源链接</span>
                                )}
                              </div>
                            </dd>
                          </div>
                        );
                      })}
                    </dl>
                  </section>

                  <div className="hotspot-detail-grid">
                    <div className="hotspot-timeline-block">
                      <div className="hotspot-block-heading">
                        <h3>事件时间线</h3>
                        <p>按时间和来源级别阅读，避免把传言、回应和报道混成同一种事实。</p>
                      </div>
                      <ol className="hotspot-timeline">
                        {selectedHotspot.timeline.map((item, index) => (
                          <li className={`hotspot-timeline-item is-${item.credibility}`} key={item.title} style={{ "--hotspot-delay": `${index * 90}ms` } as CSSProperties}>
                            <span className="hotspot-timeline-marker" aria-hidden="true" />
                            <div>
                              <div className="hotspot-timeline-meta">
                                <time>{item.date}</time>
                                <span className={`hotspot-credibility-badge is-${item.credibility}`}>
                                  <span className="hotspot-credibility-dot" aria-hidden="true" />
                                  {credibilityLabels[item.credibility]}
                                </span>
                              </div>
                              <h4>{item.title}</h4>
                              <p>{item.body}</p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>

                    <aside className="hotspot-reading-card">
                      <div>
                        <h3>以下内容无法确认</h3>
                        <ul className="hotspot-boundary-list">
                          {selectedHotspot.boundaries.map((boundary) => <li key={boundary}>{boundary}</li>)}
                        </ul>
                      </div>
                    </aside>
                  </div>

                  <button type="button" className="hotspot-detail-return" onClick={showHotspotIndex}>
                    <span aria-hidden="true">←</span> 返回热点事件索引
                  </button>
                  <section className="hotspot-question-panel hotspot-question-feature" aria-labelledby="hotspot-question-title">
                    <div className="hotspot-question-topline" aria-hidden="true">
                      <span className="hotspot-question-mark">Q</span>
                      <span>FOLLOW-UP / 资料助手</span>
                    </div>
                    <div className="hotspot-question-heading">
                      <div>
                        <h3 id="hotspot-question-title">继续追问</h3>
                        <p>{selectedHotspot.aiStatusNote}</p>
                      </div>
                      <span className="hotspot-question-context">当前事件上下文已带入</span>
                    </div>
                    <div className="hotspot-question-list">
                      {selectedHotspot.quickQuestions.map((question) => (
                        <button
                          type="button"
                          disabled={!selectedHotspot.aiReady}
                          key={question}
                          title={!selectedHotspot.aiReady ? selectedHotspot.aiStatusNote : undefined}
                          onClick={() => askHotspotQuestion(question)}
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                    <small>{selectedHotspot.aiReady ? "点击问题后会直接发送给资料助手。" : "待资料审核并获批入库后开放快捷提问。"}</small>
                  </section>
                  </div>
                </>
              ) : (
                <div ref={hotspotIndexRef} className="hotspot-index" tabIndex={-1} aria-label="热点新闻锚点">
                  <div className="hotspot-keyword-grid" role="list" aria-label="热点新闻锚点">
                    {hotspotEvents.map((event, index) => (
                      <div
                        role="listitem"
                        key={event.id}
                        style={{ "--hotspot-anchor-delay": `${Math.min(index * 80, 400)}ms` } as CSSProperties}
                      >
                        <button
                          className="hotspot-keyword-anchor"
                          type="button"
                          onClick={() => selectHotspot(event)}
                          aria-label={`打开${event.title}，事件日期 ${event.happenedAt.replaceAll("-", ".")}`}
                        >
                          <span className="hotspot-anchor-date"><span className="hotspot-anchor-date-label">事件日期</span><time dateTime={event.happenedAt}>{event.happenedAt.replaceAll("-", ".")}</time></span>
                          <span className="hotspot-anchor-title">{event.title}</span>
                          <span className="hotspot-anchor-arrow" aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedHotspot ? <p className="hotspot-credit">这是一个非官方观察项目。企业回应、媒体报道与司法结论会被分别标注。</p> : null}
            </div>
          </div>
        </div>
      </section>

      {selectedHotspot ? (
        <button
          type="button"
          className="hotspot-logo-collapse"
          onClick={showHotspotIndex}
          aria-label="使用胖东来标志收起新闻详情，返回热点事件索引"
        >
          <span className="hotspot-logo-wordmark" aria-hidden="true">
            <span className="hotspot-logo-emblem">
              <span className="hotspot-logo-flame" />
              <span className="hotspot-logo-monogram">DL</span>
            </span>
            <span className="hotspot-logo-name">PANDONG LAI</span>
          </span>
          <span className="hotspot-logo-caption">
            <span>收起</span>
            <span>档案</span>
          </span>
          <span className="hotspot-logo-arrow" aria-hidden="true">↑</span>
        </button>
      ) : null}

      <section ref={storeDirectoryRef} id="store-directory" className={`store-section${storesOpen ? " is-open" : ""}${storesClosing ? " is-closing" : ""}`} tabIndex={-1} aria-labelledby="store-directory-title" aria-hidden={!storesOpen || storesClosing}>
        <div className="store-section-clip">
          <div className="store-section-inner">
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
                  <article className="store-card" key={store.name} style={{ "--store-delay": `${(regionOffset + storeIndex) * 85}ms`, "--store-reverse-delay": `${(13 - (regionOffset + storeIndex)) * 30}ms` } as CSSProperties}>
                    <a className="store-photo-link" href="https://web.azpdl.cn/" target="_blank" rel="noreferrer" aria-label={`前往胖东来官网了解${store.name}`}>
                      <img
                        src={store.photoUrl}
                        alt={`${store.name}官方门店照片`}
                        width={800}
                        height={500}
                        sizes="(max-width: 760px) 92vw, (max-width: 1040px) 45vw, 33vw"
                        loading="lazy"
                        decoding="async"
                      />
                      <span aria-hidden="true">前往官网 ↗</span>
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
          </div>
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
        </div>

        <footer className="site-footer">
          <span>胖东来文化数字馆 / PDL CULTURE ARCHIVE</span>
          <a href="#top" onClick={handleAnchorClick}>回到表面 ↑</a>
        </footer>
      </section>

      <a
        className="mobile-chat-fab"
        href="#ai-dialogue"
        onClick={handleAnchorClick}
        hidden={!showChatFab || hotspotOpen}
        aria-label="前往与胖东来对话"
      >
        去提问
      </a>
    </main>
  );
}
