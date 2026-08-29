# ADR-13：Bubble 的必需尺寸字段语义

- 状态：Proposed
- 决策日期：2026-08-29
- 关联：[alpha.1 roadmap](./roadmap.md) · [Chart 总设计](../../../../../architecture/chart-design.md) · [Chart 封装完备设计](../../../../../architecture/chart-encapsulation-complete.md) · [ADR-04 Scatter](./04-scatter.md) · [ADR-11 encoding 字段映射](./11-chart-encoding-field-mapping.md) · [ADR-12 React 声明组件](./12-chart-react-declaration-authoring.md)

## 背景与目标

Scatter 与 Bubble 都以 Plot Point 表达观测值，但两者的长期身份不同：Scatter 只要求二维位置，`size` 是可选视觉通道；Bubble 必须用第三个数据字段控制点的面积感知尺寸。仅把 Scatter 的常量半径调大，或允许作者删除尺寸字段后仍称为 Bubble，会让 chartType 无法提供稳定的数据角色、默认与诊断。

Chart 以 `type` 区分 family、以 `recipe.chartType` 区分具体薄壳。Bubble 因此需要独立的 exact Source、recipe Definition、semantic mark、React / Vanilla 入口与文档；底层仍应完整复用 Point、size channel、sqrt scale、legend、facet composition、lowering 与 provenance 主链，不建立 Bubble 私有半径算法或 Plot 旁路。

## 决策：独立 `bubble` chartType 固定 Point 与字段尺寸映射

Bubble 属于 `point` family，并使用全局唯一的 `recipe.chartType: 'bubble'`。它要求 `encodings.x`、`encodings.y` 与 `encodings.size`，其中 `size` 只能是字段映射，不能退化为常量 property。

理由：

1. 必需的第三个数据角色是 Bubble 相对 Scatter 持续成立的语义，不应依赖示例惯例或可删除的样式配置
2. Plot 已拥有 Point size channel、sqrt scale 与 size legend，Chart 只需冻结组合和不可撤销边界
3. 独立 chartType 让 schema、自动补全、provider 路由、semantic identity、React / Vanilla API 与诊断都能精确表达 Bubble
4. Scatter 与 Bubble 可以共享 Point 原子和 resolver，但不能合并成接受所有可选 slot 的宽 Source schema

## 基础数据结构与公开契约

Bubble 使用与 Scatter 同形的 Chart Source shell，但拥有独立的严格 recipe：

```ts
type IRBubbleChartRecipe = {
  chartType: 'bubble';
  encodings: IRBubbleChartEncodings;
  properties?: IRBubbleChartProperties;
  marks?: Array<IRBubbleMark>;
};

type IRBubbleChartEncodings = {
  x: BubblePositionMapping;
  y: BubblePositionMapping;
  size: BubbleSizeMapping;
  color?: BubbleColorMapping;
  opacity?: BubbleOpacityMapping;
  shape?: BubbleShapeMapping;
  row?: BubblePartitionMapping;
  column?: BubblePartitionMapping;
  facet?: IRPlotFacetOptions;
};

type IRBubbleMark = {
  kind: 'bubble';
  override?: boolean;
  encodings?: BubbleMarkEncodingsWithoutSize;
  properties?: IRBubbleChartProperties;
};
```

这些名称表示契约角色，不新增 Plot、Data 或 Foundation 已拥有的原子类型。位置、颜色、尺寸、透明度、形状、partition、facet、aggregate、derived transform、开放 operation key 与 scale binding 直接复用 ADR-11 和当前 owner 的 schema；具体 Bubble schema仍独立闭合并由 schema 推导公开类型。

`IRBubbleChartProperties` 复用 Point 常量属性，但排除 `size`。`IRBubbleMark` 的显式 encodings 与 properties 也都排除 `size`；mark 可以继承 recipe 的必需尺寸映射，却不能改写、删除或替换该角色。Bubble 的内建 semantic group 使用唯一 `kind: 'bubble'`，并确定性生成一个 Plot Point mark。

