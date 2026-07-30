# Chart 封装完备设计

> **状态：长期封装准入真源，不定义新的底层能力域。** 本文回答“什么属于 `@retikz/chart`”以及“怎样才算形成 Chart 封装闭环”。Chart 依赖 Visualization Complete，不拥有独立的 Mark、Transform、Scale、Coordinate、Guide、Composition、Data 或 Drawing 能力。
>
> 关联：[`能力完备性与模块边界`](../../../../notes/architecture/capability-design.md) · [`Chart 总设计`](./chart-design.md) · [`Plot 可视化完备设计`](./plot-visualization-complete.md) · [`Data 能力完备设计`](./data-capability-complete.md) · [`Core 绘图完备设计`](../../../kernel/_notes/architecture/core-drawing-complete.md)

---

本文只维护 Chart 的长期问题边界、封装闭环和准入方法，不维护具体 type 清单、公开字段或版本状态。

## 1. 定位与问题边界

Chart 解决的是：

> 将常见图表意图表达为简洁、JSON-safe 的 ChartSpec，并确定性地展开为完整 PlotSpec，同时保留 Plot 的配置、扩展、诊断和追溯能力。

Chart 是 Tier 3 封装层，不是新的 capability domain。它的完备方向是 **Encapsulation Complete**：

> 在封闭的 Canonical Type 目录内，每个 type 都能通过统一 ChartSpec、默认解析和 lowering 完整映射到 Plot；type 核心配方始终保留，用户可以在其边界内调整隐式 GoG 成员并追加正式 Plot 内容；React、Vanilla 与 JSON 入口等价；类型专用 definition 与宿主扩展都复用 Plot registry，不私造纵向能力机制或平行 registry。

“Chart 完备”不表示拥有最多的图表类型，也不表示任何名称都应进入 `type` union。它表示新增或维护一个官方 type 时，可以沿统一封装机制闭环，而不是为每个 type 写独立 schema、adapter、renderer 或 lowering 特判。

## 2. 包角色与端到端闭环

| 角色                | 主责包 / 协作包             | 在 Chart 闭环中的责任                                                                                         | 不拥有                                      |
| ------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 数据能力            | `@retikz/data`              | 数据引用、字段解析、通用 transform / statistics、lineage                                                      | Chart type 与视觉默认                       |
| 可视化能力          | `@retikz/plot`              | GoG schema、definition / registry、lowering、diagnostics、provenance / locator                                | Chart type 目录                             |
| Chart 主责          | `@retikz/chart`             | ChartSpec、Canonical Type 配方、默认 / override 解析、配方所需的具体 Plot definitions、Chart-to-Plot lowering | 新 GoG 能力轴、renderer、开放 type registry |
| 通用呈现            | `@retikz/standard`          | 由 Plot 解析后消费的领域无关 composite、布局和呈现                                                            | Chart 语义与字段角色                        |
| 图形执行            | Core / Render               | 编译 Plot lowering 产物并渲染                                                                                 | Chart / Plot 领域语义                       |
| authoring / runtime | chart-react / chart-vanilla | 构造同一 ChartSpec、传递 datasets / definitions、接入宿主                                                     | Chart 默认算法与私有 IR                     |

完整链路必须保持：

```text
Chart authoring / JSON
  -> ChartSpec schema
  -> Canonical Type recipe
  -> default + override + extension resolution
  -> complete PlotSpec
  -> Plot schema / definitions / lowering
  -> Core IR / Scene
  -> Renderer
  -> Plot provenance / locator / lineage consumed by host
```

任一 type 若只能在 React、某个 renderer、某个 demo 或未序列化的 helper 中成立，都不算 Chart 封装闭环。

## 3. 封装能力面

