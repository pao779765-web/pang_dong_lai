# 国内部署适配（腾讯云 CloudBase）

## 当前状态

项目保留原有开发和预览方式：

- `npm run dev`：日常本地开发。
- `npm run start`：现有 Cloudflare Worker 生产预览。
- `npm run start:cloudbase`：新增的 CloudBase / 通用 Node 容器入口。

三个入口共用同一套页面、门店资料、知识库、RAG 逻辑和聊天契约。国内部署不会建立第二份业务代码。

## 本地验证国内运行入口

在 `pangdonglai_project/site` 目录执行：

```powershell
npm run build
npm run start:cloudbase
```

默认监听 `0.0.0.0:3000`：

- 首页：`http://127.0.0.1:3000/`
- 健康检查：`http://127.0.0.1:3000/healthz`
- AI 接口：`http://127.0.0.1:3000/api/chat`

本地运行时，`DEEPSEEK_API_KEY` 只从进程环境变量读取。不要把真实密钥写进 Dockerfile、代码、Git 或截图。

## CloudBase 云托管参数

腾讯云控制台中选择 CloudBase 云托管，从 `pangdonglai_project` 目录的最小部署包构建。该构建范围同时包含 `site` 与其依赖的 `knowledge-base.json`：

| 配置 | 值 |
|---|---|
| 构建方式 | Dockerfile |
| Dockerfile | `Dockerfile` |
| 服务端口 | `3000` |
| 访问类型 | WEB / 公网访问 |
| 健康检查路径 | `/healthz` |
| 运行时环境变量 | `DEEPSEEK_API_KEY` |

容器默认以非 root 用户运行。项目根目录的 `.dockerignore` 采用最小允许清单，只纳入网站源码、知识库与构建所需的非敏感 Sites 项目配置，并排除本地密钥、环境文件、构建缓存、测试文件和 Git 元数据。

第一次部署建议只使用 CloudBase 测试域名验收，不立即切换当前预览站。确认首页、静态资源和 AI 流式回答正常后，再绑定已经完成 ICP 备案的自定义域名。

## 正式上线前

1. 在腾讯云完成域名 ICP 备案。
2. 在 CloudBase 绑定自定义域名并启用 HTTPS。
3. 将 `DEEPSEEK_API_KEY` 配置为服务端环境变量。
4. 保留应用层 `/api/chat` 保护：同一客户端每分钟最多 6 次、单实例最多 4 个并发、64 KiB 请求体上限和 45 秒上游超时。绑定正式域名后，再在 CloudBase HTTP 网关为该路径叠加按 IP 限频。
5. 通过 CloudBase 日志检查 4xx、5xx、响应时间和实例扩缩容。
6. 验收通过后再把正式域名解析切到 CloudBase。

## 后续持续开发

日常修改仍在当前项目完成。每次发布只需构建同一套源码：

```text
页面 / 门店资料 / 知识库 / RAG
              ↓
       vinext 统一构建产物
          ↙             ↘
现有 Worker 预览     CloudBase Node 容器
```

如果未来不再使用某个平台，只删除对应的部署入口即可，不需要重写页面和业务逻辑。

## 官方参考

- [CloudBase 云托管概述](https://docs.cloudbase.net/run/introduction)
- [CloudBase 从 Dockerfile 构建](https://docs.cloudbase.net/run/develop/builds/dockerfile)
- [CloudBase HTTP 访问服务与生产域名要求](https://cloud.tencent.com/document/product/876/130728)
- [CloudBase ICP 备案说明](https://cloud.tencent.com/document/product/876/128405)
