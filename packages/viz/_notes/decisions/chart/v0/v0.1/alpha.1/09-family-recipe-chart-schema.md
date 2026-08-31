# ADR-09：Chart family、recipe 与 mark Source IR

- 状态：Accepted（2026-08-22；2026-08-23 修订 Source 根字段命名、按 chartType 装配边界与 semantic mark override）
- 决策日期：2026-08-21
- 关联：[alpha.1 roadmap](./roadmap.md) · [Chart 总设计](../../../../../architecture/chart-design.md) · [Chart 封装完备设计](../../../../../architecture/chart-encapsulation-complete.md) · [ADR-01](./01-chart-infrastructure.md) · [ADR-02](./02-style-palette.md) · [ADR-03](./03-presentation-standard-layout.md)
- 替代：ADR-01 的封闭 recipe 目录与无 Chart registry 决策；ADR-02 的 `chartThemeTokens` / Plot theme 转发字段；ADR-03 的公开 Base Chart、可编排 presentation children 与旧 Source shell
- 保留：Chart 确定性 lower 到 Plot 正式主链、Vanilla 拥有 authoring normalize、React 复用 Vanilla、presentation 复用 Standard / Layout 的既有边界
- 重审：ADR-04～08 在接受或实现前必须改用本 ADR 的 family / chartType、精确 schema、semantic mark、Theme 与 Plot 出口契约

> **后续演进：** [ADR-12](./12-chart-react-declaration-authoring.md) 将高频 coordinate 选择从 `plotExtension.coordinate` 提升为 Chart 根级 `coordinate` 与公共 `ChartCoordinate` declaration。本文关于 Plot coordinate owner、recipe spatial replaceable、角色匹配与正式 Plot resolve 的约束继续有效；`plotExtension` 字段集合和 coordinate 来源位置以 ADR-12 为准。

## 背景与目标

现有 Chart Source IR 让根 `type` 同时承担用户分类、具体 recipe 身份与分发职责，并把具体图形配置放在 `config`。这会把所有 chart type 平铺到同一选择面，也无法用统一契约表达可注册 recipe、一个 recipe 生成多个 Plot mark、附加 mark 继承 Chart 数据角色，以及不同 recipe 的精确 Theme 默认。

Chart 需要保留用户视角的简洁输入，同时继续把所有实际绘图语义交给 Plot：人类、文档和 LLM 先按稳定 family 发现图表，再用全局唯一 `chartType` 选择精确 recipe；Source IR 只保存高层意图，recipe 生成的 scaffold、mark、guide 与 composition 只进入 resolved Plot，不写回 Source IR。

## 决策：根 shell 与 `recipe` envelope 分层

Chart 根只保存跨图表类型可复用的 shell；所有决定当前图形独特效果的内容集中在必填 `recipe` 字段。根 `type` 改为稳定 family，`recipe.chartType` 改为全局唯一 recipe key，并且每个 chartType 只能属于一个 family。

`recipe` 保持单独对象，不把 `chartType`、`encodings`、`properties` 与 `marks` 展开到根。这样根 `presentation`、`theme`、`data` 与 `layout` 可以不依赖具体图形复用，recipe payload 也能在选择 family 和 chartType 后整体切换为该 Definition 的精确 schema。多一层对象是有意的所有权边界，不是任意分组。

一级 family 目录只承担分类词汇与真实共享部分；每个具体 chartType 分别拥有最终 `XxxChartSchema`、recipe Definition、provider contribution 与 adapter。Chart 不定义 `PointChartSchema`、`PointChartProvider` 或其它 family 级宽 schema / provider，也不通过公开 `ChartFamilyDefinition` / `defineChartFamily()` 建立跨 family catalog。

每个 recipe 使用有序 `ChartMarkBinding` 单向声明允许的 mark 以及可继承的 encoding / property slot；mark Definition 只拥有唯一 kind、精确 payload schema 与到 Plot target 的解析能力。命名主题继续使用 `ChartThemeDefinition` / `defineChartTheme()`；recipe、mark Definition 带函数，Theme Definition 是声明式数据，它们都只存在于 runtime，不进入 JSON Source IR。

理由：