| 能力面             | 完备目标                                               | 关键不变量                                          |
| ------------------ | ------------------------------------------------------ | --------------------------------------------------- |
| Type Recipe        | 每个 Canonical Type 选择完整、确定的 Plot 配方         | 核心配方不可撤销；type 不是可任意改写的 preset      |
| Sparse IR          | ChartSpec 只保存高层意图、数据角色、差异配置和追加内容 | 隐式默认不重复写入 IR；IR 仍 JSON-safe              |
| Default Resolution | 核心配方、表现性默认和覆盖优先级统一                   | 不按 type 私造互不相容的 merge 规则                 |
| Plot Extension     | 用户可调整隐式成员并追加 Plot operations               | 扩展复用 Plot schema / definition / registry        |
| Lowering           | 相同输入确定性生成完整合法 PlotSpec                    | Chart 不直接生成 Core IR，不隐藏第二条执行链        |
| Authoring Parity   | React、Vanilla、JSON 共享同一 ChartSpec 和 lowering    | JSX children 只是 sugar，不成为私有能力             |
| Diagnostics        | schema、type、definition 与冲突错误 fail-loud          | 错误指向用户可修改的 Chart 或 Plot 配置             |
| Traceability       | 默认、override、extension 的贡献可解释                 | Plot provenance / locator / lineage 不因 Chart 丢失 |
| Docs / LLM         | schema 和文档能区分 Canonical Type 与 Chart Pattern    | 不用不断扩张 type union 换取可发现性                |

## 4. Type Recipe 完备

一个 Canonical Type 的配方至少需要回答：

1. 它要求哪些数据角色，哪些可选
2. 它隐式生成哪些 Transform、Mark、Scale、Coordinate / Composition 和 Guide
3. 哪些成员构成不可撤销的 type 核心配方，允许调整哪些参数
4. 哪些成员是可关闭、替换或调整的表现性默认
5. 用户如何覆盖隐式主成员，如何追加新的 Plot 内容
6. 配方依赖哪些内置或外部注入的 Plot capability
7. 缺少字段、definition 或不支持组合时如何诊断
8. lower 后如何保留稳定 identity 与来源

只声明 `type -> Mark` 映射不算完整配方。比如 waterfall 除主 Interval Mark 外，还需要明确区间派生、字段角色、scale、coordinate、guide 与默认覆盖关系。

Type Recipe 完备还要求类型身份在扩展后持续成立。以 Bubble 为例，Point Mark 及维持气泡语义的数据角色 / encoding 必须保留；追加 Interval Mark 可以作为背景、参照或补充表达，但不能替换 Point Mark，或让 Bubble 退化成只剩 type 名称的任意组合。

## 5. Sparse IR、核心配方与默认解析完备

ChartSpec 的省略语义由 `type` 决定：省略代表使用类型默认，不代表 Plot 中的 `undefined` 语义。

统一解析顺序为：

```text
non-revocable type core recipe
  + (Plot built-in defaults
     < Chart type presentational defaults
     < ChartSpec theme
     < allowed GoG member overrides)
```

Type 核心配方只能在允许范围内调整，不能删除、关闭、替换或失效；表现性默认允许调整、关闭或替换。具体成员配置优先于 theme，但该优先级不能越过核心配方不变量。

封装闭环必须避免：

- 要求用户在 ChartSpec 重写完整 PlotSpec
- 允许 override 把主 Mark 改成其它 Mark，或撤销必需 Transform / encoding
- 用浅拷贝或无语义 deep merge 处理有顺序、identity 或跨字段约束的成员
- 通过数组下标定位多个隐式同类成员
- 在 adapter 中补一套与核心不同的默认值
- lower 后继续由 renderer 猜测或补齐 Chart 默认

多个隐式同类成员需要稳定语义目标。其公开表达由 ADR 冻结，但完备标准是不依赖声明顺序和内部实现偶然性。

## 6. Plot registry 横向扩展与 `defineChart` 不适用

Chart 不拥有扩展机制，但可以拥有符合 Plot 扩展机制的具体实现：

- Chart 可以为官方 type 提供具体 `MarkDefinition`、`TransformDefinition` 等 provider
- 宿主也可以注入自定义 Mark、Transform、Scale、Coordinate、Channel 等 definitions
- 两种来源都必须合入 Plot registry，并由 Plot schema、contract 与 lowering 统一解析和消费
- ChartSpec 只保存 operation 与 JSON-safe 配置，不把 provider 函数或实例写入 IR

