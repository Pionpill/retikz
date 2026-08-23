# Chart 分类、配方与 Plot-backed 解析总设计

> **状态：当前长期架构。** 本文定义 `@retikz/chart` 的 Source IR、family / recipe 判别、精确 schema、Chart mark、Theme、Plot 出口、presentation 与 adapter 边界。历史 ADR 记录当时决策，不作为当前公开契约真源。

## 1. 核心判断

Chart 是 Plot 之上的高层类型封装，不是第二套图形语法：

- Plot 沿 data、transform、scale、coordinate、mark、guide 与 composition 等 GoG 维度纵向扩展
- Chart 用稳定 family 帮助人类、文档和 LLM 先完成粗分类，再由具体 `chartType` recipe 压缩并横向组合 Plot 语义
- Chart Source IR 只保存用户的高层意图；recipe 生成的 mark、scale、coordinate、guide 与完整 Plot 结构只进入 resolved `IRPlot`，不得写回 Source IR
- Chart 只拥有高层数据角色、recipe 默认、Chart mark 继承、整图 presentation、Chart theme 与 canvas；Plot mark、scale、guide、composition、lowering、identity、provenance、lineage、locator 与诊断继续由 Plot 拥有
- 完全控制底层 Plot 时直接使用 Plot，不保留公开 `type: 'base'` 特例
- Chart 解析后可以继续汇合为内部 Base Chart 结果；该内部形态不是公开 Source IR 判别项

```text
exact Chart Source IR
  -> namespace + type + recipe.chartType envelope
  -> application-selected family/chartType route
  -> active provider recipe lookup
  -> exact recipe schema parse once
  -> shared scaffold + built-in semantic mark + authored Chart marks
  -> optional explicit Plot extension
  -> complete IRPlot
  -> internal Chart result
  -> Standard Surface / presentation
  -> Plot canonical lowering
```

## 2. Chart Source IR

所有具体 Chart 使用同一字段布局，但每个 `chartType` 仍拥有自己的 strict 精确 schema：

```ts
type ChartSource<TEncodings, TProperties, TMark, TRecipeThemeTokens> = {
  namespace: 'chart';
  type: OpenString<BuiltinChartFamily>;
  id?: string;
  presentation?: ChartPresentation;
  theme?: ChartThemeInput<TRecipeThemeTokens>;
  data: ChartData;
  layout?: {
    width?: number;
    height?: number;
  };
  recipe: {
    chartType: OpenString<BuiltinChartType>;
    encodings: TEncodings;
    properties?: TProperties;
    marks?: Array<TMark>;
  };
  plotExtension?: ChartPlotExtension;
};
```

这个泛型只说明稳定结构，不构成接受全部 chartType 字段的宽 `ChartSchema`。每个具体 chartType 都拥有自己的精确 schema，并从该 schema 派生持久化 Source IR 类型。

### 2.1 根字段

| 字段            | 必填 | Owner        | 语义                                                                                                        |
| --------------- | ---- | ------------ | ----------------------------------------------------------------------------------------------------------- |
| `namespace`     | 是   | Chart        | 固定为 `chart`，标识 Retikz Chart Source IR                                                                 |
| `type`          | 是   | Chart        | 稳定的粗粒度 family，只负责分类、发现与第一阶段 schema 路由，不直接决定绘图效果                             |
| `id`            | 否   | Chart / Core | Chart 身份；唯一范围、namespace、引用与 artifact 行为沿正式 identity 主链                                   |
| `presentation`  | 否   | Chart        | title、subtitle、note、source 等整图说明；不属于具体 recipe 或 Plot                                         |
| `theme`         | 否   | 多 owner     | 主题名，或由 Chart shell、Plot、当前 recipe 三个 owner slice 组成的 authored token 输入                     |
| `data`          | 是   | Data / Chart | 当前 Chart 的唯一数据来源；字段、transform 与 lineage 的底层语义继续由 Data / Plot 拥有                     |
| `layout`        | 否   | Chart        | 整张 Chart 的外部目标尺寸，目前只包含 `width`、`height`；不承载 Plot 内部 facet、track、coordinate 或 guide |
| `recipe`        | 是   | Chart        | 当前图表的具体高层意图，包含 recipe、数据绑定、实例属性与附加 Chart mark                                    |
| `plotExtension` | 否   | Plot         | 用户显式声明的低层 Plot 扩展；不保存 recipe 自动生成内容                                                    |

