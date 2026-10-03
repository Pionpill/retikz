---
description: Data 分离变换语义与执行实现，支持三种执行模式及函数、宿主根节点、单个 Transform 的配置覆盖
keywords: Data、transform、Definition、executor、outputModel、statistics、外部计算、结果接入、hybrid、Promise、dataExecution
---

# ADR-002：分离数据变换契约与执行实现

- 状态：Accepted
- 决策日期：2026-10-02
- 关联：[data v0 roadmap](../roadmap.md) · [Data 设计](../../../../architecture/data-design.md) · [Data 能力边界](../../../../architecture/data-capability-complete.md)
- 前置：[Data v0.2 ADR-001](./001-shared-transforms.md)
- 宿主自动接入前置：[Kernel ADR-047](../../../../../../kernel/_notes/decisions/v0/v0.5/047-async-authoring-preparation.md)，共享异步作者输入准备
- 实例结果接入：[Kernel ADR-048](../../../../../../kernel/_notes/decisions/v0/v0.5/048-composite-runtime-input.md)，运行时视图绑定真实 Source 位置，嵌套及生成子项显式转交，不重复执行变换
- 修订：ADR-001 中 Definition 同时拥有计算的契约，以及 [Data v0.1 ADR-002](../v0.1/002-shared-provider-boundary.md) 的统计 Definition 执行绑定；其能力归属继续有效

## 背景与目标

Data 已统一拥有行数据变换，但 `TransformDefinition` 仍强制携带本地 `apply`。字段依赖和输出模型推导也依赖混有 provenance helper 与计算实现的 context。第三方引擎因此无法只依据声明理解、检查并执行变换。

目标是让 Data 声明“需要得到什么数据”，由独立实现负责计算。Data 同时提供默认本地实现；外部引擎可以根据相同契约返回行数、字段集合和字段类型均发生变化的结果。两条路径最终接入同一 `DataView`，不改变数据模型和可选溯源的职责。

## 决策：语义 Definition、执行器和结果接入分离

`@retikz/data` 拥有 operation schema、默认值、字段依赖、输出模型、统计方法及顺序、缺失值和失败语义。运行时 Definition 描述这些语义，不持有 `apply`、`reduce`、`select` 或 `fit` 等计算回调。

内置与外部实现消费同一语义解析结果。Data 在执行前解析全部 operation 与统计依赖，逐步推导输出模型，再按显式执行模式为每个阶段选择可用实现，并检查整个执行链的结果交接能力。外部 adapter 负责目标引擎的查询生成、调用及结果转换，不重新定义 Data operation。数据源绑定、权限和缓存由应用负责；使用宿主自动准备入口时，由共享 Vanilla processing 管理准备任务与当前输入 revision 的对应关系，应用仍负责底层网络取消和连接资源。

所有能力从 `@retikz/data` 根入口导出，不增加 transform 子路径。内置与自定义变换使用相同的 Definition、registry、语义解析、执行能力检查和结果接入机制。

## 基础数据结构与公开契约

### 语义与实现

`IRDataTransform` 继续使用 `{ kind, ...config }`，十二种内置 operation 的配置与默认值保持现有契约。Definition 和执行器都是运行时对象，不进入 JSON IR。

宿主的 transform 声明使用 `IRDataTransformDeclaration`，将 operation 与执行配置分离；operation schema 不接收执行配置。Plot、Chart、Table 根节点及单个声明复用 Data 拥有的 `dataExecution` 契约，运行时 provider 由名称引用，不进入 IR。

```ts
/** 可继承的执行配置；默认只在完整继承后应用 */
type IRDataExecution = Readonly<{
  mode?: 'builtin' | 'external' | 'hybrid';
  external?: string;
}>;

/** 一条数据变换声明；执行选择不改变计算参数 */
type IRDataTransformDeclaration = Readonly<{
  operation: IRDataTransform;
  dataExecution?: IRDataExecution;
}>;
```

`TransformDefinition` 保留 operation schema、`inputFields`、`outputModel` 和可选 `schedule`；增加纯语义 `validate` 与 `dependencies` 回调。`validate` 校验输入模型和参数的领域不变量；`dependencies` 完整声明当前 operation 使用的 reducer、selector 和 regression operation。没有额外校验或统计依赖时分别省略。Definition 不读取行数据、不调用引擎、不访问计算实现。

