# 向量索引重建（kinfra-text-embedding-4b，2026-08-27）

用户授权将 embedding 模型从 `kinfra-text-embedding-0.6b`（1024 维）更新为 TokenHub 高质量文本模型 `kinfra-text-embedding-4b`（2560 维），覆盖当时全部已审核片段，并启用 hybrid。

- 文档向量：254（一般轨 197，案例受限 57）
- 模型：`kinfra-text-embedding-4b`
- 维度：2560
- 索引生成时间：2026-08-27T14:13:30.291Z
- 查询超时：Worker 向量请求 15 秒（首包冷启动约 7 秒，热路径约 0.4–0.6 秒）

本地冒烟：`员工休假怎么安排？` 返回 `hybrid-rrf`，`vectorApplied=true`，召回 10 条。

密钥未写入本文件。未单独重跑冻结 54+31 题对照；上线后以现网 hybrid 为准。
