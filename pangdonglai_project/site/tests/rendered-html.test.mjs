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

test("keeps store content and chat contract outside their UI and Worker entrypoints", async () => {
  const [page, worker, storeDirectory, sharedChat] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../worker/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../data/store-directory.json", import.meta.url), "utf8"),
    readFile(new URL("../shared/chat.ts", import.meta.url), "utf8"),
  ]);

  assert.match(page, /@\/data\/stores/);
  assert.match(page, /@\/shared\/chat/);
  assert.doesNotMatch(page, /const storeRegions/);
  assert.match(worker, /from "\.\.\/shared\/chat"/);
  assert.doesNotMatch(worker, /type ChatSource =/);
  assert.match(sharedChat, /export type ChatRequestMessage/);

  const regions = JSON.parse(storeDirectory);
  assert.equal(regions.flatMap((region) => region.stores).length, 14);
});

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
  assert.match(html, /aria-controls="store-directory"/);
  assert.match(html, /与胖东来对话/);
  assert.match(html, /id="explore"/);
  assert.match(html, /id="ai-dialogue"/);
  assert.match(html, /id="store-directory"/);
  assert.match(html, /aria-hidden="true"/);
  assert.match(html, /BM25 本地检索/);
  assert.match(html, /输入你的问题/);
  for (const storeName of ["许昌天使城", "许昌时代广场", "许昌生活广场", "许昌大众服饰", "许昌金三角店", "许昌云鼎店", "许昌北海店", "许昌金汇店", "许昌劳动店", "许昌人民店", "禹州店", "新乡大胖", "新乡二胖", "新乡三胖"]) {
    assert.match(html, new RegExp(storeName));
  }
  assert.equal((html.match(/<img[^>]+alt="[^"]*官方门店照片"/g) ?? []).length, 14);
  assert.equal((html.match(/href="https:\/\/web\.azpdl\.cn\/"/g) ?? []).length, 14);
});

