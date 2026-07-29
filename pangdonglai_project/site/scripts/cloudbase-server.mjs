import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { fileURLToPath, pathToFileURL } from "node:url";

const siteRoot = fileURLToPath(new URL("..", import.meta.url));
const defaultClientDirectory = resolve(siteRoot, "dist", "client");
const workerEntryUrl = new URL("../dist/server/index.js", import.meta.url);

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

function getHeaderValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function requestUrl(request) {
  const forwardedProtocol = getHeaderValue(request.headers["x-forwarded-proto"]);
  const forwardedHost = getHeaderValue(request.headers["x-forwarded-host"]);
  const protocol = forwardedProtocol?.split(",")[0].trim() === "https" ? "https" : "http";
  const host = forwardedHost?.split(",")[0].trim() || request.headers.host || "localhost";
  return new URL(request.url || "/", `${protocol}://${host}`);
}

function requestHeaders(request) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) {
      value.forEach((item) => headers.append(name, item));
    } else if (typeof value === "string") {
      headers.set(name, value);
    }
  }
  return headers;
}

function toWebRequest(request) {
  const method = request.method || "GET";
  const init = {
    method,
    headers: requestHeaders(request),
  };

  if (method !== "GET" && method !== "HEAD") {
    init.body = Readable.toWeb(request);
    init.duplex = "half";
  }

  return new Request(requestUrl(request), init);
}

async function sendWebResponse(response, nodeResponse) {
  nodeResponse.statusCode = response.status;
  if (response.statusText) nodeResponse.statusMessage = response.statusText;

  for (const [name, value] of response.headers) {
    nodeResponse.setHeader(name, value);
  }

  if (!response.body) {
    nodeResponse.end();
    return;
  }

  await pipeline(Readable.fromWeb(response.body), nodeResponse);
}

function safeAssetPath(clientDirectory, pathname) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const relativePath = decodedPath.replace(/^\/+/, "");
  if (!relativePath || relativePath.includes("\0")) return null;

  const root = resolve(clientDirectory);
  const candidate = resolve(root, relativePath);
  return candidate.startsWith(`${root}${sep}`) ? candidate : null;
}

export function createAssetFetcher(clientDirectory = defaultClientDirectory) {
  return async function fetchAsset(request) {
    const url = new URL(request.url);
    const assetPath = safeAssetPath(clientDirectory, url.pathname);
    if (!assetPath) return new Response("Not found", { status: 404 });

    let assetStat;
    try {
      assetStat = await stat(assetPath);
    } catch {
      return new Response("Not found", { status: 404 });
    }
    if (!assetStat.isFile()) return new Response("Not found", { status: 404 });

    const headers = new Headers({
      "content-length": String(assetStat.size),
      "content-type": contentTypes.get(extname(assetPath).toLowerCase()) || "application/octet-stream",
      "x-content-type-options": "nosniff",
    });
    headers.set(
      "cache-control",
      url.pathname.startsWith("/assets/")
        ? "public, max-age=31536000, immutable"
        : "public, max-age=300",
    );

    if (request.method === "HEAD") {
      return new Response(null, { status: 200, headers });
    }
    return new Response(Readable.toWeb(createReadStream(assetPath)), { status: 200, headers });
  };
}

function createPassthroughImageService() {
  return {
    input(stream) {
      return {
        transform() {
          return {
            async output({ format }) {
              return {
                response() {
                  return new Response(stream, {
                    headers: { "content-type": `image/${format}` },
                  });
                },
              };
            },
          };
        },
      };
    },
  };
}

export async function createCloudBaseServer(options = {}) {
  const worker = options.worker ?? (await import(workerEntryUrl.href)).default;
  const fetchAsset = createAssetFetcher(options.clientDirectory);
  const runtimeEnv = {
    ASSETS: { fetch: fetchAsset },
    IMAGES: createPassthroughImageService(),
    DEEPSEEK_API_KEY: options.deepseekApiKey ?? process.env.DEEPSEEK_API_KEY,
    ...options.env,
  };
  const executionContext = {
    waitUntil(promise) {
      void promise.catch((error) => console.error("Background task failed", error));
    },
    passThroughOnException() {},
  };

  return createServer(async (request, response) => {
    try {
      const url = requestUrl(request);
      if (url.pathname === "/healthz") {
        await sendWebResponse(
          new Response(JSON.stringify({ status: "ok" }), {
            headers: { "content-type": "application/json; charset=utf-8" },
          }),
          response,
        );
        return;
      }

      if (request.method === "GET" || request.method === "HEAD") {
        const assetResponse = await fetchAsset(
          new Request(url, { method: request.method }),
        );
        if (assetResponse.status !== 404) {
          await sendWebResponse(assetResponse, response);
          return;
        }
      }

      const webResponse = await worker.fetch(toWebRequest(request), runtimeEnv, executionContext);
      await sendWebResponse(webResponse, response);
    } catch (error) {
      console.error("Request failed", error);
      if (!response.headersSent) {
        response.statusCode = 500;
        response.setHeader("content-type", "application/json; charset=utf-8");
      }
      if (!response.writableEnded) {
        response.end(JSON.stringify({ error: "服务暂时不可用，请稍后重试。" }));
      }
    }
  });
}

function readPort(value) {
  const port = Number(value ?? 3000);
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : 3000;
}

export async function startCloudBaseServer(options = {}) {
  const server = await createCloudBaseServer(options);
  const port = options.port ?? readPort(process.env.PORT);
  const host = options.host ?? process.env.BIND_HOST ?? "0.0.0.0";

  await new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(port, host, () => {
      server.off("error", rejectListen);
      resolveListen();
    });
  });

  return server;
}

const isMain = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href === import.meta.url
  : false;

if (isMain) {
  const server = await startCloudBaseServer();
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : readPort(process.env.PORT);
  console.log(`CloudBase-compatible server listening on 0.0.0.0:${port}`);

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () => {
      server.close(() => process.exit(0));
    });
  }
}