1. family 与 chartType 分离后，分类、发现和 LLM schema 路由不再与具体绘图实现耦合
2. recipe payload 聚合在 `recipe` 内，可以为每个 chartType 提供 strict 精确 schema，而不建立包含全部可选字段的宽 union
3. 一级 family 目录让源码和 LLM 应用的选择顺序沿 family → chartType 展开，但 schema 与 provider 仍由最终 chartType 独立拥有
4. recipe-local mark binding 让允许关系和继承规则只声明一次，同一 recipe 的 semantic / authored mark 共用解析、诊断和 lowering
5. semantic mark 把“一个 chartType”与“一个 Plot mark”解耦，允许多 mark recipe 稳定生成多个 mark
6. `plotExtension` 保持明确的低层出口，避免 Chart 继承规则污染直接声明的 Plot 内容

## 决策：一级 family owner 与内部公共目录

`@retikz/chart` 的源码以横向 family 为主要组织轴：`point`、`bar`、`line`、`relation` 等 family 直接位于 `src` 一级目录。family 根只拥有 key、分类常量、真实共享 schema / scaffold / mark 与 barrel；每个具体 chartType 子目录完整拥有自己的精确 recipe schema、recipe Theme、semantic mark、provider contribution 与测试。新增 chartType 不建立或修改 family 级 Source schema。

所有 family 都成立的 Chart shell、recipe / mark / Theme contract、已选 recipe resolve、Theme、Plot 组合与 Core provider 汇合机制进入内部 `_chart` owner。`_chart` 只合并当前 Core contribution 实际安装的 recipe 与主题，不维护全局 builtins、family catalog、LLM 路由或跨 family 自动发现。family 间只有出现真实稳定复用后才抽取原子，不因未来可能复用提前上移。

`_chart` 的通用模块不导入任何具体 family，`_assembly` 与内置组合根被删除。每个具体 chartType 创建只携带自身 recipe 的 provider contribution；同一 family 的多个 contribution 使用同一个 Core composite key，并只在当前 compile 边界合并为临时 recipe registry 与精确 schema union。该 union 是派生编译产物，不导出为 family schema，也不写回 Definition 或 Source IR。包根不转发具体 family；family 与 chartType 通过显式 package subpath 暴露。

## 基础数据结构与公开契约

所有具体 Chart 共享以下字段布局，但 `IRXxxChart` 必须由当前 chartType Definition 的最终 strict schema 派生；这个泛型结构不是接受任意 payload 的公共宽 schema。

```ts
type IRChartPresentation = {
  title?: IRTextBlock;
  subtitle?: IRTextBlock;
  note?: IRTextBlock;
  source?: IRTextBlock;
};

type IRChartThemeInput<TRecipeThemeTokens> =
  | string
  | {
      base?: string;
      tokens?: {
        chart?: IRChartThemeOverrides;
        plot?: IRPlotThemeTokenOverrides;
        recipe?: TRecipeThemeTokens;
      };
    };

type IRChartMark<TKind extends string, TPayload extends IRJsonObject> = {
  kind: TKind;
  override?: boolean;
} & TPayload;

type IRChartSource<
  TFamily extends string,
  TChartType extends string,
  TEncodings extends IRJsonObject,
  TProperties extends IRJsonObject,
  TMark extends IRJsonObject,
  TRecipeThemeTokens extends IRJsonObject,
> = {
  namespace: 'chart';
  type: TFamily;
  id?: string;
  presentation?: IRChartPresentation;
  theme?: IRChartThemeInput<TRecipeThemeTokens>;
  data: IRPlot['data'];
  layout?: {
    width?: number;
    height?: number;
  };
  recipe: {
    chartType: TChartType;
    encodings: TEncodings;
    properties?: TProperties;
    marks?: Array<TMark>;
  };
  plotExtension?: IRChartPlotExtension;
};
```

字段语义固定如下：

| 字段            | 语义                                                                |
| --------------- | ------------------------------------------------------------------- |
| `namespace`     | 固定为 `chart`，标识 Retikz Chart Source IR                         |
| `type`          | 稳定 family，只负责分类、发现与第一阶段 schema 路由                 |
| `id`            | 可选 Chart 身份，沿 Core 正式 identity / namespace 主链消费         |
| `presentation`  | 与 recipe 无关的 title、subtitle、note、source                      |
| `theme`         | 命名主题或 Chart shell、Plot、当前 recipe 的 authored token slice   |
| `data`          | 必填且唯一的数据来源，继续复用 Data / Plot 数据契约                 |
| `layout`        | 整张 Chart 的外部 width / height，不承载 Plot 内部 composition      |
| `recipe`        | 当前图形独有的 recipe identity、字段绑定、实例属性与附加 Chart mark |
| `plotExtension` | 可选的显式 Plot-owned fragment，不保存 recipe 展开结果              |