### 2.2 `recipe` 字段

| 字段         | 必填 | 语义                                                                                         |
| ------------ | ---- | -------------------------------------------------------------------------------------------- |
| `chartType`  | 是   | 全局唯一的 recipe key，决定共享 scaffold、内建 semantic mark、精确 schema 与最终绘制效果     |
| `encodings`  | 是   | 当前 recipe 允许的数据字段绑定；只接受 field-bound 值，不接受常量                            |
| `properties` | 否   | 当前 recipe 的常量表现或行为配置；只包含该 chartType 明确拥有或消费的属性                    |
| `marks`      | 否   | 在 Chart 上下文中追加的有序 mark；可以按 mark Definition 声明继承部分 encodings / properties |

### 2.3 `plotExtension` 字段

`plotExtension` 是显式 Plot 出口，不是 `recipe` 的第二个同义入口：

- 不承载 Chart `data`、`layout`、`type`、`chartType`、Chart-owned encodings / properties 或 recipe 默认
- 只保存用户明确声明的 transform、scale、coordinate / composition、guide、theme、spatial root、附加 mark 与 meta 等 Plot-owned fragment
- 单值结构、具名集合、mark 数组与 identity 冲突分别沿 Plot 自己的 replace、merge、append 与 fail-loud 规则处理
- `plotExtension.marks` 是完全显式、相互独立的 Plot 内容，不自动继承 Chart encodings / properties
- normalizer 不为缺省值、data、尺寸或 recipe 生成内容创建空 `plotExtension`

## 3. Family、chartType 与精确 schema

### 3.1 两级判别

`type` 和 `chartType` 分工固定：

```text
type         -> family 分类与第一阶段路由
chartType    -> recipe identity 与最终效果
```

每个 `chartType` 必须唯一属于一个 `type`，因此 `chartType -> type` 是确定映射。输入的 family 与 recipe Definition 不一致时必须在 Source schema / registry 边界 fail-loud，不允许忽略 family、猜测目标或回退到同名 recipe。

family 是持久化分类契约，必须数量有限、语义稳定且拥有唯一主归属。一个 chartType 可以拥有额外检索标签，但不能同时属于多个持久化 family。

### 3.2 Family module、Definition 与 active provider registry

Chart 以一级 family 目录作为横向组织单位，但不为 family 建立一个宽 schema 或全局 catalog。每个具体 chartType 子目录闭合自己的精确 schema、Theme 与 provider contribution；recipe Definition 只作为包内实现契约存在。同一 family 的多个具体 provider 在当前 Core compile 边界使用同一个 `chart.<family>` key 合并。每个 recipe Definition 至少声明：

- 唯一 `chartType`
- 精确 encodings schema
- 精确 properties schema
- recipe resolver 自身显式消费的 encoding / property slots
- 有序的 recipe-local Chart mark binding 与继承映射
- 当前 recipe theme token schema
- shared scaffold 与 built-in semantic mark 的解析入口
- 输出到 Plot canonical 主链的依赖与诊断

当前 provider contribution 只携带一个具体 chartType Definition 与可见的命名 Theme Definition；`_chart/providers` 在 Core 合并后按 Definition identity 去重，拒绝同一 chartType 的不同 Definition，校验 family / schema identity 与 Theme 依赖，再创建当前边界的临时 recipe registry 和精确 schema union。该 union 是派生编译产物，不导出为 family schema，也不写回 Definition 或 Source IR。未知 key、Definition 缺失、family mismatch、重复注册、未知属性或无 consumer 的字段都必须 fail-loud。应用层负责动态 family / chartType catalog、模块加载与 JSON 路由，Chart runtime 不提供全局 catalog 或全局 parse/router，也不提供第三方 recipe Definition 注册入口；复杂自定义图形直接使用 Plot。

