# Notation v0.1 alpha.2 Roadmap

> 状态：Accepted；已完成。关联：[Notation v0.1 roadmap](../roadmap.md) · [Diagram Notation 完备设计](../../../../../architecture/diagram-notation-complete.md) · [alpha.1 roadmap](../alpha.1/roadmap.md)

## 目标

让正式 Notation 元素在 authored IR 中保留稳定的 `notation` namespace 与元素判别值，同时继续把 Node、Path、Step、shape、target 与 Scene 行为交给 Core。首批收敛 Terminal、Stage、Decision、Junction 与 Connector：它们只做一对一轻量 lowering，不建立平行几何、布局、artifact 或 renderer 语义。

Connector 同时提供 Core Path Step 与 Draw `way` 两种作者语法，但只持久化一份 canonical Step IR；Draw shorthand 在作者入口一次性归一，不形成第二套 schema 或 lowering。

## ADR

| ADR                                            | 主题                                | 依赖                                        | 状态     |
| ---------------------------------------------- | ----------------------------------- | ------------------------------------------- | -------- |
| [01](./01-semantic-ir-lightweight-lowering.md) | 语义 IR 与轻量 Node / Path lowering | Diagram design；Notation alpha.1；Core Path | Accepted |

## 完成标准

- Terminal、Stage、Decision、Junction 与 Connector 的 canonical IR 都保留 `namespace: 'notation'`、独立 `type` 与 authored `id`
- 四个基础单元分别通过显式 Definition 一对一 lower 为同 id Core Node，不产生 typed artifact
- Connector 通过显式 Definition 一对一 lower 为同 id Core stroke Path，不复制 Core target、Step、Way parser 或 Path compile
- Connector 的 Path `children` 与 Draw `way` 作者语法互斥，并归一为同一 canonical `children`
- 直接 JSON、TypeScript factory、React 与 Vanilla 对 canonical IR、默认值、诊断和 Definition 注入保持等价
- 当前 alpha.1 中 Core Sugar 与 Connector 路由投影的旧契约被明确 supersede，不保留兼容输入或双轨 IR
- tests、双语 docs、schema 发现与 SVG / Canvas 可见输出形成闭环

## 边界

- 不实现 GraphModel、全局拓扑、自动布局、障碍规避、自动 routing 或 Editor 状态
- 不为语义薄壳增加 layout-aware compile、typed artifact、provenance sidecar 或 renderer 分支
- 不改变 LogicFrame 与 Callout 的公开行为
- 不新增主题 token、视觉 preset 或默认视觉重设计
- 不复制 Draw 独有的 React sugar；`way` 只复用 Core `WayDSL` 的几何表达
- 不保留旧 Core Node Sugar IR、Connector `from/to/routing/appearance` 或旧 Definition 兼容入口
