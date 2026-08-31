# ADR-11：Chart encoding 字段映射计划

- 状态：Proposed
- 决策日期：2026-08-25
- 关联：[alpha.1 roadmap](./roadmap.md) · [Chart 总设计](../../../../../architecture/chart-design.md) · [Chart 封装完备设计](../../../../../architecture/chart-encapsulation-complete.md) · [Data 能力完备设计](../../../../../architecture/data-capability-complete.md) · [Plot 可视化完备设计](../../../../../architecture/plot-visualization-complete.md) · [ADR-09](./09-family-recipe-chart-schema.md) · [ADR-10](./10-chart-plot-declaration-authoring.md)
- 拟替代：本 ADR Accepted 后替代 ADR-10 中 `ChartFacet`、`recipe.facet` 以及“facet 不属于 encodings”的决定
- 保留：ADR-10 的 Plot 声明 owner、`PlotXxx` 命名、Plot canonical facet resolver 与低层 Plot 出口

## 背景与目标

Chart 原先把 `recipe.encodings` 的值限制为字段名字符串。它能表达最小 Scatter，却不能在字段映射位置说明 scale、聚合、字段派生或字段驱动 composition；常见意图因此被拆进 `plotExtension` 或独立 facet 结构，同一个字段事实出现多条 authoring 路径。

本 ADR 把 encoding 定义为**字段映射计划**：每个 exact slot 把已有字段或显式派生字段绑定给一个确定 consumer，并可携带该映射所需的 Data / Plot operation。Data 继续拥有字段、transform、statistics 与类型证据；Plot 继续拥有 channel、scale、facet、track、lowering、provenance、lineage 与 locator；Chart 只组合具体 chartType 的精确 slot、执行顺序与 consumer 连接。轨道服务共享轴与多 mark 结构，不属于当前单 mark Chart 的字段映射封装。

Flint Chart、Vega-Lite 与 Observable Plot 证明了字段映射可以诱导 transform 与 composition，但 Retikz 不采用通用宽 encoding union、函数 accessor、隐式 fold 或后端适配模型。Source 仍需 JSON-safe、chartType-specific、owner 单一，并沿 Chart → Plot 正式主链下沉。

## 决策：每个 chartType 使用精确 slot schema

不增加跨 chartType 的 `ChartEncoding`、`RawEncodingValue`、`ChartFieldType` 或包含所有可选字段的共享宽对象。每个 `XxxChartEncodingsSchema` 逐 slot 声明 shorthand、rich mapping、scale family、数组语义、composition 互斥与 consumer；公共原子只在多个真实 slot 共享完整语义和失败规则时提取。

字符串只表示单字段 direct shorthand。数组没有通用“多字段 encoding”语义；只有 row / column hierarchy或具体chartType明确拥有的tuple / series语义可以接受数组。Chart不因数组输入自动fold / unpivot，也不生成隐藏series字段。schema接受但当前scaffold、semantic mark、authored mark或composition没有消费的slot必须fail-loud。

### Scatter exact contract

当前Scatter冻结下列strict slot矩阵：

| slot           | required | mapping                                                                                | scale                      | consumer / 约束                    |
| -------------- | -------- | -------------------------------------------------------------------------------------- | -------------------------- | ---------------------------------- |
| `x`            | 是       | string、direct、aggregate、bindable `bin / normalize / jitter`或同能力custom operation | Plot position              | Point x；jitter只能作用x           |
| `y`            | 是       | string、direct、aggregate、bindable `bin / normalize / jitter`或同能力custom operation | Plot position              | Point y；jitter只能作用y           |
| `color`        | 否       | string、direct、aggregate                                                              | ordinal / continuous color | Point field-bound color            |
| `size`         | 否       | string、direct、aggregate、bindable `normalize`或同能力custom operation                | `sqrt`                     | 输出必须continuous                 |
| `opacity`      | 否       | string、direct、aggregate、bindable `normalize`或同能力custom operation                | `linear`                   | 输出必须continuous                 |
| `shape`        | 否       | string、direct                                                                         | 无named scale              | Point categorical shape palette    |
| `row / column` | 否       | string、Plot partition dimension或非空hierarchy                                        | 无                         | Plot facet partition；至少一个存在 |
| `facet`        | 否       | Plot facet options                                                                     | 无                         | 仅在row / column存在时合法         |

