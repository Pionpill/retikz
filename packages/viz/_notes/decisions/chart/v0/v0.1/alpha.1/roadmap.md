# chart v0.1-alpha.1 Roadmap：Scatter & Points

> alpha.1 以 ADR-09 规定的 family、recipe、mark、Theme、provider 与 Plot 出口作为当前基础设施总决策，先闭环 Point family 的可发布能力，再按 capability gate 处理后续 chartType。当前 `scatter`、`bubble`、`regression`、`connected-scatter` 与 `ranged-dot` 已形成实现、adapter、测试和文档闭环；其中 Bubble、Regression 与 Point 最大半径 range 留白的长期契约分别由 ADR-13、ADR-06、ADR-14 接受，Connected Scatter 与 Ranged Dot 待人工接受。`strip` 不再作为独立 chartType 或 alpha blocker，milestone 仍待整体人工验收
>
> 关联：[`chart v0.1 roadmap`](../roadmap.md) · [`Chart 总设计`](../../../../../architecture/chart-design.md) · [`Chart 封装完备设计`](../../../../../architecture/chart-encapsulation-complete.md) · [`Data 能力完备设计`](../../../../../architecture/data-capability-complete.md) · [`Plot 可视化完备设计`](../../../../../architecture/plot-visualization-complete.md) · [`ADR-11`](./11-chart-encoding-field-mapping.md) · [`ADR-12`](./12-chart-react-declaration-authoring.md)

## 1. Milestone 目标与当前状态

alpha.1 要证明 Point family 可以在精确 Source、recipe、Plot lowering、Standard presentation、三入口 adapter 与 compile-bound provider contributions 之间形成同一条长期主链：

1. root `type` 选择 `point` family，`recipe.chartType` 选择当前精确 recipe
2. `recipe.encodings` 使用具体 chartType 的精确 slot schema 保存 direct 或 rich 字段映射；`recipe.properties` 只保存常量，`recipe.marks` 只使用当前 recipe 允许的 mark kind
3. Scatter 与 Bubble recipe 分别生成 Point semantic mark；Regression recipe 生成 Point 与趋势 Path 组成的复合 semantic group
4. authored `recipe.marks` 默认按数组顺序追加，`override: true` 按 kind 原位替换内建 semantic group；`plotExtension.marks` 最后追加且不继承 Chart slots
5. Theme 使用 Chart、Plot、recipe 三个 owner slice，并按 Core mode / style、named/base chain、inline tokens 的固定顺序级联
6. provider graph、Standard Surface 与 Plot 出口组成 renderer-neutral 的唯一结果；React、Vanilla、JSON 与 SSR 复用同一精确 Source、active provider 与 resolver 主链
7. React concrete Chart 根组件以 IR-like `data` / `layout` / `coordinate` / `presentation` / `recipe` / `plotExtension` 提供完整入口，runtime rows 独立传入；owner-scoped declarations 作为同一 Vanilla Input 的 headless JSX sugar

当前状态是进行中：Point family 的 Scatter、Bubble、Regression、Connected Scatter 与 Ranged Dot recipe 已形成实现闭环；Bubble 的 ADR-13 与 Regression 的 ADR-06 已接受，Connected Scatter 的 ADR-05 与 Ranged Dot 的 ADR-07 保持 Proposed，等待人工验收后再接受。Strip 的目标视觉已由 Scatter + facet + jitter 组合覆盖，因此 ADR-08 不再要求独立 chartType，也不构成 alpha.1 退出 blocker。不能因为当前五个 recipe 已可消费就宣称整个 alpha.1 完成

## 2. ADR-01～03、ADR-09～14 的关系

ADR-09 是当前 family / recipe Chart 基础设施的总决策。早期 ADR-01～03 中与 Source shell、recipe 分发、Theme owner、公开入口和 presentation 组合有关的部分，以 ADR-09 的长期契约为准；仍与当前实现一致的 Plot lower、Vanilla normalize、React 复用 Vanilla、Standard presentation 边界继续保留