`recipe` 内部的 `chartType` 决定最终 recipe；`encodings` 是必填字段绑定；`properties` 是可选常量表现或行为；`marks` 是可选有序 Chart mark。alpha.1 当前实现的 Point family 使用 `type: 'point'`，具体 key 为 `scatter`；后续 chartType 仍需由各自 ADR 冻结语义，但不得改变既有 key 的 family 归属。

最小 Scatter Source IR 为：

```ts
{
  namespace: 'chart',
  type: 'point',
  data: { reference: 'penguins' },
  recipe: {
    chartType: 'scatter',
    encodings: {
      x: 'billLength',
      y: 'billDepth',
    },
  },
}
```

`type`、`chartType`、mark `kind` 与主题名使用开放字符串类型只表达分类或命名 key；开放 key 不开放 payload。unknown JSON 由应用先按 `type` 选择 family、再按 `recipe.chartType` 选择具体 `XxxChartSchema`，或者交给已显式安装对应 provider contribution 的 Core compile 入口 parse。Chart 不提供全局 `parseChartSource()`；未安装 chartType、重复 active recipe、family mismatch、未知字段与非法 payload 仍在具体 schema 或 provider 边界 fail-loud。

### Definition 最小内部契约

Definition 的内部边界在本 ADR 冻结如下。每个 recipe Definition 必须携带所属 chartType 的精确 Zod schema，最终公开 Source 类型直接由该 schema 推导；provider 汇合后，通用 runtime resolver 才把已经精确 parse 的 JSON-safe slice 擦除为 `IRJsonObject`。这种 runtime 擦除不允许放宽 Source schema，也不允许 resolver 再次 parse 已确定的 Source slice。

```ts
type ChartSlotConsumption = Readonly<{
  encodings: ReadonlyArray<string>;
  properties: ReadonlyArray<string>;
}>;

type ChartRecipeDefinition = Readonly<{
  chartType: string;
  schema: ZodType<IRChartSource>;
  theme: Readonly<{
    overridesSchema: ZodType<IRJsonObject>;
    resolutionSchema: ZodType<IRJsonObject>;
    fallback: IRJsonObject;
  }>;
  consumes: ChartSlotConsumption;
  marks: ReadonlyArray<ChartMarkBinding>;
  resolve: (context: ChartRecipeResolveContext) => ChartRecipeResolution;
}>;

type ChartRecipeResolveContext = Readonly<{
  id?: string;
  data: IRChartSource['data'];
  encodings: IRJsonObject;
  properties: IRJsonObject;
  recipeThemeTokens: IRJsonObject;
}>;

type ChartRecipeResolution = Readonly<{
  scaffold: Readonly<{
    transform?: ReadonlyArray<IRPlotTransform>;
    scales: ReadonlyArray<Readonly<{ value: IRPlotScaleOperation; replaceable: boolean }>>;
    spatial: Readonly<
      | { coordinate: IRPlotCoordinateOperation; replaceable: boolean }
      | { composition: NonNullable<IRPlot['composition']>; replaceable: boolean }
    >;
    guides?: Readonly<{ value: ReadonlyArray<IRPlotGuide>; replaceable: boolean }>;
  }>;
  semanticMarks: NonEmptyReadonlyArray<
    Readonly<{
      kind: string;
      plotMarks: NonEmptyReadonlyArray<IRPlotMarkOperation>;
    }>
  >;
}>;

type ChartMarkDefinition = Readonly<{
  kind: string;
  schema: ZodType<IRJsonObject>;
  resolve: (context: ChartMarkResolveContext) => ChartMarkResolution;
}>;

type ChartMarkBinding = Readonly<{
  definition: ChartMarkDefinition;
  inherit: Readonly<{
    encodings?: ReadonlyArray<string>;
    properties?: ReadonlyArray<string>;
  }>;
}>;

type ChartMarkResolveContext = Readonly<{
  chartType: string;
  source: IRChartMark;
  inherited: Readonly<{
    encodings: IRJsonObject;
    properties: IRJsonObject;
  }>;
  recipeThemeTokens: IRJsonObject;
}>;

type ChartMarkResolution = Readonly<{
  marks: NonEmptyReadonlyArray<IRPlotMarkOperation>;
}>;

type ChartThemeDefinition = Readonly<{
  name: string;
  base?: string;
  tokens?: Readonly<{
    chart?: IRChartThemeOverrides;
    plot?: IRPlotThemeTokenOverrides;
    recipes?: Readonly<Record<string, IRJsonObject>>;
  }>;
}>;
```

