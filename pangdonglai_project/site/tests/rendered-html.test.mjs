import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/", init = {}, env = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const headers = new Headers(init.headers);
  headers.set("accept", "text/html");

  return worker.fetch(
    new Request(`http://localhost${path}`, { ...init, headers }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
      ...env,
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Pangdonglai culture homepage", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="zh-CN">/i);
  assert.match(html, /<title>胖东来文化数字馆｜从理解人开始<\/title>/i);
  assert.match(html, /不要只停留在表面——/);
  assert.match(html, /理解胖东来/);
  assert.match(html, /从理解人开始/);
  assert.match(html, /href="#explore"/);
  assert.match(html, /href="#ai-dialogue"/);
  assert.match(html, /与胖东来对话/);
  assert.match(html, /id="explore"/);
  assert.match(html, /id="ai-dialogue"/);
  assert.match(html, /BM25 本地检索/);
  assert.match(html, /当前已接入本地 BM25 检索/);
  assert.match(html, /输入你的问题/);
});

test("passes BM25 evidence to DeepSeek and returns verified sources", async () => {
  const originalFetch = globalThis.fetch;
  let deepseekRequest;

  globalThis.fetch = async (input, init) => {
    if (String(input) === "https://api.deepseek.com/chat/completions") {
      deepseekRequest = JSON.parse(init.body);
      return new Response(
        JSON.stringify({ choices: [{ message: { content: "测试回答" } }] }),
        { headers: { "content-type": "application/json" } },
      );
    }
    return originalFetch(input, init);
  };

  try {
    const response = await render(
      "/api/chat",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: "胖东来周二是否闭店？" }] }),
      },
      { DEEPSEEK_API_KEY: "test-key" },
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      message: "测试回答",
      sources: [
        {
          title: "胖东来各门店信息",
          url: "https://web.azpdl.cn/contact",
          verifiedAt: "2026-07-24",
        },
      ],
    });
    assert.match(deepseekRequest.messages[0].content, /常规营业安排与周二闭店说明/);
    assert.match(deepseekRequest.messages[0].content, /只能依据下方“检索到的资料”回答具体事实/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("keeps the DeepSeek key on the server", async () => {
  const response = await render("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "你好" }] }),
  });

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "本地尚未配置 DeepSeek API Key。" });
});

test("removes disposable starter-preview code and metadata", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(page, /SkeletonPreview|codex-preview|react-loading-skeleton/);
  assert.doesNotMatch(layout, /Starter Project|codex-preview|next\/font\/google/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await Promise.all([
    assert.rejects(
      access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)),
    ),
    assert.rejects(
      access(new URL("../app/_sites-preview/preview.css", import.meta.url)),
    ),
  ]);
});