`TransformSemanticContext` 只提供当前阶段字段模型及 reducer、selector、regression 的语义 registries。统计依赖通过各自 Definition 的精确 schema 解析，执行器收到的依赖保留类别、参数和对应语义 Definition；未知依赖在执行前失败。不得通过某个顶层 transform 已被支持，推断其全部自定义统计方法也被支持。

`outputModel` 必须完整描述 `preserve` 或 `replace` 的字段影响，不再返回 `undefined`；派生字段名从它投影，不单独维护 `outputFields`。`DataTransformOutputDescriptor.type` 保留固定测量类型与 `{ from: field }`，并允许省略：省略表示字段存在，但没有测量类型证据。引用字段必须存在；被引用字段没有类型证据时不得生成证据。

preserve 保留未覆盖字段的分类 order；`{ from: field }` 同时沿用来源字段适用的分类 order。固定类型或未定类型的派生字段不继承被覆盖字段的 order，没有 order 的新分类字段继续使用 appearance 语义。

相同拆分适用于统计子算子：

| 语义 Definition               | 保留的契约                                                | 独立本地实现                             |
| ----------------------------- | --------------------------------------------------------- | ---------------------------------------- |
| `StatisticsReducerDefinition` | schema、输入字段、完整 outputs                            | `StatisticsReducerImplementation.reduce` |
| `RowSelectorDefinition`       | schema、输入字段、选择及排名语义                          | `RowSelectorImplementation.select`       |
| `RegressionDefinition`        | schema、方法语义、预测域约束                              | `RegressionImplementation.fit`           |
| `TransformDefinition`         | schema、输入字段、输出模型、依赖、领域校验、可选 schedule | `TransformImplementation.apply`          |

reducer 的 outputs 必须声明全部字段；数组或其它非标量结果可以不声明测量类型。例如 `extent` 仍返回数组，不能标为 continuous，也不能因无法表达其类型而清空其它已证明字段的类型。

本地 Implementation 引用一个语义 Definition，使用其解析后的参数，不拥有第二份 schema 或默认值。`defineTransformImplementation`、`defineStatisticsReducerImplementation`、`defineRowSelectorImplementation` 和 `defineRegressionImplementation` 保持 Definition 与回调的泛型关联。既有 `defineXxx` 入口用于语义 Definition。

`apply`、`reduce`、`select` 和 `fit` 的通用计算契约允许返回结果或 `Promise<结果>`。通用异步入口等待当前阶段及其统计依赖完成后再推进下一阶段；纯语义 callbacks 保持同步。本地同步便捷入口的类型只接受同步实现，不能接收可能返回 Promise 的回调，也不运行后才发现 Promise 再重试；Data 内置实现保持同步。

语义 registry 按既有 kind 合并内置与自定义 Definition，重复 kind 失败。独立本地 implementation registry 按对应 Definition 的 kind 索引，重复实现、无对应语义定义或引用不同 Definition 的实现失败。外部执行器不需注册本地 implementation；只有语义 Definition 的扩展在本地执行时明确报缺少实现。

本地计算 context 保留现有来源 helper、可选 lineage recorder 和计算依赖，供 Implementation 使用；它与 `TransformSemanticContext` 分离。语义 callbacks 的结果必须纯且确定；读取数据后才能确定的统计量、自动 extent 和分桶边界仍由计算实现求得，不能在语义解析时假装已知。

### 解析、执行与结果

下面是必要的运行时契约形态；字段模型复用既有 `IRDataModel` 的字段词汇，不建立第二套测量类型或 Data IR。