Scatter拒绝`series / detail / order / text`，因为当前recipe没有确定consumer。authored Scatter mark只接受`x / y / color / size / opacity / shape` direct override，不接受aggregate、derived transform或composition。

每个recipe Definition必须提供一个ordered `encodingSlots` contract。Scatter顺序固定为`x → y → color → size → opacity → shape → row → column → facet`；exact schema消费、unused检查、mark继承、aggregate `groupBy`与同阶段operation调度都使用该顺序。JSON属性顺序、Zod shape顺序和object spread不能成为第二权威。

### 开放 vocabulary 与闭合结构分离

registry-backed的transform / reducer / selector `kind`、scale / coordinate / mark `type`以及format / scheme / shape / theme name复用Foundation `OpenString<TKnown>`、`createOpenStringSchema(...)`或owner导出的开放schema。内置const object enum只提供常用authoring提示与内置Definition键，不封闭合法值全集。

开放discriminator不等于开放结构。Data / Plot继续使用“精确built-in schema union + JSON-safe external envelope”：external key排除built-in、reserved与removed值，避免字段不完整的built-in回退成custom config。形态合法的custom key可通过Source parse；Definition注册、完整config、output model、phase和consumer compatibility在owner resolve阶段fail-loud。exact slot名、composition `kind`、axis、field type与binding phase仍是闭合集合。

## 决策：字段事实与rich mapping保持单一真源

encoding `field`是非空字段名。字段`type`、format与分类order继续使用Data model的`IRDataFieldDefinition` / `DataFieldType`；省略model时由Data / Plot从rows推断。Chart不复制Flint的`quantitative / nominal / ordinal`别名，也不在mapping中重声明字段metadata。

rich mapping只组合owner契约：

```ts
type DirectMapping = { field: string; scale?: ScaleBinding };
type AggregateMapping = { aggregate: IRDataScalarReducerOperation; scale?: ScaleBinding };
type DerivedMapping = { transform: IRDataTransform; output: string; scale?: ScaleBinding };
type ScaleBinding = { operation: IRPlotScaleOperation } | { reference: string };
```

这些片段说明公开关系，不是第二个schema真源。Data拥有scalar reducer operation与开放transform schema；Plot拥有scale operation、partition scalar / dimension、facet options与完整arrangement schema；Chart直接组合owner runtime schema并从自己的strict schema派生具体Source类型。

React `XxxChart` prop、Vanilla factory input与手写JSON使用同一rich结构。Vanilla只展开`row / column`字符串shorthand，不读取data或registry改变mapping；React只桥接Vanilla input。runtime reducer / transform / scale Definition通过provider sidecar传递，不进入JSON Source，SSR与compile消费同一Source和sidecar。

## 决策：encoding只诱导输出明确的operation

mapping可以携带一个由该mapping诱导的aggregate或derived operation，但不接受任意`transform[]`。operation必须来自Data / Plot正式schema与Definition registry；Chart只选择当前slot允许的binding class，并把一个确定output绑定给consumer。

Data transform Definition公开：

- `outputModel`：`preserve`保留输入并增加/覆盖descriptor；`replace`列出operation后的完整字段集合
- `schedule`：声明binding class、闭合`DataTransformPhase`、field effect与可选output选择规则
- statistics `outputs`：声明scalar或multi-output reducer结果；compact aggregate只接受恰好一个完整scalar descriptor

Data pipeline逐步产出`{ rows, fieldTypes, fieldTypeEvidence }`。每一步先基于当前view解析input和output model，再执行operation并推进类型证据；Plot coordinate、scale、channel、guide、locator与lineage只读各自实际view。descriptor缺失的external operation仍可用于完整Plot transform，但不能进入type-dependent encoding transform。

多个aggregate mapping合并为一个summarize。每个`as`是对应consumer的字段；`groupBy`只包含summarize后仍被recipe-level direct role消费的字段，并按ordered `encodingSlots`筛选、去重。aggregate输入、临时字段、authored Chart mark与`plotExtension.marks`不能反向改变root aggregate粒度。

