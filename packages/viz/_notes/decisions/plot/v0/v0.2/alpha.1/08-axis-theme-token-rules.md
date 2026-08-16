# ADR-08：Axis 主题 Token 作用域规则

- 状态：Proposed
- 日期：2026-08-10
- 关联：[plot v0.2-alpha.1 roadmap](./roadmap.md) · [ADR-01 Plot 主题 token 所有权](./01-chart-layering.md) · [ADR-02 继承 Theme Token Scope](./02-inherited-theme-token-scope.md) · [Plot 可视化完备设计](../../../../../architecture/plot-visualization-complete.md) · [通用视觉主题设计](../../../../../../../../notes/architecture/visual-theme-design.md)

## 背景与目标

Plot theme 的 canonical token map 适合表达所有 Axis 共用的视觉默认，但无法仅用基础 token 表达“Neutral 只显示 y Axis grid”“Vibrant 同时显示 x / y Axis grid”或“x Axis 不显示 tick、y Axis 保留 tick”等 dimension 差异。把 `{ default, x, y }` 塞进单个 grid token 只能解决一个局部问题；line、tick、tick label 与 title 随后仍会各自发展出不同的作用域语法。

本 ADR 保持 canonical token 为基础、扁平且可独立解释的值，同时引入 Axis 专用的 token rule。rule 只负责选择已有 Axis dimension，并用同一份 Axis token vocabulary 覆盖其视觉默认。它不创建 Axis、tick 或 grid，不改变 scale、tick source、projection、composition selector 或 guide layout 语义。

本 ADR 取代早期 ADR-08 的复合 `axis.grid` token、`PlotGridType` 与 Grid 专用 dimension map；ADR-01～02 关于 Plot token 所有权、Core effective Theme 投影、local token 与 native theme cascade 的其余决策继续有效。

## 决策：基础 Token 与作用域规则分离

`plotThemeTokens` 继续是严格、稀疏、JSON-safe 的扁平 canonical token map。Axis dimension 差异通过独立规则表达：

```ts
type IRPlotAxisThemeTokenRule = Readonly<{
  select: Readonly<{
    dimension: string | ReadonlyArray<string>;
  }>;
  tokens: IRPlotAxisThemeTokenOverrides;
}>;

type IRPlot = Readonly<{
  plotThemeTokens?: IRPlotThemeTokenOverrides;
  plotThemeTokenRules?: ReadonlyArray<IRPlotAxisThemeTokenRule>;
}>;
```

`IRPlotAxisThemeTokenOverrides` 只包含 `axis.line.*`、`axis.tick.*`、`axis.tickLabel.*`、`axis.title.*` 与 `axis.grid.*`。rule 不能覆盖 Plot area、typography、Legend 或 palette token；这些领域没有 Axis dimension 语义。

selector 契约如下：

- `dimension` 接受一个非空 dimension，或一个非空、无重复项的 dimension 数组
- dimension 是开放字符串，不建立 x / y / z 白名单；radius、angle 与自定义 Coordinate Definition role 使用同一规则
- rule 只匹配已经存在且 `guide.dimension` 相同的 Axis，不创建缺失 Axis
- 同一层有多条规则命中时按声明顺序应用，后声明规则覆盖先声明规则中的同名 token

规则本身是闭合数据，不需要独立 definition 或 registry。自定义 Plot style 与内建 style 通过既有 `PlotThemeStyleDefinition` registry 返回同一 resolved style contract，rule 不建立内置与自定义分叉。

## 决策：Grid 恢复基础叶子 Token

Grid 主题使用四个基础 token：

```ts
const PlotThemeToken = {
  AxisGridEnabled: 'axis.grid.enabled',
  AxisGridStroke: 'axis.grid.stroke',
  AxisGridStrokeWidth: 'axis.grid.strokeWidth',
  AxisGridDrawOpacity: 'axis.grid.drawOpacity',
} as const;
```

`AxisGridEnabled` 只决定已有 Axis 在 guide 未显式配置 grid 时是否默认启用；其余三个 token 提供启用后的共享 major grid 线条样式。major / minor tick source、minor grid 是否存在以及 major / minor 独立样式继续由 Axis guide 局部契约负责，不进入 theme token rule。

原复合 `AxisGrid: 'axis.grid'`、`PlotGridType`、`PlotAxisGridTheme` 与 Grid 专用 dimension map 直接删除，不保留 alias、双读或 fallback。

## 决策：Axis Title 可见性使用基础叶子 Token

Axis title 是否显示使用 `AxisTitleEnabled: 'axis.title.enabled'`。该 token 只控制已经在 Axis guide 上提供的 title 内容是否进入 lowering，不创建 title，也不改变文本、placement 或 layout 语义。