| 运行时契约                            | 必要内容                                                                                                                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DataTransformModel`                  | 复用 `IRDataModel` 的 name/type/order，不携带源解析 format                                                                                                               |
| `DataTransformDependency`             | reducer/selector/regression 类别、解析后的 operation 及对应语义 Definition                                                                                               |
| `DataTransformStage`                  | Definition、operation、稀疏 dataExecution、全部 dependencies、完整 outputModel                                                                                           |
| `DataTransformResolution`             | inputModel 与有序 stages                                                                                                                                                 |
| `DataTransformResult`                 | rows、完整 model、可选 lineage                                                                                                                                           |
| `DataTransformDiagnostic`             | code、message、可选零基 operationIndex 与 path；源级错误可省略阶段                                                                                                       |
| `DataTransformStageInput`             | 原生 source + model，或已物化 result；source 仅用于首段                                                                                                                  |
| `DataTransformInputDescriptor`        | source 句柄 + model，或仅 result 的 model，不提供行数据                                                                                                                  |
| `DataTransformExecutionRequirements`  | preserveProvenance 与可选 lineage                                                                                                                                        |
| `DataTransformRequestOptions`         | dataExecution、provenance、lineage、signal                                                                                                                               |
| `DataTransformStageImplementation`    | 对应 Definition；execute(input) 返回结果或 Promise                                                                                                                       |
| `DataTransformImplementationProvider` | resolve(stage, context) 返回 supported + implementation，或 unsupported + diagnostics，可返回 Promise；context 含 operationIndex、input descriptor、requirements、signal |
| `DataTransformProviderRegistration`   | 唯一 name 与 provider                                                                                                                                                    |
| `DataTransformExecutionOptions`       | 默认 dataExecution、externalProviders、四类本地 implementations，以及可选 materializeSource(source, model, { requirements, signal })                                     |
| `DataTransformPreparation`            | ready + bind(input)，或 unsupported + diagnostics                                                                                                                        |
| `DataTransformExecution`              | 单次 execute()，返回结果或 Promise                                                                                                                                       |
| `DataTransformExecutor`               | prepare(descriptor, resolution, requestOptions?) 返回 preparation 或 Promise                                                                                             |

`resolveDataTransforms` 接收 transform 声明、输入字段模型与语义 definitions，返回 `DataTransformResolution`。它按声明顺序精确解析 operation 参数及依赖，保留声明的稀疏执行配置，确认输入字段存在，并完整推导每一步模型；无需持有输入 rows，也不查询执行 provider。没有观测或声明依据的类型保持未定；若某个操作的语义必须依赖该类型才能确定，则解析失败，不能默认猜为 categorical。

阶段和统计依赖携带的 Definition 是本次请求的语义身份。自定义语义由扩展作者明确约定，外部 adapter 只能对其已适配的 Definition 声明支持，不能仅按相同 kind 或输出字段猜算法。跨进程传输使用 operation 与字段模型的 JSON 表达，由 adapter 映射到其已知语义；不序列化 Definition、函数或整个 resolution，也不默认不同包版本的语义等价。

`executeDataTransforms` 接收初始 input、resolution、选定的 executor 及可选的 `DataTransformRequestOptions`，统一返回 `Promise<DataTransformResult>`。input 的模型须与 resolution.inputModel 一致。它先提取输入 descriptor 并等待 prepare 完成；unsupported 导致整次请求失败，数据计算不得启动。ready 固定实现选择，bind 校验并绑定实际输入，再生成独立执行实例；bind 和 execute 均不再次调用 provider.resolve 或改变路由。执行阶段等待 Promise resolve，再校验该阶段结果并传给下一阶段；同步抛错与 Promise rejection 采用同一错误边界。

每个执行实例只允许一次 execute 调用，首次调用即消耗执行权；尚在等待 Promise、已经失败、完成或取消时再次调用，都在发起新计算前报 `RetikzDataError`，不复用结果、不隐式重试。需要重新执行时显式创建新的执行请求。执行期间检查 signal，取消终止请求且不触发 hybrid 补算；adapter 可以利用同一 signal 中止网络请求，但 Data 不承诺外部计算已经撤销。

准备只依赖输入描述而非 rows，宿主可以在 root 计算前检查尚未生成数据的 mark/facet 模板。root 结果与分区就绪后，各作用域 bind 真实输入；同一请求中的不同分区可以共用固定的阶段选择，不能复用某个执行实例处理其它分区。bind 要求实际模型与 descriptor 一致，原生源仍为预检时同一个句柄；来源证据与声明要求不一致时失败，不重新选实现。固定计划不作为跨请求或 revision 的缓存，provider 的阶段实现必须支持模型与要求允许的各个独立输入。

准备时固定 operation、模型、请求配置及 provider 选择，绑定时固定实际输入；调用方不得在请求结束前修改或释放借入的 source、输入 rows 和运行时 Definition。源版本、连接与凭据由 source adapter 管理，不复制到 IR 或公共请求状态。

空 operation 不调用 transform 实现：result 输入直接按输入模型接入；source 输入须通过显式 materializeSource 取得可消费结果，缺少该能力时提前失败。

`createDataTransformExecutor(options)` 是统一的实现选择与编排入口，持有本次配置的默认 `dataExecution`、命名外部 providers 及本地 implementations。它不修改进程全局设置，不替换语义 registry。既有同步 `applyTransforms`、`applyTransformsToDataView` 和 lineage 入口继续提供同步内置计算便捷 API，并复用语义解析、实现分派与结果接入规则；外部或混合模式从通用异步入口执行，不把网络请求或 Promise 放入同步 lowering。

`ingestDataTransformResult` 接收匹配的 resolution 与 result，输出 `DataView`。结果 model 必须完整列出逻辑输出字段，字段集合、已有类型和分类 order 与预期一致；未定类型可以由实际结果的有效观测获得证据，非标量字段保持未定。空结果仍携带模型，不用首行猜结构。输入解析 format 不携带到输出，不再次应用源值 parser。

`DataView` 持有规范 rows 与完整逻辑 model，model 是字段存在性、已证明测量类型及分类 order 的唯一事实源；空行与未定类型字段跨作用域交接时仍保留。`createDataView(rows, model)` 从规范值观测补充未定字段的类型证据，不把额外 payload 当作模型字段。fieldTypes 与 fieldTypeEvidence 按需从 model 派生，不存储第二份可漂移的模型事实。同步变换与宿主消费直接使用该完整模型，不从行键或类型映射重建模型。持久化 data.model schema、源解析与溯源的职责保持原有边界；旧 DataView 构造形态不提供兼容分支。

返回 rows 使用既有规范值和缺失值语义；Data 在结果接入边界检查模型与值是否一致，不进行静默字段删除、重命名或类型 coercion。rows 可以保留未纳入逻辑模型的原始 payload，但这些属性不得自动获得字段类型证据或作为声明之外的新逻辑输出。Arrow、列式表、数据库结果和其它物理结构由 adapter 转换为上述 runtime result；`Map`、`Set`、Symbol provenance 和非有限数值不被当作通用 JSON 传输格式。

本地按现有数据入口确定字段模型；未经源解析的 payload 不因被保留而成为已证明的规范字段。typed adapter 在自身外部输入边界解码结果，Data 接入只检查模型一致性等领域不变量，不为内部调用重复建立结构探测或平行 schema。已有 NaN/undefined 无效值哨兵按原 skip/error 语义处理，不将允许缺失与字段测量类型不匹配混为一类。

### 执行模式与实现注入

下表的 mode 指每个阶段完成配置继承后的最终模式；同一请求的不同声明可以使用不同模式及外部入口。

| mode            | 阶段实现选择                                                   | 不支持时的行为                                   |
| --------------- | -------------------------------------------------------------- | ------------------------------------------------ |
| `builtin`，默认 | 仅选择 Data 内置及显式注册的本地实现，不查询外部 provider      | 缺少本地实现则整次请求提前失败                   |
| `external`      | 每个阶段均由外部 provider 提供实现                             | 任一阶段不支持则整次请求提前失败，不使用内置补算 |
| `hybrid`        | 每个阶段优先查询外部 provider；显式 unsupported 才选择本地实现 | 两边都不支持则整次请求提前失败                   |

provider.resolve 根据当前阶段的 Definition、已解析参数、字段模型、全部统计依赖及输入形态匹配实现。supported 返回的实现必须引用当前阶段相同的语义 Definition；unsupported 必须带有非空定位诊断，阶段诊断使用 context.operationIndex。缺少某个 kind 也是显式 unsupported。相同 kind 可以在内置和外部 provider 中分别有实现，执行模式选择优先级，不合并两边 registry 或覆盖语义 Definition；单个 provider 内的重复注册仍然失败。

首段 source descriptor 包含本次实际源句柄，provider 可以读取或异步查询该源的能力元数据、逻辑字段映射和顺序保证；不能把同模型的不同源假定为同能力。后续 descriptor 只有中间结果模型，不携带原始 source，不能据此绕过前段结果。DataModel 的分类 order 不代表输入行序；数组输入以数组顺序为逻辑行序，原生源由 adapter 明确保持等价逻辑行序，无法满足阶段要求时返回 unsupported。

requirements 在整次请求准备时固定：显式 provenance 请求、输入已有行级/组级来源或已有 lineage 来源证据均要求保留真实来源；lineage 复用现有开关、sample 白名单与 sink 契约，缺省不新增记录。provider 支持声明覆盖当前要求及必要中间结果的来源传播，不能先支持再丢弃证据。未有证据的源允许保持无来源，不生成假的索引；显式要求但引擎无法提供的记录能力返回 unsupported。

`DataLineageRun` 是实际事件记录，不是结果行到上游行的映射替代品。行级/组级映射继续使用现有 provenance helpers 和 runtime Symbol 标记；外部 adapter 在解码边界只恢复引擎实际返回且能映射到本次输入的证据，事件下标使用当前 operationIndex。阶段返回的新事件由执行器按实际执行顺序汇入同一次 run，不重复追加上游事件；sink 只消费符合白名单的实际事件，已流出的执行证据不具有失败回滚保证。

选择粒度是一整个 transform 阶段，包含它所需的 reducer、selector 和 regression。外部支持某个 transform、却不支持其某个统计依赖时，该阶段整体不支持；hybrid 将该阶段交给本地，而不在一个 transform 内跨引擎拼接统计计算。

整次请求先完成全部阶段的能力匹配与结果交接检查，固定选择后才启动计算，并保持声明顺序。provider.resolve 和 prepare 可以异步获取能力信息，但不得进行 transform 计算、结果物化或上传下载行数据。provider 必须支持输入模型允许的数据；不能依赖执行后的样本重新选择实现，也不重新运行已完成阶段。

只有显式 unsupported 触发 hybrid 的本地选择。能力查询异常、执行异常、Promise rejection 和结果接入失败均终止请求，不改用另一实现重试。失败不向调用方接入部分结果；已发生的引擎调用不因此获得事务回滚保证。

### 中间结果交接

阶段之间统一交接 `DataTransformResult`，每一步的 rows、model 及可选 lineage 在交给下一步前完成模型一致性检查。外部实现接收 result 时，由 adapter 转换到引擎输入，并把实际输出转换回 Data 结果边界；不能在后续阶段重新查询原始 source 代替上一步结果，不能丢失顺序、字段类型或来源证据。

原生 source 只允许作为初始输入。第一阶段选外部时，由 adapter 直接消费该 source；第一阶段选本地时，需要应用显式提供 materializeSource。该回调只取得同一 source 的规范数据及模型，不执行未声明变换；运行前检查必须确认所需交接能力已经存在，物化结果也须接入校验。后续阶段始终消费前一步 result，不再物化原始 source。

外部是否支持一个阶段，包含是否能消费当前输入形态并返回统一结果。只接受原生 source、不能消费中间 result 的 adapter 不得声明支持后续阶段。hybrid 对这种显式不支持选择本地；缺少首段本地所需的物化能力或任何必需交接能力时提前失败，不擅自建立数据连接或下载原始全量数据。选择模式本身不授予数据源访问权限。

### 宿主消费

宿主异步入口使用 Data 拥有的 runtime binding，IR 中仍只有既有 `data.reference` 与字段模型：

```ts
/** 数据引用实际绑定的输入；不进入 JSON IR */
type DataInputBinding<TSource> =
  | Readonly<{ kind: 'rows'; rows: Array<ExternalRow> }>
  | Readonly<{ kind: 'result'; result: DataTransformResult }>
  | Readonly<{ kind: 'source'; source: TSource }>;

