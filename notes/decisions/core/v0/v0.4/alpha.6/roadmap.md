# v0.4.0-alpha.6 路线：Ribbon 与关系图标签能力

## 目标

alpha.6 聚焦来自 plot / graph 的关系图底座需求：`Ribbon` 可变宽度带状路径、端面与边界增强、两类标签能力，以及 Path / Ribbon 的共享样式契约。

- `Ribbon` 在 IR 中是 path-like 图元，compile 后 lower 为闭合 `PathPrim`，由现有 SVG / Canvas renderer 按普通填充路径渲染。
- 节点 / 区块名称仍属于 `Node.label`；bar / block 的内侧标签通过 node label 的 `placement` 与 `{ boundary, t }` position 表达。
- flow / route / amount 等属于带状流本身的文字，通过 `Ribbon.label` 表达。
- `Ribbon.label` 的 `position`、`side`、文字样式等属性与 Path step label 共用同一套 schema 和类型，不另起 ribbon 专用 label API。
- graph 的 `RelationMark.style` 只映射到 core 显式声明的 Path / Ribbon 共享 drawable 子集，path-only 与 ribbon-only 字段继续分离。

## 决策列表

| ADR | 状态 | 主题 | 说明 |
| --- | --- | --- | --- |
| [ADR-01](./01-ribbon.md) | Proposed | Ribbon 可变宽度路径 | 新增 `type: "ribbon"`，支持固定 / stops / profile 宽度规则，编译为填充 path |
| [ADR-02](./02-ribbon-boundary-and-alignment.md) | Proposed | Ribbon 边界与对齐增强 | 补充单侧对齐、端面、显式 upper/lower 边界模式、采样策略与几何诊断 |
| [ADR-03](./03-ribbon-arc-cap.md) | Proposed | Ribbon 自定义圆弧端帽 | 端帽支持用户给定圆心与半径的圆弧闭合，为 Sankey 槽位贴合预留 core 能力 |
| [ADR-04](./04-node-label-inside-placement.md) | Proposed | Node label 内侧 placement | `Node.label` 增加 `placement: "outside" \| "inside"` 与 `{ boundary, t }` position，支持边界上的自定义标签位置 |
| [ADR-05](./05-ribbon-label.md) | Proposed | Ribbon host label | `Ribbon` 增加顶层 `label`，沿 ribbon centerline 使用与 Path step label 一致的位置、side 与文字样式契约 |
| [ADR-06](./06-path-ribbon-shared-contract.md) | Proposed | Path / Ribbon 共享 drawable 契约 | 抽取 Path 与 Ribbon 共享样式 / 元数据 schema，明确 graph 可共享字段、scope default 子集与 label 共用契约 |

## 验收清单

- [ ] `@retikz/core` schema 支持 `Ribbon` IR，并保持 JSON 可序列化。
- [ ] `Ribbon` 编译输出普通闭合 `PathPrim`，renderer 不新增 primitive。
- [ ] 宽度规则支持固定宽度、起止线性变化、stops 与 registry profile。
- [ ] React / Vanilla 暴露与 core IR 对齐的入口。
- [ ] 文档落在 `apps/docs/src/contents/core/components/draw/ribbon`，中英文同步，并包含 Sankey-like demo。
- [ ] 测试覆盖 schema、lowering、错误诊断、profile registry、paint 交互和文档 demo 入口。
- [ ] `Ribbon` 支持单侧对齐和端面控制，以 lower 为普通 `PathPrim`。
- [ ] `Ribbon` 端帽支持用户指定圆心和半径的圆弧闭合。
- [ ] `Ribbon` 支持显式 upper/lower 边界模式，用于中心线 + width 无法表达的非对称流带。
- [ ] `Ribbon` 采样与几何诊断具备可扩展入口，避免急弯 / 宽带异常静默产生难以排查的几何。
- [ ] `Node.label.placement="inside"` 能表达矩形 / 圆 / 椭圆等节点的内侧边缘标签，且不改变默认外侧标签行为。
- [ ] `Node.label.position={ boundary, t }` 能表达矩形 / box-like 节点某条边界上的自定义比例位置。
- [ ] `Ribbon.label` 能表达 flow amount / route / transition label，并与 ribbon host 一起编译，不需要 sibling text node。
- [ ] `Ribbon.label` 与 Path step label 使用同一个 `GeometryLabelSchema` / `IRGeometryLabel` 来源，包含相同的 `position`、`side`、`textColor`、`opacity`、`font` 契约。
- [ ] `Path` / `Ribbon` 共享 drawable style 子集被 core schema 显式命名并导出，graph 不再手写 ad hoc intersection。
- [ ] `pathDefault` 对 Path 完整生效，对 Ribbon 仅消费共享 drawable subset；path-only 字段不会静默改变 Ribbon 几何。
