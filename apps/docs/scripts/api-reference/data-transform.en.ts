const translations: Partial<Record<string, string>> = {
  'true 使用默认事件配置，对象自定义配置；false 或省略时不记录，不隐式建立行来源':
    'true uses default event options, an object customizes them, and false or omission disables recording without implicitly assigning row sources',
  'true 使用默认事件配置，对象自定义配置；false 或省略时不追加记录':
    'true uses default event options, an object customizes them, and false or omission disables new recording',
  '为尚无来源的输入建立零基索引，默认关闭；已有来源始终保留':
    'Creates zero-based indices for inputs without provenance; disabled by default, and existing provenance is always retained',
  '同步行变换结果；来源保存在行上，事件单独返回':
    'Synchronous row transform result; provenance stays on rows and events are returned separately',
  显式启用事件记录时的本次运行: 'The current run when event recording is explicitly enabled',
  同步视图变换结果: 'Synchronous data-view transform result',
  完成变换后的完整视图: 'The complete transformed data view',
  '语义注册表、同步计算实现与可选来源/事件记录':
    'Semantic registries, synchronous implementations, and optional provenance or event recording',
  行数组及可选执行事件: 'Rows and optional execution events',
  完整数据视图及可选执行事件: 'Complete data view and optional execution events',
  'registry 擦除不同方法的参数泛型；调用前必须精确解析':
    'Erases method-specific parameter generics in the registry; parse exact parameters before calling',
  '精确参数 schema': 'Exact parameter schema',
  已解析参数的预测域校验: 'Prediction-domain validation for parsed parameters',
  异构拟合计算注册项: 'Heterogeneous regression implementation registration',
  唯一拟合语义身份: 'Unique regression Definition identity',
  精确解析后的拟合: 'Fits with precisely parsed parameters',
  '注册表内部使用的 selector 宽类型': 'Broad selector type used by the registry',
  'registry 需要存放不同 operation 泛型的 definition；真正调用前必须用对应 schema parse 收窄':
    'Stores definitions with different operation generics; parse with the matching schema before calling',
  '列出选择操作引用的输入字段；调用前须恢复对应 schema 的参数关联':
    'Lists input fields referenced by the selector; restore its schema-specific parameter association before calling',
  '调用选择回调前用于解析具体选择参数的 schema': 'Schema used to parse exact selector parameters before selection',
  '异构 selector 计算注册项': 'Heterogeneous selector implementation registration',
  唯一语义身份: 'Unique Definition identity',
  已解析参数的计算: 'Computes with parsed parameters',
  '注册表内部使用的 reducer 宽类型': 'Broad reducer type used by the registry',
  '列出归约引用的输入字段；调用前须恢复对应 schema 的参数关联':
    'Lists input fields referenced by the reducer; restore its schema-specific parameter association before calling',
  声明归约产生的完整字段集合及其类型: 'Declares all output fields and their types',
  '调用计算回调前用于解析具体归约参数的 schema': 'Schema used to parse exact reducer parameters before computation',
  '异构 reducer 计算注册项': 'Heterogeneous reducer implementation registration',
  同步拟合入口限定结果类型: 'Restricts regression results to synchronous models',
  '不返回 Promise 的拟合': 'Fits without returning a Promise',
  同步选择入口限定结果类型: 'Restricts selector results to synchronous selections',
  '不返回 Promise 的计算': 'Computes without returning a Promise',
  同步统计入口限定结果类型: 'Restricts reducer results to synchronous records',
  '同步入口只接受不会返回 Promise 的计算实现': 'Accepts only implementations that do not return Promises',
  '同步计算，不探测或启动异步任务': 'Computes synchronously without probing or starting asynchronous work',
  '本次 registry 中相同的语义 Definition': 'The identical Definition registered for this request',
  'registry 内部使用的宽类型': 'Broad type used by the registry',
  完整统计依赖: 'Complete computation dependencies',
  '内部宽类型占位；真正调用前必须用该 definition.schema 解析 operation':
    'Broad callback placeholder; parse the operation with definition.schema before calling',
  '内部宽类型占位；真正调用前必须用该definition.schema解析operation':
    'Broad callback placeholder; parse the operation with definition.schema before calling',
  允许上层宿主闭合调度该Definition的固定描述: 'Fixed description allowing hosts to schedule this Definition',
  '不同 definition 的 schema 泛型不同，registry 只关心能从中提取 kind 并执行 parse':
    'Definitions have different schema generics; the registry only extracts kind and parses operations',
  解析完成后的领域不变量: 'Domain invariants checked after parsing',
  异构实现注册表中的计算入口: 'Computation entry in a heterogeneous implementation registry',
  精确解析后才能调用的计算入口: 'Computation entry callable only after exact parsing',
  '同步便捷入口的明确计算能力，不能注册 Promise 回调':
    'Explicit synchronous implementations; Promise callbacks cannot be registered',
  '来源、统计语义与当前计算上下文': 'Provenance helpers, computation definitions, and current execution context',
  '本次唯一的语义 registry': 'The unique Definition registry for this request',
  显式同步拟合实现: 'Explicit synchronous regression implementations',
  显式同步选择实现: 'Explicit synchronous selector implementations',
  显式同步统计实现: 'Explicit synchronous reducer implementations',
  '显式同步 transform 实现': 'Explicit synchronous transform implementations',
  同步完整视图与事件记录: 'Synchronous data-view result and execution events',
  完成变换后的数据视图: 'The transformed data view',
  本次变换执行产生的事件记录: 'Execution events produced by this transform request',
  同步来源执行选项: 'Synchronous execution options with lineage',
  '控制变换事件记录的启用方式、预算与接收器': 'Controls transform-event recording, budgets, and the event sink',
  同步行执行的事件记录: 'Synchronous row result and execution events',
  完成变换后的数据行: 'The transformed rows',
  '宿主数据引用的真实 runtime 输入': 'Actual runtime input for a host data reference',
  '原生数据源句柄类型，关联数据绑定与执行器支持的源': 'Native source-handle type shared by bindings and the executor',
  '区分直接行数据、已完成结果与原生源绑定': 'Distinguishes direct rows, completed results, and native source bindings',
  直接提供的规范数据行: 'Normalized rows provided directly',
  已完成的数据变换结果及字段模型: 'Completed transform result and field model',
  交由相应执行器解释的原生数据源句柄: 'Native source handle interpreted by the corresponding executor',
  '引擎句柄、行数据和函数均不进入 JSON IR': 'Engine handles, rows, and functions stay outside JSON IR',
  变换的精确统计依赖及本次请求的语义身份: 'Exact computation dependency and its Definition identity for this request',
  与操作匹配的语义定义: 'Definition matching the operation',
  该依赖的精确操作声明: 'The exact operation declaration for this dependency',
  '区分归约、行选择与拟合依赖': 'Distinguishes reducer, selector, and regression dependencies',
  预检失败的可定位诊断: 'Locatable diagnostic for a preparation failure',
  稳定诊断分类: 'Stable diagnostic category',
  失败原因: 'Reason for the failure',
  '零基声明下标；源级失败可省略': 'Zero-based declaration index; may be omitted for source-level failures',
  可用的参数或依赖位置: 'Available parameter or dependency location',
  一个真实输入的单次执行权: 'Single-use execution bound to an actual input',
  '第一次调用即消耗；等待、成功、失败或取消后均不可再次调用':
    'Consumed on the first call; cannot be called again while pending or after success, failure, or cancellation',
  '有作用域的执行器默认值与本地/外部计算实现': 'Scoped executor defaults and local or external implementations',
  最低优先级的执行配置: 'Execution configuration with the lowest precedence',
  按唯一名称引用的外部入口: 'External providers referenced by unique names',
  '明确授权的规范源物化；只在全部预检完成后调用':
    'Explicit normalized-source materialization, called only after all preparation checks succeed',
  显式本地拟合计算: 'Explicit local regression implementations',
  显式本地选择计算: 'Explicit local selector implementations',
  显式本地统计计算: 'Explicit local reducer implementations',
  '显式本地 transform 计算': 'Explicit local transform implementations',
  整次请求固定的来源与事件保留要求: 'Provenance and event-retention requirements fixed for the request',
  '可选事件开关、采样预算与 sink': 'Optional event switches, sampling budgets, and sink',
  各阶段是否必须保留本次输入已有的真实来源: 'Whether each stage must preserve provenance already present on its input',
  模型预检与实际计算绑定分离的执行器: 'Executor separating model preparation from binding actual inputs',
  '固定全部阶段选择；bind/execute 不重新路由': 'Fixes all stage choices; bind and execute do not route again',
  '按模型及真实源能力匹配，不计算或搬运行数据':
    'Matches field models and source capabilities without computing or transferring rows',
  '返回当前参数、统计依赖、输入形态与来源要求的支持结果':
    'Reports support for the current parameters, dependencies, input shape, and provenance requirements',
  '模型预检输入；下游结果尚未生成时不需提供假 rows':
    'Model-only preparation input; downstream results do not require fabricated rows',
  当前阶段预期可见的字段模型: 'Expected field model visible to the current stage',
  区分原生源预检与下游结果模型预检: 'Distinguishes native-source preparation from downstream-result model preparation',
  '用于查询执行能力的原生源句柄，不在预检中读取行':
    'Native source handle used to query capabilities without reading rows',
  '规范逻辑字段模型；不重复执行源格式解析': 'Normalized logical field model; source-format parsing is not repeated',
  transform输出字段的运行时类型描述: 'Runtime type descriptor for a transform output field',
  operation输出的逻辑字段名: 'Logical output field name',
  '固定字段类型，或复用当前DataView中另一个字段的类型':
    'Fixed field type or a type inherited from an existing DataView field',
  transform对字段类型图的完整影响: 'Complete effect of a transform on the field model',
  保留当前字段类型图并增加或覆盖outputs: 'Preserves the current field model and adds or overwrites outputs',
  operation产生的已类型化字段: 'Typed fields produced by the operation',
  operation之后仍存在的全部已类型化字段: 'All typed fields present after the operation',
  丢弃当前字段类型图并由fields完整重建: 'Discards the current field model and rebuilds it from fields',
  '本请求固定的模型计划，可绑定尚未生成的不同分区':
    'Fixed model plan that can bind partitions whose rows are not yet available',
  '把固定模型计划绑定到一个实际输入，创建单次执行权':
    'Binds an actual input to the fixed plan and creates a single-use execution',
  完整模型计划准备成功或不支持的判别值: 'Discriminates successful preparation from unsupported plans',
  模型计划无法完成时的可定位诊断: 'Locatable diagnostics explaining why the plan cannot be prepared',
  '具名外部入口；注册本身不启用外部模式': 'Named external provider; registration alone does not enable external mode',
  执行配置中引用的唯一名称: 'Unique name referenced by execution configuration',
  '本次执行器的能力 provider': 'Capability provider for this executor',
  '单次调用的宿主配置；不改变执行器默认值': 'Host options for one request; executor defaults remain unchanged',
  宿主根执行配置: 'Host-level execution configuration',
  事件记录要求: 'Execution-event recording requirements',
  请求保留本次输入真实来源: 'Requests preservation of existing input provenance',
  请求取消信号: 'Request cancellation signal',
  不依赖行数据的语义解析结果: 'Semantic resolution without row data',
  第一阶段输入模型: 'Input field model for the first stage',
  固定声明顺序的阶段: 'Stages in fixed declaration order',
  解析时使用的语义定义集合: 'Definition registries used during semantic resolution',
  '拟合语义 registry': 'Regression Definition registry',
  '选择语义 registry': 'Selector Definition registry',
  '统计语义 registry': 'Reducer Definition registry',
  '内置与用户 Definition 的唯一注册表': 'Unique registry of built-in and custom transform Definitions',
  '实际计算结果；事件历史不替代行级 provenance':
    'Actual computation result; event history does not replace row-level provenance',
  实际执行事件: 'Actual execution events',
  实际输出字段及类型证据: 'Actual output fields and type evidence',
  '规范值行及可选 runtime 来源标记': 'Normalized rows with optional runtime provenance markers',
  Definition声明的闭合调度描述: 'Fixed scheduling description declared by a Definition',
  '当前Definition允许的mapping binding类别': 'Mapping-binding category allowed by this Definition',
  operation对行和字段结构的影响: 'Effect of the operation on rows and fields',
  固定调度阶段: 'Fixed scheduling phase',
  按声明顺序解析的单个变换阶段: 'One transform stage resolved in declaration order',
  此声明的稀疏配置: 'Sparse execution configuration for this declaration',
  当前阶段的唯一语义身份: 'Unique Definition identity for the current stage',
  全部间接计算依赖: 'All indirect computation dependencies',
  '精确 schema 解析后的参数': 'Operation parameters parsed by the exact schema',
  当前阶段的完整预期输出模型: 'Complete expected output field model for this stage',
  '引用相同语义 Definition 的阶段计算入口': 'Stage implementation referencing the identical Definition',
  '经过 adapter 明确适配的语义身份': 'Definition identity explicitly adapted by the provider',
  '消费本次实际输入，不重新查询原始 source': 'Consumes this actual input without querying the original source again',
  '实际阶段输入；原生源仅用于第一阶段': 'Actual stage input; native sources are accepted only by the first stage',
  区分首阶段原生源和前一阶段计算结果: 'Distinguishes the first-stage source from the previous stage result',
  输入源已确定的字段模型: 'Known field model of the input source',
  只供首阶段消费的原生数据源句柄: 'Native source handle consumed only by the first stage',
  '前一阶段实际生成的数据行、模型及来源记录':
    'Rows, model, and provenance records actually produced by the previous stage',
  支持声明与能力查询异常分离: 'Separates unsupported declarations from capability-query exceptions',
  通过能力预检的具体阶段计算入口: 'Concrete stage implementation selected during preparation',
  当前阶段是否可由该执行入口支持: 'Whether this provider supports the current stage',
  无法支持当前阶段的可定位原因: 'Locatable reasons the stage is unsupported',
  'annotate 单行 selector 配置（至多一个代表行的回填规则）':
    'Single-row annotation selector producing at most one representative row',
  '标注变换（统计回填，保行数）': 'Annotation transform preserving row count',
  '分箱变换（连续分箱，改行数）': 'Continuous binning transform changing row count',
  '内置 transform operation（排序、汇总、选行、标注、堆叠、分箱、归一化、区间派生、关系、抖动、密度与拟合）':
    'Built-in operations for sorting, summarizing, selecting, annotating, stacking, binning, normalizing, deriving intervals, relating, jittering, density, and regression',
  'density 带宽策略（Silverman 默认或显式正数带宽）':
    'Density bandwidth strategy: Silverman by default or an explicit positive bandwidth',
  'density 变换（一维 KDE 采样，改行数）': 'One-dimensional KDE sampling transform changing row count',
  '区间派生变换（单行派生区间，保行数）': 'Per-row interval derivation preserving row count',
  'relate 端点投影（每组选择 source / target 行并映射字段）':
    'Relation endpoint selection and field projection for each group',
  '抖点变换（确定性位置抖动，保行数）': 'Deterministic positional jitter preserving row count',
  '归一化变换（组内百分比归一化，保行数）': 'Within-group normalization preserving row count',
  'selector 排序规则（代表行选择前的稳定排序规则）': 'Stable ordering rules used before representative-row selection',
  'outside-quantile-band selector operation（分位区间外原始行选择）': 'Selects original rows outside a quantile band',
  '配对度量（从 source / target 行派生差值等字段）':
    'Measures derived from selected source and target rows, such as differences',
  'quantile-band reducer operation（参数化分位区间规约）': 'Parameterized quantile-band reducer operation',
  'reducer metrics 列表': 'List of reducer metrics',
  'reducer operation（统计规约子算子）': 'Statistical reducer operation',
  '关系变换（从数据动态派生 relation rows）': 'Relation transform deriving relation rows from data',
  'row selector operation（代表行选择子算子）': 'Representative-row selector operation',
  '选择变换（选择代表原始行，可能改行数）': 'Representative-row selection that may change row count',
  'smooth 变换（回归趋势线采样，改行数）': 'Regression trend sampling transform changing row count',
  '排序变换（稳定排序，保行数）': 'Stable sorting transform preserving row count',
  '堆叠变换（跨行累积区间，保行数）': 'Cross-row cumulative interval transform preserving row count',
  '汇总变换（分组统计，改行数）': 'Grouped summarization transform changing row count',
  'transform operation（内置 ∪ 外部注册 kind 开放配置）':
    'Built-in operation or an open configuration for a registered custom kind',
  内置与外部拟合共享的运行时契约: 'Runtime Definition shared by built-in and custom regression methods',
  '拟合方法 schema 接受的原始声明类型': 'Source declaration type accepted by the regression schema',
  'schema 解析后传给拟合及范围校验回调的参数类型，默认与输入声明一致':
    'Parsed parameters passed to fitting and extent validation; defaults to the source declaration type',
  '精确参数 schema，kind 必须是非空字面量': 'Exact parameter schema with a nonempty literal kind',
  方法专有预测域约束: 'Method-specific prediction-domain constraints',
  拟合的独立计算实现: 'Independent regression implementation',
  '拟合回调返回的模型或模型 Promise 类型': 'Model or Promise of a model returned by fitting',
  同一方法的唯一语义身份: 'Unique Definition identity for the same regression method',
  '拟合规范有限观测，返回预测模型': 'Fits normalized finite observations and returns a prediction model',
  '拟合模型；仅用于运行时预测': 'Fitted model used only for runtime prediction',
  '在数据空间预测 y': 'Predicts y in data space',
  有限数值观测: 'Finite numeric observation',
  自变量: 'Independent variable',
  因变量: 'Dependent variable',
  '一次精确解析后的拟合入口，不进入 IR': 'Regression entry with parameters parsed once; excluded from IR',
  '拟合当前组，返回已包装异常与非有限值诊断的模型':
    'Fits the current group and returns a model with wrapped errors and nonfinite-prediction diagnostics',
  校验当前预测域: 'Validates the current prediction extent',
  'row selector 的单行选择结果': 'One selected row',
  '可选一基排名；`select.rankAs` 会把它写进输出行': 'Optional one-based rank written to output rows by select.rankAs',
  '被 selector 选中的原始行': 'Original row selected by the selector',
  'row selector 运行时定义': 'Runtime row-selector Definition',
  '自定义 selector 供 `select` 与明确声明支持它的宿主 transform（如 Plot `relate`）复用；Data `annotate` 只接受内置单行 selector 子集。定义对象不进入 JSON IR':
    'Custom selectors are available to select and transforms that explicitly support them, such as relate. annotate accepts only the built-in single-row subset. Definitions stay outside JSON IR',
  '行选择 schema 接受的原始声明类型': 'Source declaration type accepted by the selector schema',
  'schema 解析后用于字段分析和选择的参数类型': 'Parsed parameters used for field analysis and selection',
  '该 selector 消费的源字段名；参与 data.model strict 校验':
    'Input field names used for strict data-model reference checks',
  "完整 selector operation schema；必须含非空 z.literal('kind') 供注册表提取注册键":
    'Full selector schema with a nonempty literal kind used as the registry key',
  'selector 的独立计算实现': 'Independent selector implementation',
  '计算定义 schema 接受的原始声明类型': 'Source declaration type accepted by the computation Definition schema',
  'schema 解析后传给计算回调的参数类型': 'Parsed parameters passed to the computation callback',
  '选择回调返回的行选择数组或其 Promise 类型': 'Array of row selections or its Promise returned by selection',
  唯一选择语义身份: 'Unique selector Definition identity',
  选择本组原始行及一基排名: 'Selects original rows in this group with optional one-based ranks',
  '统计 reducer 运行时定义': 'Runtime statistical reducer Definition',
  '定义对象只存在于运行时，不进入 JSON IR；IR 只保存 `{ kind, ...config }` 形态的 IRDataReducerOperation':
    'Definitions exist only at runtime; IRDataReducerOperation stores a JSON declaration shaped as { kind, ...config }',
  '统计归约 schema 接受的原始声明类型': 'Source declaration type accepted by the reducer schema',
  'schema 解析后用于字段分析和计算的归约参数类型': 'Parsed parameters used for field analysis and reduction',
  '该 reducer 消费的源字段名；参与 data.model strict 校验':
    'Input field names used for strict data-model reference checks',
  '完整输出字段；非标量或没有类型证据时省略 descriptor.type':
    'Complete output fields; omit descriptor.type for non-scalar outputs or absent type evidence',
  "完整 reducer operation schema；必须含非空 z.literal('kind') 供注册表提取注册键":
    'Full reducer schema with a nonempty literal kind used as the registry key',
  'reducer 的独立计算；参数由同一语义 schema 解析':
    'Independent reducer computation using parameters parsed by the identical Definition schema',
  '归约回调返回的数据行或其 Promise 类型': 'Record or its Promise returned by reduction',
  唯一统计语义身份: 'Unique reducer Definition identity',
  规约当前组并返回声明字段: 'Reduces this group and returns declared fields',
  'transform apply 上下文': 'Transform computation context',
  '自定义 transform 用它读取 / 写入数据来源标记：保行数 transform 通常透传行对象即可保留 sourceIndex；\n  改行数 transform 若输出行代表一组源行，必须用 groupProvenance 给输出行挂 sourceIndices，避免 locator / datum meta 丢失组级来源；\n  生成行没有源行时可自然降级':
    'Custom transforms use these helpers to read and write provenance. Row-preserving transforms can usually pass through row objects to retain sourceIndex. Outputs representing groups of input rows must use groupProvenance to attach sourceIndices. Generated rows without source rows may have no provenance',
  '给一个改行数输出行打组级源序标记；成员行无标记时原样返回':
    'Attaches group provenance to an output row; returns it unchanged when member rows have no markers',
  'data lineage recorder；缺省时不记录 transform / reducer / selector 事件':
    'Lineage recorder; transform, reducer, and selector events are not recorded when omitted',
  '读单行源序标记；未开启 provenance 或行未打标记时返回 undefined':
    'Reads a single-row source index; returns undefined when provenance is disabled or the row is unmarked',
  '读组级源序标记；bin / summarize 或自定义改行数 transform 输出行可能携带':
    'Reads group source indices that may be carried by bin, summarize, or custom row-changing outputs',
  本次同步拟合实现: 'Synchronous regression implementations for this request',
  '当前运行的拟合方法 registry': 'Regression Definition registry for the current run',
  本次同步选择实现: 'Synchronous selector implementations for this request',
  'row selector registry；缺省时使用内置 selector': 'Selector Definition registry; built-ins are used when omitted',
  本次同步统计实现: 'Synchronous reducer implementations for this request',
  '统计 reducer registry；缺省时使用内置 reducer': 'Reducer Definition registry; built-ins are used when omitted',
  '本次明确注册的同步 transform 计算实现': 'Explicit synchronous transform implementations registered for this request',
  数据变换的运行时定义: 'Runtime transform Definition',
  'definition 是运行时对象，不进入 JSON IR；IR 只保存 `{ kind, params }` 形态的 IRDataTransform':
    'Definitions stay outside JSON IR; IRDataTransform stores only { kind, params }',
  'schema 校验后用于字段分析、依赖声明和执行的数据变换类型':
    'Schema-validated operation type used for field analysis, dependencies, and execution',
  '当前 operation 的全部精确统计依赖': 'All exact computation dependencies of the current operation',
  '该 transform 消费的源字段名；参与 data.model strict 校验':
    'Input field names used for strict data-model reference checks',
  '完整字段影响；没有类型证据的输出只声明字段名':
    'Complete field-model effect; outputs without type evidence declare names only',
  "完整 transform operation schema；必须含非空 z.literal('kind') 供 registry 提取注册键":
    'Full transform schema with a nonempty literal kind used as the registry key',
  模型和参数的领域不变量: 'Domain invariants involving the model and parameters',
  '变换作者提供参数 schema，完整操作 schema 由统一工厂组装':
    'Author-supplied parameter schema assembled into a complete operation schema',
  变换操作的固定注册名称: 'Fixed registered transform kind',
  '参数对象的输入与解析契约，决定回调中 params 的类型':
    'Parameter input and parsed-output contract determining the callback params type',
  变换注册名称: 'Registered transform kind',
  '具体参数的持久化契约，保留默认值及跨字段约束':
    'Serializable parameter contract preserving defaults and cross-field constraints',
  '引用唯一语义 Definition 的独立计算实现': 'Independent implementation referencing one Definition identity',
  '变换计算返回的数据行数组或其 Promise 类型': 'Row array or its Promise returned by transform computation',
  '计算规范行，不修改声明': 'Computes normalized rows without modifying the declaration',
  计算遵守的语义身份: 'Definition identity governing this computation',
  '不读取行、不计算统计量的语义上下文': 'Semantic context without reading rows or computing statistics',
  当前阶段的完整字段模型: 'Complete field model of the current stage',
  内置同步拟合计算集合: 'Built-in synchronous regression implementations',
  '内置拟合均遵守同一 Definition 契约': 'Built-in regressions follow the same Definition contract',
  '内置同步计算集合；与语义 registry 分离':
    'Built-in synchronous implementations, separate from the Definition registry',
  '内置 row selector 定义集合；内置与自定义 selector 共享同一 registry 分派流程':
    'Built-in selectors using the same registry dispatch as custom selectors',
  '内置统计 reducer 定义集合；内置与自定义 reducer 共享同一 registry 分派流程':
    'Built-in reducers using the same registry dispatch as custom reducers',
  '按 kind 索引的内置 transform definition': 'Built-in transform Definitions indexed by kind',
  '主要供诊断与测试确认内置覆盖；自定义 definition 不写入此表，而是在每次 lowering 时合并':
    'Useful for inspecting built-in coverage; custom Definitions are merged per consuming request and are not stored here',
  '内置 transform definition 列表；内置 transform 与自定义 transform 共享同一 registry 分派流程':
    'Built-in transforms using the same registry dispatch as custom transforms',
  'transform operation kind 关键字': 'Built-in transform operation kinds',
  '数据变换 operation 的判别字段；schema、provider definition 与 registry 诊断共用这些稳定取值':
    'Stable operation discriminators shared by schemas, Definitions, and registry diagnostics',
  '读取 numeric field 的内置统计 reducer operation kind 子集': 'Subset of built-in reducers reading numeric fields',
  '按现有顺序或显式排序取行的 row selector operation kind 子集':
    'Subset of selectors using current order or explicit ordering',
  '按数值字段取极值的 row selector operation kind 子集': 'Subset of selectors choosing numeric extrema',
  '内置统计 reducer operation kind 关键字': 'Built-in reducer operation kinds',
  '内置拟合方法提示；实际可用方法由当前 registry 决定':
    'Built-in regression names; availability is determined by the current registry',
  '内置 row selector operation kind 关键字': 'Built-in selector operation kinds',
  '按排序名次取行的 row selector operation kind 子集': 'Subset of selectors choosing rows by rank',
  'data 排序方向关键字': 'Data sort directions',
  transform调度允许绑定的结构类别: 'Structural binding categories allowed by transform scheduling',
  transform调度对行和字段结构的闭合影响: 'Effects of transform scheduling on rows and fields',
  transform的闭合调度阶段: 'Transform scheduling phases',
  '内置来源 helper；计算与语义上下文独立':
    'Built-in provenance helpers, separate from computation and semantic contexts',
  'density 带宽策略类型': 'Density bandwidth strategies',
  'jitter 作用轴': 'Axes affected by jitter',
  归一化结果的数值基准: 'Numeric scale of normalization results',
  配对度量操作类型: 'Pair-measure operation kinds',
  '统计 reducer operation 保留 kind 集合；供 external 开放配置排除内置判别串':
    'Reserved reducer kinds excluded from open custom configurations',
  'row selector operation 保留 kind 集合；供 external 开放配置排除内置判别串':
    'Reserved selector kinds excluded from open custom configurations',
  'transform operation 保留 kind 集合；供 external 开放配置排除内置判别串':
    'Reserved transform kinds excluded from open custom configurations',
  'row selector 平局处理策略': 'Row-selector tie strategies',
  'stack baseline offset 策略': 'Stack baseline offset strategies',
  '同步行数据便捷入口；全计划预检后只执行一次':
    'Synchronous row entry that prepares the whole plan before a single execution',
  已规范化的输入行数组: 'Normalized input rows',
  '按顺序执行的变换操作；省略时为空列表': 'Transform operations in execution order; omitted means an empty list',
  '语义注册表与同步计算实现；省略时使用内置计算':
    'Definition registries and synchronous implementations; omitted uses built-in computation',
  计算后的行数组: 'Computed rows',
  '语义解析、计算或结果校验失败': 'Semantic resolution, computation, or result validation fails',
  '按声明顺序同步推进规范 DataView': 'Advances a normalized DataView synchronously in declaration order',
  已规范化的输入数据视图: 'Normalized input data view',
  计算后的完整数据视图: 'Computed complete data view',
  一次同步执行并返回实际来源事件: 'Runs synchronously and returns execution events',
  计算后的完整数据视图与执行事件: 'Computed complete data view and execution events',
  行数据同步来源便捷入口: 'Synchronous row entry with lineage',
  计算后的行数组与执行事件: 'Computed rows and execution events',
  '从唯一语义模型投影派生字段，供宿主 strict 引用检查':
    'Projects derived fields from the semantic model for strict host reference checks',
  待分析的变换操作: 'Transform operation to analyze',
  接收输入字段名的收集器: 'Collector receiving input field names',
  '接收派生字段名的集合，会就地更新': 'Set receiving derived field names; updated in place',
  '变换定义注册表；省略时使用内置定义': 'Transform Definition registry; omitted uses built-in Definitions',
  '统计定义与可选输入模型；省略时使用空模型':
    'Computation Definitions and optional input model; omitted uses an empty model',
  '变换未注册、参数解析或字段语义回调失败':
    'The transform is unregistered, parameters fail to parse, or a field-semantics callback fails',
  '创建有作用域的执行策略；所有支持检查完成后才绑定并计算':
    'Creates a scoped executor that prepares all support checks before binding and computation',
  '原生数据源句柄类型，关联数据绑定与执行器支持的源；默认 never 表示不接入原生源':
    'Native source-handle type shared by bindings and the executor; never by default means no native source integration',
  '执行默认值、本地实现和具名外接 Provider；省略时使用内置计算':
    'Execution defaults, local implementations, and named external providers; omitted uses built-in computation',
  '可预检、绑定并执行固定阶段计划的执行器': 'Executor that prepares, binds, and executes a fixed stage plan',
  'Provider 名称重复或计算实现重复注册': 'Provider names or computation registrations are duplicated',
  '组合变换判别字段与参数契约，内置及扩展共享同一严格外壳':
    'Combines the discriminator and parameters in a strict operation object shared by built-in and custom transforms',
  参数对象的输入与解析契约: 'Parameter input and parsed-output contract',
  完整操作的固定名称: 'Fixed kind of the complete operation',
  '参数对象的 schema，保留其默认值与校验约束':
    'Parameter-object schema preserving its defaults and validation constraints',
  '包含 kind 和必填 params 的严格对象 schema': 'Strict object schema with kind and required params',
  '保留 schema 与回调的参数推断': 'Preserves parameter inference between the schema and callbacks',
  '具备精确参数关联的定义或实现；不会自动注册':
    'Definition or implementation with exact parameter associations; does not register it',
  '原样返回传入对象，保留泛型关联': 'Returns the supplied object unchanged, preserving generic associations',
  '保留 schema 与拟合参数关联': 'Preserves associations between the regression schema and fitting parameters',
  '定义一个 row selector': 'Defines a row selector',
  '保留 schema 与输入字段声明之间的泛型关联；内置与自定义 selector 都经同一 registry 入口解析':
    'Preserves schema-to-field associations; built-in and custom selectors use the same registry',
  '该入口是 typed identity：在保持定义对象原样的同时，为后续运行时校验、默认值归一或泛型收敛预留稳定 contract hook':
    'Typed identity returning the original Definition and preserving generic inference',
  '保留 selector 定义与解析参数关联': 'Preserves selector Definition and parsed-parameter associations',
  '定义一个统计 reducer': 'Defines a statistical reducer',
  '保留 schema、输入字段与完整输出声明之间的泛型关联；内置与自定义 reducer 都经同一 registry 入口解析':
    'Preserves schema, input-field, and output-field associations; built-in and custom reducers use the same registry',
  '保留 schema 输入、解析参数与计算回调的关联':
    'Preserves associations between schema inputs, parsed parameters, and computation callbacks',
  '组装变换定义，保留判别名称、参数解析结果与语义回调之间的关联':
    'Assembles a transform Definition preserving kind, parsed parameters, and semantic callback associations',
  '名称、参数 schema 与字段语义；不会自动注册':
    'Kind, parameter schema, and field semantics; does not register the Definition',
  '由统一工厂组装完整操作 schema 的语义定义':
    'Definition whose complete operation schema is assembled by the shared factory',
  保留语义定义与实际计算参数之间的泛型关联: 'Preserves associations between a Definition and computation parameters',
  将实际输入投影为无行数据的能力描述: 'Projects actual inputs into row-free capability descriptors',
  实际源输入或计算结果: 'Actual source input or computation result',
  '保留源句柄或结果模型的预检描述，不读取或复制行数据':
    'Preparation descriptor preserving the source handle or result model without reading or copying rows',
  '统一异步入口；准备不支持时不计算，绑定后的执行只消费一次':
    'Asynchronous entry that does not compute unsupported plans and executes each binding only once',
  本次实际源输入或已计算结果: 'Actual source input or completed result for this request',
  不读取行数据的语义解析结果: 'Semantic resolution without reading rows',
  承担能力预检与计算的执行器: 'Executor responsible for capability preparation and computation',
  '本次执行覆盖、来源要求与取消信号；省略时不追加请求配置':
    'Request overrides, provenance requirements, and cancellation signal; omitted adds no request configuration',
  '所有阶段完成并校验后的结果 Promise': 'Promise of the validated result after all stages complete',
  '预检不支持、输入不匹配、计算或结果校验失败，或请求被取消；Promise 会拒绝':
    'Preparation is unsupported, input mismatches, computation or validation fails, or cancellation occurs; the Promise rejects',
  '从 Definition 提取唯一注册键': 'Extracts a unique registry key from a Definition',
  '注册定义的对象 schema，kind 必须是非空字符串字面量':
    'Registered object schema whose kind must be a nonempty string literal',
  'kind 字面量的字符串值': 'String value of the kind literal',
  'schema 不是对象或 kind 不是有效字面量': 'The schema is not an object or kind is not a valid literal',
  '从统计子算子定义 schema 中提取注册键': 'Extracts the registry key from a computation-operator Definition schema',
  'reducer 与 row selector 都以 `kind` 作为 registry discriminator；schema 必须把它声明成非空字面量':
    'Reducers and row selectors use kind as their registry discriminator; the schema must declare a nonempty literal',
  '从 transform definition schema 中提取 registry key': 'Extracts the registry key from a transform Definition schema',
  "definition schema 必须是包含 `kind: z.literal('<transform-kind>')` 的 ZodObject；该 literal 值就是 registry 唯一键":
    "The Definition schema must be a ZodObject with kind: z.literal('<transform-kind>'); that literal is the unique registry key",
  '接入规范结果的完整模型；空行仍保留未定字段与分类顺序':
    'Ingests a normalized result model; empty rows retain unresolved fields and category ordering',
  用于核对最终字段模型的语义计划: 'Semantic plan used to check the final field model',
  含规范值行和完整字段模型的计算结果: 'Computation result containing normalized rows and a complete field model',
  '使用结果行与字段模型创建的数据视图，空行仍保留模型':
    'Data view created from result rows and model, retaining the model for empty rows',
  结果模型或已确定类型的字段值不符合预期:
    'The result model or values of fields with known types do not match expectations',
  '分别继承 mode/external，完整继承后才补 builtin 默认':
    'Inherits mode and external independently, applying builtin only after inheritance',
  '执行器默认配置；省略时没有这一层覆盖': 'Executor defaults; omitted adds no override at this level',
  '宿主根配置，优先于执行器默认值': 'Host configuration overriding executor defaults',
  '单条声明配置，优先于宿主根配置': 'Declaration configuration overriding host configuration',
  '分别继承 mode 与 external 的配置；mode 最终缺省为 builtin':
    'Configuration with mode and external inherited independently; mode ultimately defaults to builtin',
  '从唯一 outputModel 推进完整字段模型': 'Advances the complete field model using the outputModel declaration',
  当前完整字段模型: 'Current complete field model',
  本阶段保留或替换字段的语义声明: 'Semantic declaration preserving or replacing fields in this stage',
  '推进后的完整字段模型，不修改输入数组': 'Advanced complete field model without modifying the input array',
  输出字段重复或类型继承引用不存在的输入字段:
    'Output fields are duplicated or type inheritance references a missing input field',
  '公开纯语义入口，按精确 schema 一次解析并逐阶段推进模型':
    'Resolves operations once with their exact schemas and advances models stage by stage without row computation',
  按执行顺序排列的变换声明: 'Transform declarations in execution order',
  首阶段可见的完整字段模型: 'Complete field model visible to the first stage',
  '请求内的语义注册表；省略时使用内置定义': 'Request Definition registries; omitted uses built-in Definitions',
  '包含全部阶段、精确操作与预期输出模型的计划，不计算行数据':
    'Plan containing every stage, parsed operation, and expected output model without computing rows',
  '变换未注册、参数无效、输入字段缺失或语义回调失败':
    'A transform is unregistered, parameters are invalid, input fields are missing, or a semantic callback fails',
  '精确解析一次方法参数，返回可供多个分组消费的拟合入口':
    'Parses method parameters once and returns a regression entry reusable across groups',
  拟合方法与参数: 'Regression method and parameters',
  '拟合语义定义；省略时使用内置定义': 'Regression Definition registry; omitted uses built-in Definitions',
  '同步拟合实现；省略时按语义注册表建立内置实现映射':
    'Synchronous regression implementations; omitted creates the built-in map using the Definition registry',
  '参数只解析一次、可用于多个分组的拟合入口': 'Regression entry with parameters parsed once, reusable across groups',
  '方法未注册或参数解析失败；返回入口在计算失败时也会抛出':
    'The method is unregistered or parsing fails; calls to the returned entry may also fail',
  注册独立拟合计算: 'Registers independent regression implementations',
  '自定义拟合实现类型，默认限定同步模型结果':
    'Custom regression implementation type; defaults to synchronous model results',
  '已注册的语义定义；省略时使用内置定义注册表': 'Registered Definitions; omitted uses the built-in Definition registry',
  '自定义计算实现；省略时仅注册内置实现': 'Custom implementations; omitted registers built-in implementations only',
  '名称到计算实现的映射，保留同步与异步结果类型':
    'Name-to-implementation map preserving synchronous and asynchronous result types',
  '实现重复、对应定义未注册或 Definition 对象身份不一致':
    'Implementations are duplicated, a corresponding Definition is unregistered, or Definition object identities differ',
  '建立本次运行的拟合 registry，重复键明确失败': 'Creates a regression registry, rejecting duplicate keys',
  '自定义语义定义；省略时仅注册内置定义': 'Custom Definitions; omitted registers built-in Definitions only',
  每次调用独立创建的名称到定义映射: 'Fresh name-to-Definition map created for each call',
  '注册名称重复或定义的 kind 不符合要求': 'Registration names are duplicated or a Definition kind is invalid',
  注册独立选择计算: 'Registers independent selector implementations',
  '自定义行选择实现类型，默认限定同步选择结果':
    'Custom selector implementation type; defaults to synchronous selection results',
  '合并内置与自定义 row selector 定义，并集中检查 kind 冲突':
    'Merges built-in and custom selector Definitions, rejecting kind conflicts',
  '注册独立统计计算，不以 kind 猜测语义等价': 'Registers independent reducer implementations by Definition identity',
  '自定义归约实现类型，默认限定同步数据行结果':
    'Custom reducer implementation type; defaults to synchronous record results',
  '合并内置与自定义统计 reducer 定义，并集中检查 kind 冲突':
    'Merges built-in and custom reducer Definitions, rejecting kind conflicts',
  '独立计算 registry；内置和自定义引用同一语义身份':
    'Independent implementation registry sharing Definition identities across built-ins and custom implementations',
  '自定义变换实现类型，默认限定同步数据行数组结果':
    'Custom transform implementation type; defaults to synchronous row-array results',
  '解析 transform registry': 'Resolves the transform Definition registry',
  '内置 transform 总是先注册；用户自定义 definition 不能覆盖内置 kind，也不能彼此重复':
    'Built-ins are registered first; custom Definitions cannot override built-in kinds or duplicate one another',
};
const missing = new Set<string>();

/** 校验并使用已审阅的英文译文 */
export const translateDataTransformApiReference = (source: string): string => {
  const text = source.trim();
  const translated = translations[text];
  if (translated !== undefined) return translated;
  if (/\p{Script=Han}/u.test(text)) missing.add(text);
  return text;
};

/** 校验并使用已审阅的英文译文 */
export const assertDataTransformApiReferenceTranslated = (): void => {
  if (missing.size)
    throw new Error(`Data transform API translations missing:\n${JSON.stringify([...missing], null, 2)}`);
};