| ADR | 当前长期边界                                                                                                                                          | 状态                           |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| 01  | 保留 Chart → Plot 正式主链、精确 schema parse、resolve 与 provider 责任；family / chartType 选择由应用层承担，active provider 只服务当前 compile 边界 | Superseded                     |
| 02  | 采用 `tokens.chart`、`tokens.plot`、`tokens.recipe` 三个 owner slice 与 Core mode / style cascade                                                     | Superseded                     |
| 03  | 保留 Source、Vanilla Input、React adapter 与 Standard presentation 的边界；presentation 固定 title → subtitle → plot → note → source                  | Superseded                     |
| 04  | Point family 的 Scatter recipe、Point semantic mark 与 Chart mark contract                                                                            | Proposed                       |
| 05  | Point family 的 Connected Scatter Path → Point recipe 与 `order` 失败语义                                                                             | Proposed；实现完成，待人工接受 |
| 06  | Regression 的分组拟合、六种 Smooth method 与 Point + trend 复合 semantic mark                                                                         | Accepted                       |
| 07  | Ranged Dot 的 Relation projected endpoint glyph、row atomicity 与固定横向角色                                                                         | Proposed；实现完成，待人工接受 |
| 08  | Strip 不设独立 chartType；由 Scatter + facet + jitter 组合表达                                                                                        | Superseded                     |
| 09  | family、recipe、mark Source IR、Theme、registry 与 provider 的当前基础设施总决策                                                                      | Accepted                       |
| 10  | 保留Chart / Plot声明owner分层与`PlotXxx`命名；`ChartFacet` / `recipe.facet`部分待ADR-11 Accepted后由其替代                                            | Accepted                       |
| 11  | Scatter exact encodings、Data output model、rich mapping调度与旧facet surface迁移                                                                     | Proposed                       |
| 12  | concrete Chart 完整 IR-like 根配置、runtime rows、headless declarations、跨 slot hybrid 与同 slot fail-loud                                           | Accepted                       |
| 13  | Bubble 独立 chartType、必需字段尺寸映射、不可撤销 size 继承与 Point 共享边界                                                                          | Accepted                       |
| 14  | Point family 复用 Core 四边 spacing，并按最终 Chart-owned Point 最大半径生成 range domain padding                                                     | Accepted                       |

## 3. 当前 Source 与解析主链

alpha.1 的 Source root 固定为：

```text
namespace, type, id?, presentation?, theme?, data, layout?, coordinate?, recipe, plotExtension?
```

其中 `type` 是 family，Point family 使用 `point`；`recipe` 固定包含：

```text
chartType, encodings, properties?, marks?
```

`recipe.chartType`是全局唯一recipe key。`encodings`由具体chartType的strict schema拥有：字符串保持direct field shorthand，rich mapping可组合当前slot允许的scalar aggregate、derived transform、named scale以及`row / column / facet` composition atom；Scatter要求`x / y`，Bubble要求`x / y / size`。字段类型、format与分类order继续由Data model拥有，facet canonical composition由Plot拥有。共享轴与多mark轨道不进入Chart encodings，需要时通过`plotExtension`直接使用Plot静态Tracks。`layout.width` / `layout.height`是整张Chart的border-box allocation，不复制进Plot

`plotExtension` 只保存用户显式声明的 Plot fragment。它不承载 recipe 展开结果，显式 Plot mark 也不继承 Chart encodings 或 properties。解析顺序固定为：

```text
application-owned family / chartType route
  -> exact Source parse
  -> Theme cascade
  -> authored Plot root transforms
  -> encoding-derived operations + final field / scale / composition bindings
  -> recipe scaffold + semantic mark groups
  -> apply matching authored overrides
  -> append ordinary or unmatched Chart marks
  -> explicit Plot fragment
  -> complete Plot + fixed presentation / Surface composition
```

五个 active Point chartType 的包内 Definition 和 concrete provider contribution 分别描述各自 recipe；provider 在当前 Core compile 边界汇合 active contribution，建立临时 recipe registry 与精确 schema union，再沿同一 parse / resolve path 消费。应用层负责动态 family / chartType catalog、模块加载与 JSON 路由；Chart 不提供全局 catalog、全局 parse/router 或第三方 recipe / chartType 注册入口

## 4. Point family 当前契约

| chartType           | Source 要求                                                                                      | semantic mark                  | 当前状态              |
| ------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------ | --------------------- |
| `scatter`           | `x`、`y`；可选color / size / opacity / shape、aggregate / derived / scale与facet composition     | 一个Point                      | 已实现                |
| `bubble`            | `x`、`y`、`size`；可选color / opacity / shape、aggregate / derived / scale与facet composition    | 一个Point                      | 已实现；ADR Accepted  |
| `regression`        | `x`、`y`；可选series、method / sampleCount / extent、point / trend properties与facet composition | Point + trend复合组            | 已实现；ADR Accepted  |
| `connected-scatter` | `x`、`y`、`order`；可选series、connectNulls、Point / Path properties与facet composition          | Path → Point复合组             | 已实现；ADR待人工接受 |
| `ranged-dot`        | `category`、`start`、`end`；可选color、range / endpoint properties与facet composition            | Relation connector + endpoints | 已实现；ADR待人工接受 |

