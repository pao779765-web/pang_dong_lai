# Codex + Grok 协同工作区

本仓库是 **OpenAI Codex 桌面版** 与 **Grok Build** 的本地协作主目录。

## 怎么用

1. **两边都打开同一路径**：`D:\ai沙盒\codex+grok`
2. 开工前先读：`docs/HANDOFF.md`
3. 大方案写在：`docs/PLAN.md`
4. 项目约定写在：`AGENTS.md`
5. 做完更新 HANDOFF，并 `git commit`

## 角色

| 角色 | 谁 | 职责 |
|------|-----|------|
| 侦察 / 验收 / 环境 | Grok Build | 查结构、排障、跑命令、看 diff |
| 主实现 / 长链路编码 | Codex | 按 PLAN / HANDOFF 改业务代码 |
| 指挥 / 验收 | 你 | 定目标、确认方案、最终拍板 |

## 规则（简版）

- **同一时刻**尽量只让一个 Agent 改同一批文件
- **交手前**更新 `docs/HANDOFF.md` 并提交 Git
- **密钥**不要提交（见 `.gitignore`）

## 快速口令

**给 Codex：**

> 读 `docs/HANDOFF.md` 和 `docs/PLAN.md`，只做「未完成」里勾选的下一项，做完更新 HANDOFF 并 git commit。

**给 Grok：**

> 按 `docs/HANDOFF.md` 验收最近改动，跑必要检查，把结果写回 HANDOFF。
