# ADR-04：ordinal·color scale + color 非位置通道（首个非位置通道，按系列着色）

- 状态：Accepted（已实现）
- 决策日期：2026-06-05
- 关联：[plot v0.1-alpha.3 待办](./roadmap.md) · [plot-design.md §3.4 scale / §3.6 encoding（位置 / 非位置）/ §4.2 通道分流](../../../../../architecture/plot-design.md) · 回溯：[alpha.1 ADR-05 encoding/mark](../v0.1-alpha.1/05-plot-encoding-mark.md) · 依赖：[ADR-01 band scale（inferCategoryDomain / CategoryValueSchema）](./01-band-scale.md) · 消费方：[ADR-05 relation](./05-relation.md) · [ADR-07 DSL](./07-bindings-dsl.md)

## 背景

塑造决策的硬约束：

- alpha.1/alpha.2 的 encoding 只有 **x / y 位置通道**、scale 只有连续 linear；多系列图（多线、分组 / 堆叠柱）必须用**颜色**区分系列——color 是 plot-design §3.6 列的**非位置通道**（color / size / shape / opacity…）里的第一个，也是落地多系列的前提。
- color 牵动两处：scale 需补 **ordinal**（「分类域 → 颜色范围」映射，d3 `scaleOrdinal` + 现成配色方案）；encoding 需补**非位置通道**及「通道找 scale 的方式」——位置通道经 `coordinate.x/y` 间接绑 scale，非位置通道**没有 coordinate**，必须自己指明用哪个 scale。
- 范围限定：本 ADR 只做**按字段着色**的最小闭环（如散点 / 多线按类别上色）；与**多系列几何**（分组 / 堆叠柱、多线拆分）的集成在 [ADR-05](./05-relation.md)。

## 决策：encoding 加 `color` 通道 + ChannelSchema 加 `scale` 引用；scale union 加 ordinal；mark 按 color scale 分组着色，每色一子 Scope 设 fill

`ChannelSchema` 加可选 `scale?`（非位置通道用它指明 scale 名；位置通道省略、scale 由 coordinate 绑）。`EncodingSchema` 加 `color?` 通道。`ScaleSchema` 加 `ordinal` 成员（分类域 → 输出值数组，颜色是其典型用途；`range` 省略时 lowering 用默认配色方案）。lowering：解析 color scale，把行按 color 值分组，**每个颜色一个子 Scope**（`fill` 设为该色），柱 / 点落进对应子 Scope——颜色上提到 Scope、不逐元素写，守 IR 体积原则。**注意主从（与 [ADR-05](./05-relation.md) 统一）：当 mark 带 `series` 时，分区以 series 为主、color 仅决定每系列 paint；本 ADR 的「按 color 分子 Scope」专指 *无 series* 的着色（如分类散点）**——lowering 永远不会「先按 color 拆、再按 series 拆」。

判别串以代码为准（命名 / 语义即决策）：`ScaleSchema` 升 4 成员 union、`PlotScale` 补 `Ordinal:'ordinal'`（`packages/plot/plot/src/ir/scale.ts`）；`ChannelSchema.scale` / `EncodingSchema.color` 见 `packages/plot/plot/src/ir/encoding.ts`。

理由：

1. **color 是多系列的前提**：没有 color 通道 / scale，多条线 / 分组柱无法区分系列——[ADR-05](./05-relation.md) 直接依赖它。先把单通道（color）打通，size / shape / opacity 套同一「非位置通道 + scale ref」模式后续加。
2. **`scale` 引用解决「非位置通道找 scale」**：位置通道的 scale 藏在 coordinate，非位置通道没有归宿，显式 `scale` 名是 grammar of graphics 「scale 名必须显式」（§3.6）的落地；位置通道省略该字段、零影响（非破坏）。
3. **ordinal + d3 配色方案**：`scaleOrdinal` + `d3-scale-chromatic` 是成熟分类配色，省自造调色板；`range` 可显式覆盖（用户给颜色数组）。
4. **每色一子 Scope、颜色上提**：N 行同色 → 一个 `fill` 设在 Scope、子元素不重复写 fill，IR 体积 O(色数) 而非 O(行数)；且天然契合 [ADR-05](./05-relation.md) 的「按系列分子图层」。
5. **JSON 安全 / 可扩展**：color 值、ordinal range 都是字符串数组；`type` 判别位继续扩（size scale 等）非破坏。

### 拍板的取舍

