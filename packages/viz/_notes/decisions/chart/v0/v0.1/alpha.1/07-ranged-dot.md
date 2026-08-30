# ADR-07：Ranged Dot 的 projected Relation 端点原子性

- 状态：Proposed
- 决策日期：2026-08-30
- 关联：[alpha.1 roadmap](./roadmap.md) · [ADR-04 Scatter](./04-scatter.md) · [ADR-11 encoding 字段映射](./11-chart-encoding-field-mapping.md) · [ADR-12 React 声明组件](./12-chart-react-declaration-authoring.md)

## 背景与目标

Ranged Dot 用同一行数据中的起点、终点和连接线比较一个类别的两个值。其稳定身份不是三个独立 mark 的视觉巧合，而是同一 row、同一坐标帧、同一颜色与同一 provenance 下的原子三成员输出。

Plot Relation 已拥有 source / target projected target、路径几何、样式、坐标投影与逐行跳过语义，但只输出 connector。若 Chart 独立生成两个 Point 和一个 Relation，三者会分别投影：某一端无效时可能残留孤立端点。为保持 owner 边界，Plot Relation 扩展可选 endpoint glyphs，在一次 source / target 投影后原子生成 connector、source glyph 与 target glyph；Chart 只配置这一能力。

## 决策：固定横向 `ranged-dot`，由一个 Relation operation 原子输出

Ranged Dot 属于 `point` family，并使用全局唯一的 `recipe.chartType: 'ranged-dot'`。它固定横向方向：`category` 映射 y，`start` 与 `end` 分别映射 source.x 与 target.x，并共同消费同一个 x scale。两端都显式声明 scale binding 时名称必须一致；允许一端声明 operation、另一端引用同名 scale，不同名称在 Ranged Dot owner schema 边界 fail-loud。

```ts
type IRRangedDotChartRecipe = {
  chartType: 'ranged-dot';
  encodings: {
    category: RangedDotCategoryMapping;
    start: RangedDotValueMapping;
    end: RangedDotValueMapping;
    color?: RangedDotColorMapping;
    row?: RangedDotPartitionMapping;
    column?: RangedDotPartitionMapping;
    facet?: IRPlotFacetOptions;
  };
  properties?: {
    point?: IRRangedDotPointProperties;
    startPoint?: IRRangedDotPointProperties;
    endPoint?: IRRangedDotPointProperties;
    range?: IRRangedDotRangeProperties;
  };
  marks?: Array<IRRangedDotMark>;
};

type IRRangedDotMark = {
  kind: 'ranged-dot';
  override?: boolean;
  encodings?: {
    category?: RangedDotDirectCategoryMapping;
    start?: RangedDotDirectValueMapping;
    end?: RangedDotDirectValueMapping;
  };
  properties?: IRRangedDotChartRecipe['properties'];
};
```

Chart 生成一个 Plot Relation：source 和 target 各投影 x / y，`endpoints.source` 与 `endpoints.target` 请求端点 glyph。Relation 在每行只解析一次两个 projected target；二者都成功时，按 connector、source glyph、target glyph 的固定顺序输出。端点 glyph 复用 Point 的核心形状和常量表现原子，但不拥有独立位置、数据、view、transform、anchor、offset 或 zIndex。

`point` 是两个端点的共同常量样式；`startPoint` 与 `endPoint` 在其后分别覆盖对应端点。`range` 只配置 connector 的常量线条表现。`color` 字段映射使用同一个 ordinal scale同时驱动 connector 和两个端点，并默认生成分类图例；成员级 properties 只能给出常量颜色，不建立独立数据尺度。

具体入口为：

- `@retikz/chart/point/ranged-dot`
- `@retikz/chart-vanilla/point/ranged-dot`
- `@retikz/chart-react/point/ranged-dot`

React 最小 authoring 为：

```tsx
<RangedDotChart>
  <ChartData data={rows} />
  <RangedDotEncodings category="country" start="previous" end="current" />
</RangedDotChart>
```

## Plot Relation endpoint glyph 契约

- endpoint glyph 只在对应 target 是 projected ref 时合法；direct target、generated target、ribbon relation、显式 route / via 或外部 anchor 不接受 endpoint glyph
- source 或 target 任一字段缺失、null、类型不可投影或投影结果无效时，整行 connector 与两个 endpoint glyph 一起跳过
- 字段映射缺失、坐标 role 不受支持、scale 或 coordinate contract 不兼容属于结构错误，继续 fail-loud
- 同一行的 connector 与端点共享 transformed row、frame、颜色通道、mark provenance 和 datum identity；endpoint role 只用于区分生成节点，不复制或冲突 Core id
- locator 仍解析该 row 的共同 relation anchor；本次不新增 endpoint-specific locator address
- endpoint glyph 是 Relation 的可选正式能力；省略时现有 Relation 输出、schema、lowering、locator 与 provenance 行为不变

## 行为、失败语义与兼容性

- authored role：`start > end` 不自动排序或交换，两端继续保持 start / end 身份
- 退化值：`start === end` 生成零长度 connector 和两个重合端点；空 rows 合法且不产生 geometry
- 原子跳过：datum-level 无效值只跳过该行，不让整张 Chart 失败，也不留下孤立 geometry
- mark：普通 authored mark 按顺序追加完整 ranged-dot group；`override: true` 原位替换内建 group，不能只替换 connector 或单端点
- 层级：connector 固定先于两个端点绘制；properties 排除 zIndex，不能撤销该层级
- 失败：缺少 category / start / end、非法 scale、未知 properties、重复 override、endpoint glyph 用于非 projected target 或 ribbon，以及 provider 依赖不闭合，均在 owner 边界 fail-loud
- facet：row / column / facet 沿用 Point family 的固定 composition；同一 group 始终使用共同 view
- 兼容性：Relation endpoint glyph 是向后兼容的可选字段；Ranged Dot 是新增 exact chartType，不保留旧 flattened API 或三独立 mark 实现别名
- adapter 等价：JSON、Vanilla 与 React 生成同一个 exact Source；adapter 不 reshape / filter 数据，不投影坐标，不自行组装 connector 或 endpoint geometry

## 范围边界

本 ADR 不建立任意 compound-mark 原子性框架，不支持纵向 orientation、多个端点、误差线、dumbbell 专用布局、endpoint locator、renderer 新图元或数据清洗。未来纵向能力应作为同一 pattern 的 orientation 扩展，而不是新增 chartType。
