# ADR-03：带文本 Node 输出始终包 `<g>`（emit 以 Node 为 stacking / DOM 单位）

- 状态：Accepted（已实现）
- 决策日期：2026-05-23
- 关联： · [v0 roadmap §带文本 Node 输出始终包 g 提案](../../roadmap.md#带文本-node-输出始终包-g-提案) · [本 milestone ADR-02 显式 zIndex](./02-explicit-zindex.md)（「以 Node 为 stacking 单位」同源）· [v0.1-alpha.5 ADR-01 Scene 结构化](../../v0.1/alpha.5/01-scene-primitive-structured.md)（GroupPrim.transforms 结构化来源）

> **目标**：让带文本 Node 的 emit 始终包一层 `GroupPrim`，使整个 Node 成为稳定的 DOM / stacking 单位。

## 背景 / 约束

塑造方案的硬约束：

- `emitNodePrimitives` 原**仅在 `rotateDeg !== 0`** 时把 shape + text + label 包进 `GroupPrim`，不旋转的 Node 直接平铺一组兄弟 primitive。这套「看旋转角决定包不包」导致三个问题：DOM 看不出「哪段属于同一个 Node」（rect 和 text 是散开兄弟）；与 ADR-02 zIndex 的「以 Node 为 stacking 单位」对不齐（平铺时同 Node 的 rect / text 与相邻 Node primitive 同层混排，无结构边界）；改个 `rotate` 值 DOM 结构突变（一会儿一层 `<g>`、一会儿没有），不利于稳定 snapshot 与下游样式 / 交互工具。
- TikZ 无对应概念（输出 PDF / 无 DOM）——这是浏览器原生渲染 + 面向交互的需求。

## 决策：`layout.lines` 非空（即 Node 有文本）就包 `<g>`

判据 `needsGroup = rotateDeg !== 0 || lines !== undefined`：带文本或旋转的 Node 包单个 `GroupPrim`（无旋转时 group 不带 `transforms` 字段，renderer 不写 transform 属性）；纯几何 Node 维持平铺、零额外 DOM 层。

理由：

1. **判据贴语义**：`layout.lines` 非空 ≈「语义化节点」（流程图节点 / UML 类目），正是需要 DOM 边界 / stacking 单位 / 整体交互的那类；纯几何 Node 多半是装饰背景，保留极简平铺。
2. **与 ADR-02 同源**：带文本 Node emit 成**单个** GroupPrim → zIndex 只 tag 一个 group，整节点天然成一个 stacking 单位——两件事同段、同一片 emit 改动。
3. **DOM 可预测**：带文本 Node 永远一层 `<g>`，不随 `rotate` 值突变；稳定 snapshot + 下游样式 / 交互工具有稳定锚点。
4. **极简留口**：纯几何 Node 不强行加层，SVG 体积不无谓膨胀。

具体决策细节（设计意图）：

- **判据严格是 `layout.lines !== undefined`**，不含「仅有 label 无 text」的 Node（仅 label 仍平铺）——label 是角标装饰，「有文本」才是语义节点标志。空串 `text:''` 也走包装：`layoutNode` 对 `node.text !== undefined` 一律生成 `lines`（`text:'' → lines=[{text:''}]` 非 undefined），**不对空串做「视为无文本」特判**。
- **无旋转 group 不带 `transforms` 字段**（而非空数组）：`GroupPrim.transforms` 已是 optional，renderer 对 undefined / 空数组都回无 transform，省一个空数组分配。
- **不加 `data-node-id` / `GroupPrim.meta`**：本 ADR 只立「包不包」的结构边界，不引入 DOM 钩子字段（那要扩 `GroupPrim` schema，单独取舍）。
- **label / text emit 顺序不变**：只追加外层包装，shape → text → label 的内部栈叠固定。

## 长期边界

- **`GroupPrim.meta` / `data-node-id` / `data-node-shape` DOM 钩子**：需扩 `GroupPrim` schema，单独 ADR。本 ADR 只立结构边界，不挂元数据。
- **仅有 label、无 text 的 Node 是否也包**：当前不包；将来按需扩 `needsGroup` 判据为 `lines !== undefined || labels !== undefined`。
- **无条件全包**：评估后否决，保留记录避免重复立项。
- **显式 zIndex** → [ADR-02](./02-explicit-zindex.md)；**Node label rotate** → [ADR-04](./04-node-label-rotate.md)。

---

## 最终实现结果

已实现本 ADR 的核心决策。兼容性：非 breaking（无 schema / IR / 公开类型变化，纯 emit 输出结构调整——带文本 Node 多包一层 `GroupPrim`）；其余默认行为、失败语义与公开契约以正文为准。
