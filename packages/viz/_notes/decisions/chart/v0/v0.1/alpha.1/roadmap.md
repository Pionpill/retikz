# chart v0.1-alpha.1 Roadmap：Scatter & Points

> 本 milestone 先建立所有 Chart family 共用的封装基础设施，再逐个加入点图 Canonical Type。每篇 ADR 在人工确认后进入实现，并在自身验收完成后独立 Accepted；milestone 只在全部退出条件满足后结束。
>
> 关联：[`chart v0.1 roadmap`](../roadmap.md) · [`Chart 总设计`](../../../../../architecture/chart-design.md) · [`Chart 封装完备设计`](../../../../../architecture/chart-encapsulation-complete.md) · [`Plot 可视化完备设计`](../../../../../architecture/plot-visualization-complete.md) · [Core ADR-18 provider graph](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.2/18-composite-dependency-provider-graph.md) · [Core ADR-19 spatial handles](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.2/19-qualified-spatial-handles.md) · [Standard Surface ADR-01](../../../../../../../library/_notes/decisions/standard/v0/v0.1/alpha.4/01-arbitrary-child-surface.md)

## 1. 目标

alpha.1 证明基础 Chart 与 type-first Chart 可以在不裁剪 Plot 能力的前提下汇合为同一个公开 Chart 主链：

1. 建立 `@retikz/chart`、`@retikz/chart-react`、`@retikz/chart-vanilla` 三包及封闭 type recipe 主链
2. 让 typed ChartSpec 保持 JSON-safe、单根 data、结构轴与 Plot 自洽，并可确定性解析为完整 PlotSpec；基础 Chart 直接承载完整 Plot authoring
3. 消费 Core effective Theme；为 Chart canvas / presentation / recipe defaults 提供 owner-local Chart style definition 与严格 `chartThemeTokens`，并把 Plot-owned `plotThemeStyles`、`plotThemeTokens`、`colors`、Plot `plotTheme` 转发到完整 PlotSpec
4. 以 canonical `IRChart` 汇合基础 / typed Chart，并用 Layout FlexLayout 按 children authored order 组合唯一主 Plot 占位与 title、subtitle、note、source 四类唯一 TextBlock preset，再由 Standard Surface 包装完整内容
5. 按 `scatter` / `bubble`、`connected-scatter`、`regression`、`ranged-dot`、`strip` 顺序逐 type 建立闭环；Scatter 与 Bubble 是共享 Point 能力但保留独立身份的平级 Canonical Type
6. 保持手写 JSON、React JSX、Vanilla helper 的完整 PlotSpec、canonical `IRChart` 与最终组合结果等价

alpha.1 不在任何中间 ADR 后发包。基础设施允许内部 fragment 与 resolver 先落地，但公开 `ChartSpecSchema`、`IRChart` 与基础 / typed adapters 只能随着 ADR-04 的 `scatter` / `bubble` variants 原子出现，禁止 schema 接受尚未实现的 type。

## 2. 固定链路

```text
base Chart -> complete Plot authoring -> PlotSpec
typed ChartSpec -> closed recipe resolver -> PlotSpec
  -> canonical IRChart
  -> optional ordered presentation resolver
  -> PlotSpec | layout.flexLayout<TextBlock presets + exactly one Plot placeholder>
  -> Standard surface(content)
  -> Standard / Plot composite expansion
  -> Core IR / Scene
```

Chart 不提供 `defineChart`、Chart registry 或自定义 type。官方 recipe 是 `@retikz/chart` 私有的封闭映射；所有 Mark、Transform、Scale、Coordinate、Guide 与 Channel 扩展继续使用 Plot definition / registry。

## 3. ADR 顺序