Chart shell Theme 另外拥有一对固定 schema：`ChartThemeOverridesSchema` 描述 Source / Definition 可写的稀疏 `tokens.chart`，`ChartThemeResolutionSchema` 描述 presentation 与 Surface 实际消费的完整 token map。Chart 必须为每个 Core `ThemeMode` 提供一份显式、完整且经 resolution schema 校验的 fallback；不得通过 resolution schema default 隐式补 token。Chart shell 不拥有 categorical palette，不复制 Core 或 Plot 色板；需要 shared color 时只从当前 `ResolvedTheme.colors` 映射。

family → chartType 关系由目录、具体 schema 的 `type` literal 与应用层选择共同表达，不再保存为公共 runtime Definition。具体 chartType provider contribution 显式携带 family 与 recipe；provider 汇合必须拒绝空 family、同一 active family 下不同 Definition 使用相同 chartType，以及 recipe schema 的 family / chartType literal 不匹配。LLM、schema registry 或编辑器需要的 family / chartType 索引由应用按已安装模块自行维护，不进入 Chart runtime 或 Source IR。

`ChartRecipeDefinition` 是 chartType、精确 Source schema、recipe Theme 与 semantic mark 的唯一真源。`schema` 直接引用具体 chartType 子目录定义的最终 strict `XxxChartSchema`；chartType provider 与 Core compile 消费同一个 schema，不再从 encodings、properties、mark 或 Theme schema 碎片重建第二份 Source schema。`theme.overridesSchema` 可以是没有字段的 strict schema，但不能省略；`theme.resolutionSchema` 描述 resolver 实际消费的完整 token map，`theme.fallback` 是它唯一的最低默认来源，并在 provider 汇合时由 resolution schema parse；resolution schema 只验证完整性，不通过 schema default 隐式补 token，所有必需默认都必须显式存在于 fallback。

`consumes` 显式声明 recipe resolver 自身会读取的根级 encoding / property slot，不能从 schema 全部字段自动推导；provider 汇合拒绝空名称和同一 owner 内的重复名称。recipe-local mark binding 的继承 slot 只在 Source 实际包含该 kind 的 authored mark 时成为 active consumer。Source 中任一 slot 若既不在 recipe `consumes` 中，也没有当前 authored mark 的 active binding 消费，必须定位到该 slot 并 fail-loud。

recipe 的 `resolve` 只接收已经按最终精确 schema parse 的 recipe-owned encodings / properties、根 data / identity，以及已经完成 fallback / named / inline cascade 的 recipe token；它看不到 presentation、layout 或显式 `plotExtension` fragment，也不读取 adapter、DOM 或 renderer 状态。它输出 Plot-owned scaffold 与一个或多个内建 semantic mark 组；scale 和 spatial / guide 的 `replaceable` 是显式 Plot fragment 能否替换 recipe scaffold 的唯一依据。每个 semantic mark 组以 Chart mark `kind` 标识，并包含一个非空、有序 `plotMarks` 序列；同一 recipe 的内建组 `kind` 必须唯一。一个组可以原子地生成多个 Plot mark，不把一个 Chart mark 约束为单个 Plot mark。

`ChartMarkDefinition.schema` 是包含 `kind` 与可选 `override` 的完整 strict mark schema，Definition 本身不认识任何 family 或 chartType。`override` 省略时不由 schema 物化 `false`，以保持 Source IR 只保存 authored intent；resolver 将省略与 `false` 视为追加，将 `true` 视为按 `kind` 覆盖 recipe 内建 semantic mark 组。recipe 的有序 `marks` 是允许关系与继承规则的唯一真源；同一 recipe 内的 binding kind 必须唯一。Chart resolver 从当前 recipe binding 按 properties → encodings 的既定优先级构造 inherited context，没有列出的值不会进入 mark context。mark 自身 payload 在 mark resolver 内高于所有 inherited values；mark 显式 properties 可以覆盖继承的同目标 encoding，mark 自身同时声明 property 与 encoding 时仍由 encoding 胜出。resolver 只能输出一个非空、有序 Plot mark 列表，不能改写 recipe scaffold、data、Theme 或 presentation。

