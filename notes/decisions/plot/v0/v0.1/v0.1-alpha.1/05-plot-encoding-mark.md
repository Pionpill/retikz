# ADR-05：Plot 编码与图元（Channel / Encoding + Point / Line / Mark union）

- 状态：Accepted（已实现）
- 决策日期：2026-06-03
- 关联：[plot v0.1-alpha.1 待办](./roadmap.md) · [plot v0.1 roadmap](../roadmap.md) · [plot-design.md §3.7 mark / §3.8 order](../../../../../architecture/plot-design.md) · 根节点：[ADR-01 PlotSpec](./01-plot-spec-root.md) · 依赖：[ADR-02 data](./02-plot-data.md) · 关联：[ADR-04 coordinate](./04-plot-coordinate.md)

## 背景 / 约束

根节点（ADR-01）的 `marks` 槽位是图层数组，每层一个 mark（图元，把数据行画成可见几何）。每个 mark 带一份 `encoding`——声明各视觉通道（x / y）绑定到哪个数据字段或常量。塑造方案的硬约束：

- mark 与 encoding 结构耦合（`MarkSchema` 每个变体都内嵌 `encoding`），合一个 ADR——单拆 encoding 会出现「定义了通道却无 mark 消费」的悬空。
- 位置通道（x / y）的 scale 由 coordinate 持有（ADR-04），故 channel 本身**不带 scale 引用**——这是 ADR-04 决策的直接后果。
- 接 ADR-02（数据不进 IR）：`ChannelSchema.field` 是路径 accessor `'a.b.c'`，对外部数据行（`ExternalRow`，任意 JS）解析后须落标量；`ChannelSchema.value`（常量，确实进 IR）复用 `ScalarValueSchema`。

## 决策：channel = field/value 二选一；mark = point/line union，内嵌 encoding，可挂 id

**Channel**：绑定到「数据字段」（`field`）或「常量」（`value`），refine 互斥（exactly-one）。**Encoding**：位置通道 `x` / `y`，各可选、各是一个 channel，不带 scale 引用。**Mark**：共享 `markBase`（可选 `id` 预留 handle + 必填 `encoding`）；`point` 一行一个 glyph，`line` 把记录按顺序连成路径、带可选 `order`（连接顺序字段，省略 = 数据数组顺序）。mark 设计成 `z.discriminatedUnion('type', [...])`，为后续 interval(bar) / area / sector / rule / text 预留。

**命名决策**（字面即决策，故记最小片段）：

```ts
/** mark 类型判别值集（const 对象 + 派生类型；后续加 bar / area / sector / rule / text…） */
export const PlotMark = { Point: 'point', Line: 'line' } as const;
export type MarkType = ValueOf<typeof PlotMark>;
```

理由：

1. **field / value 互斥**：通道要么数据驱动（`field` 路径取外部数据）、要么常量（`value` 进 IR），并存无意义（refine 强制 exactly-one）；`value` 复用 ADR-02 `ScalarValue`，保证常量与「字段解析后的标量」同一定义。
2. **位置通道不带 scale 引用**：scale 归 coordinate（ADR-04），mark 只声明「绑哪个字段」，语义不与 coordinate 重叠。
3. **marks 顺序 = z-order**：图层按 `marks` 数组顺序绘制（稳定 z-order，复用 core IR 顺序语义），该不变量由根节点的数组承载，mark 无需额外 z 字段。
4. **mark `id` 预留**：与根 `id`（ADR-01）独立，alpha.5 才解析为 scope / anchor，alpha.1 仅校验。
5. **union 可扩展**：discriminatedUnion 加 bar / area 等不破坏旧 IR。

### 未来兼容性考虑

- **line.order 最简字符串**：alpha.1 用字段名表连接顺序；alpha.3 relation 完整化时升级为 `string | { field, descending? }`（非破坏）。
- **encoding 通道集**：alpha.1 仅 `x` / `y` 且都 optional；非位置通道（color / size / shape）及其 channel `scale` 字段 → alpha.3（非破坏加）。
- **`field` 路径语法**：schema 仍是非空字符串、语义是 accessor；`['k']` 转义、字段名含点号歧义、多层解析规则归 ADR-06。alpha.1 schema 即接受路径形态（与扁平名同为字符串，非破坏）。
- **mark `meta`**：alpha.1 mark 只放 `id`、根放 `meta`，alpha.5 再按需补（datum locator 可能需要）。

## 不在本 ADR 范围

- **interval(bar) / area / sector / rule / text mark** → alpha.3。
- **非位置通道（color / size / shape）及其 channel `scale` 字段** → alpha.3。
- **relation：完整 order / group / stack**（`order` 升级为对象）→ alpha.3。
- **mark `id` 的 anchor / scope 解析、datum locator** → alpha.5。
- **encoding → 几何的 lowering** → ADR-06。

---

> **实现指针**：level `red`（动 `plot/src/ir/**`）、additive 非 breaking。真源以代码为准——`ChannelSchema`（field/value refine 互斥）/ `EncodingSchema`（`plot/src/ir/encoding.ts`，复用 ADR-02 `ScalarValueSchema`）、`PlotMark` / `PointMarkSchema` / `LineMarkSchema` / `MarkSchema` + `Channel` / `Encoding` / `Mark` 类型（`plot/src/ir/mark.ts`，复用 core `ValueOf`）。测试在 `packages/plot/plot/tests/ir/{encoding,mark}.schema.test.ts`。完整施工契约（Schema 改动表 / 文件 scope / 测试象限 / 依赖现有元素）见本文件 git 历史。

> 🔖 封板压缩 commit `9115e6b4`；压缩前完整施工蓝图 = `git show 9115e6b4^:notes/decisions/plot/v0/v0.1/v0.1-alpha.1/05-plot-encoding-mark.md`。