具体入口为：

- `@retikz/chart/point/bubble`：Bubble exact schema、Source 类型与 provider contribution
- `@retikz/chart-vanilla/point/bubble`：`normalizeBubbleChart` 与 `createBubbleChart`
- `@retikz/chart-react/point/bubble`：`BubbleChart`、`BubbleEncodings`、`BubbleProperties` 与 `BubbleMark`

最小 React authoring 为：

```tsx
<BubbleChart>
  <ChartData data={rows} />
  <BubbleEncodings x="income" y="lifeExpectancy" size="population" />
</BubbleChart>
```

JSON、Vanilla 与 React 最终生成同一个 `IRBubbleChart`；React 继续通过 Chart 公共 declarations 与 Bubble 私有 declarations 组装 Vanilla Input，不建立新的持久化 grammar。

## Point 复用边界

Scatter 与 Bubble 共享以下稳定 Point 能力：字段 mapping 原子、position / visual scale binding、facet refinement、字段 mapping resolve、Cartesian scaffold、Point mark lowering、Point recipe Theme 与 size legend 生成。共享层只表达 Point family 不变量，并允许具体 chartType 组合自己的 exact schema、ordered slots、consumer、mark payload 与 semantic identity。

以下内容保持具体 chartType 私有：`chartType`、必需 / 可选 slot、properties 收窄、mark 可覆盖面、semantic group kind、provider contribution 与 adapter 入口。不得为复用建立 `SharedPointChartEncodingsSchema`、通用 Bubble / Scatter recipe factory 或运行时按字段猜测 chartType。

## 行为、失败语义与兼容性

- 默认行为：Bubble 生成一个 Point semantic mark；`size` 使用 Plot 的 sqrt 尺寸尺度语义，并默认生成 size legend。legend 是可替换的表现性 guide，不属于 chartType 核心
- 尺度约束：省略显式 scale 时沿用 Plot 的默认 sqrt size scale；内联或具名 scale 必须解析为兼容的 sqrt position scale。Chart 不实现第二套尺度或半径计算
- mark 行为：普通 `BubbleMark` 按 authored order 追加；`override: true` 原位替换内建 `bubble` semantic group。两种情况都继承 recipe 的核心 size mapping，显式 payload 不能提供 `size`
- facet 与 transform：row / column / facet、aggregate 与 derived mapping 沿用 Point exact encoding 和 owner operation 契约；共享轴多 mark 轨道仍只通过 `ChartExtension` / `plotExtension` 使用 Plot 能力
- 失败与诊断：缺少 `x`、`y` 或 `size`，把常量 size 放入 properties，在 `BubbleMark` 中声明 size，使用不兼容的 size scale，重复 override，未知 operation / chartType / provider dependency，均在对应 schema、Chart resolve 或 Plot owner 边界 fail-loud
- 数据边界：字段类型、transform output model、非负尺寸值、空数据与退化 domain 沿用 Data / Plot 正式校验和诊断；Chart 不扫描或修补 runtime rows
- 兼容性：这是新增公开 chartType，不移除 Scatter 的可选 size 能力。它取代“Bubble 只是 Scatter Pattern”的旧分类结论，但不恢复已删除的旧 API、旧 schema 或兼容别名
- React / Vanilla 等价性：Bubble 三入口复用同一 exact Source、runtime Definition sidecar、active provider 与 resolver 主链；adapter 不实现 Bubble 默认、尺度选择或 legend 逻辑

## 范围边界

本 ADR 不包含 circle packing、碰撞布局、常量半径 preset、新的 radius 算法、负值补偿、数据清洗、轨道或 generic Chart router。若未来 packed bubble 引入独立布局或数据拓扑，应建立新的 chartType 与能力决策，不能扩展本 Bubble recipe 偷渡实现。