authored mark 的覆盖目标是完整 semantic mark 组，不是某个已生成 Plot mark 的数组下标或 `type`。`override: true` 命中同 kind 内建组时，解析后的 authored mark 输出在原位置整体替换该组的 `plotMarks`；没有命中时仍按 authored 顺序作为附加组生成，并通过 Core 正式 compile warning 通道报告 `CHART_MARK_OVERRIDE_TARGET_NOT_FOUND`。同一 Source 对同一 kind 声明多个 `override: true` 必须 fail-loud，避免隐式 first-wins、last-wins 或跨 payload 合并。覆盖只改变 semantic mark 组，不改变 scaffold、data、Theme、presentation 或 `plotExtension`。

Core 的 layout-aware composite compile context 必须提供领域中立的结构化 warning 入口，由当前 composite occurrence 补全 Source path 并进入既有 `CompileWarning` / `onWarn`、layout probe 与 replay 事务。Chart 拥有上述 Chart warning code 与消息，Core 只拥有传输、定位和生命周期；不得使用 `console.warn` 或建立 Chart 私有诊断队列。

```ts
type LayoutCompositeCompileContext = Readonly<{
  warn: (code: CompileWarningCodeValue, message: string, subPath?: string) => void;
}>;

const ChartWarningCode = {
  MarkOverrideTargetNotFound: 'CHART_MARK_OVERRIDE_TARGET_NOT_FOUND',
} as const;
```

`ChartWarningCode` 作为公开 const object enum 从 Chart 包根导出，供 compile warning 消费方稳定判断；开放的 Core warning code 类型继续接受该领域 code，不把它复制进 `CompileWarningCode`。`subPath` 是相对当前 composite Source occurrence 的可选 jq-like 路径；Core 负责与当前路径组合，Chart 对未命中的 mark 传入 `recipe.marks[index].override`。warning 只在对应 compile 结果提交时对调用方可见，失败或丢弃的 probe 不得泄漏，replay 不得重复报告同一 warning。

alpha.1 的 Point family 当前只内置 `scatter` Chart mark kind，并下沉为 Plot Point mark。它的 Source payload 使用可选的精确 `encodings` / `properties` slice，省略的 slot 才从当前 recipe 的 Chart context 继承，显式 mark slice 覆盖继承结果。mark encoding 仍只接受字段绑定，mark property 仍只接受常量；下沉前缺少目标 Plot mark 必需的位置角色必须 fail-loud。当前 Scatter 的内建 semantic mark 组使用 `kind: 'scatter'` 并生成一个 Point；authored `recipe.marks` 默认按数组顺序追加，`override: true` 时按上述通用契约替换该组。React 的 `ScatterMark` 是该 Source mark 的 marker，Vanilla 使用同形 plain mark input。作者需要 Path 等非 Scatter 图元时使用独立的 `plotExtension.marks`，不得通过 Scatter 的 Chart context 隐式继承。

`ChartThemeDefinition` 是声明式 JSON-safe Definition，没有 resolve 回调；`base` 指向另一个已安装主题，`tokens.recipes` 按 chartType 保存专有 slice。当前 provider 汇合只诊断未知 base、继承环、重复 name、非法 Chart / Plot slice，以及当前 active recipe 的非法 token slice；没有全局 catalog 时不能把未激活的 recipe key 判断为未知，它们由安装该 chartType 的应用或后续 active provider 校验。inline `tokens.recipe` 始终由当前 recipe overrides schema 精确 parse。`tokens.plot` 直接复用 `IRPlotThemeTokenOverrides`，不复制 Plot Theme schema。

Core effective Theme 与 Chart Source theme 的选择和级联固定如下：

1. Chart shell 从当前 Core `mode` 对应的完整内建 fallback 开始；recipe 从 Definition 的 `theme.fallback` 开始；Plot 仍由 Plot owner 从同一个 Core effective Theme 建立自己的 baseline
2. 若 Core effective Theme 含 `style`，Chart registry 必须存在同名 `ChartThemeDefinition`；先按其 `base` 链从祖先到当前项应用三个 owner slice，未注册时在 Chart Theme resolve 边界 fail-loud，不能静默退回 Neutral
3. Source `theme` 为字符串时，再应用该命名主题的完整 base chain；为对象时先应用 `base` 的完整 chain，再应用 inline `tokens`；若它与 Core style 指向同一 definition，同一 chain 只应用一次
4. 每个 slice 内按定义顺序以顶层 token key 原子覆盖，数组、对象和 scalar 都整体替换；Chart shell 与 recipe 合并后分别由其完整 resolution schema parse 一次
5. Chart 得到的 Plot slice 作为 Plot owner 的 authored token 输入，顺序位于 Plot 自己的 Core style baseline 之后、显式 `plotExtension` fragment 之前；Chart 不解析或复制 Plot baseline