| ADR | 主题                             | 核心产出                                                                                                                                                   | 前置                                                                                                                   | 实现状态                                                                   |
| --- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 01  | Chart 基础设施与封闭 recipe 主链 | 可实施内部 schema / resolver / inspection / authoring normalizer；typed recipe 统一归一为单一 `chart.chart` composite root；首个公开入口在 ADR-04 原子接线 | 内部子集依赖 Plot v0.1、Data v0.1；公开 adapter 依赖 Kernel gate                                                       | 内部完成 / 公开接线受门控                                                  |
| 02  | Chart token 与 Plot token 转发   | Core effective Theme；同名 Chart / Plot style definition；`chartThemeTokens`；`plotThemeTokens` / `colors` / Plot `plotTheme` 转发；canvas surface gate    | ADR-01、Plot theme ownership ADR-01～02、Core ADR-15、Standard alpha.4 ADR-01 Surface                                  | Proposed / owner-local 已实现；公开 adapter、surface、spatial、docs 仍阻塞 |
| 03  | Chart authoring 与 presentation  | 基础 / typed Chart、canonical IRChart、四类唯一文本 preset、authoring-only position、共享 normalizer 与 authored-order Flex mapping                        | owner-local 依赖 ADR-01、ADR-02 与 Layout FlexLayout；公开接线依赖 Core ADR-18、Core ADR-19 与 Standard alpha.4 ADR-01 | Proposed / 旧 owner-local presentation 已被新契约替代，等待重新实现与 Gate |
| 04  | Scatter 与 Bubble                | 首批两个平级 ChartSpec variants、共享 Point 主 Mark 能力、二维关系与必需面积量级角色                                                                       | ADR-01–03；owner-local Plot quantitative size dependency 已满足                                                        | Proposed / owner-local 已实现 / 公开接线受门控                             |
| 05  | Connected Scatter                | Point + Path + 稳定 order                                                                                                                                  | ADR-04                                                                                                                 | 待人工 Accept                                                              |
| 06  | Regression                       | Point + mark-local Smooth + Path                                                                                                                           | ADR-05、Data / Plot transform output reservation                                                                       | **阻塞**                                                                   |
| 07  | Ranged Dot                       | 两端 Point + projected Relation                                                                                                                            | ADR-06、Plot range-row atomicity                                                                                       | **阻塞**                                                                   |
| 08  | Strip                            | 分类位置 + 数据驱动 offset + Point                                                                                                                         | ADR-07 + Plot offset capability                                                                                        | **阻塞**                                                                   |

实施是严格串行链。类型 ADR 必须把自己的 variant 加入同一个 `ChartSpecSchema` discriminated union 和同一个封闭 resolver，不复制 package、style、presentation、diagnostics 或 adapter 主链。

ADR-02 的 owner-local schema、definition、preset、resolver 与 Plot handoff bundle 已有实现证据，但 owner-local 已实现不等于公开能力完成；实际 React / Vanilla authoring、definition 与根 Theme parity、完整 renderer-neutral surface、Chart → Plot spatial transparency、最终 SVG / Canvas 与公开文档仍是 Accepted 前置。ADR-03 先前的六 preset / 任意 child owner-local 实现不再构成新契约证据，必须按新 Architecture Gate 与 implementation plan 重新验收。

## 4. 契约真源

Chart 的长期结构、能力归属与跨 ADR 约束以 [`Chart 总设计`](../../../../../architecture/chart-design.md) 为准；Plot token 所有权与 inherited scope 以 [`Plot 主题所有权 ADR-01`](../../../../plot/v0/v0.2/alpha.1/01-chart-layering.md)、[`Plot inherited theme token ADR-02`](../../../../plot/v0/v0.2/alpha.1/02-inherited-theme-token-scope.md) 与 [Core ADR-15](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.2/15-lightweight-theme-resolution.md) 为准；Chart token、presentation 与各 type 的公开契约分别由对应 ADR 维护。roadmap 只记录 milestone 顺序、依赖 gate、状态与退出条件，不重复定义字段、覆盖算法、recipe 或测试矩阵。

## 5. Strip capability gate

当前 Plot `JitterTransform` 只在数据单位中原地扰动连续 `xField` / `yField`；Plot 没有 `xOffset` / `yOffset` 等在 category band 内消费独立字段的位置 capability。Flint 的 Strip Plot 需要分类位置、数值位置和分类 band 内的 jitter offset 同时成立。

