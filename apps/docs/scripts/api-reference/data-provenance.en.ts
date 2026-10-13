const translations: Partial<Record<string, string>> = {
  '使用 sink 时是否仍在返回值中保留 events；默认 false，未设置 sink 时始终保留':
    'Whether to retain returned events with a sink; defaults to false with a sink, and events are always retained without one',
  本次发出的链路事件: 'The lineage event being emitted',
  回调返回值不参与执行结果: 'The callback return value does not contribute to the execution result',
  待读取来源的行: 'Row whose provenance is being read',
  '单行来源索引；不存在时返回 undefined': 'Single-row source index, or undefined when absent',
  '行上保存的来源索引数组引用；不存在时返回 undefined':
    'Reference to the source index array stored on the row, or undefined when absent',
  待标记的输入行: 'Input rows to mark',
  '新数组及各行的浅拷贝；保留已有来源，为未标记行建立当前下标来源':
    'A new array of shallow row copies; preserves existing provenance and assigns current indices to unmarked rows',
  'data lineage 事件': 'Data lineage event',
  事件类型: 'Event kind',
  输入数据行数: 'Number of input rows',
  输入来源索引摘要: 'Input source index summary',
  'definition 声明的输入字段': 'Input fields declared by the Definition',
  输入行数: 'Number of input rows',
  'transform 在声明数组中的下标': 'Transform index in the declaration array',
  数据变换种类: 'Transform kind',
  'definition 声明的输出字段': 'Output fields declared by the Definition',
  输出行数: 'Number of output rows',
  输出来源索引摘要: 'Output source index summary',
  '诊断详情样本；仅 calculationDetails 开启时存在':
    'Diagnostic samples; present only when calculationDetails is enabled',
  'reducer operation 配置摘要；只包含 JSON-safe operation 字段，不包含行值':
    'Reducer configuration summary containing only JSON-safe operation fields, without row values',
  聚合归约种类: 'Reducer kind',
  'reducer 本次消费的行数': 'Number of rows consumed by this reducer invocation',
  'reducer 输入行来源摘要': 'Source summary of reducer input rows',
  'selector operation 配置摘要；只包含 JSON-safe operation 字段，不包含行值':
    'Selector configuration summary containing only JSON-safe operation fields, without row values',
  选择器种类: 'Selector kind',
  'selector 本次消费的行数': 'Number of rows consumed by this selector invocation',
  被选行来源摘要: 'Source summary of selected rows',
  'selector 输入行来源摘要': 'Source summary of selector input rows',
  '样本来自 transform 输入还是输出': 'Whether samples come from transform input or output',
  '裁剪后的 row 样本': 'Row samples restricted to the configured fields and limit',
  'transform 字段流事件': 'Transform field flow event',
  'data lineage 运行时开关': 'Runtime data lineage options',
  '记录 reducer 输入值或 selector 候选详情，必须显式限制行数和字段':
    'Records reducer input values or selector candidate details; row and field limits must be explicit',
  '记录字段级读取 / 产出关系': 'Records field reads and outputs',
  '记录 reducer kind、目标字段和输入字段，不记录每行输入值':
    'Records reducer kind, target fields, and input fields without per-row input values',
  '使用 sink 时是否仍在返回值中保留 events；默认 false，未设置 sink 时默认 true':
    'Whether to retain returned events when a sink is set; defaults to false with a sink and true without one',
  '记录 transform 前后 row 样本，必须显式限制行数和字段':
    'Records row samples before and after transforms; row and field limits must be explicit',
  '记录 selector kind、排序 / 分组选项和被选行 sourceIdentity，不记录候选排名':
    'Records selector kind, sorting and grouping options, and selected sourceIdentity, without candidate rankings',
  事件流式消费回调: 'Callback for consuming events as they are emitted',
  '记录 sourceIndex / sourceIndices；对象存在时默认 summary + maxIndices: 20':
    'Records sourceIndex / sourceIndices; an options object defaults to summary with maxIndices: 20',
  '记录 transform 顺序、kind、输入 / 输出行数与输入 / 输出字段':
    'Records transform order, kind, input and output row counts, and input and output fields',
  'reducer 操作摘要事件': 'Reducer operation summary event',
  'data lineage 运行结果': 'Data lineage run result',
  本次运行记录到的事件: 'Events retained for this run',
  'row sample 事件': 'Row sample event',
  'selector 操作摘要事件': 'Selector operation summary event',
  'data lineage 事件 sink': 'Data lineage event sink',
  原始数据来源事件: 'Original data source event',
  'transform step 摘要事件': 'Transform step summary event',
  数据来源索引摘要: 'Data source index summary',
  来源索引总数: 'Total number of source indices',
  '记录的来源索引；summary 模式为 capped 前缀，full 模式为完整列表':
    'Recorded source indices: a capped prefix in summary mode or the complete list in full mode',
  '记录模式；summary 是默认安全摘要，full 只在显式开启时出现':
    'Recording mode: summary is the default bounded summary; full requires explicit opt-in',
  'summary 模式下是否因 maxIndices 截断': 'Whether maxIndices truncated the list in summary mode',
  数据来源索引记录选项: 'Data source index recording options',
  'summary 模式下保留的 sourceIndices 前缀长度，必须为正整数':
    'Length of the sourceIndices prefix retained in summary mode; must be a positive integer',
  'summary 只记录 count + 前 maxIndices 个索引；full 只允许显式开启':
    'summary records count and the first maxIndices indices; full requires explicit opt-in',
  记录行值样本的安全白名单选项: 'Explicit limits and field allowlist for row value samples',
  '允许记录值的字段白名单，必须非空；不允许省略后记录整行':
    'Non-empty allowlist of fields whose values may be recorded; omitting it cannot enable whole-row recording',
  '最大记录行数，必须为正整数': 'Maximum number of recorded rows; must be a positive integer',
  数据来源索引摘要模式: 'Data source index summary mode',
  行级源序标记: 'Single-row source index marker',
  '数据进入 pipeline 时给每行打 `row[SOURCE_INDEX]=i`；Symbol 键不进 JSON.stringify，也不会被字符串路径解析读取':
    'Marks each input row with `row[SOURCE_INDEX]=i`; the Symbol key is ignored by JSON.stringify and string-path lookup',
  '组级源序标记：改行数 transform 给每个输出行打 `row[SOURCE_INDICES]=[...]`':
    'Group source index marker: transforms that change row counts mark output rows with `row[SOURCE_INDICES]=[...]`',
  '聚合 / 分箱等输出行可代表一组源行，故 provenance 记录源行索引集合':
    'Aggregation and binning outputs can represent multiple source rows, so provenance records their source indices',
  '读一行的源序标记；未打标记时返回 undefined': 'Reads a row source index; returns undefined when the row is unmarked',
  '读一行的组级源序标记；bin / summarize 输出行可能携带':
    'Reads group source indices, which may be present on bin / summarize output rows',
  给每行打源序标记: 'Assigns source index markers to rows',
  '已有行级或组级来源身份保持不变；未标记行才使用当前数组下标。object spread 会保留可枚举 symbol 属性，resolveFieldPath / JSON 都忽略它':
    'Preserves existing row or group provenance; only unmarked rows use their current array index. Object spread preserves enumerable symbol properties, while resolveFieldPath and JSON ignore them',
};
const missing = new Set<string>();

/** 使用已审阅的溯源英文说明 */
export const translateDataProvenance = (source: string): string => {
  const text = source.trim();
  if (translations[text] !== undefined) return translations[text];
  if (/\p{Script=Han}/u.test(text)) missing.add(text);
  return text;
};

/** 缺译时阻止发布英文参考 */
export const assertDataProvenanceTranslated = (): void => {
  if (missing.size) throw new Error(`Missing provenance translations: ${JSON.stringify([...missing], null, 2)}`);
};
