---
description: '最初的 Vanilla API 同时提供 hyperscript 与可链式修改的 Figure，方便无框架创建场景'
keywords: 'Vanilla、builder、API、Figure、measureText、draw、coordinate'
---

# ADR-004：Vanilla 命令式 builder API

- 状态：Superseded
- 决策日期：2026-05-31
- 关联：[ADR-001 SVG descriptor](./001-svg-descriptor-contract.md)、[ADR-003 Vanilla runtime](./003-vanilla-runtime-and-dependency-graph.md)、[ADR-005 renderer 重打包](./005-renderer-repackage.md)
- 后续决策：[kernel v0.4/037](../v0.4/037-vanilla-plain-spec-api.md)

## 决策沿革

最初的 Vanilla API 同时提供 hyperscript 与可链式修改的 Figure，方便无框架创建场景。后来转为 plain object 作者接口：组合数据与执行挂载分开，旧链式 builder 不再保留。
