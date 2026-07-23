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

AI 区域目前只有结构示例，未接入模型、知识库或任何真实回答能力。
