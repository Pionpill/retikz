# v0.4.0-alpha.6 收尾：Path kind / Ribbon 与关系图标签能力

## 目标

alpha.6 聚焦来自 plot / viz 的关系图底座需求：可变宽度带状关系路径、端面与边界增强、两类标签能力，以及关系路径的共享样式契约。

- 最终公开形态由 [ADR-07](./07-path-kind-registry.md) 收敛：不新增独立 `type: "ribbon"` IR；ribbon 是 `type: "path", kind: "ribbon"`。
- `Path.kind` 是一等 provider contract，内置 `stroke` / `ribbon` 与自定义 kind 走同一注册、解析和 lowering 机制。
- `kind: "ribbon"` compile 后 lower 为闭合 `PathPrim`，由现有 SVG / Canvas renderer 按普通填充路径渲染。
- 节点 / 区块名称仍属于 `Node.label`；bar / block 的内侧标签通过 node label 的 `placement` 与 `{ boundary, fraction }` position 表达。
- flow / route / amount 等属于带状流本身的文字，通过 `Path.label` 表达。
- `Path.label` 的 `position`、`side`、文字样式等属性与 Path step label 共用同一套 `GeometryLabelSchema` 和类型，不另起 ribbon 专用 label API。
- plot 的 `RelationMark.style` 只映射到 core 显式声明的 shared drawable 子集，stroke-only、ribbon-only 与自定义 kind 参数继续分离。

## 决策列表

| ADR                                             | 状态           | 主题                              | 说明                                                                                                                                     |
| ----------------------------------------------- | -------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| [ADR-01](./01-ribbon.md)                        | 被 ADR-07 收敛 | Ribbon 可变宽度路径               | 宽度规则与 lowering 落地，但独立 `type: "ribbon"` 公开形态被 ADR-07 收敛为 `Path.kind="ribbon"`                                          |
| [ADR-02](./02-ribbon-boundary-and-alignment.md) | 被 ADR-07 收敛 | Ribbon 边界与对齐增强             | 单侧对齐、端面、显式 upper/lower 边界与采样能力落地，挂载在 `Path.ribbon` 参数对象下                                                     |
| [ADR-03](./03-ribbon-arc-cap.md)                | 被 ADR-07 收敛 | Ribbon 自定义圆弧端帽             | 圆弧端帽能力落地，作为 `Path.ribbon.start/end.cap` 的一种结构化 cap                                                                      |
| [ADR-04](./04-node-label-inside-placement.md)   | 已接受         | Node label 内侧 placement         | `Node.label` 增加 `placement: "outside" \| "inside"` 与 `{ boundary, fraction }` position，支持边界上的自定义标签位置                    |
| [ADR-05](./05-ribbon-label.md)                  | 被 ADR-07 收敛 | Ribbon host label                 | host label 能力落地，但公开字段收敛为共享的 `Path.label`，不保留 ribbon 专用 label API                                                   |
| [ADR-06](./06-path-ribbon-shared-contract.md)   | 被 ADR-07 收敛 | Path / Ribbon 共享 drawable 契约  | 共享样式 / 元数据 schema 落地，并由 ADR-07 改名为 `DrawableStyleSchema` / `DrawableMetaSchema`                                           |
| [ADR-07](./07-path-kind-registry.md)            | 已接受         | Path kind registry 与 Ribbon 合并 | 移除独立 `IRRibbon`；Ribbon 表示为 `type: "path", kind: "ribbon"` 与 `ribbon` 参数对象，并让 `Path.kind` 通过一等 provider contract 扩展 |

## 验收清单

- [x] `IRRibbon` 已移除；Ribbon 表示为带 `kind: "ribbon"` 与 `ribbon` 参数对象的 `IRPath`。
- [x] `Path.kind` 通过 provider registry 分派；内置 `stroke` / `ribbon` 与外部 kind 使用同一个 `PathKindDefinition` contract。
- [x] `kind: "ribbon"` 编译输出普通闭合 `PathPrim`，renderer 不新增 primitive。
- [x] 宽度规则支持固定宽度、起止宽度、stops 与 runtime profile registry。
- [x] `Path.ribbon` 支持单侧对齐、端帽控制、用户指定圆心与半径的圆弧端帽。
- [x] `Path.ribbon.mode="boundary"` 支持显式 `upper` / `lower` 边界模式，用于中心线 + width 无法表达的非对称流带。
- [x] React `<Path kind="ribbon">` 与 `<Layout pathKinds>` 暴露与 core IR 对齐的入口。
- [x] Vanilla `draw(way, { kind: "ribbon", ribbon })` 暴露与 core IR 对齐的入口；不新增独立 `ribbon()` helper。
- [x] `Node.label.placement="inside"` 能表达节点的内侧边缘标签，且不改变默认外侧标签行为。
- [x] `Node.label.position={ boundary, fraction }` 能表达矩形 / box-like 节点某条边界上的自定义比例位置。
- [x] `Path.label` 能表达 flow amount / route / transition label，并与 path host 一起编译，不需要 sibling text node。
- [x] `Path.label` 与 Path step label 使用同一个 `GeometryLabelSchema` / `IRGeometryLabel` 来源，包含相同的 `position`、`side`、`textColor`、`opacity`、`font` 契约。
- [x] `DrawableGeometryStyleSchema` / `DrawableElementMetadataSchema` 改名为 `DrawableStyleSchema` / `DrawableMetaSchema`，相关 public export 和文档同步改名。
- [x] `pathDefault` 对 stroke Path 完整生效，对 ribbon 仅消费 shared drawable subset；path-only 字段不会静默改变 Ribbon 几何。
- [x] Ribbon 文档和 demo 移入 Path 组件页；独立 Ribbon draw 组件页从 sidebar / i18n data 中移除。
- [x] alpha.6 changelog 已补 core / react / vanilla 条目，记录最终 `Path.kind` 公开面。

## 收尾备注

- 早期 ADR-01 / 02 / 03 / 05 / 06 的能力已经按最终实现吸收，但它们提出的独立 `type: "ribbon"` / `IRRibbon` 公开形态不再成立；以 ADR-07 为最终公开契约。
- 当前代码库有 `packages/kernel/core/tests/compile/path-kind.test.ts` 与 `node-label-placement.test.ts` 等覆盖核心路径；未在本收尾里追加新的测试文件。
- 几何异常诊断首版覆盖 profile、arc cap、sampling 非有限值等明确错误；复杂自交 / 拓扑诊断未作为 alpha.6 完成项声明，后续如 plot 真实场景需要可单独排 beta TODO。
