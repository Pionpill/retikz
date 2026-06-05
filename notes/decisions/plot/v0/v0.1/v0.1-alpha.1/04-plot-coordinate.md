# ADR-04：Plot 坐标系（Cartesian2D + Coordinate union，持有位置 scale 绑定）

- 状态：Accepted（已实现）
- 决策日期：2026-06-03
- 关联：[plot v0.1-alpha.1 待办](./roadmap.md) · [plot v0.1 roadmap](../roadmap.md) · [plot-design.md §3.5](../../../../../architecture/plot-design.md) · 根节点：[ADR-01 PlotSpec](./01-plot-spec-root.md) · 关联方：[ADR-03 scale](./03-plot-scale.md) · [ADR-05 encoding+mark](./05-plot-encoding-mark.md)

## 背景 / 约束

根节点（ADR-01）的 `coordinate` 槽位定义图的坐标空间。本 ADR 定义坐标系 schema，并承担一个**关键跨切决策**：位置通道（x / y）的 scale 绑定**由 coordinate 持有**——coordinate 声明「哪个 scale 驱动 x、哪个驱动 y」。这是 Plot IR 的一个分叉点（Vega-Lite 风格让每个 channel 自带 scale 引用；本设计把位置 scale 绑定收归 coordinate）。alpha.1 仅 `cartesian2D`。

## 决策：cartesian2D，x / y 各引用一个 scale 名

`cartesian2D` 是 2D 笛卡尔空间（x 水平 / y 垂直），持有两个字段 `x` / `y`，各是一个 scale 名（字符串，引用 ADR-03 的 `scales[].name`）。coordinate 设计成 `z.discriminatedUnion('type', [...])`，alpha.1 只一个成员 `Cartesian2DSchema`，为后续 polar2D / linear1D 预留。

**命名决策**（字面即决策，故记最小片段）：

```ts
/** 坐标系类型判别值集（const 对象 + 派生类型；后续加 polar2D / linear1D…） */
export const PlotCoordinate = { Cartesian2D: 'cartesian2D' } as const;
export type CoordinateType = ValueOf<typeof PlotCoordinate>;
```

理由：

1. **coordinate 持有位置 scale 绑定，消除冗余**：避免「coordinate 声明 x/y + 每个 mark 又重复声明 scale」。多 mark 共享同一坐标空间天然成立——都受同一 coordinate 的 x/y scale 驱动。
2. **职责清晰**：coordinate 决定「空间怎么搭、位置通道由谁驱动」；mark 的 encoding（ADR-05）只决定「通道绑哪个数据字段」，位置通道无 scale 引用，语义不重叠。
3. **union 可扩展**：polar2D / linear1D 加变体不破坏旧 IR；坐标系抽象通用化在 alpha.4 由 polar 逼出。
4. **代价**：引用完整性（x/y 指向的 scale name 是否存在于 `scales`）**不在 schema 层校验**——单元素 schema 看不到整份 `scales`，交给 ADR-06 lowering。本 ADR 锁定「schema 不做跨字段引用校验」边界。

### 未来兼容性考虑

- 位置 scale 绑定归 coordinate（本方案）vs channel 自带 `scale`（Vega-Lite 风格）是宜现在定死的分叉——若改为 channel 持有，将是 ADR-05 的破坏性改动。
- 非位置通道（color / size 等自带 scale）留 alpha.3 在 channel 上加 `scale` 字段**非破坏接入**，与「位置 scale 归 coordinate」并存不矛盾。

## 不在本 ADR 范围

- **polar2D / linear1D coordinate** → alpha.4 / 后续。
- **坐标系投影几何 / extent 推断 / 引用完整性校验** → ADR-06 lowering（及 alpha.4 几何）。
- **非位置通道的 scale 绑定** → alpha.3（ADR-05 后续扩展）。

---

> **实现指针**：level `red`（动 `plot/src/ir/**`）、additive 非 breaking。真源以代码为准——`PlotCoordinate` / `Cartesian2DSchema` / `CoordinateSchema` / `Coordinate`（`plot/src/ir/coordinate.ts`，复用 core `ValueOf`）；x/y 是字符串、语义指向 `scales[].name` 但 schema 不 import scale、不校验存在性。测试在 `packages/plot/plot/tests/ir/coordinate.schema.test.ts`。完整施工契约（Schema 改动表 / 文件 scope / 测试象限 / 依赖现有元素）见本文件 git 历史。

> 🔖 封板压缩 commit `9115e6b4`；压缩前完整施工蓝图 = `git show 9115e6b4^:notes/decisions/plot/v0/v0.1/v0.1-alpha.1/04-plot-coordinate.md`。
