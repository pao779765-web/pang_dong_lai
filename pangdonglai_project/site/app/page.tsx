"use client";

import type { CSSProperties, MouseEvent } from "react";
import { useEffect, useRef } from "react";

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
  { label: "周二闭店？", x: 45, y: 88, dx: -10, dy: -11, duration: 21, delay: -4, tone: "copper" },
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

function getKeywordStyle(keyword: Keyword) {
  return {
    "--x": `${keyword.x}%`,
    "--y": `${keyword.y}%`,
    "--dx": `${keyword.dx}px`,
    "--dy": `${keyword.dy}px`,
    "--duration": `${keyword.duration}s`,
    "--delay": `${keyword.delay}s`,
  } as CSSProperties;
}

export default function Home() {
  const heroRef = useRef<HTMLElement>(null);

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
              className={`keyword keyword-${keyword.tone}`}
              data-index={index + 1}
              style={getKeywordStyle(keyword)}
            >
              {keyword.label.slice(0, -1)}
              <b>？</b>
            </span>
          ))}
        </div>

        <div className="scroll-cue" aria-hidden="true">
          <span>SCROLL TO UNLEARN</span>
          <i />
        </div>
      </section>

      <section id="explore" className="explore-section" tabIndex={-1} aria-labelledby="explore-title">
        <div className="section-shell">
          <div className="section-heading">
            <p className="section-index">A / EXPLORE</p>
            <h2 id="explore-title">标签很响亮，<br />理解需要证据。</h2>
            <p>
              这里不急着回答“胖东来好不好”，而是先建立一条从印象走向事实的路径。
              未来的门店、报道与文化资料，都会沿着这条路径被组织起来。
            </p>
          </div>

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

          <aside className="next-chapters" aria-label="后续内容规划">
            <div>
              <span className="next-kicker">接下来会被打开的三扇门</span>
              <p>门店地图 · 新闻档案 · 文化问答</p>
            </div>
            <span className="next-status">内容建设中</span>
          </aside>
        </div>
      </section>

      <section
        id="ai-dialogue"
        className="dialogue-section"
        tabIndex={-1}
        aria-labelledby="dialogue-title"
      >
        <div className="section-shell dialogue-layout">
          <div className="dialogue-copy">
            <p className="section-index section-index-light">B / DIALOGUE</p>
            <div className="prototype-label">胖东来文化资料助手（非官方）</div>
            <h2 id="dialogue-title">别只问它做了什么，<br />也问它为什么这样做。</h2>
            <p>
              未来，这里会连接经过整理的公开资料。回答会展示依据、区分事实与观点，
              并提醒你：一家企业的文化，不能被一句口号概括。
            </p>
            <p className="prototype-note">
              当前仅展示交互方向，尚未接入 AI 或真实资料库。
            </p>
          </div>

          <div className="dialogue-window" aria-label="AI 问答概念界面">
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
