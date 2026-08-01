# chart v0.1 Roadmap

> 本文件汇总 `@retikz/chart` v0.1 的版本目标、类型范围、里程碑、依赖与退出条件。Chart 是 viz 的 Tier 3 类型封装层，依赖 `@retikz/data`、`@retikz/plot` 与必要的 Standard / Core 公开能力，不拥有 renderer，也不直接 lower 到 Core。
>
> 关联：[`Chart 总设计`](../../../../architecture/chart-design.md) · [`Chart 封装完备设计`](../../../../architecture/chart-encapsulation-complete.md) · [`Chart 横向分析`](../../../../analysis/chart-compare-analysis.md) · [`plot v0.1 roadmap`](../../../plot/v0/v0.1/roadmap.md) · [`plot v0 roadmap`](../../../plot/v0/roadmap.md)
>
> **状态：草案。** 2026-07-31 已人工确认 alpha.1、alpha.2、alpha.3 依次覆盖 Scatter & Points、Line & Area、Bar & Column 三个传统 family。alpha.3 不是 beta 入口；后续 alpha 主题尚未规划，将继续补充 v0.1 内容。精确 schema、默认值与逐 type 配方由 milestone ADR 冻结。

## 1. 版本目标

chart v0.1 基于 plot v0.1 已完成的 GoG 基座，建立第一套可发布的 type-first 封装：

1. 用 JSON-safe、稀疏的 ChartSpec 保存 Canonical Type、数据角色、用户差异配置、显式 Plot 内容与可选单图展示内容
2. 用 type 隐式选择完整、不可撤销的 Plot recipe，并产生可独立检查的完整 PlotSpec
3. 以 Scatter & Points、Line & Area、Bar & Column 三个传统 family 建立首批类型目录
4. 分别以 Point、Path、Interval 为主要 Mark 骨架，但不把 family 降级为互斥的 primitive 白名单
5. 用 Chart Pattern 承接方向、堆叠、曲线、紧凑呈现等常用市场名称，避免扩大 public `type` union
6. 在 alpha.1 建立所有 family 共用的样式入口：默认 `neutral` 及 `academic` / `vibrant` / `clean` preset、独立 light / dark mode、公开严格 token map 和自定义颜色数组
7. 在 alpha.1 把 Chart-level label / presentation 与 Plot 本体交给 Standard 统一布局，形成单一可组合结果
8. 保持 React、Vanilla 与手写 JSON 等价，并允许在 type 核心配方上追加正式 Plot members
9. 保持 Chart 外层与 Plot 内部空间、诊断和来源透明

固定执行链路为：

```text
ChartSpec / Chart IR
  -> type recipe resolution
  -> allowed overrides + Plot member assembly
  -> complete PlotSpec
  -> optional Chart presentation resolution
  -> Standard composition containing PlotSpec
  -> Plot / Standard lowering
  -> Core IR / Scene
```

v0.1 的目标是证明统一 Chart 封装机制可以覆盖三个基础 family，而不是追求最大 type 数量。

## 2. 分类原则

### 2.1 传统 family 面向用户

