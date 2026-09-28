---
description: Point family 的 Connected Scatter recipe；背景：Connected Scatter 用离散观测点和按显式顺序连接的开放轨迹共同表达变化过程
keywords: 'Point、family、Connected、Scatter、recipe、order、series、zIndex'
---

# ADR-005：Point family 的 Connected Scatter recipe

- 状态：Proposed
- 决策日期：2026-08-30
- 关联：[alpha.1 roadmap](./roadmap.md) · [ADR-004 Scatter](./004-scatter.md) · [ADR-006 Regression](./006-regression.md) · [ADR-011 encoding 字段映射](./011-chart-encoding-field-mapping.md) · [ADR-012 React 声明组件](./012-chart-react-declaration-authoring.md)

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
    colorMode?: 'series' | 'mark' | 'muted';
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

具体 schema 独立闭合并由 schema 推导公开类型。Point properties 复用 Point 的常量表现原子但排除 `zIndex`；Path properties 开放常量线条表现、`curve` 与 `connectNulls`，排除 `zIndex`、`closed`、位置、数据、view、transform、order 与 series。authored mark 可以直接覆盖 x、y、order，却不能引入或改写 series。

默认 `colorMode: series` 下，`series` 存在时，Path 按该字段分组，Point 与 Path 绑定同一个 ordinal color scale，并默认生成分类图例；没有 series 时，Chart 为两者写入同一个 Plot `defaultColorGroup`，使省略 member paint 的 Path 与 Point 复用 `palette.series` 中的同一槽位。合法的 member properties 仍可显式覆盖各自颜色。

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

`path.connectNulls` 复用 Plot 的 boolean / 描边对象契约（[ADR-107](../../../plot/v0/v0.1/107-path-null-connections.md)）：省略或 false 在缺值处断开；true 与空对象开启默认虚线桥接，对象仅覆盖跨缺值段描边。正常段沿用 path 样式，不补点或推断缺失整行；缺口分段与几何由 Plot 负责。

`properties.path.curve` 复用 Plot Path 的连接方式契约，省略时按 `linear` 连接。Recipe 与 authored mark 均可配置，图元显式值覆盖继承值。Chart 仅透传该选项，曲线几何、极坐标约束与回退仍由 Plot 负责，不改变点的位置、order、series 或 Path → Point 绘制顺序。Basis 不保证经过所有中间观测点；平滑连接不代表统计拟合。

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

### 配色策略

Recipe properties 的 `colorMode` 取 `series`（默认）、`mark` 或 `muted`。默认保持每个序列的点线同色；`mark` 使第 i 个序列的点、线分别使用有效色板的第 2i、2i+1 项，超出长度继续循环。无 series 时视为第一个序列，点取第一色、线取第二色。

显式 point.color、point.fill 与 path.stroke 优先；图例必须同时呈现每个序列的点色、线色。策略属于 Chart，色板索引与组合图例能力属于 Plot，Chart 不解析主题色板或自行渲染图例。所有 authoring 入口共享同一 Source 契约。

`colorMode: muted` 沿用 series 的配色与图例，Point 外观不变，仅将 Path 的缺省 strokeOpacity 设为 0.6。显式 recipe 或 authored mark 的 path.strokeOpacity 优先（包括 0）；path.opacity 仍按既有整体透明度语义独立生效。

本 ADR 不包含闭合轨迹、多条异构轨迹、箭头、动画、曲线拟合、数据 reshape、通用 Layer Chart 或全局 Chart catalog。需要任意 Point / Path layering 的应用继续直接使用 Plot 或 `ChartExtension`。
