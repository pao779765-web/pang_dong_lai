import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
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
  assert.match(html, /非官方资料助手/);
  assert.match(html, /对话功能将在资料库准备完成后开放/);
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