/** 按 data.reference 查找的本次 runtime 绑定 */
type DataInputBindings<TSource> = Readonly<Record<string, DataInputBinding<TSource>>>;
```

Plot/Chart/Table 的 IR/spec 作者入口使用 `dataBindings` 注入上述表；现有 rows DSL 将行数组组装成 rows binding。dataBindings 与同一宿主已有的 data/rows 注入互斥，不双读、不以优先级掩盖重复绑定。`renderPlotAsync(spec, dataBindings, options)` 使用第二参数绑定；`renderChartAsync` 与 `renderTableAsync` 的 options 使用同名 dataBindings。三个入口的 options 均接收 dataTransformExecutor 与可选 signal，React 对应 runtime props 同样不进入 JSON。

rows binding 先复用现有 Data 字段映射、format、resolveField 及非法值政策，产生规范输入再执行变换。result binding 已是规范值，使用自身模型作为当前事实源；若作者另声明模型，须与其字段、已知类型和 order 一致，不重新套源 parser。source binding 必须在宿主 `data.model` 显式提供完整逻辑字段模型，必要测量类型不能依赖下载后的观测推断；source 句柄必须指向满足该模型的规范逻辑输入。

本次原生 source 与 result 接入不执行原始值解析：对它们配置源 format、fieldMaps 或 resolveField 时，在计算前诊断不适用，不能忽略配置或下载数据补解析。需要远端解析的应用先在 adapter 层建立规范 source；需要任意本地 parser 的应用显式提供 rows binding。materializeSource 也只返回同一规范 source 的结果，不重新执行源格式或隐藏变换。Data 不拥有数据库连接和授权，也不在 Source IR 新增引擎句柄。

Plot、Chart、Table 本身支持执行选择，不要求应用先手工处理数据。统一覆盖优先级是：**单个 Transform 声明 > Plot/Chart/Table 根节点 > 函数创建执行器时的默认配置 > builtin 默认值**。`mode` 与 `external` 分别按此优先级取最近的显式值，未填写的字段继续继承；不能先给每一层填 builtin，否则会遮蔽上游设置。

`mode: 'builtin'` 不查询外部入口，即使继承得到 external 名称。注册 provider 或仅填写 external 不自动启用外部模式；在最终模式为 external/hybrid 时，external 必须存在且能在当前执行器中找到，缺失或名称未知属于配置错误，hybrid 也不因此改用本地。多个外部入口同名注册失败；不使用隐式“第一个 provider”。同一阶段只使用最终选中的一个外部入口，不搜索其它外部入口补算。

根节点的 `dataExecution` 作用于该宿主拥有的全部数据变换作用域。Plot 的 root、mark-local 和 facet 仍按原有数据依赖与分区粒度执行，单个声明的覆盖只影响该次变换，不改变后续声明、兄弟 mark 或其它宿主的设置。mark 不增加第四层执行默认值。Chart 的显式扩展声明保留自身覆盖，encoding 和 recipe 自动生成的声明继承 Chart 根配置，Chart 展开出的 Plot 不建立另一层默认。嵌套的独立 Plot/Chart/Table 按各自根配置解析，不继承外层宿主根配置；它们可以共用同一个函数配置的执行器。

Table 的数据驱动 Detail/Custom 入口新增 `transform` 声明序列，在表结构和单元格解析前消费变换后的字段模型。ManualTable 没有数据源，不接受 transform；没有绑定数据的 CustomTable 也不能执行 transform。三类宿主使用同一 Data 声明契约，不分别定义内置操作白名单。

React 的 `PlotTransform` 保留声明组件角色，其 props 与 `IRDataTransformDeclaration` 相同：`{ operation, dataExecution? }`，由 Vanilla 作者 API 组装；Table 和 Chart 作者入口复用此 Data 声明语义。JSON IR、Vanilla 和 JSX 均使用同一包装，不平铺 operation 字段；自定义 operation 即使包含名为 dataExecution 的计算参数，也不会与声明配置冲突。provider 回调留在 runtime，不塞进 JSON。根节点的 props 与 spec 表达同一个配置槽；同一输入同时提供两份根配置时诊断重复声明，不建立额外优先级。

外部计算在同步 lowering 前的共享数据准备阶段完成。Plot/Chart/Table 领域负责解析实际数据作用域和依赖，Data 负责每条阶段链的配置继承、能力匹配与执行；Vanilla processing 调度准备，React 只收集声明并订阅结果。准备产物是本次输入的运行时消费态，不回写作者 IR、不保存已执行数量或完成标记；同步 lowering 直接消费已准备视图，不重新执行源声明。应用自行调用 Data 执行后绑定新 dataset 的路径也继续成立，此时只声明仍需执行的操作。

宿主提供明确的异步渲染入口 `renderPlotAsync`、`renderChartAsync`、`renderTableAsync`。这些入口与 React 独立组件、Layout 嵌入共用 Kernel ADR-047 的 Vanilla processing 准备能力；带自动执行配置的 JSON IR 渲染也经该入口。准备回调解析数据作用域、调用 Data prepare 固定各阶段选择，execute 回调完成计算并将准备视图交给同一同步领域 lowering。

同步 `renderPlot`、`renderChart`、`renderTable` 及直接领域 lowering 不接受通用 DataTransformExecutor、原生 source binding 或异步实现，只消费既有 rows 入口和同步本地 implementation 集合；其类型与同步 apply 入口一致，不将可返回 Promise 的实现放入集合。本地同步与通用异步 Implementation 都引用相同语义 Definition，使用相同 registry/解析/结果接入规则，区别是允许的计算回调返回类型。执行配置在完整继承后逐声明检查；出现 external/hybrid 就在计算前诊断应改用异步入口。全 builtin 声明可同步执行，单个模式覆盖不会绕过同步实现限制。同步入口不通过调用回调来探测 Promise，也不改变返回类型。

异步准备、发布与 revision 生命周期遵循 Kernel ADR-047；Viz Vanilla 提供领域准备逻辑，Kernel 不解释 Data 语义。准备失败、过期或卸载后不得发布新图形；任务失效不保证撤销外部计算。

新的结果引用是独立的物化数据源：其局部来源下标只指向该结果 dataset。绑定时不能透传指向上游原始 rows 的 Symbol 下标；应用如需保留上游行级映射，应在绑定前通过既有 provenance helpers 读取并关联，执行事件由 result.lineage 独立返回。lineage 不能替代行映射。现有 locator 不自动跨引用回查数据库或原始明细，无证据时只能定位结果数据，不能声称具有上游行级来源。

Chart 仍拥有 recipe 展开、phase 和 slot 政策，Table 仍拥有表结构和单元格生成。Data 不按 schedule 重排通用 operation，也不因协议化给缺少 schedule 的 operation 添加 Chart 能力。

## 行为、失败语义与兼容性

- 字段配置、默认输出名、分组粒度、缺失与非法值处理、空组行为、统计算法、稳定排序、并列规则和结果顺序沿用现有操作语义。依赖原始顺序的 first/last、选择和分组必须由 adapter 明确保持；只有引擎名称或相同函数名不足以证明支持。随机扰动保持既有 seed 与序列语义。
- 支持检查覆盖参数、输入类型、统计依赖、输入形态、交接能力及语义约束。浮点与时间表达须符合对应操作的算法和精度契约；没有已明确的误差规则时不得自行采用近似替代。无法证明语义等价时返回不支持诊断，不改变 operation 含义。
- 结果接入能证明结构和字段值域符合声明，不能证明引擎算术、分组和顺序实现正确；executor 对其支持声明负责。执行器使用源数据时须满足输入模型的逻辑字段映射及规范值语义，原始解析和格式接入仍由数据模型层负责。
- 未注册操作或统计依赖、字段缺失、输出冲突、不能确定的必要类型、无效执行配置、能力不支持、执行失败以及结果模型不匹配均由 `RetikzDataError` 表达。错误保留 operation 下标及可用的字段/依赖路径；宿主补充 root/mark/facet/声明的作者位置，引擎、用户回调异常保留为 cause。失败不接入部分结果；自动接入入口还不得将旧 revision 的结果发布到当前图形。
- 这是 Definition、运行时执行 API 和宿主 transform 声明结构的 breaking 调整：计算回调迁入独立 Implementation，语义 context 不再持有计算 helper，输出模型及统计 outputs 成为完整声明，冗余 outputFields 移除。宿主 transform 数组与 JSX props 由裸 operation 改为 declaration 包装；operation 自身的 JSON 配置保持现状。旧组合 Definition、旧 registry 参数形态、context、裸 operation 宿主数组及平铺 JSX props 不提供兼容别名、适配层或双轨。
