# 胖东来文化数字馆：首页原型

这是项目的可维护前端源码。当前里程碑包含：

- 首页中心叙事与 22 个网络印象关键词
- A「向下探索」和 B「与胖东来对话」双锚点
- `#explore` 详情承接区
- `#ai-dialogue` 非官方 AI 文化问答概念区
- 目录化 RAG 资料库、BM25 / 向量混合检索、来源绑定与事件阶段保护
- 移动端适配、键盘焦点与减少动态效果模式

原始单文件网页保存在上一级目录，本工程不覆盖它。

## 技术结构

- Vite 驱动的 vinext / Next App Router
- React 19 + TypeScript
- 原生 CSS，无额外 UI 组件依赖

## 本地运行

需要 Node.js `>=22.13.0`。

```bash
npm ci
npm run dev
```

构建与自动验收：

```bash
npm run build
npm test
npm run lint
```

知识库源文件位于上一级 `knowledge/`。`npm run dev`、`npm run build` 和 `npm run lint` 会先执行 `npm run knowledge:build`，从目录化资料生成只读兼容索引。不要直接编辑 `knowledge/compiled/knowledge-base.json`。

生产预览（包含 Worker 与静态资源绑定）：

```bash
npm run build
npm run start
```

`npm run start` 使用构建产物中的 Cloudflare Worker 配置提供预览，因此不会出现直接运行 `vinext start` 时遗漏 `/assets/*` 文件的问题。

## 永久保存 DeepSeek API Key（推荐）

本站对话接口在 **Worker 服务端** 读取 `DEEPSEEK_API_KEY`。  
仅写在 Windows「系统环境变量」里，**不一定**会被 `npm run dev` 注入到 Worker；每次重开网页后仍可能提示未配置。

**一劳永逸的做法：在项目里放本地密钥文件（不会进 Git）。**

### 步骤（PowerShell）

1. 进入站点目录：

```powershell
cd D:\ai沙盒\codex+grok\pangdonglai_project\site
```

2. 从模板复制一份本地密钥文件：

```powershell
copy .dev.vars.example .dev.vars
```

3. 用记事本或编辑器打开 `.dev.vars`，填入真实 Key。日常开发默认继续使用 BM25：

```text
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx
RAG_RETRIEVAL_MODE=bm25
```

需要本地验证 R5C 混合检索时，再改为：

```text
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx
RAG_RETRIEVAL_MODE=hybrid
TENCENT_TOKENHUB_API_KEY=xxxxxxxxxxxxxxxx
TENCENT_TOKENHUB_ENDPOINT=https://tokenhub.tencentmaas.com/v1/embeddings
TENCENT_TOKENHUB_MODEL=kinfra-text-embedding-0.6b
```

混合模式缺少 TokenHub 密钥、模型与现有索引不一致或向量请求失败时，会自动退回 BM25。不要把任何真实密钥提交到 Git。

4. **关掉**正在跑的 `npm run dev`，再重新启动：

```powershell
npm run dev
```

5. 浏览器打开首页 → 「与胖东来对话」→ 提问验证。

### 注意

| 项 | 说明 |
|----|------|
| 文件位置 | 必须是 `pangdonglai_project/site/.dev.vars` |
| 是否提交 Git | **不要**。仓库已忽略 `.dev.vars` |
| 模板文件 | `.dev.vars.example` 可提交，只放占位符 |
| 改完 Key 后 | 必须重启 `npm run dev` 才生效 |
| 密钥安全 | 不要写进前端代码、不要发到聊天/截图公开 |

### 可选：Windows 用户环境变量

若你仍想用系统环境变量，请保证：

1. 用户变量名正好是：`DEEPSEEK_API_KEY`  
2. **新开**一个终端（已开的 PowerShell 读不到刚改的环境变量）  
3. 在该终端里 `cd` 到 `site` 再 `npm run dev`

即便如此，Cloudflare / vinext 本地开发仍**优先推荐 `.dev.vars`**，最稳、可跨终端复用。

AI 对话会调用 DeepSeek；回答为**非官方**，具体事实只能依据目录化资料库检索到的已审核内容。
