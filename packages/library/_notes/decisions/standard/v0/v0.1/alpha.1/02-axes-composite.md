# ADR-02：将 Axes 加入 Standard Tier 2 composite

- 状态：Accepted
- 决策日期：2026-07-21
- 修订日期：2026-07-23
- 关联：[Standard v0.1 roadmap](../roadmap.md) · [alpha.1 roadmap](./roadmap.md) · [ADR-01 Grid](./01-grid-composite.md) · [Standard Drawing Library 设计](../../../../../architecture/standard-library-design.md) · [Drawing Complete](../../../../../../../kernel/_notes/architecture/core-drawing-complete.md)

## 背景

静态数学插图经常重复组合轴线、箭头、刻度、文字与可选网格。手写 Core Path / Node 能画出结果，但会丢失“坐标参考轴”的整体语义，并迫使调用方反复处理 y-down 画布中的数学正方向。

Axes 不是 Plot axis 或数据坐标系：它不拥有 domain、scale、自动 tick、formatter、标签避让或任意 children 的坐标投影。

## 决策

`@retikz/standard` 拥有 `standard.axes` composite 的 `AxesSchema`、`IRAxes`、`AxesDefinition`、`createAxes()` 与纯 `lowerAxes()`。输入以 origin 和每条轴正负方向的 extent 描述静态数学轴，再确定性 lower 为 Core Path 与 Node。

```ts
type IRAxes = {
  namespace: 'standard';
  type: 'axes';
  origin?: [number, number];
  extent: { x: number | { negative: number; positive: number }; y: number | { negative: number; positive: number } };
  grid?: IRAxesGrid;
  x?: false | IRAxesAxis;
  y?: false | IRAxesAxis;
  originLabel?: false | IRTextBlock | IRAxesTextLabel;
};
```

### extent 与方向

- `origin` 默认 `[0, 0]`
- number extent 表示正负方向等长；对象分别给出非负的 `negative` 与 `positive`，同一轴至少一端大于零
- x 正方向映射到 Core 向右；y 正方向通过 `originY - value` 映射到屏幕向上
- extent 是轴局部绘图距离，不是数据 domain；Axes 不改变 Core 全局 y-down 坐标

### 轴线、刻度与文字

- x / y 默认启用，默认正向箭头与轴名；二者不能同时关闭。`line: false` 只隐藏轴线，不删除刻度和文字
- `arrows` 支持 none / positive / negative / both；`arrowDetail` 直接复用 Core `IRArrowDetail`
- tick source 只能是正 spacing 或严格递增、唯一、非零且位于 extent 内的显式 values
- tick `side` 默认 both，`endpointGap` 默认 6，`length` 默认 6；原点永不作为普通 tick
- tick label 只为实际存在的 tick value 提供静态 `IRTextBlock`，不接受 formatter；x / y label 默认分别位于轴下方和左侧
- `originLabel` 独立于两轴刻度文字，默认关闭；轴名默认位于正向端外 8 个 user units

### 网格与 lowering

Axes 内置 grid 只提供共用 origin、extent 与 spacing 的轻量普通格线，并允许 vertical / horizontal 样式覆盖。主线、边框和方向开关等高级网格能力继续由独立 `Grid` 负责，避免复制完整 Grid schema。

lowering 顺序固定为 grid、x/y 轴线、x/y 刻度、刻度文字、轴名、原点文字。Path 只使用既有 move / line / arrow；文字使用普通 Core Node。Axes 不新增 Core IR、Scene、renderer 或私有 registry。

### 宿主入口

React `<Axes>` 与 Vanilla `axes()` 接收同一 `AxesInput`、产生同一 `IRAxes`，并在当前图内贡献同一 `AxesDefinition`。直接 IR 通过 `composites: [AxesDefinition]` 显式接入 Core compile options

## 被否决的方案

- 将 Axes 做成数据坐标系：会侵入 Plot 的 domain、scale、guide 与 layout 所有权
- 自动格式化 tick：需要数据类型、locale 与 formatter policy，不属于静态绘图 composite
- 让 Axes 投影任意 children：需要独立 Cartesian space / projection 契约，不能隐式附着在轴线装饰上
- 在 renderer 中特判轴线：现有 Path、Node 与 arrow 已足以表达最终结果

## 公开影响与兼容性

- `@retikz/standard` 新增宿主无关 Axes IR、schema、definition 与 factory
- `@retikz/standard-react` 新增 `<Axes>`；`@retikz/standard-vanilla` 新增 `axes()` 与 adapter
- Axes 保存静态数学参考轴语义；lowering 后只产生既有 Core Path / Node
- 内置 grid 是轻量快捷配置，不替代完整 `Grid`

## 最终实现与验证摘要

- Standard 已覆盖默认值、非对称 extent、单轴、四种箭头、两类 tick source、endpoint gap、静态文字、轻量 grid 与稳定 lowering 顺序
- React 与 Vanilla adapter 对同一输入生成等价 IR，并只在当前图贡献同一 definition
- 双语组件页、demo、controls、API 表与 source preview 已同步实际公开入口
- Standard 三包的 lint、类型检查、全量测试和 build 已在 alpha.1 收尾验证通过

## 遗留边界

- 不支持 Plot axis / scale / guide、自动 tick、formatter、标签避让或 chart layout
- 不支持任意 children 的数学坐标投影、时间 / 对数 / 分类 / 极坐标 / 三维 / 地理坐标
- axis break、minor tick、viewport 自适应与交互状态留待独立能力设计