因此 Chart shell 的完整顺序是 `mode fallback → Core style theme chain → authored named/base chain → inline tokens.chart`；recipe 的完整顺序是 `recipe fallback → Core style theme chain → authored named/base chain → inline tokens.recipe`。省略 Source `theme` 不等于忽略 Core style：存在 style 时仍消费同名 Chart definition；`mode` 永远选择 fallback，style 只叠加稀疏 owner slices。

最终 Source schema 由具体 chartType owner 使用公共 strict root shell、当前 recipe 的 strict `encodings / properties / recipe theme` schema，以及 recipe-local mark schema 判别 union 组合，并直接写入对应 `ChartRecipeDefinition.schema`。family 根不组合第二份 `XxxFamilyChartSchema`；应用选择的具体 schema 或 Core 从 active contribution 派生的临时 union 对完整对象精确 parse 一次。

### 按 chartType 安装与通用消费入口

每个具体 chartType 暴露一个只携带自身 recipe Definition 的 Core dependency provider。相同 family 的 provider 使用同一个 `chart.<family>` composite key；Core 合并当前 Scene 实际贡献的 provider datasets 后，`_chart` 才建立该 family 的 active recipe registry、临时 schema union 与有序主题集合。重复使用同一 Definition 必须幂等，不同 Definition 争用同一 chartType 必须 fail-loud。

`_chart` 的 provider 与 resolver 不导入 Point 或其它具体 family，也不维护默认 builtins。具体 Vanilla factory 只安装对应 chartType provider；具体 React component 复用该 Vanilla factory。因而只使用 Scatter 不要求安装未使用的其它 chartType，同时一个 Scene 内多个 Point chartType 仍可在相同 Core key 下汇合并编译。

Chart 不再公开 generic `createChart()`、`normalizeChart()`、`<Chart source>`、`ChartRuntimeOptions.familyDefinitions` 或动态 `parseChartSource()`。Vanilla / React 仍共享内部 authoring adapter 与 compile session，但公开入口是 `createScatterChart()`、`<ScatterChart>` 等具体 chartType API。命名主题以 `themeDefinitions` 传入具体 chartType provider；应用层 family / chartType 路由、动态 JSON 调度与 schema catalog 不属于 Chart runtime。

`encodings` 只保存当前 recipe 声明的 field-bound 数据角色，不接受常量；`properties` 只保存当前实例的常量表现或行为，不接受字段绑定。共享原子 schema 只按稳定语义、不变量和真实复用边界提取，每个 `XxxChartEncodingsSchema`、`XxxChartPropertiesSchema` 与 recipe Theme schema 仍保持精确、闭合。源于 Plot 且语义和值域完全一致的原子直接复用 Plot owner。

recipe 解析结果包含 shared scaffold 与按唯一 `kind` 标识的 built-in semantic mark 组。每个组可以按稳定顺序生成一个或多个 Plot mark。`recipe.marks` 是有序的 Chart mark，每项以 `kind` 选择当前 recipe binding 中的精确 Definition；它只继承 binding 声明可消费的 encoding / property slot，mark 自身显式 payload 覆盖自己的继承结果。默认 authored mark 作为附加组，`override: true` 则按 kind 原位替换内建组；生成的所有 Plot mark 继续进入 Plot 正式 schema、resolve、lowering、identity、provenance、lineage、locator 与 diagnostics 主链。

### 显式 `plotExtension` fragment 的组合语义

`plotExtension` 只保存用户显式声明的 Plot-owned fragment，字段集合固定为 `transform / scales / plotThemeTokens / plotThemeTokenRules / plotTheme / coordinate / composition / marks / guides / meta`；它不允许重新声明 `namespace / type / id / data / width / height`。Chart 按下表构造唯一完整 `IRPlot`，构造后必须再经过 Plot 正式 schema 与 resolve，不能把 fragment 当作无约束对象 spread：