- **默认配色方案**：`range` 省略时用 **`schemeCategory10`**（d3-scale-chromatic，10 色循环，最通用）；色数 > 10 时循环复用（d3 `scaleOrdinal` 默认行为）。引 `d3-scale-chromatic`（catalog 登记）。
- **color 落 fill 还是 stroke**：按 mark 类型——**填充型**（point / interval）落 `fill`，**描边型**（line）落 `stroke` / `color`（master）。lowerMark 各分支自行决定通道。
- **color 与 series 的主从（与 [ADR-05](./05-relation.md) 一致）**：**series 是主分区，color 只定 paint，分组永不「先 color 后 series」**。
  - *无 series*：point / interval 按 color 值分子 Scope（color 即事实分组）；**line 的 color 无 series → 提升为 `series = color`**（一条线不能多色，必须先按色拆成多线）。
  - *有 series*：按 series 分子 Scope，每系列取其 **color 字段值**过 scale 上色（`color` 省略时默认 `color = series`，一系列一色）。`color` 字段 ≠ `series` 字段、且系列内 color 取值不一的「系列内逐 datum 着色」**留后续**——alpha.3 取该系列**首行** color 值定该系列色。
- **color 通道无显式 scale 时**：lowering **自动合成**一个 ordinal color scale（域 = 该字段分类域、range = 默认方案），免用户为「按字段上色」必写一条 scale + scale ref。显式 `scale` 名则查 `scales[]`。DSL（[ADR-07](./07-bindings-dsl.md)）默认走自动合成。
- **`color.value` 常量**：`{ value:'#e4572e' }` → 整个 mark 固定色（不过 scale），等价 alpha.1 的 currentColor 但可指定；与 `field`（过 scale）互斥（沿用 channel refine）。
- **域推断口径**：color 字段的分类域复用 [ADR-01](./01-band-scale.md) `inferCategoryDomain`（保序去重），与 band 同源——保证「系列在图例 / 颜色 / 堆叠序」一致。
- **ScalarValue vs CategoryValue 域**：ordinal `domain` 用 `CategoryValueSchema`（string|number），与 band 对齐；`range` 用 `z.array(z.string())`（颜色串），不混入数值。

## 不在本 ADR 范围

- **legend（图例）** → 后续（与 color scale 配套，但富排版 + 布局占位，单独里程碑）。
- **size / shape / opacity 等其余非位置通道** → 后续（套同一「非位置通道 + scale ref」模式）。
- **连续色阶（sequential / diverging，数值 → 渐变色）** → 后续（本 ADR 只 ordinal 分类色）。
- **系列内逐 datum 着色**（color 字段 ≠ series 字段、系列内 color 取值不一）→ 后续（alpha.3 取系列首行 color 定色）。
- **多系列几何**（按 color 拆多线 / 分组 / 堆叠柱）→ [ADR-05](./05-relation.md)；本 ADR 只做「按字段给元素上色」。
- DSL 表面（`<PointMark color="category" />` 等）见[文档站](https://pionpill.github.io/retikz/)与 [ADR-07](./07-bindings-dsl.md)。

---

> **实现指针**：level `red`（动 `plot/src/ir/**` encoding+scale schema + `src/lower/**` + plot 包依赖）、非 breaking（位置通道省 `scale` 零影响；color 通道纯新增；对 core 无影响，color 在 lowering 算成 CSS 色串落 Scope.fill / element fill，IR 纯 JSON）。
> - 真源以代码为准：`ChannelSchema`（加 `scale?`）/ `EncodingSchema`（加 `color?`）（`packages/plot/plot/src/ir/encoding.ts`）、`OrdinalScaleSchema` / `PlotScale.Ordinal` / `ScaleSchema` 4 成员 union（`packages/plot/plot/src/ir/scale.ts`）、`resolveOrdinalScale` + 自动合成（`packages/plot/plot/src/lower/scale.ts`）、按 color 分组着色（`packages/plot/plot/src/lower/mark.ts`）、解析 / 合成 color scale（`packages/plot/plot/src/lower/expand.ts`）。基于 `d3-scale`（`scaleOrdinal`）+ `d3-scale-chromatic`（`schemeCategory10`），版本在 `pnpm-workspace.yaml` catalog；color 在 lowering 内部算、不进 IR。
> - 测试见 `packages/plot/plot/tests/ir/encoding.schema.test.ts` / `tests/ir/scale.schema.test.ts`（color 通道 + scale ref accept/reject、ordinal schema、range 非串拒、field/value 互斥）与 `tests/lower/lowerPlots.test.ts`（按值分子 Scope、默认方案循环、显式 range、固定 `color.value`、无 scale ref 自动合成、point 落 fill / line 落 stroke、color 域与 band 域同源）。
> - 完整施工契约（Schema 改动表 / 测试象限 / 文件 scope）见本 ADR Proposed commit。