v0.1 参考 [Flint Chart Vega-Lite Gallery](https://microsoft.github.io/flint-chart/#/gallery/vegalite) 及其 ECharts、Chart.js、Plotly、Excel 对照，使用用户熟悉的传统 family：

1. Scatter & Points
2. Line & Area
3. Bar & Column

family 决定文档、gallery 与发现路径，不决定唯一实现。Regression 可以归 Scatter & Points，同时使用 Point、Smooth Transform 与 Path；Bullet 可以归 Bar & Column，同时使用 Interval 与 Reference。

### 2.2 Mark 与 Coordinate 正交

Point、Path、Interval 是坐标系无关的 Plot Mark。Cartesian、Polar 或其它已注册 Coordinate 只改变投影环境，不建立新的 Chart 技术 family，也不需要新的 Chart lowering 主链。

具体 type 的默认 Coordinate、允许调整范围和数据角色由其 ADR 冻结。v0.1 未收录 Circular & Radial family 是版本目录取舍，不表示 Chart 或 Plot 缺少极坐标封装机制。

### 2.3 Canonical Type 与 Pattern

Canonical Type 进入 `ChartSpec.type`，并选择一套持续成立、不可撤销的核心配方。候选名称只有在必需数据角色、Mark 组合或 Transform 拓扑形成稳定语义时才进入 type。

Chart Pattern 是 Canonical Type 加可复用 modifier、表现配置或正式 Plot 内容的文档配方，不进入 `type` union。只改变方向、堆叠、曲线、guide 可见性或主题的名称优先作为 Pattern。

## 3. v0.1 类型目录

### 3.1 Scatter & Points

| Canonical Type      | 核心配方边界                                              |
| ------------------- | --------------------------------------------------------- |
| `scatter`           | 以 Point 为主的二维关系配方                               |
| `bubble`            | Point + 不可撤销的 size 数据角色 / encoding               |
| `connected-scatter` | Point + Path + 稳定顺序；仍是单个 PlotSpec 内的 Mark 组合 |
| `regression`        | Point + 内建 Smooth / regression Transform + Path         |
| `ranged-dot`        | 起止数值角色 + 端点与连接线                               |
| `strip`             | 一维分布角色 + 内建 Jitter Transform + Point              |

上述类型只消费 Plot 已有 Mark、Transform、Scale、Coordinate 与 Guide 能力。精确字段角色、排序规则和默认呈现留给 ADR。

### 3.2 Line & Area

| Canonical Type | 核心配方边界                            |
| -------------- | --------------------------------------- |
| `line`         | 以 Path 为主的有序趋势配方              |
| `area`         | Path + 不可撤销的基线或边界闭合         |
| `range-area`   | 必需 lower / upper 边界角色 + 闭合 Path |

首批 Chart Patterns：

- sparkline：Line + 紧凑 layout 与简化 guide
- slope：Line + 双端点数据约束与端点强调
- smooth / step line：Line + Path curve
- stacked area：Area + Stack Transform
- streamgraph：Area + centered Stack Transform

Bump Chart 依赖尚未纳入 v0.1 范围的排名派生语义，暂缓。

### 3.3 Bar & Column

| Canonical Type | 核心配方边界                                |
| -------------- | ------------------------------------------- |
| `bar`          | 以 Interval 为主的类别—数值比较配方         |
| `waterfall`    | Interval + 不可撤销的区间派生语义           |
| `gantt`        | 必需 start / end 时间角色 + Interval extent |
| `bullet`       | Interval + Reference 的固定业务语义         |

首批 Chart Patterns：

- stacked bar：Bar + Stack Transform
- grouped bar：Bar + group / dodge
- horizontal bar：Bar + 方向和角色映射
- normalized bar：Bar + Stack / Normalize Transform
- pyramid：Bar + 水平、发散或镜像配置

Lollipop Chart 虽然在 Flint 中归 Bar & Column，但主要配方是 Point + stem，不以 Interval 为本体；v0.1 明确暂缓，不放入 Bar family。Combo Chart 的主体与组合边界不稳定，也不进入 v0.1。

## 4. v0.1 能力边界

### 4.1 允许

- 一个完整 PlotSpec 内包含多个 Mark、Transform、Scale、Guide 或 Reference
- type 使用 Plot 已有 Transform 和多 Mark 配方
- 用户在不破坏 type 核心配方的前提下调整隐式主成员
- 用户追加 JSON-safe 的正式 Plot members
- 宿主注入的 Plot definitions 沿既有 registry 被追加内容消费
- Chart 提供有限 style preset 与公开 JSON-safe `styleTokens`，但解析到 Plot theme / guide / palette、Standard presentation 与正式 canvas surface，不建立平行 renderer 样式系统
- 用户提供自定义颜色数组作为 token palette 之上的 shorthand，并沿 Plot 的 color / scale / theme 语义消费；raw theme 与显式 scale 继续获得更高优先级
- light / dark 只改变 paint、palette 与 opacity，不改变 guide topology、tick glyph、尺寸、间距或 typography hierarchy
- Chart-level label / presentation 通过 Standard 与 Plot 本体组成单一 renderer-neutral 结果
- Chart 外层 handle 与 Plot 内部 handle、provenance、locator / lineage 保持连续

### 4.2 不包含

- Chart 官方 type 自带新的专用 MarkDefinition 或 TransformDefinition
- Candlestick、Boxplot 及其它需要专用 provider 的类型
- Lollipop、Bump 与尚未确认配方归属的类型
- Distributions、Circular & Radial、Tables & Multi-Dimensional、Hierarchies & Flows、Maps 等其它 family
- 多 view、track、facet 或 scaffold 构成类型身份的 Plot composition
- tree、network、treemap、Sankey、word cloud 等 layout-transform 类型
- linked selection、filter、scroll、responsive dashboard state
- `defineChart`、Chart registry 或用户自定义 Chart type

单个 PlotSpec 内多 Mark 叠加不属于本节所排除的 composition。若某个候选 type 无法完全复用 plot v0.1 已有能力，v0.1 应延期该 type，而不是为它增加类型专用旁路。

## 5. Milestones

| Milestone          | 主题                        | 候选 ADR / 产出                                                                                                                                                                                                                                                             | 退出边界                                                                                                                                                                                                                                                | 状态   |
| ------------------ | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| chart v0.1-alpha.1 | **点图 · Scatter & Points** | [alpha.1 roadmap](./alpha.1/roadmap.md)：先建立 ChartSpec / recipe resolution / inspection、三 adapter、style token / mode、presentation + Standard layout / surface，再按 `scatter`、`bubble`、`connected-scatter`、`regression`、`ranged-dot`、`strip` 的顺序逐 type 闭环 | 前五个 type 从同一 JSON-safe 语义生成完整 PlotSpec；`strip` 等待 Plot position-offset；完整 canvas 等待 Standard arbitrary-child surface composite，Core 仅在其 ADR 识别出通用底座缺口时先行；preset、token、palette、presentation 与 identity 规则确定 | 起草中 |
| chart v0.1-alpha.2 | **线图 · Line & Area**      | `line`、`area`、`range-area`；Path ordering / closure / curve 与系列默认；sparkline、slope、smooth / step line、stacked area、streamgraph Patterns；复用 alpha.1 样式、颜色、label 与 Standard 布局基座                                                                     | 三个线图 type 的 Path 核心配方和边界角色不可撤销；Pattern 不扩张 type union；相同样式与 presentation 契约无需按 family 分叉                                                                                                                             | 待起草 |
| chart v0.1-alpha.3 | **面图 · Bar & Column**     | `bar`、`waterfall`、`gantt`、`bullet`；Interval bound、内建区间 Transform 与 Reference；stacked / grouped / horizontal / normalized / pyramid Patterns；跨 family override、追加 Plot members、冲突、来源与空间透明收口                                                     | 四个面图 type 只消费 Plot 现有 capability；追加内容不撤销核心配方；三个 family 共用同一 resolver、样式、presentation、diagnostics 与 handle forwarding；无 composition                                                                                  | 待起草 |

里程碑只冻结版本目标和依赖顺序。字段名、默认值、允许覆盖范围、错误 payload、测试 case 与实现文件由对应 ADR 决定。

alpha.3 只表示当前三个基础 family 已完成第一轮封装，不表示 v0.1 功能冻结或进入 beta。alpha.4 及后续 alpha 的主题、其它 family、进一步横向能力与 beta / RC 收口条件，等待后续讨论后继续补入本 roadmap。

## 6. 依赖与版本关系

- **plot v0.1**：提供 Point、Path、Interval、Reference、内建 Transform、Scale、Coordinate、Guide、Theme、Plot composition 基座、registry、provenance 与 locator
- **data v0.1**：提供单一根数据引用、字段模型、通用 transform / statistics contract 与 lineage
- **standard**：主责 Chart presentation 所需的领域无关组合、布局、arbitrary-child surface 与呈现
- **core**：提供 renderer-neutral IR / Scene、空间 handle / namespace / index / selector，以及 Standard ADR 证明必需的通用 layout-aware composite / primitive 底座

chart v0.1 不以 plot v0.2 的 interaction 或 layout transform 作为首版 type 目录依赖，也不吸收 plot v0.3 的复杂组合与空间感知类型。后续 Chart minor 可以消费这些能力，但不得反向扩大 v0.1 的发布边界。

chart 使用自己的发布家族：`@retikz/chart` / `@retikz/chart-react` / `@retikz/chart-vanilla` lockstep。它不与 plot 全域同版本；每个 prerelease 必须声明实际可消费的 Data、Plot、Standard 与 Core 版本范围。

## 7. alpha.1–alpha.3 阶段验收边界

完成当前已确认的三个 alpha 时必须同时满足：

1. 13 个 Canonical Type 均有稳定数据角色、完整核心配方、表现性默认和允许调整范围
2. 所有内建 type 只使用 plot v0.1 已有 capability，不包含 Chart 专用 provider 或私有 lowering
3. Pattern 不进入 `ChartSpec.type`，gallery 名称可以追溯到 Canonical Type + 配置
4. 核心配方删除、替换、关闭或失效时 fail-loud；显式追加内容不能静默覆盖隐式成员
5. ChartSpec 保持单一根 data、100% JSON-safe，并可确定性解析为可检查的完整 PlotSpec
6. React children、Vanilla builder 与手写 JSON 具有等价表达，不存在 framework-only Chart 能力
7. 四套 style preset、独立 light / dark、公开严格 token 与自定义颜色数组沿 Plot / Standard / Core 正式能力解析，不形成 Chart 平行 renderer 样式系统
8. Chart-level label / presentation 复用 Standard 与 Plot 布局为单一结果，Chart 封装不丢失 Plot 内部空间 identity、provenance、locator 或 lineage
9. 三个 family 的文档导航、Canonical Type 契约页、Pattern gallery、跨库名称参考和当前不支持范围齐全

这些条件只验收 alpha.1–alpha.3，不构成 v0.1 beta 或 RC gate。后续 alpha 增加的能力需要补充自己的阶段边界，最终 v0.1 退出条件在 beta 规划明确后另行冻结。

## 8. ADR 约定

每个 milestone 独立编号，从 `01` 起。`roadmap.md` 可以随版本规划更新；`NN-*.md` 是 ADR，Accepted 后只增补状态或 supersede 信息。

每项能力进入实现前必须按 Chart Encapsulation Complete 检查类型配方、稀疏 IR、默认解析、Plot extension、presentation、spatial transparency、lowering、跨入口、诊断与追溯闭环。Plot / Data / Standard / Core 能力不足时，回到对应 owner 设计，不在 Chart 内绕开。