Scatter 与 Bubble recipe 都允许有序 `recipe.marks`，并分别只接受 `scatter` 与 `bubble` mark。普通 mark 表达额外 Point authored mark；`override: true` 在原位置整体替换同 kind 的内建 semantic group。mark 省略的 slot 只从当前 binding 声明的 Chart context 继承，显式 properties 高于 inherited encoding，显式 encoding 再胜出。Bubble 的 size 始终继承 recipe 的必需字段映射，不能由 mark 或 properties 覆盖。React `ScatterMark` / `BubbleMark` 是各自 Chart mark 的 marker，Vanilla 使用同形 plain input；作者需要 Path 等其它图元时通过 `plotExtension.marks` 显式添加

Bubble 已按 ADR-13 作为独立 `bubble` chartType 进入 active contribution。它复用 Point 主链，但要求字段绑定的 `size` 并保持 sqrt 尺度兼容；`BubbleProperties` 与 `BubbleMark` 都不能显式提供 size，mark 只能继承 recipe 的核心尺寸映射。实现、adapter、测试与文档闭环已完成，ADR-13 已接受

Regression 已按 ADR-06 作为独立 `regression` chartType 进入 active contribution。它复用共同 Point 数据视图，并仅在趋势 Path 上执行 mark-local Smooth；可选 `series` 同时驱动分组、共享 categorical color scale 与默认 legend。六种内置回归方法、精确 Source、三入口 adapter、测试与文档闭环已完成，ADR-06 已接受

Connected Scatter 已按 ADR-05 作为独立 `connected-scatter` chartType 进入 active contribution。它要求 `order` 字段映射，可选 `series` 驱动分组与共享颜色，Path 始终先于 Point 绘制；缺值分段或桥接复用 Plot 的 `connectNulls` 语义。精确 Source、三入口 adapter、测试与文档闭环已完成，ADR-05 保持 Proposed，待人工接受

Ranged Dot 已按 ADR-07 作为固定横向 `ranged-dot` chartType 进入 active contribution。它把 `category` 映射到 y，把 `start` / `end` 映射到同一个 x scale，并通过 Plot Relation projected endpoint glyph 一次输出 connector 与两个端点；投影失败按 datum 原子跳过，connector 始终先于端点绘制。精确 Source、三入口 adapter、测试与文档闭环已完成，ADR-07 保持 Proposed，待人工接受

component props 与 `recipe.properties` 都只调整内建 semantic recipe 的常量表现；React、Vanilla 与手写 JSON 最终必须得到同一 Source。Plot 的直接 `marks` 始终是最后追加的独立内容

Point chartType 的 recipe properties 可以通过 `domainPadding` 调整连续位置 scale 的 domain 留白：数值简写与省略 `kind` 的对象使用 range 单位，显式 `kind: 'ratio'` 使用 domain 跨度比例；对象复用 Core `default / x / y / top / right / bottom / left` spacing shape。五个 Point chartType 从最终 Chart semantic groups 计算最大 Point `size` 半径作为缺省 range 留白。显式 Properties、encoding scale operation 与 Plot extension 的 owner 优先级保持不变；该字段不进入 authored Chart mark，也不改写 categorical 或 `plotExtension` 完整提供的 scale

## 5. Theme、presentation 与空间边界

Theme 接受命名主题，或 `{ base?, tokens?: { chart?, plot?, recipe? } }`。Chart shell 从 Core mode 的完整 fallback 开始，依次应用 Core style chain、authored named/base chain 与 inline slices；Chart slice 负责 canvas、padding、presentation，Plot slice 交给 Plot owner，recipe slice 由当前 recipe 的 overrides / resolution schema 负责。省略 recipe slice 时使用该 recipe 的显式 fallback

presentation 只生成唯一的 title、subtitle、note、source，并固定按 `title → subtitle → plot → note → source` 排列。Standard Surface 包含完整 Chart border-box 与 Plot；Chart 不预估文字尺寸、不复制 Plot intrinsic size，也不把 host viewport 尺寸写回 Source

Chart、Plot 与 Standard 的 identity / provenance / lineage / locator 沿同一结果传递。Chart 只拥有外层 identity 与 delegation，不复制 Plot 的 registry、scale、guide、composition 或 spatial locator

## 6. Provider 与 adapter gates

provider graph 与 Standard Surface gate 已闭环，五个 active Point chartType 的 concrete provider contribution 可以在当前 Core compile 边界声明并解析 family、recipe、mark、Theme 与 Plot / Surface 依赖。公开入口只编排这条 provider pipeline：