因此 ADR-08 只冻结 Chart-level roles 与延期边界，不授权实现或把 `strip` 加入公开 `ChartSpec.type`。以下 Plot owner 能力完成后，必须新建 Strip implementation ADR，补 exact recipe / version contract / `validateCore` / 测试矩阵，并从 Architecture Gate Round 1 重新开始：

- Jitter 能把结果写入独立输出字段，不覆盖原分类 / 数值角色
- position offset 能在坐标投影后、Mark lowering 前以数据驱动方式作用于 Point
- offset 对 Cartesian / Polar 等坐标保持坐标系无关，并沿 Plot channel / coordinate contract 消费
- schema、registry、lowering、provenance 与 React / Vanilla authoring 在 Plot 内闭环

该缺口属于 Plot 的纵向位置能力，不允许由 Chart 私造节点位移、renderer 特判或私有 channel pipeline 绕过。

## 6. Regression transform output reservation dependency gate

ADR-06 的保留趋势字段在 Data / Plot 提供完整 registry output reservation preflight 前不得进入可执行 lowering。该 gate 必须统一覆盖内置与自定义 transform、root 与 mark-local writer、声明数据模型和 Plot extensions，并在 transform 执行前对冲突 fail-loud；Chart 不维护私有 transform 白名单或预扫描旁路。

## 7. Ranged Dot row atomicity dependency gate

ADR-07 在 Plot 提供共享 row 的复合 Mark 原子角色校验前不得进入可执行 lowering。该 gate 必须先于各 Mark 的缺值跳过语义运行，复用正式 field、data model 与 coordinate role 诊断，并保持自定义兼容 coordinate 同路；Chart 不 reshape 或私自清洗 rows。

## 8. Size channel / legend contract

Plot owner 已补齐退化数据前的显式 sqrt scale 校验、正式 data-model field type 的 quantitative validation、逐行 missing / null / 非有限 size delivery、descriptor scale identity 与多 identity legend 消歧；空集、全缺失与全零仍保留正式 descriptor 和退化语义。Chart 持续复用这条正式 channel / guide 主链，不预扫描或私自清洗 rows，也不复制 field validation、missing-value delivery、scale validation、descriptor collection 或 legend selection。

## 9. Embeddable dependency gate

Chart 的 canonical result 是 `standard.surface` 直接包含 `plot.plot`，或在存在 presentation 时包含 `layout.flexLayout` 后再包含完整 `plot.plot`。当前 React / Vanilla embeddable protocol 按 adapter namespace 分组 datasets 与 composite maker，无法让独立 Chart、Plot、Standard、Layout contributions 同时共享唯一 Plot dataset group、注册单一 `chart.chart` definition 并确定性去重 Surface / Flex / Plot definitions。

因此 ADR-04 的公开 adapter 接线前，需要 [Core ADR-18](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.2/18-composite-dependency-provider-graph.md) 让唯一 `chart.chart` provider 直接依赖 `{ standard.surface, layout.flexLayout, plot.plot }` 三个完整 key：

- contribution 显式声明 composite dependencies
- Chart datasets 可进入同一 Plot lowering group
- 相同 definition 确定性去重、不同实现冲突失败
- compile 前解析全部 declared dependencies；缺失项 fail-loud，并稳定标识 owner-qualified `namespace + type`
- React / Vanilla 同构

该 gate 未解除时只允许实现 Chart core 的 schema / resolver 与 standalone 显式 composite bundle 测试，不允许 Chart 私自提前 lower Plot 或复制 Layout solver。

## 10. Canvas surface dependency gate

`chart.canvas.fill` 与 `chart.padding` 必须覆盖完整 Chart，而不只是 Plot panel。当前 Standard Frame 只接受直接 Core Node；OverlayLayout 虽可承载任意 child，但没有按父 allocation 动态铺满的 renderer-neutral background child。