例如，股票图可以选择股票 Mark。该 `MarkDefinition` 既可以随 Chart 官方类型提供，也可以由宿主扩展提供；关键不变量不是“Chart 不实现它”，而是它必须作为合法 Plot provider 注册，由 Plot registry / lowering 执行，不能成为 Chart 私有几何旁路。definition 的内建注入与宿主合并方式由后续 ADR 冻结，缺失或冲突语义沿用 Plot 的 fail-loud 契约。

Chart 不提供：

- `ChartDefinition`
- `defineChart`
- Chart registry
- 自定义 Chart type 字符串

这不是扩展缺口，而是包使命的闭合边界。Chart 负责精选、稳定、低学习成本的官方类型；用户若需要设计新配方，应直接组合 Plot，若需要新增具体 provider，则沿 Plot registry 横向扩展。开放 Chart registry 会复制 Plot 的扩展问题，并让 Chart 用户额外学习配方 schema、注册、部署和冲突解析，违背封装层目标。

因此，`define-registry` 检查在 Chart type 层的结论固定为“不适用且禁止”；但每个 type 依赖的 Plot capability 仍必须证明其 definition / registry / lowering 闭环。

## 7. 混合表达完备

Chart 必须支持在类型默认基础上混入正式 Plot 内容：

- 覆盖隐式主 Mark / Transform / Scale / Guide 等成员的允许参数
- 追加 Mark、Transform、Guide 或其它正式 Plot operation
- 使用已注册的自定义 Plot capability
- 保留单一根 data 与 Plot 的 series / group / color 语义

React children 中的 Plot 内容必须可以表示为 Chart IR；Vanilla 和 JSON 入口必须等价。

混合边界保持单向：Chart 可以包含 Plot members，Plot 不包含 Chart。追加内容默认追加，不作为替换、关闭或删除核心成员的指令；ID 或语义目标冲突必须显式诊断。

混合内容应围绕当前 type 的本体功能增强，而不是把 Chart 当作无类型约束的 Plot 容器。核心配方破坏必须 fail-loud；对于无法可靠机械判断的语义偏离，不全面禁止任意组合，但文档、inspection 与可选诊断应引导作者在主要意图已经改变时直接使用 Plot。

## 8. Lowering 完备

`lowerChartSpec` 只有一个合法输出：完整 PlotSpec。它必须：

- 在 Chart 层校验 type 数据角色与覆盖边界
- 确定性展开隐式配方
- 验证 type 核心配方在 override 与 extension 后仍完整、有效
- 使用统一规则合并 defaults、overrides 与 extensions
- 输出可通过 PlotSpec schema 的结果
- 保留 stable identity 与可追溯来源
- 不读取 renderer 或 framework 私有状态
- 不直接调用 Core geometry / compile 绕开 Plot

Chart lowering 与 Plot lowering 应可独立观察和测试。至少需要验证：

- ChartSpec 到预期 PlotSpec 的精确等价
- 删除、替换或关闭 type 核心成员的配置稳定失败
- 显式 Chart 配置与手写等价 PlotSpec 的可观察结果一致
- React / Vanilla / JSON 生成同一 ChartSpec 或等价 PlotSpec
- 自定义 Plot definitions 能穿过 Chart 链路被统一消费
- 错误路径不会静默丢弃用户配置或退化为另一类型

## 9. Diagnostics 与 Traceability 完备

Chart 隐式内容越多，越需要可解释性。完整闭环至少要求：

- 未知或不支持的 type 在 Chart schema / lowering 阶段失败
- 缺失数据角色指向对应字段配置
- 尝试删除、关闭、替换或使 type 核心成员失效时明确说明不变量
- override 目标不存在、重复或冲突时 fail-loud
- ID 冲突不自动重命名或覆盖
- 所需 Plot definition 缺失时保留 capability key 与来源信息
- 工具可以查看展开后的 PlotSpec
- Plot provenance / locator / lineage 能继续定位最终视觉贡献

具体 artifact schema 可以延期，但不得以“Chart 只是 sugar”为理由省略诊断和来源链。

## 10. Docs 与 type taxonomy 完备

文档发现性不等于公开 type 数量。Chart 文档使用：

