# ADR-03：Cell box、矩形 span 与 bounds-aware alignment

- 状态：Accepted
- 决策日期：2026-07-23
- 收口日期：2026-07-27
- 关联：[alpha.2 roadmap](./roadmap.md) · [轨道尺寸与 solver](./02-track-sizing-schema-and-solver.md) · [Core constrained layout gate](./01-core-constrained-layout-gate.md)

## 背景

alpha.1 把每个 Cell 固定到单个 row × column，并假设内容局部原点就是视觉中心。该模型无法表达 span、padding，也不能正确放置原点偏移、带 transform 或嵌套 composite 的任意 `IRChild`。

Table 需要把内容的 allocation bounds、padding 与 span 归一为数值 contribution，再在轨道求解后形成稳定的 Cell box。visual bounds 只描述装饰性可见范围，不得反向改变轨道尺寸或对齐。

## 决策

### Cell 合同

Cell 的共享 payload / manual entry 合同通过 `IRTableCellSpan` 与 `IRTableCellLayout` 提供可选 `span` 和 `layout`：

- `span.rows` / `span.columns` 是正整数，省略时为 `1`
- `layout.padding` 复用 Core `BoxSpacingSchema`，按 side > axis > default > `0` 解析
- `horizontalAlign` / `verticalAlign` 支持 `start | center | end`，省略时为 `center`
- `start` / `end` 指 Table 局部坐标轴的较小 / 较大坐标，不引入 writing mode

normalize 后的 `ResolvedTableCellSpan` 与 `ResolvedTableCellLayout` 全字段必填；manual、detail 与 custom Structure 都进入同一个 `SemanticTableModel`，后续布局不读取 provider identity。detail column 的 `headerLayout` / `bodyLayout` 直接映射到对应 Cell。

通用 spacing normalization 由 Core 包根公开的 `resolveBoxSpacing()` 拥有。Table 只消费该纯 helper，不复制实现，也不 deep import Core compile 内部。

### 占位与 span contribution

Cell address 始终是覆盖矩形的左上角。normalize 对 canonical occupancy 执行以下不变量：

1. span 不得越界，并覆盖连续矩形轨道
2. span 不得跨越不同 `TableRowKind`
3. 任意两个 Cell 不得占用同一槽位；空槽合法
4. 冲突诊断包含 Cell id 与首个重叠槽位

非 spanning Cell 以 `allocation size + 两侧 padding` 贡献自然尺寸。spanning Cell 按 `(span length, start index, cell id)` 排序，把 deficit 传播回每轨 contribution：fixed 轨不增长，auto 与非 flex minmax 先等额 water-fill，fraction 与 flex minmax 再按权重分配。传播只产生数值 contribution，不把 Cell 或 span 语义塞入 ADR-02 solver。

内部 gap 计入 span 已覆盖尺寸：

```text
covered = sum(track natural sizes) + (span length - 1) * gap
deficit = max(0, required outer size - covered)
```

全部计算保持 canonical order、输入不变与有限数诊断；无可表示的 IEEE-754 微小 residual 确定性耗尽，不能无进展循环或误抛合法输入。

### Cell box 与对齐

spanning Cell box 覆盖全部轨道及其内部 gaps。content box 由 Cell box 内缩 resolved padding；padding 超过 Cell 尺寸时对应轴钳制为 `0`，不产生负尺寸。

对齐基于 Core `allocationBounds`：content box 的 start / center / end anchor 减去 source allocation bounds 的对应 anchor，得到 finite Table-local translation。该 translation 包在 replay root 外层，不覆盖 child 自带 transform，也不重新 layout child。

列优先事务先用 natural proposal probe 的 allocation width 求 columns；列宽确定后，仅对 `wrap: true` 的 Cell 以 content-box width 发起 x 轴 range proposal，并用选中的 probe result、replay 与 allocation height 求 rows。row 结果不反向重开 column solver。

## 不采用的方案

- 不按内容局部原点或 visual bounds 对齐：两者都不能稳定代表布局盒
- 不让 solver 直接读取 Cell / span：会破坏轴无关数值边界
- 不按 manual / detail / custom 分叉布局：Structure 只负责产生统一模型
- 不在 Table 内复制 Core spacing、测量或 replay 能力

## 公开影响与兼容性

- ⚠️ BREAKING：Cell 从单槽占位扩展为矩形占位，重叠或跨 row-kind span 现在 fail-loud
- `IRTableCellSpan` / `IRTableCellLayout`、detail column、manual Cell、Structure output 与 Semantic model 共享 span/layout；manual 持久化最终形态由 ADR-08 冻结
- alpha.1 的单点 `contentCenter` 被 Cell box、content box、source bounds 与 translation 取代，不保留兼容字段
- `visualBounds` 不参与 contribution；fit / overflow 后的可见范围由 ADR-04 与 ADR-06 的 manifest 表达

## 最终实现与验证

实现落在 Table schema、Structure normalize、`layout/span.ts`、`layout/cell.ts` 与 layout transaction；Core spacing helper 由已发布 Kernel 提供。React marker builder 使用同一 occupancy 语义预占未来行。

正式测试覆盖 schema round-trip、默认值、越界/重叠/跨 row-kind、deterministic span propagation、gap、padding、非零 source bounds、三种对齐及 marker 等价。关键证据位于 `tests/layout/{span,cell-layout}.test.ts`、`tests/structure/normalize.test.ts`、`tests/pipeline/layout-transaction.test.ts` 与 React `tests/components/authoring.test.tsx`。

遗留范围包括 writing mode / RTL、stretch 之外的内容策略、有限高度约束与 fragmentation；它们不改变本 ADR 的 Cell box 和 allocation-bounds 对齐合同。
