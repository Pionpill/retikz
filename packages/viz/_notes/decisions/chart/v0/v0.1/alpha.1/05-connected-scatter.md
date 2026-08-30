# ADR-05：Point family 的 Connected Scatter recipe

- 状态：Proposed
- 决策日期：2026-08-30
- 关联：[alpha.1 roadmap](./roadmap.md) · [ADR-04 Scatter](./04-scatter.md) · [ADR-06 Regression](./06-regression.md) · [ADR-11 encoding 字段映射](./11-chart-encoding-field-mapping.md) · [ADR-12 React 声明组件](./12-chart-react-declaration-authoring.md)

## 背景与目标

Connected Scatter 用离散观测点和按显式顺序连接的开放轨迹共同表达变化过程。它不是“开启连线样式的 Scatter”：轨迹顺序是必需数据角色，Point 与 Path 组成不可拆散的 semantic group，可选 series 还需要同时控制轨迹分组、分类颜色与图例。

Plot 已拥有 Point、Path、`order`、`series`、`connectNulls`、字段尺度、图例、facet、lowering 与 provenance 主链。Chart 因此只冻结具体 chartType 的字段角色、组合顺序、可覆盖面和三入口等价，不建立私有排序、分组、缺值或路径算法。

## 决策：独立 `connected-scatter` chartType 固定 Path → Point 组合

Connected Scatter 属于 `point` family，并使用全局唯一的 `recipe.chartType: 'connected-scatter'`。`x`、`y` 与 `order` 是必需字段映射；`series` 是可选、仅属于 recipe 的字段映射。一个 semantic group 确定性生成 `[Path, Point]`，使轨迹先绘制、点后绘制。

```ts
type IRConnectedScatterChartRecipe = {
  chartType: 'connected-scatter';
  encodings: {
    x: ConnectedScatterPositionMapping;
    y: ConnectedScatterPositionMapping;
    order: ConnectedScatterOrderMapping;
    series?: ConnectedScatterSeriesMapping;
    row?: ConnectedScatterPartitionMapping;
    column?: ConnectedScatterPartitionMapping;
    facet?: IRPlotFacetOptions;
  };
  properties?: {
    point?: IRConnectedScatterPointProperties;
    path?: IRConnectedScatterPathProperties;
  };
  marks?: Array<IRConnectedScatterMark>;
};

type IRConnectedScatterMark = {
  kind: 'connected-scatter';
  override?: boolean;
  encodings?: {
    x?: ConnectedScatterDirectPositionMapping;
    y?: ConnectedScatterDirectPositionMapping;
    order?: ConnectedScatterDirectOrderMapping;
  };
  properties?: {
    point?: IRConnectedScatterPointProperties;
    path?: IRConnectedScatterPathProperties;
  };
};
```

具体 schema 独立闭合并由 schema 推导公开类型。Point properties 复用 Point 的常量表现原子但排除 `zIndex`；Path properties 只开放常量线条表现与 `connectNulls`，排除 `zIndex`、`closed`、位置、数据、view、transform、order 与 series。authored mark 可以直接覆盖 x、y、order，却不能引入或改写 series。

`series` 存在时，Path 按该字段分组，Point 与 Path 绑定同一个 ordinal color scale，并默认生成分类图例；没有 series 时两者使用同一个常量颜色。该颜色是 recipe 默认，可被合法的 member properties 显式覆盖。

公开入口为：

- `@retikz/chart/point/connected-scatter`
- `@retikz/chart-vanilla/point/connected-scatter`
- `@retikz/chart-react/point/connected-scatter`

React 最小 authoring 为：

```tsx
<ConnectedScatterChart>
  <ChartData data={rows} />
  <ConnectedScatterEncodings x="income" y="lifeExpectancy" order="year" series="country" />
</ConnectedScatterChart>
```

## 行为、失败语义与兼容性

- 排序与分组：Path 必须按 `order` 字段排序，不能依赖输入数组的偶然顺序；series 只分组，不参与组内排序
- 缺值：Point 跳过无法投影的行；Path 默认在无效行处分段，`path.connectNulls: true` 可以跨越无效行连接；Chart 不扫描或修补 runtime rows
- 轨迹：Path 固定开放，不能通过 properties、mark 或 extension 把核心轨迹闭合、替换数据、改写 transform 或移动到其它 view
- mark：普通 authored mark 按 authored order 追加完整 `[Path, Point]` group；`override: true` 原位替换内建 group。两者都必须解析整个 group，不能只替换其中一个 member
- 顺序：member properties 不公开 `zIndex`，以保持 Path → Point 的核心绘制层级；共享 Plot extension 仍可在 semantic groups 后追加独立 mark，但不继承核心字段角色
- 失败：缺少或使用空白 x / y / order、非法 scale、series 被 mark 改写、未知 properties、重复 override、provider 缺失或依赖不闭合，均由 schema、Chart resolve 或 Plot owner 边界 fail-loud
- facet：row / column / facet 沿用 Point family 的固定 composition 与 locator 规则，两个 member 始终使用共同 view
- 兼容性：这是新增 exact chartType，不恢复已删除的旧 flattened Chart API、旧 patch schema或兼容别名
- adapter 等价：JSON、Vanilla 与 React 生成同一个 exact Source，并沿同一 Definition、provider、resolver 与 Plot lowering 主链执行；adapter 不实现排序、分组、缺值或图例语义

## 范围边界

本 ADR 不包含闭合轨迹、多条异构轨迹、箭头、动画、曲线拟合、数据 reshape、通用 Layer Chart 或全局 Chart catalog。需要任意 Point / Path layering 的应用继续直接使用 Plot 或 `ChartExtension`。