- Canonical Type：稳定 IR 判别值与完整隐式配方
- Chart Pattern：Canonical Type 加 modifier、表现配置或 Plot extension 的常用名称

每个 Canonical Type 应有一份 canonical 页面，说明适用目的、数据角色、最小 ChartSpec、不可撤销的核心配方、常用 Patterns、Plot 混合方式及其语义边界和不适用场景。

文档可按分析目的分组，并用底层 recipe family 作为技术标签；同一类型可以从多个目的入口被发现，但不复制多份契约真源。

新增 type 不能只因为某个市场别名常见。应先把候选图表展开为完整 Plot 配方，移除 theme / style 并提取可复用 modifier，再判断剩余的数据角色、Mark 组合、Transform 与 Coordinate / Composition 拓扑是否形成稳定独立语义。具体阈值由 Chart architecture design 或 ADR 决定。

## 11. 准入与闭环检查

新的 Chart type 进入 roadmap / ADR 前至少填写：

```md
## Chart 封装完备性检查

- 用户问题与 Canonical Type 名称：
- 数据角色与单根 data 语义：
- 完整隐式 Plot 配方：
- 不可撤销的 type 核心配方与允许调整范围：
- 表现性默认及关闭 / 替换范围：
- 用户 override 与 Plot extension 表面：
- 扩展后如何保持 type 本体语义：
- 依赖的 Data / Plot / Standard / Core capability：
- 是否只使用现有能力轴与 contract：
- 新增具体 definition、来源、注册方式与闭环：
- 缺失纵向 capability 的 owner 与处理结论：
- ChartSpec -> PlotSpec lowering 与错误路径：
- React / Vanilla / JSON parity：
- diagnostics / provenance / locator / lineage：
- Canonical Type 还是 Chart Pattern，理由：
- 本轮结论：组合 / 先下沉 / 仅 Pattern / 不支持或延期
```

若需求可以由既有 Plot contract 下的具体 Mark、Transform 等 definition 表达，Chart ADR 可以纳入该横向 provider，但必须证明 definition、registry、lowering、诊断与测试闭环。只有当需求需要新增能力轴、contract、registry 类型、pipeline 语义或 Core primitive 时，当前 Chart ADR 才必须暂停并把纵向能力送回对应 owner；不得在 Chart 内建立旁路实现。

## 12. 常见反例

以下情况都不算 Chart 封装完备：

- 某 type 由 renderer 或 React 组件直接绘制，无法生成 PlotSpec
- ChartSpec 只保存 `type + x + y`，常用 style、guide、scale、mark 配置无法表达
- 允许 Bubble override 删除 Point Mark、改成 Interval Mark，或撤销维持气泡语义的核心 encoding
- 追加内容已经成为主要表达、原 type 只剩名义存在，却仍把 Chart 当作通用 Plot 容器
- 为股票图在 Chart 内建立私有股票几何路径，而不是提供 Plot registry 可识别的 `MarkDefinition`
- 为 waterfall 在 Chart 内旁路计算数据，而不是提供或复用 Data / Plot transform definition
- React children 能追加 Plot Mark，但 Vanilla / JSON 无对应 IR
- 每个 type 各写一套 merge、默认轴、theme 或错误处理
- 用 `series[]` 给每个系列绑定独立 dataset，破坏 Plot 单根 data 模型
- 为了用户自定义 type 增加 Chart registry，形成第二套扩展体系
- 文档把 stacked / horizontal / smooth 等所有市场名称都固化成 type union

## 13. 与能力域和版本的关系

Chart 封装完备性依赖但不取代：

- Data Complete：数据与通用 transform 可被统一消费
- Visualization Complete：所有 GoG 能力可表达、扩展并 lower
- Drawing Complete：Plot 产物可由 Core / Render 执行

Chart completeness 只检查高层意图是否完整、安全、可解释地映射到这些能力。

具体类型、字段、默认值和测试矩阵进入 milestone ADR；版本 roadmap 只安排已确认的封装缺口。本文不以当前未实现状态降低长期标准，也不把长期标准误记为 v0.1 已承诺范围。
