/** @retikz/foundation 中文 JSDoc 的审阅后英文投影 */
const translations: Readonly<Record<string, string>> = {
  提供属性值的对象类型: 'Object type that provides the property values',
  待比较的实际类型: 'Actual type being compared',
  作为比较基准的预期类型: 'Expected type used as the comparison baseline',
  已知字符串字面量的联合类型: 'Union of known string literals',
  待调整属性的对象类型: 'Object type whose properties are adjusted',
  需要设为必填的属性键: 'Property keys made required',
  需要设为可选的属性键: 'Property keys made optional',
  数组元素类型: 'Array element type',
  'Map 键类型': 'Map key type',
  'Map 值类型': 'Map value type',
  被合并的对象类型: 'Object type being merged',
  被浅合并的对象类型: 'Object type being shallowly merged',
  输入值的静态类型: 'Static type of the input value',
  '已知字符串值的 const object enum 类型': 'Const-object enum type of known string values',
  错误分类代码的字符串类型: 'String type of the error classification code',
  与错误代码关联的结构化详情类型: 'Structured detail type associated with the error code',
  'Foundation 错误码的具体字面量类型': 'Concrete literal type of a Foundation error code',
  '与 Foundation 错误码关联的结构化详情类型': 'Structured detail type associated with a Foundation error code',
  导致当前错误的原始异常或值: 'Original exception or value that caused this error',
  结构化错误的分类代码: 'Classification code of the structured error',
  与错误代码关联的结构化错误详情: 'Structured error details associated with the error code',
  面向调用方的错误消息: 'Error message for the caller',
  属性浅合并的写入策略: 'Write policy for shallow property merging',
  '决定源属性是否参与写入；首次写入也调用，返回 false 时保留已有值':
    'Decides whether a source property is written; also runs for initial writes, and false preserves any existing value',
  '从左到右浅合并对象的自身可枚举属性，返回新对象':
    'Shallowly merges own enumerable properties from left to right into a new object',
  '包含字符串与 symbol 键，跳过 undefined 源；默认保留所有属性值，不递归合并或修改输入':
    'Includes string and symbol keys and skips undefined sources; preserves all property values by default without recursively merging or mutating inputs',
  按优先级从低到高排列的源对象: 'Source objects ordered from lowest to highest priority',
  属性写入策略: 'Property write policy',
  '可能经过过滤的新对象，因此返回类型为 `Partial<T>`':
    'A new, potentially filtered object, hence the `Partial<T>` return type',
  '属性读取或策略回调失败时抛出 RetikzFoundationError，原始异常保留为 cause':
    'Throws RetikzFoundationError when reading a property or invoking the policy fails, preserving the original exception as cause',
  'Retikz 结构化领域错误的基础骨架': 'Base structure for Retikz structured domain errors',
  'Foundation 原子契约失败的统一结构化错误': 'Unified structured error for Foundation atomic-contract failures',
  双向检查两个类型是否等价: 'Bi-directionally checks whether two types are equivalent',
  '字符串键 JSON 对象': 'String-keyed JSON object',
  '单个递归 JSON 值；readonly 数组允许 const Source 在 parse 边界直接收窄':
    'A single recursive JSON value. Readonly arrays allow const sources to narrow directly at the parse boundary.',
  至少包含一个元素的只读数组: 'Readonly array with at least one element',
  '保留已知字符串提示，同时接受任意字符串': 'Preserves known-string suggestions while accepting any string',
  '归一化 sRGB 颜色与 alpha': 'Normalized sRGB color with alpha',
  '不透明度，范围 0~1': 'Opacity in the range 0–1',
  '蓝色通道，范围 0~1': 'Blue channel in the range 0–1',
  '绿色通道，范围 0~1': 'Green channel in the range 0–1',
  '红色通道，范围 0~1': 'Red channel in the range 0–1',
  'Retikz 结构化领域错误的基础构造参数': 'Base construction parameters for a Retikz structured domain error',
  'Foundation 包稳定错误码取值': 'Stable Foundation package error-code values',
  '取得对象所有 value 的联合类型': 'Obtains the union of all object values',
  '将指定属性收窄为必填，同时保留其余属性':
    'Narrows selected properties to required while preserving the remaining properties',
  '将指定属性扩展为可选，同时保留其余属性':
    'Makes selected properties optional while preserving the remaining properties',
  '字符串键 JSON 对象 schema': 'Schema for a string-keyed JSON object',
  '递归 JSON 值 schema': 'Schema for recursive JSON values',
  '非空白字符串 schema': 'Schema for non-blank strings',
  '非负整数 schema': 'Schema for non-negative integers',
  '非负数 schema': 'Schema for non-negative numbers',
  '闭区间 0..1 内的归一化数值 schema': 'Schema for normalized numbers in the closed interval 0..1',
  '正整数 schema': 'Schema for positive integers',
  '正数 schema': 'Schema for positive numbers',
  'Foundation 包稳定错误码': 'Stable Foundation package error codes',
  '静态 CSS 命名颜色对应的小写十六进制清单': 'Lowercase hexadecimal values for static named CSS colors',
  '仅包含 `parseStaticCssColor()` 支持的命名颜色，不包含 transparent、函数和十六进制写法':
    'Contains only named colors supported by `parseStaticCssColor()`; excludes transparent, functions, and hexadecimal notation.',
  拒绝空串和全空白字符串: 'Rejects empty and all-whitespace strings',
  '断言一棵外部数据树只使用普通对象、普通数组与安全属性描述符':
    'Asserts that an external data tree uses only plain objects, plain arrays, and safe property descriptors',
  待检查的外部数据树: 'External data tree to inspect',
  错误消息中用于定位根值的路径: 'Path used to locate the root value in error messages',
  '叶子值域由调用方 schema 校验；本函数只在读取属性前排除原型对象、accessor、symbol、异常数组与循环引用':
    'The caller schema validates leaf values. This function only excludes prototype objects, accessors, symbols, exotic arrays, and cycles before reading properties.',
  拒绝不是严格大于零的有限数值: 'Rejects finite numbers that are not strictly greater than zero',
  '校验 JSON 安全的普通数据，创建脱离原输入的深冻结副本':
    'Validates JSON-safe plain data and creates a deeply frozen copy detached from the original input',
  '待复制的 JSON 安全数据': 'JSON-safe data to copy',
  错误消息中用于定位当前值的路径: 'Path used to locate the current value in error messages',
  与输入结构相同但不共享可变对象的深冻结副本:
    'Deeply frozen copy with the same structure as the input but no shared mutable objects',
  '把静态 CSS 前景色按权重预合成到不透明静态底色':
    'Pre-composites a static CSS foreground color onto an opaque static backdrop by weight',
  '前景自身 alpha 与 weight 相乘，再按 source-over sRGB 得到不含透明度的确定性颜色':
    'Multiplies the foreground alpha by weight, then uses source-over sRGB compositing to produce a deterministic opaque color.',
  '从已知 const object enum 建立保留提示的开放非空字符串 schema':
    'Creates an open non-blank string schema with suggestions from a known const-object enum',
  '创建不暴露写方法的 Map 浅快照': 'Creates a shallow Map snapshot that exposes no mutating methods',
  '输入 entries 会复制到独立存储；迭代与查询保持原生 Map 语义，`forEach` 的 owner 参数返回只读快照自身':
    'Copies input entries into independent storage while preserving native Map iteration and lookup semantics; the `forEach` owner argument is the readonly snapshot itself.',
  '判断动态值是否继承自 Retikz 结构化领域错误':
    'Determines whether a dynamic value inherits from a Retikz structured domain error',
  '解析无需宿主环境即可确定的静态 CSS color 子集':
    'Parses the static CSS color subset that can be resolved without a host environment',
};

/** 将中文 JSDoc 投影为英文文案，缺少审阅后的映射时终止生成 */
export const translateFoundationApiReference = (source: string): string => {
  if (!/[\u3400-\u9fff]/u.test(source)) return source;
  const translation = translations[source];
  if (translation) return translation;
  throw new Error(`缺少 @retikz/foundation API Reference 的审阅后英文翻译：${source}`);
};