| Plot 字段                    | 与 recipe / Chart 结果的组合语义                                                                                                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `transform`                  | authored transforms 保持数组顺序，先于 recipe-required transforms 执行；这是 Chart 数据进入 recipe 前的显式预处理，不提供隐式 post-recipe 阶段                                                               |
| `scales`                     | 先保留 recipe scale 顺序；同名 authored scale 仅在对应 recipe scale `replaceable: true` 时整体替换，否则 fail-loud；新名字按 authored 顺序追加                                                               |
| `coordinate` / `composition` | fragment 内二者互斥；只有 recipe spatial 声明 `replaceable: true` 才能整体替换，否则 fail-loud；省略时使用 recipe spatial                                                                                    |
| `guides`                     | authored `guides` 是整体替换，`[]` 表示明确关闭；只有 recipe guides 声明 `replaceable: true` 才允许替换，否则 fail-loud                                                                                      |
| `marks`                      | 先按 recipe 顺序保留 built-in semantic mark 组并应用命中的 authored override，再按 authored 顺序追加普通或未命中的 Chart mark，最后追加 `plotExtension.marks`；Plot extension 完全独立且不继承 Chart context |
| `meta`                       | 只保留 authored user meta；recipe provenance、lineage 与 diagnostics 使用正式内部结构，不混入同一自由 metadata bag                                                                                           |
| Plot Theme                   | Core / Plot style baseline → named Chart Theme `tokens.plot` → inline Chart Theme `tokens.plot` → `plotExtension.plotThemeTokens` → `plotExtension.plotThemeTokenRules` → `plotExtension.plotTheme`          |

完整 Plot 的 `data` 始终取 Chart 根 `data`；Chart resolver 不为 Plot 根默认注入 `id`，避免在 Core 中无必要地创建 identity 相关模型状态；显式 Plot mark 的身份仍由 Plot 正式契约决定。直接写入 `plotExtension.marks` 的内容与 built-in semantic mark、`recipe.marks` 相互独立，不继承 Chart encodings / properties。完全需要底层控制时直接使用 Plot，不提供公开 `type: 'base'` Chart。

### `layout.width / height` 的尺寸契约

`layout.width` 与 `layout.height` 是 Chart 最外层 Standard Surface border-box 在对应轴上的 exact allocation，包含 shell padding、title / subtitle / note / source、各 slot 间距与 Plot；它们不是 Plot intrinsic size，也不是 renderer host viewport。每个值必须是有限正数；两个轴可以独立省略，省略轴使用 natural intrinsic allocation，不做隐式纵横比联动。

在 exact 轴上，Surface 先扣除 shell padding，presentation Flex 再为固定文字 slot 与间距分配空间，Plot 接收剩余 exact slot；空间不足必须由 Standard / Layout owner fail-loud，不裁剪成负值或静默回退默认尺寸。两个轴都省略时，natural allocation 由 Plot intrinsic fallback 加 presentation 与 shell spacing 得出。React 容器、SVG viewport、Canvas backing store 等 host 尺寸属于 adapter / renderer options，必须与 Source `layout` 分开暴露，不能因为 host 恰好给了 width / height 就改写 Source IR。

Plot 正式主链使用 layout-aware composite：先以 `IRPlot.width / height`、`LowerPlotsOptions.width / height` 与内建默认确定 intrinsic size，再让父级 exact / range proposal 按轴确定最终 lowering 尺寸。Chart 的 Surface / Flex 因而可以把扣除 presentation 后的 Plot slot 作为 proposal 传入，同一尺寸同时驱动 Plot 几何、allocation bounds 与 replay；`layout.width / height` 不复制到 `IRPlot.width / height`，Chart 也不预估文本尺寸。

Theme 分为三个 owner slice：`tokens.chart` 只控制所有 Chart 共用的 canvas、padding 与 presentation；`tokens.plot` 直接交给 Plot owner；`tokens.recipe` 由当前 recipe Definition 的 `theme.overridesSchema` / `theme.resolutionSchema` 拥有。注册主题可以同时提供多个可选 recipe slice；当前 chartType 在 Core style chain 与 authored named chain 中都没有对应 slice 时只使用该 Definition 的 `theme.fallback`，不构成错误。省略 `theme` 时仍消费当前 Core effective Theme 的 mode 与可选同名 style definition，并使用 Chart shell、Plot 与 recipe 各自的 fallback；对象形式必须至少提供 `base` 或一个非空 token slice。主题只提供表现默认，不能改变 family、数据角色或 recipe 结构不变量。

