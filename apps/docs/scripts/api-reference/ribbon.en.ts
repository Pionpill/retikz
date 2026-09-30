/** Ribbon 公开说明的受审阅英文翻译；未知中文阻止生成 */
const translations: Readonly<Partial<Record<string, string>>> = {
  '定义可注册的 Ribbon 端帽并校验名称': 'Define a registrable Ribbon cap and validate its name',
  内置与自定义端帽共用的参数解析和几何构造契约:
    'Shared parameter parsing and geometry contract for built-in and custom caps',
  '非空且非全空白的端帽注册名，由 start.cap.name 或 end.cap.name 引用':
    'Nonempty registered cap name containing non-whitespace characters, referenced by start.cap.name or end.cap.name',
  '构造前解析 cap.params 的 JSON 参数 schema；省略 cap.params 时解析 {}，可由 schema 提供默认字段':
    'JSON parameter schema used before geometry construction; omitted cap.params is parsed from {}, and the schema may supply default fields',
  '使用已解析参数构造连接两侧接点的开放路径；坐标、接点顺序与位移须符合 RibbonCapGeometry':
    'Build an open path joining both side attachments from parsed parameters; coordinates, attachment order, and displacement must follow RibbonCapGeometry',
  '端帽构造时收到的端面位置、方向与已解析参数':
    'Section position, orientation, and parsed parameters received during cap construction',
  所属端点: 'Endpoint owning the cap',
  'Path 局部坐标中的端面中点，位于 extension 位移之前':
    'Section midpoint in Path-local coordinates, before the extension displacement',
  从右侧指向左侧的单位轴: 'Unit section axis from right to left',
  垂直端面并背离流带内部的单位向量: 'Unit vector normal to the section and pointing outward',
  '端面左右接点间的非负距离，单位为 user units':
    'Non-negative distance between the section side attachments in user units',
  '经 schema 解析的端帽参数': 'Cap parameters parsed by the schema',
  '连接流带两侧的端帽开放路径，以及对两侧接点的位移':
    'Open cap path joining both ribbon sides and displacement of their attachments',
  '两侧接点沿 outward 同步移动的有限有符号距离，单位为 user units；无位移时显式返回 0':
    'Finite signed distance moving both attachments along outward in user units; explicitly return 0 for no displacement',
  'Path 局部坐标中的单条连续开放命令链，以 move 开始，后续不得含 move 或 close':
    'Single continuous open command chain in Path-local coordinates, starting with move and containing no later move or close',
  '接点先沿 outward 移动 extension；start 从右接点走向左接点，end 从左接点走向右接点，首尾必须匹配移动后的接点':
    'Attachments are shifted by extension along outward; start runs from right to left and end from left to right, with endpoints matching the shifted attachments',
  '创建供 Core 依赖解析器装配 Ribbon Path kind 的贡献项':
    'Create a contribution for the Core dependency resolver to assemble the Ribbon Path kind',
  '包含 ribbon 根依赖与内置定义，调用方可追加宽度函数和端帽；不自动注入编译器':
    'Includes the ribbon root dependency and built-in definitions, with optional custom width profiles and caps; does not automatically inject them into the compiler',
  '使用内置 bulge 宽度函数与 butt、square、round、arc 端帽的 Ribbon Path kind':
    'Ribbon Path kind with the built-in bulge width profile and butt, square, round, and arc caps',
  '需要在当前图的 pathKinds 中显式装配，不自动注册':
    'Must be explicitly supplied through pathKinds for the current drawing; not automatically registered',
  '创建包含内置与自定义宽度函数、端帽的 Ribbon Path kind':
    'Create a Ribbon Path kind containing built-in and custom width profiles and caps',
  '扩展注册项，默认 {}；profiles 与 caps 默认 []，仍保留全部内置定义':
    'Extension registrations, defaulting to {}; profiles and caps default to [], while all built-in definitions remain available',
  '名称为 ribbon 的 Path kind，供当前图的 pathKinds 显式装配':
    'Path kind named ribbon, to be explicitly supplied through pathKinds for the current drawing',
  '包含 ribbon 根依赖及对应 provider 的贡献项，交给 resolveCoreProviderDependencies 装配':
    'Contribution containing the ribbon root dependency and its provider, assembled by resolveCoreProviderDependencies',
  'RetikzExtensionError：注册名为空或全空白、不同宽度函数定义同名，或端帽注册名重复时':
    'RetikzExtensionError when a registered name is empty or whitespace-only, different width profiles share a name, or cap names are duplicated',
  '定义可注册的 Ribbon 宽度函数并校验名称': 'Define a registrable Ribbon width profile and validate its name',
  '端帽参数的 JSON 对象类型，关联参数解析结果与 resolve 上下文':
    'JSON object type for cap parameters, relating parsed parameters to the resolve context',
  '宽度函数参数的 JSON 对象类型，关联可选参数解析结果与 widthAt 上下文':
    'JSON object type for width profile parameters, relating optional parameter parsing to the widthAt context',
  '端帽名称、参数 schema 与几何构造回调；此处只校验名称，不执行参数解析或构造回调':
    'Cap name, parameter schema, and geometry callback; only the name is validated here, without parsing parameters or invoking the callback',
  '宽度函数名称、可选参数 schema 与采样回调；此处只校验名称，不执行参数解析或采样':
    'Width profile name, optional parameter schema, and sampling callback; only the name is validated here, without parsing parameters or sampling',
  '原 definition 对象，参数泛型被擦除以便统一装入端帽注册表':
    'The original definition object, with its parameter generic erased for storage in the cap registry',
  '原 definition 对象，参数泛型被擦除以便统一装入宽度函数注册表':
    'The original definition object, with its parameter generic erased for storage in the width profile registry',
  'RetikzExtensionError：name 为空串或全空白字符串时': 'RetikzExtensionError when name is empty or whitespace-only',
  '宽度函数在一次中心线采样中收到的位置、长度与参数':
    'Position, length, and parameters received by a width profile for a centerline sample',
  '沿中心线的归一化位置，范围 [0, 1]': 'Normalized position along the centerline in [0, 1]',
  '中心线近似总长度（user units）': 'Approximate centerline length in user units',
  '经 paramsSchema 或 JSON 对象校验解析的宽度函数参数；省略 width.params 时从 {} 解析':
    'Width profile parameters parsed by paramsSchema or JSON object validation; omitted width.params is parsed from {}',
  '自定义宽度函数的注册输入，通过 name 在 Ribbon width 中引用':
    'Registration input for a custom width profile, referenced by name in Ribbon width',
  '端帽参数的 JSON 对象类型，默认 JsonObject': 'JSON object type for cap parameters, defaulting to JsonObject',
  '端帽参数的 JSON 对象类型，关联 paramsSchema 与 resolve，默认 JsonObject':
    'JSON object type for cap parameters, relating paramsSchema to resolve and defaulting to JsonObject',
  '宽度函数参数的 JSON 对象类型，默认 JsonObject':
    'JSON object type for width profile parameters, defaulting to JsonObject',
  '宽度函数参数的 JSON 对象类型，关联 paramsSchema 与 widthAt，默认 JsonObject':
    'JSON object type for width profile parameters, relating paramsSchema to widthAt and defaulting to JsonObject',
  '注册表 key，由 IR `width: { kind: "profile", name }` 引用':
    'Registry key referenced by IR `width: { kind: "profile", name }`',
  '在采样前解析 width.params 的 JSON 参数 schema；省略时仅校验 JSON 对象结构，不做自定义参数校验':
    'JSON parameter schema parsing width.params before sampling; when omitted, only JSON object structure is validated, without custom parameter validation',
  '在采样位置计算完整流带宽度，单位为 user units；返回值必须有限且非负，可被多次调用':
    'Compute the full ribbon width at a sample position in user units; the result must be finite and non-negative, and the callback may run multiple times',
};

export const translateRibbonApiReference = (source: string): string => {
  if (!/[\u3400-\u9fff]/u.test(source)) return source;
  const translated = translations[source];
  if (translated === undefined) throw new Error(`Missing Ribbon API translation: ${source}`);
  return translated;
};
