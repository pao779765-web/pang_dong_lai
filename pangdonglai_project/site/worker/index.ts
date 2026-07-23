/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DEEPSEEK_API_KEY?: string;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

type ChatRole = "user" | "assistant";

type ChatMessage = {
  role: ChatRole;
  content: string;
};

const SYSTEM_PROMPT = `你是“胖东来文化资料助手”，一个非官方的对话助手。
当前版本尚未接入资料检索、门店数据库或新闻档案。你可以进行一般性对话和帮助用户梳理问题，但不得把未经核验的信息说成事实。
当用户询问具体门店、政策、日期、人物、经营数据或争议事件时，请明确说明“当前版本没有接入可核验资料，建议以官方渠道或原始报道为准”。
请使用简洁、友好、克制的中文回答；不杜撰来源，不假装代表胖东来。`;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function readMessages(value: unknown): ChatMessage[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 10) {
    return null;
  }

  const messages: ChatMessage[] = [];
  for (const item of value) {
    if (
      !item ||
      typeof item !== "object" ||
      !["user", "assistant"].includes((item as { role?: unknown }).role as string) ||
      typeof (item as { content?: unknown }).content !== "string"
    ) {
      return null;
    }

    const role = (item as { role: ChatRole }).role;
    const content = (item as { content: string }).content.trim();
    if (!content || content.length > 1200) {
      return null;
    }
    messages.push({ role, content });
  }

  return messages;
}

async function handleChat(request: Request, env: Env) {
  if (request.method !== "POST") {
    return json({ error: "仅支持 POST 请求。" }, 405);
  }

  if (!env.DEEPSEEK_API_KEY) {
    return json({ error: "本地尚未配置 DeepSeek API Key。" }, 503);
  }

  let payload: { messages?: unknown };
  try {
    payload = await request.json();
  } catch {
    return json({ error: "请求格式不正确。" }, 400);
  }

  const messages = readMessages(payload.messages);
  if (!messages || messages.at(-1)?.role !== "user") {
    return json({ error: "请先输入一个有效的问题。" }, 400);
  }

  let upstream: Response;
  try {
    upstream = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-v4-flash",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        thinking: { type: "disabled" },
        max_tokens: 700,
        stream: false,
      }),
    });
  } catch {
    return json({ error: "暂时无法连接 AI 服务，请稍后重试。" }, 502);
  }

  if (!upstream.ok) {
    return json({ error: "AI 服务暂时无法回答，请稍后重试。" }, 502);
  }

  let result: { choices?: Array<{ message?: { content?: unknown } }> };
  try {
    result = await upstream.json();
  } catch {
    return json({ error: "AI 服务返回了无法识别的内容。" }, 502);
  }

  const content = result.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    return json({ error: "AI 服务没有返回有效回答，请稍后重试。" }, 502);
  }

  return json({ message: content.trim() });
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/chat") {
      return handleChat(request, env);
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