recipe 的显式 consumer 列表贴近实际 resolver 维护，不从 schema 字段自动推导；schema 允许“可以被某种合法组合使用”，consumer 列表说明“当前组合确实读取”。mark binding 只有在对应 authored mark 实际出现时才成为 active consumer，因此同一个 slot 在有该 mark 时可以继承，没有该 mark 时不能被静默接受。

### 3.3 LLM 渐进 schema

面向 LLM 的 schema 发现按三步进行：

```text
选择 family
  -> 只暴露该 family 的 chartType
  -> 选择 chartType
  -> 只暴露该 recipe 的精确 encodings / properties / marks / recipe theme schema
```

仅把 `chartType` 嵌套进 `recipe`，但仍一次展开所有宽 union，不能降低选择复杂度。LLM 与 unknown JSON 入口应消费应用层生成或提供的 family catalog，再选择具体 chartType 的精确 schema；Chart runtime 只处理当前 provider 边界已经选定的 schema。

## 4. Encodings 与 Properties

### 4.1 精确 schema 与原子组合

Chart 共享稳定语义原子，不建立包含所有可选字段的宽 `SharedChartEncodingsSchema` 或 `SharedChartPropertiesSchema`：

- field reference 等基础值由单一原子 schema 拥有
- Cartesian position、颜色、大小、facet、track 等片段只有在多个 recipe 真实共享完整语义和不变量时才提取
- 每个 `XxxChartEncodingsSchema` / `XxxChartPropertiesSchema` 最终仍是 strict 精确对象
- 源于 Plot 且语义、值域完全一致的属性直接复用 Plot 权威原子；Chart 只拥有领域收窄、recipe 默认和 Chart-specific 组合
- 仅服务一个 recipe 的字段留在该 recipe，不为结构整齐提前进入 Chart shared

### 4.2 Encodings

`encodings` 只表达 field-bound 数据角色，不接受常量。一个 encoding slot 可以由不同 consumer 使用：

- position、color、size 等可以被 built-in semantic mark 或 authored Chart mark 消费
- axis、guide 等共享 scaffold 可以读取相应数据角色
- facet、track 由 composition owner 消费，只影响分区、轨道、共享轴与 guide 上下文，不广播给普通 mark

每个 Definition 必须声明 slot 的 owner、consumer、目标语义与失败行为。字段同名不代表可以继承或映射。

### 4.3 Properties

`properties` 保存当前 chartType 的常量表现和行为参数：

- Theme 提供视觉默认环境，properties 表示当前实例的明确配置
- properties 不能承载数据字段绑定
- properties 与 encodings 映射到同一目标 slot 时，encoding 胜出
- 冲突按目标 slot 解析，不对两个对象执行无约束 spread
- schema 接受但没有 scaffold、semantic mark 或 authored mark 消费的属性属于契约错误，不得静默忽略

## 5. Semantic mark 与多个 Plot mark

### 5.1 Recipe 输出

每个 chartType recipe 解析两类结果：

1. 共享 scaffold：coordinate、axis、guide、facet、track 等 Chart 需要补全的 Plot 结构
2. built-in semantic mark：当前 chartType 的核心图元计划

built-in semantic mark 不等于恰好一个 Plot mark。它可以 lower 为一个或多个 Plot mark，例如当前 Scatter semantic mark 生成 PointMark；未来的多 mark recipe 也必须按稳定顺序生成各自的 Plot mark。所有生成目标继续进入 Plot 正式 schema、resolve、lowering、identity、provenance、lineage、locator 与 diagnostics 主链。

### 5.2 Chart marks

`recipe.marks` 表达处于 Chart 继承上下文的附加 mark：