Neutral 以及 docs Academic / Vibrant reference definitions 的基础值为开启，docs Clean reference definition 的基础值为关闭。全局 token 与 dimension rule 可以重新开启 Clean 的全部或指定 Axis title；原生 `plotTheme.axis.title` 使用 `false | ThemeAxisTitleStyle`，`false` 关闭、样式对象开启并提供视觉默认值。Axis guide 的 `title` 继续提供内容和最高优先级的局部样式，但内容本身不会越过 `axis.title.enabled: false` 自动重新开启标题。

## 决策：Axis Title Padding 使用基础叶子 Token

Axis title 与 tick label 带之间的距离使用 `AxisTitlePadding: 'axis.title.padding'`。该 token 是非负用户坐标值，Neutral 与 docs 三个 reference definitions 的基础值统一为 `12`，并映射到原生 `plotTheme.axis.title.padding`。

它与其他 Axis token 共用同一 dimension rule，因此可以只调整某个 Axis 的 title spacing。原生 `plotTheme.axis.title.padding` 继续高于全局 token 与命中的 rule，单个 Axis guide 的 `title.padding` 最终优先；title placement、orientation、rotate、anchor、shift 与 layout 不进入 canonical token。

## 决策：Style Definition 返回 Token 与规则

Plot style definition 解析完整基础 token map，并可同时返回 Axis rules：

```ts
type ResolvedPlotThemeStyle = Readonly<{
  tokens: IRPlotResolvedThemeTokens;
  tokenRules?: ReadonlyArray<IRPlotAxisThemeTokenRule>;
}>;

type PlotThemeStyleDefinition = Readonly<{
  name: string;
  resolve: (theme: ResolvedTheme) => ResolvedPlotThemeStyle;
}>;
```

内建和自定义 definition 都返回该结构。原先直接返回 `IRPlotResolvedThemeTokens` 的 resolver 形态直接删除，不保留运行时探测或兼容分支。

内建 style 的 Axis grid 规则为：

| Style              | 基础值 | 规则                 |
| ------------------ | ------ | -------------------- |
| Neutral            | 关闭   | y dimension 开启     |
| Academic reference | 关闭   | 无                   |
| Vibrant reference  | 关闭   | x / y dimension 开启 |
| Clean reference    | 关闭   | y dimension 开启     |

Clean 还通过同一 rule 只为 x dimension 开启 `axis.line.enabled`；基础 `axis.tick.mark` 保持关闭，因此 x Axis 只有轴线与 label，不绘制 tick mark，y Axis line 继续关闭。

Light / Dark 只改变 grid paint 等 mode-sensitive token，不改变哪些 dimension 启用 grid。

## Token Rule 级联

Axis guide 的有效视觉 token 按以下顺序解析：

```text
Plot style 基础 tokens
  -> Plot style 中匹配当前 dimension 的 tokenRules
  -> Core effective Theme 的 inherited Plot projection
  -> local plotThemeTokens
  -> local plotThemeTokenRules 中匹配当前 dimension 的规则
  -> colors shorthand / native plotTheme
  -> Axis guide 显式视觉配置
```

该顺序保证用户显式写入一个全局 `plotThemeTokens` 值可以覆盖内建 style rule；需要更具体的 dimension 差异时，再由 local rule 覆盖。native `plotTheme.axis` 仍是比 canonical token 更高的 Plot-local 结构化输入，单个 Axis guide 的显式 line、ticks、tickLabels、title 与 grid 视觉字段继续拥有最高优先级。`axis.title.enabled` 是可见性门控；guide title 内容不会自动覆盖关闭状态。

rule 只覆盖自己包含的 token；未出现的 Axis token 继续继承前一层。规则应用不得改写输入数组或共享 preset 数据，相同输入必须产生确定结果。

## Inspection 与来源

主题 inspection 必须同时解释基础 token 与 Axis rule：

```ts
type PlotThemeTokenRuleSourceRecord = Readonly<{
  rule: IRPlotAxisThemeTokenRule;
  kind: ThemeTokenSourceValue;
  path: string;
}>;

type IRPlotThemeResolution = Readonly<{
  tokens: IRPlotResolvedThemeTokens;
  tokenSources: ReadonlyArray<PlotThemeTokenSourceRecord>;
  tokenRules: ReadonlyArray<PlotThemeTokenRuleSourceRecord>;
}>;
```

- resolved `tokens` 继续表示不带 dimension 差异的完整基础 map，并保留 one-source-per-token 记录
- `tokenRules` 按实际级联顺序记录 style rules 与 local rules；style definition 与 Plot-local 输入都属于当前 Plot owner 构建的 `local` source，稳定 path 分别定位入口
- Axis guide 消费时按当前 dimension 解析有效 Axis token；不能把某个 dimension 的胜出值伪装成全局 token 值
- source path 区分 `$style/tokenRules/...` 与 `$spec/plotThemeTokenRules/...`，不通过值相等反推来源

非法 selector、非 Axis token、未知 token、显式 `undefined` 与非法 token value 必须由 schema fail-loud。inspection 不承担 selector 容错或 fallback。

## 用户可观察行为

仅开启 x Axis grid：

