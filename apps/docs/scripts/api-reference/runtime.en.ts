const translations: Record<string, string> = {
  '待注册的来源凭证；空数组建立空注册表': 'Source tokens to register; an empty array creates an empty registry',
  '计算身份或 Trace 声明无效时抛出': 'Invalid computation identity or Trace declarations',
  '已验证并补齐 owner 的性能记录': 'Validated performance record with its owner filled in',
  '无返回值；异常由报告器隔离为 sink-threw 诊断':
    'No return value; the reporter isolates exceptions as sink-threw diagnostics',
  '来源键及值的捕获、读取、比较和释放契约': 'Source key and value capture, read, equality, and disposal contract',
  '冻结的来源凭证；回调由运行时私有保存': 'Frozen Source token; callbacks are stored privately by Runtime',
  '来源键为空时抛出 TokenInvalid': 'TokenInvalid when the Source key is empty',
  '计算身份、依赖、执行回调与结果生命周期': 'Computation identity, dependencies, callbacks, and result lifecycle',
  '冻结的计算凭证；回调由运行时私有保存': 'Frozen Computation token; callbacks are stored privately by Runtime',
  '参与者依赖、选择策略与事务回调': 'Participant dependencies, selection policy, and transaction callbacks',
  '只能由一个 Runtime 接管的参与者凭证': 'Participant token that can be owned by only one Runtime',
  '参与者键为空或 Trace 声明无效时抛出': 'Empty participant key or invalid Trace declarations',
  '冻结的来源注册表，保留原始凭证身份': 'Frozen Source registry preserving original token identity',
  '凭证不是由 defineRuntimeSource 创建或来源键重复时抛出':
    'Token not created by defineRuntimeSource or duplicate Source key',
  绑定的来源注册表与待注册计算: 'Bound Source registry and computations to register',
  按依赖优先顺序查询计算的冻结注册表: 'Frozen registry exposing computations in dependency-first order',
  '凭证、依赖绑定、计算身份或依赖图无效时抛出':
    'Invalid token, dependency binding, computation identity, or dependency graph',
  所属来源的非空键: 'Non-empty key of the owning Source',
  '至少含一个非空字符串的路径；保留原始大小写与空白':
    'Path with at least one non-empty string; preserves case and whitespace',
  复制并冻结路径后的身份对象: 'Identity object with a copied and frozen path',
  'owner 或路径不符合身份契约时抛出 IdentityInvalid':
    'IdentityInvalid when the owner or path violates the identity contract',
  要比较的第一个身份: 'First identity to compare',
  要比较的第二个身份: 'Second identity to compare',
  'owner 与每个路径段均相等时为 true': 'True when the owner and every path segment match',
  该查询表绑定的非空来源键: 'Non-empty Source key bound to the lookup',
  属于同一来源且不重复的合法身份: 'Valid, unique identities belonging to the same Source',
  '复制并冻结身份后的查询表；values 按路径顺序返回副本':
    'Lookup containing copied and frozen identities; values returns copies in path order',
  'owner 为空、身份归属不匹配或路径重复时抛出 IdentityInvalid':
    'IdentityInvalid for an empty owner, mismatched ownership, or duplicate path',
  非负安全整数: 'Non-negative safe integer',
  '带 RuntimeRevision 类型品牌的原数值': 'Original number branded as RuntimeRevision',
  '数值不是非负安全整数时抛出 RevisionInvalid': 'RevisionInvalid when the number is not a non-negative safe integer',
  变更提示所基于的已发布版本: 'Published revision on which the change hint is based',
  '领域变更提示；仅复制并冻结数组，不克隆其中的元素':
    'Domain change hints; only the array is copied and frozen, not its elements',
  绑定版本并由当前工厂标记的变更提示: 'Revision-bound change hint branded by this factory',
  'baseRevision 无效时抛出 RevisionInvalid': 'RevisionInvalid when baseRevision is invalid',
  待初始化的来源定义: 'Source definition to initialize',
  '完整初始输入；capture 在 Runtime 初始化时执行': 'Complete initial input; capture runs during Runtime initialization',
  '供 initialSnapshots 使用的不透明初始化命令': 'Opaque initialization command for initialSnapshots',
  待更新的来源定义: 'Source definition to update',
  '完整下一份输入；capture 在 Runtime 更新时执行': 'Complete next input; capture runs during a Runtime update',
  '可选增量提示；不替代完整输入': 'Optional incremental hint; does not replace the complete input',
  '供 RuntimeUpdate.sources 使用的不透明更新命令': 'Opaque update command for RuntimeUpdate.sources',
  'changeSet 不是由当前工厂创建时抛出 ChangeSetInvalid':
    'ChangeSetInvalid when changeSet was not created by this factory',
  '固定归属、允许的阶段与同步接收函数': 'Fixed owner, allowed phases, and synchronous sink',
  '隔离非法记录、接收函数异常与重入的报告器':
    'Reporter isolating invalid records, sink failures, and reentrant reports',
  'owner 为空、阶段与单位重复或 outcomes 为空时抛出 TraceDefinitionInvalid':
    'TraceDefinitionInvalid for an empty owner, duplicate phase/unit pair, or empty outcomes',
  '来源、计算、完整初始输入与可选参与者配置':
    'Sources, computations, complete initial inputs, and optional participants',
  '已完成初始计算和参与者提交、revision 为 0 的同步 Runtime':
    'Synchronous Runtime after initial computation and participant commit, at revision 0',
  '注册绑定、初始输入或参与者无效，以及初始化执行或提交失败时抛出':
    'Invalid registry binding, initial input, or participant, or failed initialization execution or commit',
  'Runtime 公共契约或 transaction 失败的结构化错误': 'Structured error for a Runtime contract or transaction failure',
  '创建保留稳定 code、context 与 secondary diagnostics 的 Runtime 错误':
    'Creates a Runtime error preserving its stable code, context, and secondary diagnostics',
  原始错误或无效输入: 'Original error or invalid input',
  稳定错误分类: 'Stable error category',
  '可选 Computation context': 'Optional Computation context',
  'cleanup 等 secondary diagnostics': 'Secondary diagnostics such as cleanup failures',
  '可选来源归属，例如 Source key 或 participant key': 'Optional owner, such as a Source key or participant key',
  '发生失败的 Runtime 阶段': 'Runtime phase in which the failure occurred',
  '创建 trace reporter 的配置': 'Options for creating a trace reporter',
  '报告器固定绑定的来源名称类型，保留 owner 的字面量信息；默认沿用 string':
    'Owner name type bound to the reporter, preserving its literal type; defaults to string',
  'reporter 固定绑定的 owner': 'Owner permanently bound to the reporter',
  'owner 可以报告的阶段定义': 'Phase definitions this owner may report',
  接收合法记录的同步回调: 'Synchronous callback receiving valid records',
  'trace reporter 的非致命诊断': 'Non-fatal trace reporter diagnostic',
  诊断类别: 'Diagnostic category',
  'reporter 绑定的 owner': 'Owner bound to the reporter',
  触发诊断的执行阶段: 'Execution phase that triggered the diagnostic',
  '一次 owner 执行阶段的确定性工作量记录': 'Deterministic work counts for one owner execution phase',
  '本阶段发生变化的实体 occurrence 数': 'Number of entity occurrences changed in this phase',
  阶段的完成方式: 'How the phase completed',
  '发出记录的 owner': 'Owner emitting the record',
  被观测的执行阶段: 'Observed execution phase',
  '本阶段复用的实体 occurrence 数': 'Number of entity occurrences reused in this phase',
  阶段使用的计数单位: 'Counting unit used by the phase',
  '本阶段访问的实体 occurrence 数': 'Number of entity occurrences visited in this phase',
  接收已验证性能记录的同步出口: 'Synchronous sink for validated performance records',
  '原子发布 revision、Source Snapshot 与 Computation result 的同步 runtime':
    'Synchronous runtime that atomically publishes revisions, Source snapshots, and Computation results',
  '返回并清空累计 diagnostics': 'Returns and clears accumulated diagnostics',
  '反向释放 committed participant、Computation result 与 Source value；失败 participant 可重复调用重试':
    'Disposes committed participants, Computation results, and Source values in reverse order; repeated calls retry failed participants',
  '读取 participant 在当前 revision 的 committed public read':
    "Reads the participant's committed public view at the current revision",
  '读取 Computation 在当前 revision 的 public result Snapshot':
    "Reads the Computation's public result snapshot at the current revision",
  '返回当前已发布 revision': 'Returns the currently published revision',
  '读取 Source 在当前 revision 的 immutable Snapshot': "Reads the Source's immutable snapshot at the current revision",
  '同步准备并原子发布一次完整 update': 'Synchronously prepares and atomically publishes a complete update',
  'CandidateView 的 typed Source 与 Computation lookup': 'Typed Source and Computation lookups for CandidateView',
  '读取已通过 Runtime envelope/revision 校验的 change hint；领域完整性由消费提示的 Computation 校验':
    'Reads a change hint whose envelope and revision have passed Runtime validation; the consuming Computation validates domain completeness',
  '判断已声明 Source 是否在当前 candidate transaction 中发生实际变化':
    'Whether a declared Source actually changed in the current candidate transaction',
  '读取已声明 upstream Computation 的 public result view': "Reads a declared upstream Computation's public result view",
  '读取已声明 Source 的 candidate Snapshot': "Reads a declared Source's candidate snapshot",
  'Computation prepare 期间只读且带 phase 的 candidate view':
    'Readonly candidate view with a phase discriminator during Computation preparation',
  'candidate 完整发布后使用的 revision': 'Revision used after the complete candidate is published',
  'initial candidate 不存在 base revision': 'An initial candidate has no base revision',
  'initial runtime 的 full prepare': 'Full preparation for runtime initialization',
  'update 基于的 current revision': 'Current revision on which the update is based',
  '已有 runtime 的 update prepare': 'Update preparation for an existing runtime',
  '绑定 base revision 的领域 change hint': 'Domain change hint bound to a base revision',
  '领域变更提示的单项类型，由消费它的计算校验并用于增量处理':
    'Individual domain change hint type, validated and consumed by a computation for incremental processing',
  'Computation commit observer 接收的 revision-bound 事件':
    'Revision-bound event received by a Computation commit observer',
  '依赖计算、提交观察者和宿主可读取的公开结果视图类型':
    'Public result view readable by dependent computations, commit observers, and the host',
  'publish 前冻结的 commit-safe diagnostics': 'Commit-safe diagnostics frozen before publication',
  '已发布 result 的 public Snapshot': 'Public snapshot of the published result',
  '初始提交不存在 base revision': 'An initial commit has no base revision',
  '初始 Computation 固定使用 full outcome': 'An initial Computation always has a full outcome',
  初始提交判别字段: 'Initial commit discriminator',
  '已发布的 runtime revision': 'Published runtime revision',
  'update 基于的 previous revision': 'Previous revision on which the update is based',
  '当前 Computation 的实际执行结果': 'Actual execution outcome of the current Computation',
  更新提交判别字段: 'Update commit discriminator',
  '已发布的 next revision': 'Published next revision',
  '保留 committed public read 类型的 participant token': 'Participant token preserving the committed public read type',
  提交参与者对宿主暴露的已提交只读视图类型: 'Committed readonly view exposed by the participant to the host',
  'Runtime commit participant 的作者侧输入': 'Author input for a Runtime commit participant',
  'participant 声明读取的 Computation tokens': 'Computation tokens the participant declares as dependencies',
  '释放 participant 持有的宿主状态': 'Disposes host state owned by the participant',
  'participant 的稳定唯一 key': 'Stable unique participant key',
  '为 candidate staging 一次可回滚 commit': 'Stages a rollback-capable commit for the candidate',
  '生成与已 commit view 对应的 immutable public read':
    'Produces an immutable public read corresponding to the committed view',
  'participant 的 update 选择策略': 'Participant selection policy for updates',
  'participant 声明读取的 Source tokens': 'Source tokens the participant declares as dependencies',
  'participant 允许发射的 trace phases': 'Trace phases the participant may emit',
  '动态 runtime options 只暴露的 commit participant token':
    'Commit participant token exposed by dynamic runtime options',
  'Computation callback 可用的 trace 与 warning context':
    'Trace and warning context available to Computation callbacks',
  '追加由 Runtime 统一归属的 commit-safe warning':
    'Appends a commit-safe warning whose attribution is assigned by Runtime',
  '当前 callback 的实际执行方式': 'Actual execution mode of the current callback',
  '固定绑定 Computation Source 的 trace reporter': "Trace reporter bound to the Computation's Source",
  '保留 result 四组泛型关系的 typed Computation token':
    'Typed Computation token preserving the four result type relationships',
  'run 或 update 产生、交给 result capture 的结果输入类型':
    'Result input produced by run or update and passed to result capture',
  'capture 产生并由运行时持有和释放的计算结果类型；默认沿用 TResultInput':
    'Captured computation result owned and disposed by the runtime; defaults to TResultInput',
  '仅供当前计算的 update 读取旧结果的私有视图类型；默认沿用 TResult':
    "Private previous-result view used only by this computation's update; defaults to TResult",
  '依赖计算、提交观察者和宿主可读取的公开结果视图类型；默认沿用 TResult':
    'Public result view for dependent computations, commit observers, and the host; defaults to TResult',
  'Runtime Computation Definition 的作者侧输入': 'Author input for a Runtime Computation definition',
  'Runtime Computation 的结构化 identity': 'Structured identity of a Runtime Computation',
  'Source 内精确匹配的 Computation key': 'Exactly matched Computation key within a Source',
  'Computation 归属的领域 Source': 'Domain Source owning the Computation',
  '统一解析 typed Computation token 并暴露稳定拓扑顺序的 registry':
    'Registry resolving typed Computation tokens and exposing a stable topological order',
  '按依赖优先和 code-unit tie-break 返回 immutable token copy':
    'Returns an immutable token copy in dependency-first order with code-unit tie-breaking',
  '动态 identity lookup 只返回不含 callback 的 token': 'Dynamic identity lookup returns only tokens without callbacks',
  '以原 Definition token 恢复完整泛型': 'Restores the full generic types from the original definition token',
  'Computation registry 的 Source binding 与计算列表输入':
    'Source binding and computation list for a Computation registry',
  '待注册的计算凭证，默认空列表': 'Computation tokens to register; defaults to an empty list',
  'Computation dependencies 必须来自的 Source registry':
    'Source registry from which Computation dependencies must originate',
  'Computation result 的 capture、双层 read 与释放契约':
    'Capture, private and public read, and disposal contract for a Computation result',
  '动态 graph lookup 只暴露的 opaque Computation token': 'Opaque Computation token exposed by dynamic graph lookups',
  'Computation callback 只能写入、不能 drain 的 Source-bound trace facade':
    'Source-bound trace facade that Computation callbacks can write to but cannot drain',
  '校验并报告一条不含 owner 的性能记录': 'Validates and reports a performance record without an owner field',
  'Computation callback 可提交的无归属 warning 输入':
    'Warning input without attribution submitted by Computation callbacks',
  '稳定 warning 分类': 'Stable warning category',
  '面向开发者的 warning 信息': 'Warning message for developers',
  '产生 warning 的领域阶段': 'Domain phase that produced the warning',
  'Runtime 提交或执行阶段产生的结构化诊断': 'Structured diagnostic produced during Runtime execution or commit',
  隔离的原始非致命错误: 'Isolated original non-fatal error',
  稳定诊断分类: 'Stable diagnostic category',
  '关联的 Computation identity': 'Associated Computation identity',
  面向开发者的诊断信息: 'Diagnostic message for developers',
  '来源归属，例如 Source key 或 participant key': 'Owner, such as a Source key or participant key',
  产生诊断的执行阶段: 'Execution phase that produced the diagnostic',
  诊断严重级别: 'Diagnostic severity',
  '跨 revision 稳定的结构化 Runtime identity': 'Structured Runtime identity stable across revisions',
  'identity 所属领域 Source': 'Domain Source owning the identity',
  不做规范化的非空路径段: 'Non-empty path segments without normalization',
  '单个 Source 的 validated identity lookup': 'Validated identity lookup for a single Source',
  '按 segment exact equality 查询 identity': 'Looks up an identity using exact segment equality',
  'lookup 绑定的 Source': 'Source bound to the lookup',
  'identity 数量': 'Number of identities',
  '按 path code-unit 顺序返回 immutable copy': 'Returns an immutable copy sorted by path code units',
  '同步 Runtime runtime 的创建配置': 'Options for creating a synchronous Runtime',
  '与同一 Source registry 绑定的 Computation registry': 'Computation registry bound to the same Source registry',
  '精确覆盖 Source registry 的初始完整 Snapshot commands':
    'Initial complete snapshot commands covering the Source registry exactly',
  '可选的领域中立 commit participants': 'Optional domain-neutral commit participants',
  'runtime state 所属的 Source registry': 'Source registry owning the runtime state',
  '可选性能 trace sink': 'Optional performance trace sink',
  'Computation 更新策略': 'Computation update strategy',
  'participant candidate 只允许读取已声明依赖': 'Participant candidate lookup restricted to declared dependencies',
  '读取 Computation candidate public result Snapshot': "Reads a Computation's candidate public result snapshot",
  '读取 Source candidate Snapshot': "Reads a Source's candidate snapshot",
  'participant prepare 期间只读且带 phase 的 candidate view':
    'Readonly candidate view with a phase discriminator during participant preparation',
  初始化运行时使用的候选状态: 'Candidate state for runtime initialization',
  运行时更新使用的候选状态: 'Candidate state for a runtime update',
  'participant prepare callback 可用的 trace 与 warning context':
    'Trace and warning context available to participant prepare callbacks',
  '固定绑定 participant key 的 trace reporter': 'Trace reporter bound to the participant key',
  'participant callback 只能写入、不能 drain 的 trace facade':
    'Trace facade that participant callbacks can write to but cannot drain',
  'participant callback 可提交的 warning 输入': 'Warning input submitted by participant callbacks',
  'participant prepare 产生的单次 transaction token': 'Per-transaction token produced by participant preparation',
  '应用已完成领域校验的 staging state': 'Applies staging state that has passed domain validation',
  '释放本次 transaction token': 'Disposes this transaction token',
  '恢复 commit 前状态': 'Restores the state preceding commit',
  '一次同步 runtime update 的公开结果': 'Public result of a synchronous runtime update',
  '本次调用产生的 immutable diagnostics': 'Immutable diagnostics produced by this call',
  '本次 transaction 的聚合执行结果': 'Aggregated execution outcome of this transaction',
  '成功发布后的 runtime revision': 'Runtime revision after successful publication',
  '单调递增且不超过 safe integer 的 Runtime revision':
    'Monotonically increasing Runtime revision bounded by the maximum safe integer',
  'full Computation 执行产生的新 result 输入': 'New result input produced by a full Computation execution',
  'full 执行判别字段': 'Full execution discriminator',
  '交给 result capture 的新输入': 'New input passed to result capture',
  '绑定所属 runtime revision 的 immutable read envelope': 'Immutable read envelope bound to its runtime revision',
  '快照中 value 承载的 Source 或计算结果只读视图类型':
    "Readonly Source or computation-result view stored in the snapshot's value",
  '当前 view 所属的 runtime revision': 'Runtime revision owning the current view',
  'source 或 Computation 暴露的 immutable read view': 'Immutable read view exposed by a Source or Computation',
  '保留 input/value/read/change 泛型的 typed source token':
    'Typed Source token preserving input, value, read, and change types',
  'Source 接收的完整作者输入，由 capture 转为运行时持有值':
    'Complete author input accepted by the Source and captured into a runtime-owned value',
  'Source 经 capture 产生并由运行时持有、比较和释放的值':
    'Captured Source value owned, compared, and disposed by the runtime',
  'Source 的只读视图类型，由 read 从持有值生成并通过快照暴露':
    'Readonly Source view produced by read and exposed through snapshots',
  'Runtime source Definition 的作者侧输入': 'Author input for a Runtime Source definition',
  '从 captured value 收集该 source 的完整 identity 集合':
    "Collects the Source's complete identity set from its captured value",
  '全局精确匹配的非空 source key': 'Non-empty Source key matched exactly across the registry',
  'source value 的完整 Snapshot lifecycle': 'Complete snapshot lifecycle of the Source value',
  'Source executor 的成功结果与非致命诊断': 'Successful Source executor result and non-fatal diagnostics',
  'Source 执行成功时 value 字段承载的结果类型': 'Result type carried by value after successful Source execution',
  执行过程中隔离的非致命诊断: 'Non-fatal diagnostics isolated during execution',
  成功结果: 'Successful result',
  '初始 Snapshot 的 opaque source command': 'Opaque Source command for an initial snapshot',
  'Runtime Source value 释放失败的非致命诊断': 'Non-fatal diagnostic for a Runtime Source value disposal failure',
  原始错误: 'Original error',
  诊断分类: 'Diagnostic category',
  可读错误信息: 'Readable error message',
  '发生失败的 Source': 'Source in which the failure occurred',
  释放阶段: 'Disposal phase',
  'lifecycle cleanup 固定为非致命 error diagnostic': 'Lifecycle cleanup always produces a non-fatal error diagnostic',
  '统一解析 typed Source token 的 immutable registry': 'Immutable registry resolving typed Source tokens',
  '按 key code-unit 顺序返回 immutable token copy': 'Returns an immutable token copy sorted by key code units',
  '动态 key lookup 只返回不含 callback 的 token': 'Dynamic key lookup returns only tokens without callbacks',
  '动态 registry lookup 只暴露的 opaque source token': 'Opaque Source token exposed by dynamic registry lookups',
  '更新 Snapshot 的 opaque source command': 'Opaque Source command for an updated snapshot',
  'source value 的 capture、read、semantic equality 与释放契约':
    'Capture, read, semantic equality, and disposal contract for a Source value',
  '从完整输入捕获 runtime-owned value': 'Captures a runtime-owned value from complete input',
  '释放未发布或已替换的 captured value': 'Disposes an unpublished or replaced captured value',
  '比较两个完整 captured value 的语义等价性': 'Compares two complete captured values for semantic equality',
  '产生不携带 disposable handle 的 immutable read view': 'Produces an immutable read view without disposable handles',
  'owner 允许报告的阶段、单位与结果组合': 'Allowed phase, unit, and outcome combinations for an owner',
  阶段允许报告的结果: 'Outcomes the phase may report',
  阶段名称: 'Phase name',
  阶段唯一的计数单位: 'Single counting unit for the phase',
  '由 Runtime 固定 owner 的同步 trace reporter': 'Synchronous trace reporter with an owner fixed by Runtime',
  '返回并清空 reporter-local 诊断': 'Returns and clears reporter-local diagnostics',
  '一次同步 runtime update 的完整输入': 'Complete input for a synchronous runtime update',
  '本次提供完整 next Snapshot 的 source commands': 'Source commands providing complete next snapshots for this update',
  'incremental Computation 执行的三种可观察结果': 'Three observable outcomes of incremental Computation execution',
  'incremental 执行判别字段': 'Incremental execution discriminator',
  '复用 committed result 的判别字段': 'Discriminator for reusing the committed result',
  '随成功 full 结果提交的可选 warnings': 'Optional warnings committed with the successful full result',
  '放弃增量路径并执行 full run 的判别字段': 'Discriminator for abandoning the incremental path and running in full',
  '性能 trace 的执行结果常量': 'Performance trace outcome constants',
  '性能 trace 的执行阶段常量': 'Performance trace phase constants',
  '性能 trace 的计数单位常量': 'Performance trace counting unit constants',
  'Runtime transaction、Computation、registry、Source 与 participant 的稳定错误码':
    'Stable error codes for Runtime transactions, Computations, registries, Sources, and participants',
  'Runtime Computation callback 的实际执行方式常量':
    'Actual execution mode constants for Runtime Computation callbacks',
  'Runtime Computation callback 结果的 kind 常量': 'Result kind constants for Runtime Computation callbacks',
  'Runtime Computation 的 candidate 与 commit 执行阶段常量':
    'Candidate and commit phase constants for Runtime Computations',
  'Runtime 内置结构化诊断码': 'Built-in Runtime structured diagnostic codes',
  'Runtime 结构化诊断的发生阶段': 'Phases in which Runtime structured diagnostics occur',
  'Runtime Source 生命周期阶段': 'Runtime Source lifecycle phases',
  'Runtime Runtime 更新策略': 'Runtime update strategies',
  '创建同步 Snapshot transaction runtime': 'Creates a synchronous snapshot transaction runtime',
  '创建复制并冻结 changes 容器的 revision-bound change hint':
    'Creates a revision-bound change hint by copying and freezing the changes container',
  '注册 Computation Definitions 并验证 Source binding 与 DAG':
    'Registers Computation definitions and validates Source binding and the dependency DAG',
  '创建并冻结一个 Runtime identity': 'Creates and freezes a Runtime identity',
  '创建复制输入、验证 Source/唯一性并稳定排序的 identity lookup':
    'Creates an identity lookup that copies input, validates Source ownership and uniqueness, and sorts stably',
  '把已验证 safe integer 转成 Runtime 内部 revision': 'Converts a validated safe integer into a Runtime revision',
  '在 concrete source 泛型仍可见时创建初始 Snapshot command':
    'Creates an initial snapshot command while preserving the concrete Source generic types',
  '注册来源 token，并拒绝无效 token 与重复 key': 'Registers Source tokens, rejecting invalid tokens and duplicate keys',
  '在 concrete source 泛型仍可见时创建更新 Snapshot command':
    'Creates an update snapshot command while preserving the concrete Source generic types',
  '创建一个固定 owner 且失败隔离的同步 trace reporter':
    'Creates a synchronous trace reporter with a fixed owner and isolated failures',
  '报告器固定绑定的来源名称类型，保留 owner 的字面量信息':
    'Owner name type bound to the reporter, preserving its literal type',
  '定义 nominal Runtime commit participant': 'Defines a nominal Runtime commit participant',
  '创建不暴露 author callbacks 的 typed Computation token':
    'Creates a typed Computation token without exposing author callbacks',
  '创建不暴露 author callbacks 的 typed source token': 'Creates a typed Source token without exposing author callbacks',
  '按 Source、path 长度与 segment exact equality 比较 identity':
    'Compares identities by Source, path length, and exact segment equality',
};

/** 使用审阅后的英文说明，缺译时终止生成 */
export const translateRuntimeApiReference = (source: string): string => {
  if (!/[\u3400-\u9fff]/u.test(source)) return source;
  const translated = translations[source];
  if (translated) return translated;
  throw new Error(`Missing reviewed Runtime API translation: ${source}`);
};
