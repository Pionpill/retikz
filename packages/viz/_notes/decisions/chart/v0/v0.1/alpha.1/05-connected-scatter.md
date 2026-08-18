# ADR-05：Connected Scatter 的 Point + Path 配方

- 状态：Proposed
- 决策日期：2026-07-31
- 关联：[alpha.1 roadmap](./roadmap.md) · [ADR-04](./04-scatter.md)

## 背景与目标

Connected Scatter 用点表示观察值，并按稳定顺序连接它们以强调二维轨迹。连接不是可关闭的装饰；只有 Point 或只有 Path 都不再是该 Canonical Type。

## 核心决策与基础数据结构

```ts
type ConnectedScatterChartIR = ChartCommon & {
  type: 'connected-scatter';
  encoding: {
    x: IRPlotChannel;
    y: IRPlotChannel;
    order: string;
    series?: string;
    color?: StrictColorChannel;
  };
  mark?: ConnectedPointPatch;
  components?: { connection?: ConnectedPathPatch };
};
```

recipe 固定生成一条开放 Path 与一个 Point Mark：connection 先绘制，points 后绘制；两者共享 x / y、active view 与颜色语义，Path 使用必需 `order`，可按 `series` 分组。两个 Mark、共同位置角色、Path 顺序和开放轨迹是不可撤销核心。

`mark` 只调整 points 的表现字段；`components.connection` 只调整 Path 的 curve 与表现样式。两者不能修改 type、identity、encoding、order / series、closed 状态、transform、coordinate ownership 或核心层级。Point patch 复用 ADR-04 `ScatterPointPatch` 并排除 `layer`；Path patch 只允许 Plot Path 的 `curve`、`connectNulls`、stroke / fill、line、marks、shadow、blendMode、label 等表现字段，排除 `type`、`id`、`encoding`、`order`、`series`、`closed`、`transform`、view、anchor、zIndex、rotate、scale 与未知字段。

显式 color field 让 Point 与 Path 共享同一 scale identity；未指定 scale 时使用保留的 Plot ordinal scale，并消费 Plot 最终 categorical palette。省略 color 而存在 series 时，series 作为共同 field-bound color 并消费 Plot 最终 series palette；省略两者时使用最终 series palette 第一色的同一 constant。field-bound 分支在默认 legend 允许时生成绑定实际 scale 的 color legend，constant 分支不生成 legend；显式 guides 整体替换 defaults。

## 行为、失败语义与兼容性

- 缺 `order`、字段类型与 scale 不兼容、核心 Mark 缺失、顺序改变、x / y / order / series 不一致、轨迹被闭合、保留 identity 冲突或 coordinate 不兼容均 fail-loud
- `series` 决定 Path 分组；省略 series 而提供 color field 时按 color field 分组，避免跨颜色连接
- `series` 与不同 color field 同时存在时，Plot 验证每个 series 内颜色恒定；Chart 不预扫描 rows，也不合成复合 key
- Path、Point 与 axes 始终属于同一二维 view；root transform 沿 Plot 主链作用于共同输入
- JSON、React、Vanilla 共享同一 variant、recipe、color / scale 语义，不把连接改成 renderer path 或 adapter-only decoration

## 功能与包边界

Chart 拥有双 Mark recipe、order / series 角色、patch 边界与 categorical default；Plot 拥有 Point / Path、stable order、series grouping、color / scale 校验、coordinate projection、lowering 与 locator。Chart 不复制排序、分组或 color consistency 算法。

## 当前实现结果与遗留风险

本 ADR 已冻结 Point + ordered open Path 的 type identity 与覆盖边界，状态仍为 Proposed。公开 Chart surface 仍需与 canonical Chart root 及 Plot 正式 order、grouping、color pipeline 同步形成。

长期风险是任何新增表现性 patch 都不能撤销开放 Path、核心层级或共同 view；数据排序、分组与 scale 诊断必须继续由 Plot 统一拥有。
