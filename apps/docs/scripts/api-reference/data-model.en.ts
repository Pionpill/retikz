const translations: Partial<Record<string, string>> = {
  外部数据集表: 'External datasets',
  '数据集名 -> 行数组；data.reference 按名查此表':
    'Maps dataset names to row arrays; data.reference looks up a dataset by name',
  外部数据行: 'External data row',
  '消费侧在运行时提供的任意 JS 记录（可嵌套）；字段路径解析后的结果须为标量':
    'An arbitrary, possibly nested JavaScript record supplied by the consumer at runtime; field paths resolve to scalar values',
  '字段解析格式名：内置关键字或自定义注册名，运行时由 format registry 解析为 parser':
    'A built-in or registered custom format name, resolved to a parser by the runtime format registry',
  '字段解析格式 runtime definition': 'Runtime field-format definition',
  'definition 是运行时对象，不进 JSON IR；IR 只在 IRDataFieldDefinition.format 保存格式名':
    'Definitions are runtime objects outside JSON IR; IRDataFieldDefinition.format stores only the format name',
  '该格式唯一蕴含的字段测量类型；字段省略 type 时由它覆盖推断':
    'The measurement type implied by this format; takes precedence over inference when the field omits type',
  '注册键 = IR 中 IRDataFieldDefinition.format 字符串；必须非空，且不与内置格式名冲突':
    'The registry key stored in IRDataFieldDefinition.format; must be nonempty and must not conflict with a built-in format name',
  '原始值 -> 运行时字段规范值；返回 undefined / NaN 表示该值非法':
    'Converts a raw value to a normalized runtime field value; undefined or NaN marks the value as invalid',
  分类顺序比较器共享的当前类别集合: 'Current categories shared by category-order comparators',
  '去重后的有效类别，保留首次出现顺序': 'Distinct valid categories in first-appearance order',
  '运行时分类顺序定义；比较函数不进入 JSON IR':
    'Runtime category-order definition; the comparator stays outside JSON IR',
  '返回有限数值；零表示排序等价，不合并类别':
    'Returns a finite number; zero means equal ordering without merging categories',
  内置或自定义排序名称: 'Built-in or custom order name',
  '单字段解析结果，运行时使用，不进 IR': 'Resolution of one field, used at runtime and excluded from IR',
  '`type` 覆盖最终字段测量类型；`parse` 覆盖内置 coercion，返回 undefined 表示该值不可用':
    '`type` overrides the resolved measurement type; `parse` overrides built-in coercion and returns undefined for an unusable value',
  '覆盖内置 coercion：原始值 -> 运行时字段规范值；返回 undefined 跳过该值':
    'Overrides built-in coercion from raw values to normalized field values; undefined skips the value',
  '覆盖最终字段类型；省略则用 model 声明 / 自动推断':
    'Overrides the resolved field type; when omitted, uses the model declaration or inference',
  '字段声明：逻辑字段名、可选测量类型、可选解析格式和可选分类顺序':
    'Field declaration with a logical name, optional measurement type, parsing format, and category order',
  '数据模型：IR 内可选字段声明数组，用于 strict 引用校验与 type-driven 推断':
    'An optional IR array of field declarations used for strict reference validation and type-driven inference',
  'IR 数据槽位：具名数据集引用与可选模型；真实数据值由宿主运行时注入':
    'An IR data slot with a named dataset reference and optional model; actual values are supplied by the consumer at runtime',
  '运行时字段规范值；不含 boolean / null，是 `coerceValue` 与自定义 `parse` 的输出域':
    'Normalized runtime field values excluding boolean and null; the output domain of `coerceValue` and custom `parse` functions',
  '程序化字段解析逃生舱，运行时函数，不进 IR':
    'A programmatic field-resolution escape hatch; a runtime function excluded from IR',
  '按字段名返回类型覆盖与可选自定义解析；返回 undefined 时保留已有的模型或格式解析结果':
    'Returns a type override and optional parser by field name; undefined preserves the existing model or format resolution',
  当前逻辑字段名: 'The current logical field name',
  '数据集名称、映射后的物理路径及模型显式声明的类型':
    'The dataset name, mapped physical path, and type explicitly declared in the model',
  '字段覆盖；返回 undefined 不作覆盖。提供 parse 时必须同时返回 type 或在模型中显式声明类型':
    'A field override, or undefined to preserve the existing resolution. A parse override requires either a returned type or an explicit model type',
  内置与自定义共享相同的比较协议: 'Built-in orders using the same comparison protocol as custom orders',
  '内置字段解析格式 definition 列表；内置 6 个与自定义格式共享同一 registry 分派流程':
    'Six built-in field-format definitions sharing the same registry dispatch as custom formats',
  内置字段值解析格式名: 'Built-in field-value parsing format names',
  字段测量类型关键字: 'Field measurement type names',
  '区分连续数值、离散类别与时间，决定字段推断与值解析的语义':
    'Distinguishes continuous quantities, discrete categories, and time to determine field inference and parsing semantics',
  分类字段顺序策略: 'Category-order strategies',
  '定义一个字段解析格式 definition': 'Defines a field parsing format',
  '内置与自定义格式经同一 registry 入口分派；spec 里仍只写 `{ name, format }` JSON':
    'Built-in and custom formats use the same registry dispatch; specifications contain only `{ name, format }` JSON',
  '具名格式及其类型、解析函数；注册时检查名称冲突':
    'A named format with its type and parser; registration checks name conflicts',
  '原样返回定义对象；不会自动注册': 'Returns the definition unchanged without registering it',
  定义可注册的纯分类比较规则: 'Defines a registrable pure category comparator',
  '具名比较器；必须保持纯计算并返回有限数值': 'A named comparator that must remain pure and return a finite number',
  '解析分类域，不修改输入值或显式顺序数组':
    'Resolves a category domain without modifying input values or explicit order arrays',
  '原始类别值；仅保留字符串与有限数字并按首次出现顺序去重':
    'Raw category values; retains only strings and finite numbers, deduplicated in first-appearance order',
  '排序名称或非空显式类别数组；undefined 表示按出现顺序。显式数组之后追加未列出的观测类别':
    'An order name or nonempty explicit category array; undefined uses appearance order. Observed categories absent from an explicit array are appended',
  '名称到比较器的映射；省略时使用内置排序注册表':
    'A map from names to comparators; defaults to the built-in order registry',
  '排列后的分类域；数字和字符串保持各自身份': 'The ordered category domain, preserving number and string identities',
  '排序名称未注册、比较器抛出异常或返回非有限数值':
    'The order name is unregistered, or its comparator throws or returns a nonfinite number',
  '合并请求内的分类顺序定义，禁止重复和覆盖内置名称':
    'Merges category-order definitions for a request, rejecting duplicates and built-in name overrides',
  '自定义排序列表；省略时仅包含内置排序': 'Custom order definitions; omitting this includes only built-in orders',
  当前请求的只读名称到定义映射: 'A readonly name-to-definition map for the current request',
  '名称为空白或与内置、自定义名称重复': 'A name is blank or duplicates a built-in or custom name',
  '解析字段格式 registry': 'Resolves a field-format registry',
  '内置格式总是先注册；用户自定义 definition 不能覆盖内置格式名，也不能彼此重复':
    'Built-ins are registered first; custom definitions cannot override built-in names or duplicate each other',
  '自定义格式列表；省略时仅包含内置格式': 'Custom format definitions; omitting this includes only built-in formats',
  每次调用独立创建的名称到定义映射: 'A fresh name-to-definition map created for each call',
  '格式名称为空或与内置、自定义名称重复': 'A format name is empty or duplicates a built-in or custom name',
};
const missing = new Set<string>();

/** 使用经审阅的译文生成英文公开契约 */
export const translateDataModelApiReference = (source: string): string => {
  const text = source.trim();
  const translated = translations[text];
  if (translated !== undefined) return translated;
  if (/\p{Script=Han}/u.test(text)) missing.add(text);
  return text;
};

/** 阻止未翻译的说明写入英文参考 */
export const assertDataModelApiReferenceTranslated = (): void => {
  if (missing.size) throw new Error(`Data model API translations missing:\n${JSON.stringify([...missing], null, 2)}`);
};
