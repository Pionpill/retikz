# @retikz/diagram 工作指南

本文件覆盖 `packages/schematic/diagram/`。全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，Schematic 分组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责

`@retikz/diagram` 解决完整图示如何装配，以及高层关系结构如何按图示布局规则自动排列的问题。它单向消费 `@retikz/graph`，长期拥有 Diagram Presentation / Frame / Drawing Core 的区域装配语义、LLM-first Flow Source、Diagram 专属 Theme、Flow 扁平 token、结构化全局配置、单项 style / layout、布局意图、Graph 语义投影、约束确定化、provider 编排、自动 routing，以及按 element authored identity 与 relation Source 顺序对齐的几何结果。

本包不拥有 Graph 的 Group / Block / Entity / Relation、Graph Theme 或 identity，也不复制 Core Text / Theme、Layout、Standard Surface / Legend、Scene 或 renderer 契约。它也不拥有 Editor 状态、DOM 或框架生命周期。Graph 当前没有端口契约；后续通用 endpoint / 局部连接点能力必须先由独立设计冻结。移除 Schematic 领域词汇后仍成立且被多个领域复用的算法或几何能力应进入对应 Kernel / Library owner。

## 输入与输出

长期输入是 JSON-safe Diagram Presentation / Frame、具体 Drawing Core Source、Flow token / 全局配置 / 单项配置与 Diagram 布局意图；Flow resolve 只把 Graph element 已公开字段的窄投影确定性下沉为 Graph semantic records。长期输出是完整 renderer-neutral Scene 所需的区域装配与 Diagram 布局几何。具体 Source IR、Canonical、Definition、provider、失败语义与 lowering 契约必须由 Diagram roadmap / ADR 确认后建立。

当前 alpha.1 已在包内建立 Presentation / Frame / Diagram Theme、固定区域装配 Foundation 与 FlowDiagram MVP。Flow 通过三个包对称的 `./flow` 子入口公开，不从包根聚合；不得添加占位 drawing core、schema、类型、provider、算法或 fallback

当前 Flow Source 支持 Entity、Group、Layout 与 Relation：三类 element 在平级 catalog 中声明，根、Group 与 Layout 的 `children` 是唯一包含事实源。Group 始终下沉为可见 Graph Group 并可作为 Relation endpoint；Layout 以 `direction`、`gap` 与 `align` 固定排列 children，不绘制、没有 Graph identity 且不能作为 endpoint。Graph Block 在其结构与连接契约稳定并出现真实 Flow 消费者后再通过独立设计引入；当前不预留 Block schema、Theme token、adapter、artifact 或兼容入口

## 源码组织与导出

- `src/_diagram/` 承载所有具体图类型共享的 Diagram vocabulary、schema、contract、provider、resolve、pipeline 与区域装配能力；具体图类型不得复制这些公共机制
- `flow`、`tree` 等具体图类型直接使用 `src/<type>/` 一级 owner，各自闭合 Source、resolve、provider 与 lowering；只创建已经实现的类型，不预建空目录
- 包根只导出已经形成真实公共消费者的 Diagram 共享能力，不聚合具体图类型；Flow 只通过 `./flow` 子入口公开
- 每个具体图类型通过 `package.json` 的显式 `./<type>` subpath 导出，不使用 wildcard exports；同一入口必须在 Diagram、Diagram Vanilla 与 Diagram React 三包保持对称
- `_diagram` 是源码 owner，不作为 package subpath；具体类型只能通过其 owner barrel 消费共享能力，不跨目录 deep import 到 `_diagram` 实现文件

## 验证

结构化文件改动至少运行 Prettier、ESLint、`tsc --noEmit`、包测试与 build。公开能力建立后还必须验证 direct IR、React、Vanilla、Graph identity 对齐、renderer-neutral 结果及双语文档。
