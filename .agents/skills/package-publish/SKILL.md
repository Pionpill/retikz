---
name: package-publish
description: 'Use when 发布或准备发布 retikz npm 包、核对发布版本与 git tag，或执行 alpha、beta、rc、stable 发版'
---

# 发布 retikz 包

本 skill 用于 npm 发版。风险点是版本号、git tag、npm artifact、docs changelog、roadmap 必须可追溯一致。

## 硬门槛

- 先读根 `AGENTS.md`。commit、tag、push、npm publish 都必须拿到当前对话明确授权。
- 不替用户猜目标版本。版本号、发布组或 changelog 范围不清楚时先问。
- 目标版本必须先写入仓库、验证并提交，再 tag / publish。
- 必须按 npm registry 校验版本连续性；不要把仓库里的预 bump 开发版本当成已发布版本。
- ADR 长期一致性审计是所有发布组不可跳过的前置门槛；必须逐篇阅读全文，不得以状态字段、roadmap 勾选或 commit message 代替。
- `npm view` / login / dry-run / publish，以及验证真实用户依赖闭包的 `pnpm install`，都显式使用 `--registry https://registry.npmjs.org/`；不得继承用户级镜像 registry。

## 执行顺序

| 阶段                           | 必读 reference                          | 出口                                       |
| ------------------------------ | --------------------------------------- | ------------------------------------------ |
| 解析发布组、依赖闭包、连续版本 | [发布范围](references/scope-version.md) | 用户确认发布闭包与目标版本                 |
| 版本/changelog 与相关 ADR 对账 | [发布准备](references/preparation.md)   | 相关 ADR 全文审计通过，准备范围明确        |
| 全仓与 packed artifact 验证    | [验证](references/validation.md)        | 检查、dry-run、真实 registry consumer 证据 |
| Commit / tag / publish / push  | [发布操作](references/execution.md)     | 逐项获得授权，发布后核对 registry 与远端   |

顺序不能跳过；只查状态的任务停在只读检查。发布组/包列表以 scripts/release-groups.config.mjs 和 package manifest 为准，不复制静态发布清单。tag 为 <release-group>-v<version> 的 annotated tag；历史及已发布 tag 不移动、复用或覆盖。

任一步失败停止。部分包已发布时先查询 registry，再由实际状态决定剩余步骤，不重发同版本。完成后分别报告 npm、local tag、remote tag 与 push 状态，不把准备完成称为发布成功。