显式`plotExtension.transform`先执行，用于准备encoding输入；随后Chart-generated operation按Definition声明的闭合阶段执行：`row-shape → field-derive → row-order → cumulative-derive → field-adjust`，同阶段按ordered slot执行。custom `kind`不能自定义phase，later-stage output不能喂earlier-stage input。

内置常用能力包括scalar aggregate、position `bin`、`normalize`和单轴`jitter`；表内名称只是vocabulary，不是custom白名单。custom Definition具备同等output model、schedule与consumer type时走同一路径。`select / annotate / relate / density / smooth`等没有single-slot完整语义的operation继续属于完整Plot transform。

encoding jitter禁止`axis: 'both'`：x mapping只改x，y mapping只改y；双轴需要两个operation或完整`plotExtension.transform`。带composition grouping的bin在Plot提供正式grouped-bin contract前拒绝，Chart不补写owner operation没有声明的grouping或output。

一个Chart只生成一个共享encoding data view。root transform、encoding-derived operation、facet partition、semantic mark、authored Chart mark与`plotExtension.marks`都消费aggregate / derived后的rows；Chart不自动保留raw分支。raw + aggregate layering、mark-local独立数据视图或不同transform分支必须直接使用Plot正式能力。

## 决策：scale由Plot拥有，Chart只连接consumer

`scale.operation`把一个完整Plot operation作为唯一authored source写入`IRPlot.scales`一次，并把name写入对应consumer；`scale.reference`只引用已存在的named operation，不复制operation。

- x / y连接当前recipe coordinate role的position scale
- color连接field-bound color consumer，允许ordinal / continuous color family
- Point size当前只接受`sqrt`，opacity只接受`linear`
- shape没有named scale；scheme只存在于支持它的Plot color scale operation中

encoding operation替换同slot的recipe position fallback；无其它consumer的fallback移除，仍被引用时保留。省略scale才使用recipe / Plot type-driven fallback。recipe fallback中只有position role拥有稳定公开name：`__chart.<chartType>.scale.x / y`，且只能由所属slot引用。color / size / opacity的内部默认不是reference target；跨slot共享必须显式声明一个named operation，其它slot再reference。

scale `type`与scheme复用Plot开放schema；custom scale仍由Plot Definition `family`与`isFieldCompatible`判断。Chart不复制custom type白名单，也不因通用scale union扩大size、opacity或shape。重复name、多source、缺失reference、family / field type不兼容与悬空consumer都fail-loud，不设置last-wins。

## 决策：row、column与facet绑定Plot composition

`row / column`直接使用Plot partition dimension或字段名shorthand，`facet`只保存Plot facet options。只声明row或column即可生成facet；Chart用稳定recipe identity与当前有效的panel coordinate组装完整Plot facet configuration，再调用Plot canonical resolver。Source不保存可推导的arrangement id、template view或coordinate。

facet encoding拥有“按字段重复panel”的composition语义，`plotExtension.coordinate`拥有panel内部的投影语义，两者可以组合。recipe spatial scaffold可替换时，显式coordinate替代recipe coordinate并成为每个facet panel共享的coordinate template；省略时继续使用recipe coordinate。`plotExtension.composition`仍与facet encoding冲突，因为两者都声明root composition。不可替换的recipe spatial scaffold继续拒绝显式coordinate。

Chart的position role保持`x / y`，不因coordinate类型改变Source slot。Plot的`CoordinateDefinition`为operation提供统一的position scale binding contract：默认按role同名字段读写scale name，内置Polar把`x / y`别名映射到`angle / radius`，自定义coordinate可以为自己的operation shape提供同一hook。该hook属于Plot运行时Definition，不进入JSON IR；Chart与Plot lowering使用同一次编译边界安装的coordinate registry，不复制内置白名单。

```ts
type CoordinateScaleBinding<TCoordinateOperation> = {
  read: (operation: TCoordinateOperation) => Partial<Record<DimensionRole, string>>;
  bind: (operation: TCoordinateOperation, scaleNames: Partial<Record<DimensionRole, string>>) => TCoordinateOperation;
};

type CoordinateDefinition<TCoordinateOperation> = {
  schema: ZodType<TCoordinateOperation>;
  roles: ReadonlyArray<DimensionRole>;
  scaleBinding?: CoordinateScaleBinding<TCoordinateOperation>;
  resolve: (operation: TCoordinateOperation, context: CoordinateDefinitionResolveContext) => CoordinateResolution;
};
```

