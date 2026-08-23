# chart v0.1 Roadmap

> 本文件汇总 `@retikz/chart` v0.1 的版本目标、family 目录、里程碑、依赖与退出条件。Chart 是 Viz 的 Tier 3 封装层，依赖 Data、Plot、Standard 与 Core 的公开能力，不拥有 renderer，也不直接承担 primitive lowering
>
> 关联：[`Chart 总设计`](../../../../architecture/chart-design.md) · [`Chart 封装完备设计`](../../../../architecture/chart-encapsulation-complete.md) · [`plot v0.1 roadmap`](../../../plot/v0/v0.1/roadmap.md) · [`plot v0 roadmap`](../../../plot/v0/roadmap.md)
>
> **状态：草案。** alpha.1 当前只确认 Point family 的 `scatter` 已形成实现闭环；其它 Point chartType 与 `regression`、`ranged-dot`、`strip` 仍为 planned / gated。alpha.2 与 alpha.3 继续规划 Line & Area、Bar & Column，不将当前 alpha.1 宣称为已完成

## 1. 版本目标

chart v0.1 建立一套以 family 发现、以 chartType 选择精确 recipe 的 JSON-safe Chart Source 与统一解析主链：

1. Source 根 `type` 固定表示 family，具体 recipe key 固定写在 `recipe.chartType`；每个 recipe 拥有自己的 strict schema
2. Source 只保存用户意图与显式内容，保持单一根 `data`；recipe 生成的 scaffold、semantic mark、默认 guides 与 recipe composition 只进入解析结果
3. Chart 负责精简的 `encodings`、`properties`、有序 `marks`、presentation、layout 与 Theme owner slices；Plot 负责 channels、marks、scales、guides、composition、lowering、provenance 与 locator
4. Point、Path、Interval 等 Plot mark 继续作为坐标系无关的下游能力；Chart recipe 可以生成一个或多个 semantic mark，但必须沿 Plot 正式 registry 与 lowering 主链消费
5. React、Vanilla、JSON 与 SSR 生成同一精确 Source，并通过应用选定的 chartType provider 与同一 resolver 主链解析，不建立框架旁路
6. 每个内建 chartType 使用包内 Definition 描述精确 schema、recipe Theme、semantic mark 与 Chart mark binding，由 concrete provider contribution 安装到当前 Core compile 边界；应用层自行维护动态 family / chartType catalog 与 JSON 路由，Chart 不提供第三方 recipe / chartType 注册入口
7. 以 Standard Surface 与 Layout 组合 Chart presentation，保持 Chart 外层与 Plot 内部的 identity、provenance、lineage、locator 和空间语义连续
8. 逐 family 记录稳定的图表目录与 capability gate；不能由现有 Plot 能力完整表达的 chartType 延期，不在 Chart 内建立旁路能力

固定执行链路为：

```text
unknown Source
  -> application-owned family / chartType route
  -> selected exact Source schema parse in the active provider boundary
  -> recipe Theme、slot 与 mark resolve
  -> semantic mark + authored Chart marks + explicit Plot fragment
  -> complete Plot result
  -> Standard presentation / Surface composition
  -> Core IR / Scene
```

## 2. 分类原则

### 2.1 family 面向用户发现

family 是文档、gallery、schema discovery 与 provider 路由的第一层。它不决定单一 primitive，也不取代 recipe 的精确 schema。v0.1 保留以下候选目录：

1. `point`：Scatter & Points
2. `line`：Line & Area
3. `bar`：Bar & Column

同一 family 可以拥有多个 chartType；一个 chartType 只能属于一个 family。family 目录承担源码与文档分类，具体 chartType 的 Definition 与 provider contribution 各自声明身份；应用层按已安装模块维护 discovery catalog，Chart runtime 只在当前 Core compile 边界汇合 active contributions

### 2.2 Mark 与 Coordinate 正交

Point、Path、Interval 是 Plot 的 mark 能力。Cartesian、Polar 或其它已注册 Coordinate 只改变投影环境，不另造 Chart family。具体 recipe 的默认 Coordinate、可替换 scaffold 与数据角色由对应 ADR 冻结

### 2.3 chartType 与 Pattern

只有当数据角色、semantic mark 组合或 transform 拓扑长期稳定时，名称才进入 chartType。只改变方向、堆叠、曲线、guide 可见性或主题的名称作为 Pattern，记录为某个 chartType 的配置，不扩大 chartType 目录

## 3. v0.1 family 与 chartType 目录

### 3.1 Point family：Scatter & Points

