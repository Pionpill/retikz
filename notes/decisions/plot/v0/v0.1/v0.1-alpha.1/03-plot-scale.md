# ADR-03：Plot 比例尺（LinearScale + Scale union）

- 状态：Accepted（已实现）
- 决策日期：2026-06-03
- 关联：[plot v0.1-alpha.1 待办](./roadmap.md) · [plot v0.1 roadmap](../roadmap.md) · [plot-design.md §3.5 / §11.1](../../../../../architecture/plot-design.md) · 根节点：[ADR-01 PlotSpec](./01-plot-spec-root.md) · 引用方：[ADR-04 coordinate](./04-plot-coordinate.md)

## 背景 / 约束

根节点（ADR-01）的 `scales` 槽位是命名比例尺数组。scale 定义「数据值 → 绘图坐标值」的映射，是图形语法最核心一环（业务量纲经 scale 映射到绘图区量纲）。本 ADR 只管「scale 自身长什么样」与「如何按名引用」，不管「谁用它」——位置通道用哪个 scale 由 coordinate 决定（ADR-04）。alpha.1 最薄切片只需 `linear`（连续线性）。

## 决策：命名 `linear` scale，domain / range 可省（lowering 推断）

每个 scale 有唯一 `name`（被 coordinate 按名引用）。alpha.1 仅 `type: 'linear'`：`domain`（输入区间 `[min,max]`）/ `range`（输出区间 `[start,end]`）均可省略，省略时留给 ADR-06 lowering 推断——domain 从绑定的外部数据集字段推（数据不进 IR、绑定期才到位，ADR-02），range 从 coordinate extent 推。`nice` / `clamp` 为可选布尔，语义默认 false。

scale 设计成 `z.discriminatedUnion('type', [...])`，alpha.1 只一个成员 `LinearScaleSchema`，为后续 band / log / time / ordinal·color 预留扩展位（registry 风格，plot-design §11.1）。

**命名决策**（字面即决策，故记最小片段）：

```ts
/** scale 类型判别值集（const 对象 + 派生类型；后续加 band / log / time / ordinal…） */
export const PlotScale = { Linear: 'linear' } as const;
export type ScaleType = ValueOf<typeof PlotScale>;
```

理由：

1. **命名 + 引用解耦**：scale 集中声明、按 `name` 被引用，让 coordinate / 未来非位置通道共享同一 scale，不必内联重复。
2. **domain / range 可省 = 自动推断入口**：alpha.1 让用户少写、lowering 兜底推断；显式给出时按用户值。可选而非必填，保证「最小 spec 能跑」。
3. **union 可扩展**：discriminatedUnion 加变体不破坏旧 IR。
4. **scale 不持有「驱动哪个通道」**：那是 coordinate（ADR-04）的职责，scale 保持纯映射定义、可被任意通道复用。

### 设计细节（具体决策）

- `domain` / `range` 用固定二元组 `[number, number]`（非 `{ min, max }` 对象）——与 d3 / Vega 习惯一致、紧凑。
- `nice` / `clamp` 语义默认 false，schema **不写 `.default(false)`**（缺省即未启用，由 lowering 解释）——保持 IR 最小、避免 parse 产物膨胀。
- scale `name` 跨元素唯一性 schema 层**不校验**（数组层无法在单元素 schema 表达），重名检测归 ADR-06 lowering。

### 未来兼容性考虑

alpha.3 多 scale 类型后，lowering 可据 ADR-02 `DataModel` 的字段 `type` 推断默认 scale 类型（quantitative → linear、nominal → band…）；本 ADR 不实现推断，仅记此联动。

## 不在本 ADR 范围

- **band / time / ordinal·color scale** → alpha.3。
- **非位置通道（color / size）自带 scale** → alpha.3（届时 channel 加 `scale` 字段）。
- **domain / range 推断、scale 求值、重名检测** → ADR-06 lowering。

---

> **实现指针**：level `red`（动 `plot/src/ir/**`）、additive 非 breaking。真源以代码为准——`PlotScale` / `LinearScaleSchema` / `ScaleSchema` / `Scale`（`plot/src/ir/scale.ts`，复用 core `ValueOf`）。测试在 `packages/plot/plot/tests/ir/scale.schema.test.ts`。完整施工契约（Schema 改动表 / 文件 scope / 测试象限 / 依赖现有元素）见本文件 git 历史。

> 🔖 封板压缩 commit `9115e6b4`；压缩前完整施工蓝图 = `git show 9115e6b4^:notes/decisions/plot/v0/v0.1/v0.1-alpha.1/03-plot-scale.md`。