- mark Definition 只声明精确 payload schema 与如何映射到一个或多个 Plot mark，不反向认识 family 或 chartType
- 当前 recipe 的有序 binding 单向声明允许哪些 mark，以及每个 mark 可消费哪些 encoding / property slot
- 内建 Chart mark 使用同一 package-internal Definition / recipe binding 机制；Chart mark Definition 不是第三方扩展入口
- mark 自身显式内容只覆盖该 mark 的继承结果，不改写 built-in semantic mark
- recipe 内建 mark 按 recipe 声明顺序生成；authored marks 按数组顺序追加
- PointMark 等 Plot target 只有通过 Chart mark 入口时才获得 Chart 继承；直接写入 `plotExtension.marks` 时保持纯 Plot 语义
- 未被某个 mark 接受的 slot 不传递给该 mark；未被整张 Chart 的任何合法 consumer 接受的字段必须诊断

Chart mark 只负责高层继承与最小映射，不复制 Plot mark schema、scale、coordinate、lowering、identity 或 diagnostics。

## 6. 默认、继承与组合优先级

优先级按 consumer 和目标 slot 定义，不存在覆盖整张 Chart 的全局 last-wins：

| 目标                        | 从低到高的来源                                                                                             |
| --------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Chart shell token           | mode fallback → Core style 同名主题链 → authored named / base 链 → inline `tokens.chart`                   |
| built-in semantic mark slot | recipe fallback → Core style 同名主题链 → authored named / base 链 → inline theme → properties → encodings |
| authored Chart mark slot    | mark schema default → resolved recipe theme → inherited properties → inherited encodings → mark 显式内容   |
| Plot 单值结构               | recipe 默认 → 用户显式 `plotExtension` 值，前提是该字段允许替换                                            |
| Plot 具名集合               | 按 Plot identity 合并；重复且不可合并时 fail-loud                                                          |
| `plotExtension.marks`       | 按 Plot 顺序追加，与 built-in / Chart marks 相互独立                                                       |

`false`、`0`、空数组与空字符串是否有效由各权威 schema 决定，resolver 不使用 truthy fallback。recipe 不得让表现默认撤销 chartType 的结构不变量。

## 7. Presentation

`presentation` 位于 Chart 根，只保存可选的 `title`、`subtitle`、`note`、`source`。当前版本使用固定语义顺序：

```text
title -> subtitle -> plot -> note -> source
```

- JSON 对象属性出现顺序没有语义，resolver 必须按固定顺序生成
- 每类内容至多一个；缺失项直接省略
- presentation 不接受 authored order、position、任意 children 或多 Plot placeholder
- 文本复用 Standard / Core 正式文本能力，布局复用 Standard / Layout 正式组合能力
- 后续若需要自由组合，必须另行设计显式有序结构，不能把对象属性顺序升级为隐式 API

## 8. Theme

### 8.1 Source 输入

`theme` 可以是注册主题名，也可以是带可选 base 的 authored token 输入：

```ts
type ChartThemeInput<TRecipeThemeTokens> =
  | ChartThemeName
  | {
      base?: ChartThemeName;
      tokens?: {
        chart?: ChartThemeTokens;
        plot?: PlotThemeTokens;
        recipe?: TRecipeThemeTokens;
      };
    };
```

- `tokens.chart` 只拥有所有 Chart 共用的 canvas、padding、presentation 等 shell 语义
- `tokens.plot` 直接使用 Plot token owner，不由 Chart 复制 axis、grid、guide、palette 或 mark token
- `tokens.recipe` 由当前 chartType 的 Definition 提供精确 schema，只保存该 recipe 特有的表现默认
- 可以提供部分或完整 authored token mapping；最终 resolved token map、Theme Definition 与 resolver 状态不写回 Source IR
- 对象形式必须至少提供 `base` 或一个非空 token slice；空主题对象没有语义并应被 schema 拒绝

### 8.2 注册主题

一个可跨 chartType 复用的注册主题可以为多个 recipe 提供 token slice：