ADR-02 的完整 canvas 与 ADR-03 的公开组合入口因此等待 [Standard alpha.4 ADR-01](../../../../../../../library/_notes/decisions/standard/v0/v0.1/alpha.4/01-arbitrary-child-surface.md) 的 `standard.surface`。Core 只提供 layout-aware composite、provider graph 与 spatial sidecar 底座，不拥有 Surface appearance。该 gate 未解除时：

- 不允许 Chart 私造 layout / bbox / background primitive 主链
- 不允许 React / Vanilla 用 DOM / CSS 主题替代 JSON / Canvas 能力
- 不允许只实现 `plot.area.fill` 就宣称完整 dark mode
- ADR-04 不公开带未消费 token 的 ChartSpec surface

## 11. Spatial transparency dependency gate

Chart presentation 会在 Plot 外增加 surface 与 layout，但公开入口不能把 Plot 变成只能观察整体 bbox 的黑盒。ADR-04 的公开 adapter 与 Chart API 文档接线前，需要 [Core ADR-19](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.2/19-qualified-spatial-handles.md) 的 qualified spatial handle / selector capability 满足：

- 稳定标识整个 Chart、Plot body 与每个实际存在的 presentation item
- selector 可以从 Chart namespace 穿过 Plot body，继续定位 Plot 拥有的 view / track / facet / plotArea / axis / series / datum handle
- Standard probe / replay 改变 geometry 后不丢失或重命名上述 identity、payload、locator 与 provenance
- 多个 Chart 的局部 handle 经过 qualified namespace 后不冲突
- target 不存在或 namespace 越界时 fail-loud，不回退到整个 Chart

Chart 只提供外层 identity 与 delegation，不复制 Plot handle registry，也不预造 Core selector 语法或 index。

## 12. 退出条件

alpha.1 只有同时满足以下条件才可结束：

1. ADR-01–07 已 Accepted 并实现；Regression transform output reservation 与 Ranged Dot row atomicity gates 已解除；ADR-08 的延期边界已确认，Plot capability gate 解除后新建的 Strip implementation ADR 也已 Accepted 并实现
2. 六个 type 都由同一封闭 resolver 展开，不存在 type-specific adapter 或 renderer 路径；Scatter 与 Bubble 保留平级 identity 并共享 Point / size / guide 正式主链
3. typed ChartSpec、resolved PlotSpec、canonical `IRChart`、最终 Standard composition 与 inspection 均可单独观察；基础 Chart 与 typed Chart 在 PlotSpec 之后进入同一主链
4. Core effective Theme、Chart `chartThemeTokens`、Plot `plotThemeTokens`、`colors`、Plot `plotTheme` 与显式成员的两条 owner cascade 有精确测试；ChartSpec 不再包含 `style` / `themeMode`
5. 没有 presentation 时不生成可见文本；有 presentation 时 canonical children 顺序不被 preset / position 重排，Plot 仍保持自己的 id、provenance、locator 与 lineage
6. 完整 Chart canvas 由 renderer-neutral Standard surface 覆盖裸 Plot 与 presentation；若 Standard 依赖 Core 新底座，该 dependency 已先闭环；light / dark 切换不改变布局
7. docs 为已实现 Canonical Type 提供最小配置、核心 recipe、允许覆盖、Plot 混合与不适用场景；Scatter 使用可识别真实数据并由 Chart 自身渲染 title、subtitle、source；主题页面区分 Chart / Plot token owner，并提供四 preset × 两 mode gallery 与各自 token explorer；Strip 在独立 implementation ADR 完成前只标记 planned
8. Kernel dependency preflight 与 Core spatial transparency gates 已解除；缺失 dependency、selector target 或 namespace 越界均 fail-loud
9. Plot size / legend dependency 已解除；field-bound size 的 quantitative type validation、逐行缺值跳过、scale 校验与 legend descriptor identity 不随退化数据或多 descriptor 组合失真

若 Plot offset capability 不进入可消费版本，alpha.1 不以错误语义实现 `strip`；应由人工决定延期 `strip` 或延后整个 milestone 退出。