```ts
const spec = {
  plotThemeTokens: {
    [PlotThemeToken.AxisGridEnabled]: false,
  },
  plotThemeTokenRules: [
    {
      select: { dimension: 'x' },
      tokens: {
        [PlotThemeToken.AxisGridEnabled]: true,
      },
    },
  ],
};
```

同一规则可以一起控制 tick、line 与 grid：

```ts
const rule = {
  select: { dimension: ['x', 'y'] },
  tokens: {
    [PlotThemeToken.AxisLineEnabled]: false,
    [PlotThemeToken.AxisTickMark]: false,
    [PlotThemeToken.AxisTitleEnabled]: false,
    [PlotThemeToken.AxisTitlePadding]: 12,
    [PlotThemeToken.AxisGridEnabled]: true,
  },
};
```

React、Vanilla 与 plain JSON 必须传递同一 `plotThemeTokenRules`；adapter 不增加 selector shorthand、默认 rule 或私有 merge。Chart 只能转发 Plot 公开输入，不能复制 Axis token subset、selector schema 或 rule resolution。

## 功能与包边界

- 所属能力域：Visualization Complete 的 Theme 与 Guide
- 主责包：`@retikz/plot` 拥有 Axis token vocabulary、selector、rule schema、style resolver、inspection 与 guide 消费
- 协作包：Core 提供 effective Theme 与 renderer-neutral paint；Chart 只转发 Plot 输入；React / Vanilla 提供等价 authoring
- 不拥有：Axis 创建、Chart recipe、tick 生成、minor tick 采样、composition projection、renderer selector、交互状态或 Chart presentation
- 外部扩展：自定义 Plot style 经既有 definition / registry 返回 `tokens + tokenRules`；local rule 作为闭合 IRPlot 数据走同一 resolver 与 guide lowering

## 架构验证与能力完备性

- 问题与归属：Axis dimension 是 Plot guide 语义，由 Plot owner 在 theme-to-guide 映射阶段解析，不下沉 Core 或 renderer
- 内部表达：同一 Axis token subset 和 selector 贯通 style、local IRPlot、inspection 与 guide lowering，不为 grid、tick 或 line 建立平行 scope 机制
- 外部扩展：内建与自定义 style 复用同一 `PlotThemeStyleDefinition` registry；rule 是闭合数据，不需要新的 define-registry
- 端到端闭环：Core effective Theme 选择 Plot style，Plot resolver 保留基础 token 与 rule layers，guide 按 dimension 物化正式视觉配置，之后继续进入既有 Standard / Core lowering
- adapter 等价性：React、Vanilla 和 plain JSON 传递同一 schema-derived rule，不存在 adapter 私有选择器
- provenance / locator：rule 不表达 datum lineage；Axis identity、facet scope 与 locator 不变，inspection 只增加主题来源解释
- 结论：扩展 Plot 已有 Theme / Guide 能力面，用一个统一 scoped rule 取代 Grid 专用复合值

## 被否决方案

- 每个 token 使用 `{ default, x, y }`：基础值不再原子，所有 Axis token 都要携带 dimension map，并让简单全局覆盖变复杂
- `axis.x.*` / `axis.y.*` token：token 数量随属性和 dimension 相乘，且无法覆盖开放 Coordinate role
- 只让 Grid 支持 dimension：tick、line、tick label 与 title 会继续产生各自的 scope 语法
- 把完整 Axis theme 放进 token value：重新开放任意嵌套 theme，破坏 canonical key 的单一语义和 one-source-per-token inspection
- 通用 component selector：本轮只有 Axis dimension 的真实消费者；提前支持 legend、plotArea 或 palette selector 会扩大无消费契约
- 由 ECharts 式轴类型主题代替 dimension：value / category 类型不能表达同为 value Axis 的 x / y 差异

## 测试策略摘要

需要 schema 与 JSON 证据锁定 selector、Axis token subset、开放 dimension、空值 / 重复项 / 非 Axis token 拒绝以及旧复合 Grid 契约删除；style definition、resolver 与 inspection 证据锁定 `tokens + tokenRules`、两层 rule 来源和级联；guide / composition 证据锁定 line、tick、tick label、title 与 grid 的 dimension 覆盖、声明顺序、局部 guide 优先级和 facet / scaffold 中的已有 Axis 行为；adapter 与双语 docs 证据锁定 React、Vanilla 和 plain JSON 共享同一公开契约。

关键不变量是基础 token 始终保持扁平原子值，scope 只由 Axis rule 表达，rule 只修改已有 guide 的表现性默认且不能创建 Axis、tick、minor grid 或改变结构语义。

## 不在本 ADR 范围

- Legend、Plot area、palette、mark 或交互状态 selector
- Axis orientation、scale type、data type、facet role 或 selector specificity 层级
- 自动 Axis guide recipe、Chart type 默认轴或 Chart presentation
- minor tick source、tick density、major / minor 独立主题 token
- composition grid projection、共享策略、布局或 renderer 专属规则
