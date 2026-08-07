import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = fileURLToPath(new URL("..", import.meta.url));
const dataPath = path.join(siteRoot, "data", "store-directory.json");
const outDir = path.join(siteRoot, "public", "stores");
const reportPath = path.join(siteRoot, "..", "..", "tmp", "store-photo-download.json");

const data = JSON.parse(await readFile(dataPath, "utf8"));
await mkdir(outDir, { recursive: true });
await mkdir(path.dirname(reportPath), { recursive: true });

const stores = data.flatMap((city) => city.stores.map((store) => ({ ...store, city: city.city })));

function slug(name) {
  const map = {
    许昌天使城: "xuchang-tianshicheng",
    许昌时代广场: "xuchang-shidai",
    许昌生活广场: "xuchang-shenghuo",
    许昌大众服饰: "xuchang-dazhong",
    许昌金三角店: "xuchang-jinsanjiao",
    许昌云鼎店: "xuchang-yunding",
    许昌北海店: "xuchang-beihai",
    许昌金汇店: "xuchang-jinhui",
    许昌劳动店: "xuchang-laodong",
    许昌人民店: "xuchang-renmin",
    禹州店: "yuzhou",
    新乡大胖: "xinxiang-dapang",
    新乡二胖: "xinxiang-erpang",
    新乡三胖: "xinxiang-sanpang",
  };
  return map[name] || name.replace(/[^\w\u4e00-\u9fff]+/g, "-") || "store";
}

function extFromUrl(url) {
  const clean = url.split("?")[0];
  const match = clean.match(/\.(jpe?g|png|webp|gif)$/i);
  if (!match) return "jpg";
  return match[1].toLowerCase().replace("jpeg", "jpg");
}

const results = [];

for (const store of stores) {
  const ext = extFromUrl(store.photoUrl);
  const file = `${slug(store.name)}.${ext}`;
  const dest = path.join(outDir, file);
  try {
    const response = await fetch(store.photoUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://web.azpdl.cn/",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(90_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 800) throw new Error(`too small: ${buffer.length}`);
    // Reject HTML error pages disguised as images.
    const head = buffer.subarray(0, 32).toString("utf8").toLowerCase();
    if (head.includes("<!doctype") || head.includes("<html")) {
      throw new Error("got HTML instead of image");
    }
    await writeFile(dest, buffer);
    const localPath = `/stores/${file}`;
    results.push({
      name: store.name,
      ok: true,
      file,
      bytes: buffer.length,
      localPath,
      sourceUrl: store.photoUrl,
    });
    console.log(`OK ${store.name} ${buffer.length} -> ${localPath}`);
  } catch (error) {
    results.push({
      name: store.name,
      ok: false,
      file,
      error: error instanceof Error ? error.message : String(error),
      sourceUrl: store.photoUrl,
    });
    console.error(`FAIL ${store.name}: ${error instanceof Error ? error.message : error}`);
  }
}

await writeFile(reportPath, `${JSON.stringify(results, null, 2)}\n`, "utf8");
const okCount = results.filter((item) => item.ok).length;
console.log(`done ${okCount}/${results.length}`);
if (okCount !== results.length) process.exitCode = 1;