```ts
type ChartThemeDefinition = {
  name: ChartThemeName;
  base?: ChartThemeName;
  tokens?: {
    chart?: ChartThemeTokens;
    plot?: PlotThemeTokens;
    recipes?: Partial<Record<ChartType, ExactRecipeThemeTokens>>;
  };
};
```

Definition 是 JSON-safe 声明式数据，没有 resolve 回调。`base` 指向另一个已注册主题；registry assembly 检测重复 name、未知 base、继承环、未知 chartType 与非法 owner slice。解析 `theme: 'clean'` 时，Chart 按 base chain 从祖先到当前项应用 token，并根据当前 chartType 选择可选 recipe slice；缺少 slice 表示沿用该 recipe 自己的 fallback，不是错误。Theme Definition 可以覆盖多个 recipe，单个 Chart Source IR 的 inline `tokens.recipe` 始终只接受当前 recipe 的精确 token。

### 8.3 Baseline 与 cascade

Chart shell 拥有稀疏 `ChartThemeOverridesSchema` 与完整 `ChartThemeResolutionSchema`。Chart 内建 Theme resolver 为每个 Core `ThemeMode` 提供一份显式完整 fallback，并由 resolution schema 校验；resolution schema 不通过 default 补 token。recipe 同样以 Definition 的显式 `recipeThemeFallback` 为最低来源。Chart shell 不复制 Core / Plot categorical palette，需要 shared color 时只读取当前 `ResolvedTheme.colors`。

主题按以下顺序解析：

1. Chart shell 选择当前 Core mode fallback，recipe 选择当前 recipe fallback；Plot owner 从同一个 Core effective Theme 建立自己的 baseline
2. Core effective Theme 存在 `style` 时，Chart registry 必须存在同名 Theme Definition，并先应用它的完整 base chain；缺少同名 definition 必须 fail-loud
3. Source `theme` 是字符串时再应用该命名主题 chain；是对象时应用可选 `base` chain，再应用 inline tokens；相同 definition chain 不重复应用
4. 每个 owner slice 以顶层 token key 原子覆盖，数组、对象与 scalar 整体替换；Chart shell 与 recipe 合并后分别再经完整 resolution schema 校验
5. `tokens.plot` 只作为 Plot authored token 输入，位于 Plot 自己的 Core style baseline 之后、显式 `plotExtension` fragment 之前；Chart 不解析 Plot baseline

完整顺序因此是：Chart shell 为 `mode fallback → Core style theme chain → authored named/base chain → inline tokens.chart`；recipe 为 `recipe fallback → Core style theme chain → authored named/base chain → inline tokens.recipe → properties → encodings`。省略 Source `theme` 时仍消费 Core mode 与可选 style chain。

样式归属按语义判断：

- 所有 Chart 都成立的 canvas / presentation 样式属于 Chart shell
- 所有 Plot Axis / Guide / Mark 都成立的样式属于 Plot
- 只对 Scatter、Heatmap 等特定 recipe 成立的默认属于 recipe
- 当前实例明确指定的值属于 properties

不同 owner 可以复用 Core paint、opacity、font、spacing 等值原子，但不得因为值类型相同而合并 token key 或 resolver。

## 9. React、Vanilla 与 Source IR

- JSON、Vanilla 与 React 最终生成同一精确 Chart Source IR，并进入应用选定的 active provider / resolver
- 具体组件或 factory 可以从入口身份推断 family 与 chartType，减少 authoring 冗余，但不得建立不同的持久化结构或默认逻辑
- Vanilla normalize 只把 typed Input 组装为 Source IR，不读取 registry、Theme、data 或 host
- React 只把 props、marker 与 children 映射为同一 Vanilla Input，不直接解析 recipe、继承 Theme 或生成 Plot IR
- React presentation marker 的出现顺序不改变固定 presentation 语义顺序
- React Chart mark children 按 authored order 归一为 `recipe.marks`
- inspection、文档预览与序列化优先展示精简 Chart Source IR，不暴露 resolved Base / Plot IR 代替 authoring 结构