| chartType    | 核心 recipe                                       | 状态                                          |
| ------------ | ------------------------------------------------- | --------------------------------------------- |
| `scatter`    | 二维字段角色，生成一个 Point semantic mark        | 已实现                                        |
| `regression` | Point + 内建 smooth / regression transform + Path | planned，等待 transform output capability     |
| `ranged-dot` | 起止数值角色与端点 / 连接语义                     | planned，等待 row atomicity capability        |
| `strip`      | 分类位置、数据驱动 offset 与 Point                | planned，等待 Plot position-offset capability |

Point family 的 recipe 只把 `encodings` 用于字段绑定，把 `properties` 用于常量配置。Scatter 的 semantic mark 生成 Point；`recipe.marks` 只接受可选的 `scatter` Chart mark，并按 authored 顺序追加；Path 等其它 Plot mark 通过 `plotExtension.marks` 最后追加，且不继承 Chart slots

### 3.2 Line family：Line & Area

| chartType    | 核心 recipe                            | 状态            |
| ------------ | -------------------------------------- | --------------- |
| `line`       | Path 为主的有序趋势                    | alpha.2 planned |
| `area`       | Path 与不可撤销的基线 / 边界闭合       | alpha.2 planned |
| `range-area` | 必需 lower / upper 边界角色与闭合 Path | alpha.2 planned |

候选 Pattern 包括 sparkline、slope、smooth / step line、stacked area 与 streamgraph。Bump 等需要排名派生语义的名称不进入首轮目录

### 3.3 Bar family：Bar & Column

| chartType   | 核心 recipe                                 | 状态            |
| ----------- | ------------------------------------------- | --------------- |
| `bar`       | Interval 为主的类别—数值比较                | alpha.3 planned |
| `waterfall` | Interval 与不可撤销的区间派生语义           | alpha.3 planned |
| `gantt`     | 必需 start / end 时间角色与 Interval extent | alpha.3 planned |
| `bullet`    | Interval 与 Reference 的固定业务语义        | alpha.3 planned |

候选 Pattern 包括 stacked、grouped、horizontal、normalized bar 与 pyramid。需要专用 provider 或不稳定组合边界的名称暂不进入 v0.1

## 4. 长期能力边界

### 4.1 Source 与 recipe

所有 Chart Source 遵循以下 root layout：

```ts
type ChartThemeInput<TRecipeThemeTokens extends IRJsonObject> =
  | string
  | {
      base?: string;
      tokens?: {
        chart?: IRChartThemeOverrides;
        plot?: IRPlotThemeTokenOverrides;
        recipe?: TRecipeThemeTokens;
      };
    };

type ChartSource<TFamily extends string, TRecipe extends IRJsonObject, TRecipeThemeTokens extends IRJsonObject> = {
  namespace: 'chart';
  type: TFamily;
  id?: string;
  presentation?: IRChartPresentation;
  theme?: ChartThemeInput<TRecipeThemeTokens>;
  data: IRPlot['data'];
  layout?: z.infer<typeof ChartLayoutSchema>;
  recipe: TRecipe;
  plotExtension?: IRChartPlotExtension;
};
```

`TRecipe` 与 `TRecipeThemeTokens` 必须来自所选 recipe 的具名 strict schema，不是任意 JSON 对象。`type`、`recipe.chartType`、mark `kind` 与主题名是由应用选择或 active provider contribution 提供的命名 key；开放 key 不开放 payload。应用层先选择 family 与 recipe，随后由选定 schema 或当前 compile 边界的 active provider 对完整 Source 进行一次精确 parse。Chart runtime 不提供全局 catalog 或全局 parse/router。`encodings` 只接受字段名，`properties` 只接受常量；未知字段、family mismatch、未安装的 key 与没有合法 consumer 的 slot 必须在 owner 边界 fail-loud

### 4.2 Mark、Plot 与顺序

recipe 生成内建 semantic mark，并声明可用的 Chart mark binding、继承 slots 与 Plot scaffold。当前 Point family 只有 `scatter` Chart mark kind；mark 只继承 binding 明确声明的 encoding / property，显式 mark payload 覆盖继承值。Path 等非 Scatter 图元由作者通过 `plotExtension.marks` 显式添加

解析顺序固定为：recipe semantic mark → `recipe.marks` authored mark → `plotExtension.marks` explicit Plot marks。Chart mark 与 semantic mark 均沿 Plot 正式 mark schema、resolve、lowering、identity、provenance、lineage、locator 与 diagnostics 主链消费；显式 `plotExtension.marks` 独立于 Chart context

### 4.3 Theme、presentation 与 layout