- 具体 Point chartType 的包内 Definition 声明精确 schema、recipe Theme、scaffold、semantic mark 与允许的 Chart mark binding
- concrete provider contribution 安装该 Definition；当前 Core compile 边界拒绝重复 chartType、family mismatch、未知 base 与依赖缺失
- 应用层负责动态 family / chartType catalog、模块加载与 JSON 路由；Chart 不提供第三方 recipe / chartType 注册入口

React concrete Chart 根通过 `rows` 与结构化 `data`、`layout`、`coordinate`、`presentation`、`recipe`、`plotExtension` 组装 Vanilla Input，组件身份推断 family 与 chartType；公共 singleton、chartType 私有 singleton、Chart marks 与 `ChartExtension` 是相同 owner slots 的 headless JSX sugar。根与 declarations 可以跨 slot 混用，同 slot 双来源 fail-loud。`ChartCoordinate` 接受名称或完整 operation；Vanilla 把名称归一为 Source 根 `{ type }`，并只展开 `row / column` 字符串 shorthand。JSON、Vanilla、React 与 SSR 不各自实现 aggregate、scale、composition、dispatch、默认或 Theme resolve。runtime reducer / transform / scale Definition 通过 provider sidecar 保真传递，不进入 JSON Source；动态 JSON 路由由应用层负责

## 7. Regression 实现边界与仍保留的 capability gates

### 7.1 ADR-06：Regression 分组拟合与 mark-local Smooth

Regression 采用 Point 与趋势 Path 组成的复合 semantic group。Point 消费共同数据，Path 在当前 mark data view 上执行 Plot Smooth；recipe-only `series` 同时驱动分组、Path series、共享颜色与默认 legend。ADR-06 已通过 Architecture Gate 并接受，Data / Plot 当前的 TransformDefinition、replace output model、mark-local data view、facet panel、lineage 与 locator 足以承载该组合。六种内置方法、精确 Source、adapter、测试与文档已形成实现闭环，`regression` 已进入 active chartType

### 7.2 ADR-07：Ranged Dot row atomicity

Plot Relation 已提供 projected source / target endpoint glyph：同一 datum 的 connector、source glyph 与 target glyph 在投影成功后按固定顺序输出，任一必要坐标无效时三者原子跳过，并共享原 datum provenance。Ranged Dot 在此能力上形成一个 Relation operation；缺值跳过与 field / coordinate 诊断继续由 Plot 正式数据与坐标契约负责，Chart 不 reshape rows

### 7.3 ADR-08：Strip 不再作为独立 chartType

Strip 的目标视觉与交互能力已由现有 Scatter recipe 组合 facet 与 jitter 表达；新增独立 `strip` chartType 只会复制现有 Source 和 recipe 能力，不形成新的长期契约。因此 ADR-08 被替代，Strip 不进入 active chartType，也不再阻塞 alpha.1

## 8. alpha.1 退出条件

alpha.1 结束前必须同时满足：

1. 当前alpha.1的Scatter、Bubble、Regression、Connected Scatter与Ranged Dot有稳定的exact encoding Source schema、ordered slot contract、recipe、semantic mark、mark contract、concrete provider contribution与三入口等价性；Strip由Scatter + facet + jitter组合表达，不设独立chartType
2. 应用层family → chartType discovery与JSON路由、active provider的精确Source parse、Theme cascade、encoding-derived operation、slot consumer、mark inheritance与Plot facet composition形成清晰边界；Chart runtime不维护全局catalog
3. semantic mark → authored Chart marks → explicit Plot marks 的顺序、继承、覆盖、identity、provenance、lineage 与 locator 语义稳定
4. Core mode / style、Chart / Plot / recipe Theme slices、固定 presentation 顺序与 Chart border-box layout 形成完整 renderer-neutral 结果
5. React、Vanilla、JSON、SSR与五个active Point chartType的concrete provider contribution复用同一Source、runtime Definition sidecar与resolver主链；未知family、未安装chartType / custom operation、mark、Theme、字段绑定、output descriptor、scale family、composition冲突与依赖缺失都在对应owner边界fail-loud
6. docs、schema discovery 与示例只展示已实现 recipe；Superseded 的 Strip 不列为可导入 chartType，其组合表达保留在 Scatter 示例与决策记录中
7. ADR-14 已接受，Point family 的默认连续位置留白由最大 Point 半径统一驱动，四边 / Polar 失败语义与 Plot range / ratio 单位保持一致

当前 alpha.1 仍处于进行中；Connected Scatter 与 Ranged Dot 的实现已完成但 ADR 保持 Proposed，需人工验收后再更新接受状态与 milestone 结论
