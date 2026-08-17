# ADR-02：将 Axes 加入 Standard Tier 2 composite

- 状态：Accepted
- 决策日期：2026-07-21
- 修订日期：2026-08-04
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
  origin?: { position?: [number, number]; label?: false | IRTextBlock | IRAxesTextLabel };
  x: IRAxesAxis;
  y: IRAxesAxis;
};
```

### extent 与方向

- `origin.position` 默认 `[0, 0]`
- `x.extent` 与 `y.extent` 分别拥有对应轴的局部绘图距离；number 表示正负方向等长，对象分别给出非负的 `negative` 与 `positive`，同一轴至少一端大于零
- x 正方向映射到 Core 向右；y 正方向通过 `origin.position[1] - value` 映射到屏幕向上
- extent 是轴局部绘图距离，不是数据 domain；Axes 不改变 Core 全局 y-down 坐标
- x / y 始终是轴对象；隐藏整条轴时使用 `line: false`、`ticks: false`、`grid: false` 与 `label: false`，这样另一轴的网格仍能取得完整的横向或纵向跨度

### 轴线、刻度与文字

- x / y 都是独立轴对象，默认正向箭头与轴名；通过 `line`、`ticks`、`grid` 与 `label` 分别控制各类产物，`line: false` 只隐藏轴线，不删除刻度和文字
- `arrows` 支持 none / positive / negative / both；`arrowDetail` 直接复用 Core `IRArrowDetail`
- tick source 只能是正 spacing 或严格递增、唯一、非零且位于 extent 内的显式 values
- tick `side` 默认 both，`endpointGap` 默认 6，`length` 默认 6；原点永不作为普通 tick
- tick label 只为实际存在的 tick value 提供静态 `IRTextBlock`，不接受 formatter；x / y label 默认分别位于轴下方和左侧
- `origin.label` 独立于两轴刻度文字，默认关闭；轴名默认位于正向端外 8 个 user units

### 网格与 lowering

Axes 内置 grid 只提供轴局部的轻量普通格线：`x.grid` 根据 x 轴的 spacing / offset 生成竖直格线，`y.grid` 根据 y 轴的 spacing / offset 生成水平格线，并分别接受自己的 style。主线、边框和方向开关等高级网格能力继续由独立 `Grid` 负责，避免复制完整 Grid schema。

lowering 顺序固定为 grid、x/y 轴线、x/y 刻度、刻度文字、轴名、原点文字。Path 只使用既有 move / line / arrow；文字使用普通 Core Node。Axes 不新增 Core IR、Scene、renderer 或私有 registry。

### 宿主入口

React `<Axes>` 与 Vanilla `axes()` 接收同一 `AxesInput`、产生同一 `IRAxes`，并在当前图内贡献同一 `AxesDefinition`。直接 IR 通过 `composites: [AxesDefinition]` 显式接入 Core compile options

## 契约修订（2026-08-04）

本次实现已将公开 schema 调整为轴拥有字段：`origin` 统一承载 `position` 与 `label`；`x` / `y` 分别承载 `extent`、`grid`、`line`、`ticks` 与 `label`。顶层 `extent`、顶层 `grid` 与 `originLabel` 不再保留，`x: false` / `y: false` 改为在对应轴对象内关闭各类产物。该调整保持 Axes 的静态数学参考轴定位，不引入 Plot 的 scale、domain 或自动 tick 语义。

## 公开影响与兼容性

- `@retikz/standard` 新增宿主无关 Axes IR、schema、definition 与 factory
- `@retikz/standard-react` 新增 `<Axes>`；`@retikz/standard-vanilla` 新增 `axes()` 与 adapter
- Axes 保存静态数学参考轴语义；lowering 后只产生既有 Core Path / Node
- 内置 grid 是轻量快捷配置，不替代完整 `Grid`

## 最终实现结果

- Standard 已覆盖默认值、非对称 extent、单轴、四种箭头、两类 tick source、endpoint gap、静态文字、轻量 grid 与稳定 lowering 顺序
- React 与 Vanilla adapter 对同一输入生成等价 IR，并只在当前图贡献同一 definition
- 双语组件页、demo、controls、API 表与 source preview 已同步实际公开入口

## 遗留边界

- 不支持 Plot axis / scale / guide、自动 tick、formatter、标签避让或 chart layout
- 不支持任意 children 的数学坐标投影、时间 / 对数 / 分类 / 极坐标 / 三维 / 地理坐标
- axis break、minor tick、viewport 自适应与交互状态留待独立能力设计