## 最终实现结果与遗留边界

最终实现采用一级 family 分类与具体 chartType owner：`point` 只拥有分类词汇、真实共享 schema / scaffold / marks 与 barrel；每个具体 chartType 分别拥有精确 schema、recipe、provider contribution 与 adapter。当前 Point family 仅闭环 Scatter。`_chart` 只承载跨 family 的 Source shell、Definition contract、active provider registry、selected-recipe resolve、Theme、Plot 组合与 Core composite 机制，不维护全局 catalog 或导入具体 family。

后续 Bar、Line、Relation 等 family 按同样规则建立一级分类目录，再由各 chartType 子目录闭合 schema、recipe、provider 与 adapter / docs；不建立 `BarChartSchema`、`LineChartProvider` 等 family 级宽入口。多 Chart composition、可编排 presentation 顺序与应用层 LLM / JSON catalog 仍需独立决策。

## 行为、失败语义与兼容性

- 默认行为：built-in semantic mark 的单个目标 slot 按 `theme.fallback` → Core style theme chain → authored named/base chain → inline theme → properties → encodings 解析；authored Chart mark 按 mark schema default → resolved recipe theme → inherited properties → inherited encodings → mark 显式 properties → mark 显式 encodings 解析。mark 显式内容整体高于 inherited values，同一显式目标中仍由 encoding 胜出；不存在覆盖整张 Chart 的无约束全局 spread
- 默认行为：recipe 内建组按 recipe 声明顺序生成；`recipe.marks` 省略 `override` 或为 `false` 时按数组顺序追加，为 `true` 时按唯一 kind 原位替换内建组。未命中的 override 仍追加并产生 compile warning；`plotExtension.marks` 再按 Plot 声明顺序作为独立内容进入 Plot。facet / track 由 composition owner 消费，不作为同名属性广播给普通 mark
- 默认行为：presentation 固定按 `title → subtitle → plot → note → source` 生成。JSON 属性顺序、Vanilla 对象构造顺序和 React marker 顺序没有语义；缺失项省略，每类内容至多一个
- 默认行为：LLM 与 schema registry 可以先列出 family，再列出应用已安装的 chartType，最后只展开所选具体 `XxxChartSchema`；该索引由应用维护，不由 Chart runtime 全局枚举
- 失败与诊断：未安装 chartType、active recipe 冲突、family mismatch、未知 mark / theme、重复 semantic mark kind、同 kind 重复 `override: true`、constant encoding、field-bound property、无 consumer 字段、当前 recipe 的未知 token、空主题对象、非法 Plot fragment 与 Definition 依赖缺失必须在各自 owner 边界 fail-loud，并把 path 指向用户可修改的 Source 字段；未找到 override 目标不是错误，必须追加该 mark 并通过 Core `onWarn` 报告
- 失败与诊断：`false`、`0`、空数组与空字符串是否有效由权威 schema 决定；resolver 不使用 truthy fallback，也不静默忽略 schema 已接受但没有合法 consumer 的字段
- 兼容性 / breaking：直接删除根 `type = chartType`、旧 `config`、根 `width` / `height`、`chartThemeTokens` / `plotThemeTokens` 转发字段、公开 Base Chart、旧 presentation children / position 和静态封闭 recipe 分发。不保留 alias、fallback、migration、自动猜测或新旧双轨
- 兼容性 / breaking：ADR-01 只继续保留 Chart lower 到 Plot 正式主链的原则；ADR-02 的 Proposed Theme 输入由本 ADR 完整替代；ADR-03 只继续保留 Source / Vanilla Input / React 边界和 Standard presentation lowering。ADR-04～08 的具体图表语义不在此处重新裁决，但其旧 Source shape 与配置标记必须在接受前重写
- React / Vanilla 等价性：具体 factory 或组件从入口身份推断 family 与 chartType；Vanilla normalize 仍只把 typed Input 组装为精确 Source IR，React 仍映射到同一 Vanilla Input。具体 JSON schema、Vanilla 与 React 的等价输入必须生成相同 Source IR，并进入同一 active provider / resolver
- 兼容性 / breaking：删除 `_assembly`、family Definition / catalog、generic Chart parse / authoring API 与 runtime family 注入，不保留 alias、fallback 或双轨；完全动态的 family / chartType 选择由应用层承担，复杂自定义图形直接使用 Plot