最终position scale binding按`recipe fallback < authored coordinate < encoding operation / reference`覆盖。省略显式binding时，Cartesian与Polar都继承同一组recipe scale identity、domain与padding；authored coordinate可以改绑到显式Plot scale；encoding rich mapping作为具体slot的最高优先级连接consumer。Definition hook必须保留operation其它配置，绑定后仍由自身schema与Plot resolver校验；缺失scale、重复来源或不兼容family继续由既有Plot路径fail-loud。

Scatter semantic mark只声明`x / y`位置consumer，因此替换coordinate必须按顺序声明恰好`x / y`两个roles。自定义coordinate可以使用任意operation字段名，但只有通过Definition hook表达同一`x / y`roles时才能用于Scatter；`u / v`、单role或额外必需role在Chart边界fail-loud。其它chartType若需要不同roles，必须由自己的exact recipe另行冻结，不能由Scatter自动猜测。

recipe-local identity统一使用`__chart.<chartType>.<target>`。Scatter facet arrangement固定为`__chart.scatter.composition.facet`并复用`__chart.scatter.view.main` template；Chart root `id`只限定最终Plot root，不改写这些recipe-local identity。

Chart不提供`track`或`trackOptions` encoding。轨道需要作者先声明稳定track identity，再把不同mark绑定到不同track，并显式决定共享坐标角色；这与按字段distinct value重复同一mark的facet语义不同。需要轨道的作者通过`plotExtension.composition`与`plotExtension.marks`直接使用Plot静态`Tracks`，Chart不生成动态轨道、不广播semantic mark，也不提供轨道locator包装。

## 公开契约、失败语义与迁移

Scatter的JSON、Vanilla与React exact Source可组合direct、aggregate、derived、scale以及facet；adapter不执行这些算法。Chart resolve沿一个长期顺序生成完整`IRPlot`：

```text
exact Chart Source
  -> authored Plot root transforms
  -> encoding-derived operations and final DataView
  -> field / scale / composition bindings
  -> recipe semantic marks and guides
  -> authored Chart mark inheritance / override
  -> explicit Plot marks
  -> Plot resolve / lowering / provenance / lineage / locator
```

breaking public surface：

- 删除Chart Source `recipe.facet`，迁移到`recipe.encodings.row / column / facet`
- 删除Chart React `ChartFacet` / `ChartFacetProps`及child collection识别
- 删除Chart Vanilla `InputChartFacet`、`normalizeChartFacet`与factory root `facet`
- public surface与Docs不保留deprecated export、alias、fallback或新旧双轨

现有字段名字符串无需迁移。`average`不新增为重复reducer；使用Data开放reducer operation。`quantitative / nominal / ordinal`不进入Chart；使用Data field model。通用`sortBy / sortOrder`与顶层scheme不进入宽mapping；使用具体chartType的order consumer与Plot scale operation。

以下情况必须在所属owner fail-loud：未知或未注册Definition、malformed built-in、空字段、strict model中不存在的字段、output descriptor / phase / consumer不兼容、later-stage dependency、重复operation或output、scale多source / reference / family冲突、facet依赖错误、普通slot数组、facet encoding与显式Plot composition并存、显式coordinate替换不可替换的recipe spatial scaffold、默认role字段不能承载scale binding且Definition未提供自定义hook、Scatter替换coordinate的roles不是恰好`x / y`，以及position scale没有合法coordinate role。Chart不维护第二套字段、scale、transform、coordinate或composition诊断。

## 实现结果与保留边界

当前实现已把Data output model与transform schedule、Chart exact mapping scheduler、React / Vanilla同形Source及旧facet surface删除接入同一端到端路径。Scene、lineage与locator在一次runtime请求内复用同一次lowering / data artifact；独立请求仍各自执行transform。

本ADR仍保持Proposed。非目标继续包括：万能encoding union、Scatter `series / detail / order / text`、隐式fold、多数据视图、Chart轨道封装以及尚无consumer的预防性slot。
