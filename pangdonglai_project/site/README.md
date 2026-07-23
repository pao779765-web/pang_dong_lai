# 胖东来文化数字馆：首页原型

这是项目的可维护前端源码。当前里程碑包含：

- 首页中心叙事与 22 个网络印象关键词
- A「向下探索」和 B「与胖东来对话」双锚点
- `#explore` 详情承接区
- `#ai-dialogue` 非官方 AI 文化问答概念区
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

3. 用记事本或编辑器打开 `.dev.vars`，改成你的真实 Key（只保留一行键值）：

```text
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx
```

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

AI 对话会调用 DeepSeek；回答为**非官方**，当前未接资料库检索。