Theme 是命名主题，或带可选 `base` 与 `tokens` 的 authored 对象。`tokens.chart` 属于 Chart canvas、padding 与 presentation，`tokens.plot` 交给 Plot owner，`tokens.recipe` 由当前 chartType Definition 的 recipe schema 拥有。Core mode 先选择完整 Chart fallback，Core style、named/base chain 与 inline slices 再按 owner 顺序级联；Chart 不复制 Plot 的 token、palette、resolver 或 lowering

presentation 固定按 `title → subtitle → plot → note → source` 组合，JSON 属性顺序、Vanilla 构造顺序与 React marker 顺序没有语义。`layout.width` / `layout.height` 是包含 shell、presentation、Plot 与间距的 Chart border-box allocation；不复制到 Plot intrinsic size，也不由 host viewport 反写 Source

### 4.4 扩展与 provider

内建 chartType 使用各自包内 Definition 与 concrete provider contribution；provider 在当前 Core compile 边界汇合 active contributions，建立临时 recipe registry 与精确 schema union，并沿同一 resolve 主链消费。应用层负责动态 family / chartType catalog、模块加载与 JSON 路由；Chart 不提供第三方 recipe / chartType 注册入口，也不提供全局 catalog 或全局 parse/router

## 5. Milestones

| Milestone          | 主题             | 当前目录                                                                                             | 状态   |
| ------------------ | ---------------- | ---------------------------------------------------------------------------------------------------- | ------ |
| chart v0.1-alpha.1 | Scatter & Points | `point`: `scatter` 已实现；其它 Point chartType、`regression`、`ranged-dot`、`strip` planned / gated | 进行中 |
| chart v0.1-alpha.2 | Line & Area      | `line`: `line`、`area`、`range-area` 与对应 Pattern                                                  | 待起草 |
| chart v0.1-alpha.3 | Bar & Column     | `bar`: `bar`、`waterfall`、`gantt`、`bullet` 与对应 Pattern                                          | 待起草 |

里程碑只冻结长期目标、依赖顺序与能力门槛。字段、默认值、允许覆盖范围与失败语义由对应 ADR 冻结；alpha.3 完成也不等于 v0.1 beta 或 RC

## 6. 依赖与版本关系

- **Plot**：提供 marks、channels、scales、guides、coordinates、composition、transform、开放 registry、theme ownership、provenance 与 locator
- **Data**：提供唯一根数据来源、字段模型、transform / statistics contract 与 lineage
- **Standard**：提供 Chart presentation、Surface、Layout 与领域无关组合能力
- **Core**：提供 renderer-neutral IR / Scene、provider dependency graph、namespace 与空间基础能力

Chart 只消费这些 owner 的公开能力；Plot、Standard 或 Core 缺少必要 capability 时，相关 chartType 进入 planned / gated，不在 Chart 内复制实现。Chart 发布组为 `@retikz/chart`、`@retikz/chart-react` 与 `@retikz/chart-vanilla`，三者按实际可消费的依赖版本 lockstep

## 7. v0.1 退出方向

v0.1 退出前至少需要确认：

1. 每个已发布 family 的已实现 chartType 都有精确 Source schema、recipe、semantic mark、mark contract、provider contribution 与三入口等价性
2. semantic mark、Chart mark 与显式 Plot fragment 的顺序、覆盖、继承、identity、provenance、lineage 与 locator 语义稳定
3. Theme 三个 owner slice、Core mode / style cascade、Chart presentation 与 border-box layout 能在同一 renderer-neutral 结果中闭环
4. 当前 compile 边界内已安装 chartType 的 provider contributions 走同一 provider / resolve path，重复 key、Definition 冲突、依赖缺失与未知引用都 fail-loud；应用层 catalog 只负责发现与路由，不成为 Chart runtime 的全局事实源
5. docs、示例与 schema discovery 只展示已实现 chartType；planned / gated 类型清楚标记边界，不以目录存在代替能力完成

这些条件不提前承诺 alpha.1 的完整退出；后续 family 必须在自己的 milestone ADR 中补充长期契约与 capability gate

## 8. ADR 约定

每个 milestone 的 ADR 只记录长期的 family / chartType 身份、Source schema、默认与失败语义、owner 边界、provider / adapter 责任和兼容性决策。执行计划、测试矩阵、临时状态与验证记录不进入 ADR 或 roadmap

能力进入实现前，必须确认 Chart、Plot、Data、Standard 与 Core 的归属及端到端闭环；任一 owner 能力不足时回到对应 owner 设计，不在 Chart 内建立平行机制