test("streams BM25-grounded DeepSeek tokens and verified sources", async () => {
  const originalFetch = globalThis.fetch;
  let deepseekRequest;

  globalThis.fetch = async (input, init) => {
    if (String(input) === "https://api.deepseek.com/chat/completions") {
      deepseekRequest = JSON.parse(init.body);
      return new Response(
        [
          'data: {"choices":[{"delta":{"content":"测试"}}]}\n\n',
          'data: {"choices":[{"delta":{"content":"回答"}}]}\n\n',
          "data: [DONE]\n\n",
        ].join(""),
        { headers: { "content-type": "text/event-stream" } },
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
    assert.match(response.headers.get("content-type") ?? "", /^text\/event-stream\b/i);
    const body = await response.text();
    assert.match(body, /"type":"delta","content":"测试"/);
    assert.match(body, /"type":"delta","content":"回答"/);
    assert.match(body, /"type":"sources","sources":\[{"title":"胖东来各门店信息","url":"https:\/\/web\.azpdl\.cn\/contact","verifiedAt":"2026-07-24"}\]/);
    assert.match(body, /"type":"done"/);
    assert.equal(deepseekRequest.stream, true);
    assert.match(deepseekRequest.messages[0].content, /DeepSeek 模型 deepseek-v4-flash/);
    assert.match(deepseekRequest.messages[0].content, /常规营业安排与周二闭店说明/);
    assert.match(deepseekRequest.messages[0].content, /只能依据下方“检索到的资料”回答具体事实/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("does not attach store sources when only the generic brand name matches", async () => {
  const originalFetch = globalThis.fetch;
  let deepseekRequest;

  globalThis.fetch = async (input, init) => {
    if (String(input) === "https://api.deepseek.com/chat/completions") {
      deepseekRequest = JSON.parse(init.body);
      return new Response(
        'data: {"choices":[{"delta":{"content":"资料不足"}}]}\n\ndata: [DONE]\n\n',
        { headers: { "content-type": "text/event-stream" } },
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
        body: JSON.stringify({ messages: [{ role: "user", content: "胖东来酱油怎么样？" }] }),
      },
      { DEEPSEEK_API_KEY: "test-key" },
    );

    const body = await response.text();
    assert.match(deepseekRequest.messages[0].content, /本次检索没有命中任何已审核资料/);
    assert.doesNotMatch(body, /"type":"sources"/);
    assert.match(body, /"type":"done"/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("retrieves limited L3 book chunks for how-to-learn questions", async () => {
  const originalFetch = globalThis.fetch;
  let deepseekRequest;

  globalThis.fetch = async (input, init) => {
    if (String(input) === "https://api.deepseek.com/chat/completions") {
      deepseekRequest = JSON.parse(init.body);
      return new Response(
        'data: {"choices":[{"delta":{"content":"据书中讨论"}}]}\n\ndata: [DONE]\n\n',
        { headers: { "content-type": "text/event-stream" } },
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
        body: JSON.stringify({
          messages: [{ role: "user", content: "怎么学胖东来？只学高福利和服务话术够吗？" }],
        }),
      },
      { DEEPSEEK_API_KEY: "test-key" },
    );

    assert.equal(response.status, 200);
    const prompt = deepseekRequest.messages[0].content;
    assert.match(prompt, /胖东来，你要怎么学/);
    assert.match(prompt, /高福利|服务话术|表面/);
    assert.doesNotMatch(prompt, /本次检索没有命中任何已审核资料/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects chat payloads longer than the server message cap with a clear error", async () => {
  const longHistory = Array.from({ length: 17 }, (_, index) => ({
    role: index % 2 === 0 ? "user" : "assistant",
    content: `消息${index + 1}`,
  }));
  // Ensure last is user
  longHistory[longHistory.length - 1] = { role: "user", content: "最后一问" };

  const response = await render(
    "/api/chat",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: longHistory }),
    },
    { DEEPSEEK_API_KEY: "test-key" },
  );

  assert.equal(response.status, 400);
  const data = await response.json();
  assert.match(String(data.error), /最多 16 条/);
});

test("accepts a 12-message sliding window that ends with a user turn", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    if (String(input) === "https://api.deepseek.com/chat/completions") {
      return new Response(
        'data: {"choices":[{"delta":{"content":"ok"}}]}\n\ndata: [DONE]\n\n',
        { headers: { "content-type": "text/event-stream" } },
      );
    }
    return originalFetch(input);
  };

  try {
    const messages = [];
    for (let i = 0; i < 5; i += 1) {
      messages.push({ role: "user", content: `问${i + 1}` });
      messages.push({ role: "assistant", content: `答${i + 1}` });
    }
    messages.push({ role: "user", content: "问6" });

    const response = await render(
      "/api/chat",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages }),
      },
      { DEEPSEEK_API_KEY: "test-key" },
    );

    assert.equal(response.status, 200);
    assert.match(await response.text(), /"type":"done"/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("marks approved media interview evidence as an attributed claim", async () => {
  const originalFetch = globalThis.fetch;
  let deepseekRequest;

  globalThis.fetch = async (input, init) => {
    if (String(input) === "https://api.deepseek.com/chat/completions") {
      deepseekRequest = JSON.parse(init.body);
      return new Response(
        'data: {"choices":[{"delta":{"content":"访谈摘要"}}]}\n\ndata: [DONE]\n\n',
        { headers: { "content-type": "text/event-stream" } },
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
        body: JSON.stringify({ messages: [{ role: "user", content: "胖东来为什么不盲目扩张？" }] }),
      },
      { DEEPSEEK_API_KEY: "test-key" },
    );

    const body = await response.text();
    const prompt = deepseekRequest.messages[0].content;
    assert.match(prompt, /公开访谈中的受访者表述/);
    assert.match(prompt, /据《人民日报》2025 年访谈/);
    assert.doesNotMatch(prompt, /L2|attributed_claim/);
    assert.match(body, /人民日报于东来访谈/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("keeps a limited event response inside its case and forbids finality language", async () => {
  const originalFetch = globalThis.fetch;
  let deepseekRequest;

  globalThis.fetch = async (input, init) => {
    if (String(input) === "https://api.deepseek.com/chat/completions") {
      deepseekRequest = JSON.parse(init.body);
      return new Response(
        'data: {"choices":[{"delta":{"content":"企业初步回应"}}]}\n\ndata: [DONE]\n\n',
        { headers: { "content-type": "text/event-stream" } },
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
        body: JSON.stringify({ messages: [{ role: "user", content: "茶叶苍蝇反馈后企业公开怎么说的？是最终结论吗？" }] }),
      },
      { DEEPSEEK_API_KEY: "test-key" },
    );

    const body = await response.text();
    const prompt = deepseekRequest.messages[0].content;
    assert.match(prompt, /【这次问题的回答边界】/);
    assert.match(prompt, /顾客反馈茶叶问题后的企业公开初步说明/);
    assert.match(prompt, /目前能看到的是企业当时的公开回应，后续调查结论尚未见到/);
    assert.match(prompt, /用户是否在问后续结论：是/);
    assert.match(prompt, /不得引用其他案例或企业理念资料来裁定本案例事实/);
    assert.doesNotMatch(prompt, /人民日报于东来访谈/);
    assert.doesNotMatch(prompt, /胖东来简介/);
    assert.doesNotMatch(prompt, /L1|L2|caseId|claimType|finality|preliminary_only|资料说明/);
    assert.match(body, /顾客抖音反馈茶叶问题后的企业公开初步说明/);
    assert.match(body, /"claimType":"company_preliminary_response"/);
    assert.match(body, /"finality":"preliminary"/);
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