## 10. Owner 边界

| Owner                   | 拥有                                                                                     | 不拥有                                                                      |
| ----------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Chart 根                | family、identity、data 引用、外部 layout、presentation、Theme 入口                       | Plot 内部 layout、mark、scale、guide、renderer                              |
| Chart recipe Definition | chartType、精确 schema、recipe theme、scaffold、built-in semantic mark、Chart mark 继承  | Plot mark catalog、Plot lowering、Data 算法、Core compile                   |
| Plot                    | transform、scale、coordinate、composition、mark、guide、Plot theme 与 canonical lowering | Chart family、chartType、presentation、Chart recipe                         |
| Data                    | 数据模型、字段、transform / statistics 与 lineage                                        | Chart encoding role、Plot channel、visual recipe                            |
| Standard / Layout       | 通用 Surface、文本、排列和跨领域组合                                                     | Chart / Plot 领域 schema 与 recipe                                          |
| Vanilla                 | TypeScript authoring Input 与 Input-to-Source-IR normalize                               | Chart schema、registry resolve、recipe、Plot lowering                       |
| React                   | JSX / props / children 到 Vanilla Input 的宿主映射                                       | 平行 Source IR builder、recipe resolve、Theme resolver、Plot / Core compile |

## 11. 源码组织与依赖

Chart 是横向 recipe 能力，但每个 family 自己闭合；不沿 Plot 的纵向 grammar 能力作为顶层目录轴：

```text
src/
  _chart/    Chart vocabulary、精确 Source、recipe/mark/theme contract、Chart resolve、presentation、Plot 生成与 active provider aggregation
  point/     Point family 的分类 key、shared scaffold、marks 与具体 chartType 子目录
  bar/       Bar family 横向闭包
  line/      Line family 横向闭包
  relation/  Relation family 横向闭包
```

依赖方向固定为 `point -> _chart`，具体 chartType provider 通过 `_chart/providers` 创建当前 family 的 contribution。`_chart/providers` 不导入具体 family；它只消费 provider contribution，在 Core 合并后建立临时 registry、schema union 与 composite Definition。`point` 等一级 family 只依赖 `_chart` 的 contract 与 schema factory，family 之间不得互相 deep import。应用层可按需导入具体 chartType subpath 并自行决定如何组合多个 provider，不由 Chart 建立全局组合根。

每个具体 chartType 的 recipe、mark、schema、Theme fallback、scaffold、provider、tests 与 adapter typed sugar 应形成可单独理解的闭包。新增 family 正常只增加自己的一级目录与具体 chartType 入口、adapter / docs 入口和测试，不修改通用 Source resolve；新增 chartType 只在自己的目录内增加 Definition、schema 与 provider。

## 12. 非目标

- 不保留 `type: 'base'`、旧字段别名、fallback、migration 或新旧双轨
- 不建立包含所有 family、chartType、encoding、property、mark 或 recipe theme 字段的开放宽 schema
- 不让 `OpenString` 绕过 Definition、registry、精确 schema 与 consumer 校验
- 不把 `plotExtension.marks` 纳入 Chart 隐式继承
- 不复制 Plot mark、scale、guide、composition、Theme、lowering、identity 或 diagnostics
- 不把 resolved `IRPlot` 或 recipe 展开结果写回 Chart Source IR
- 当前不设计多 Chart composition、concat、repeat 或自由 presentation 顺序
- 不把函数、ReactNode、Definition 实例或宿主运行时状态写入 IR

## 13. 缺口流向

- 新数据算法进入 `@retikz/data`
- 新 GoG operation、Mark / Scale / Coordinate / Guide Definition 与 lowering 进入 `@retikz/plot`
- 通用布局进入 Layout owner
- 跨领域 presentation / surface composite 进入 `@retikz/standard`
- Chart recipe、family、精确 schema、Chart mark 继承和 recipe theme 留在 `@retikz/chart`
- Core composite、identity、provider 与 adapter 聚合缺口进入 Kernel owner
