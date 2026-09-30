/** Ribbon 公开说明的受审阅英文翻译；未知中文阻止生成 */
const translations: Readonly<Partial<Record<string, string>>> = {
  '定义端帽，集中处理参数泛型擦除边界': 'Define a cap and centralize generic parameter erasure',
  内置和第三方端帽共同实现的能力: 'Shared contract for built-in and custom caps',
  端帽注册名: 'Registered cap name',
  'JSON 参数解析契约': 'JSON parameter schema',
  构造从一侧接点通往另一侧的端帽: 'Build a cap connecting its two side attachments',
  端帽消费的端面局部坐标基底: 'Endpoint-local frame consumed by a cap',
  所属端点: 'Endpoint owning the cap',
  端面中点: 'Section midpoint',
  从右侧指向左侧的单位轴: 'Unit section axis from right to left',
  垂直端面并背离流带内部的单位向量: 'Unit vector normal to the section and pointing outward',
  端面弦长: 'Section chord length',
  '经 schema 解析的端帽参数': 'Cap parameters parsed by the schema',
  端帽开放路径及其接点延伸: 'Open cap path and attachment extension',
  '沿 outward 的有符号接点位移': 'Signed attachment displacement along outward',
  'Path 局部坐标中的单条开放命令链': 'Single open command chain in Path-local coordinates',
  '用同一 maker 装配端帽和宽度 profile 的 provider contribution':
    'Create a provider contribution assembling caps and width profiles through one maker',
  '官方 Ribbon Path Kind definition，默认只注册 bulge profile':
    'Official Ribbon Path kind definition; registers only the built-in bulge profile by default',
  '创建带调用方 profiles 的唯一 Ribbon Path Kind definition':
    'Create the single Ribbon Path kind definition with caller-provided profiles',
  '定义 ribbon width profile 注册项并校验名称': 'Define a ribbon width profile registration and validate its name',
  集中封装参数泛型擦除边界: 'Encapsulates the parameter generic erasure boundary',
  '当 name 为空串或全空白字符串时': 'When name is empty or contains only whitespace',
  '创建 Extension Ribbon 的 Core provider contribution': 'Create a Core provider contribution for Extension Ribbon',
  'ribbon width profile 采样上下文': 'Ribbon width profile sampling context',
  '沿中心线的归一化位置，范围 [0, 1]': 'Normalized position along the centerline in [0, 1]',
  '中心线近似总长度（user units）': 'Approximate centerline length in user units',
  '经过可选 paramsSchema 校验后的 profile 参数': 'Profile parameters validated by the optional paramsSchema',
  'ribbon width profile definition 的作者侧输入形态': 'Authoring input for a ribbon width profile definition',
  '注册表 key，由 IR `width: { kind: "profile", name }` 引用':
    'Registry key referenced by IR `width: { kind: "profile", name }`',
  '可选的 JSON-safe params schema；compile 在采样前解析 `width.params`':
    'Optional JSON-safe parameter schema; compilation parses `width.params` before sampling',
  '不校验 params': 'Parameters are not validated',
  '返回指定归一化位置处的非负 ribbon 宽度（user units）':
    'Return the non-negative ribbon width at the given normalized position in user units',
  'Extension Ribbon kind 的完整 Path options schema': 'Complete Path schema for the Extension Ribbon kind',
  'Extension Ribbon 完整 Path subject': 'Complete Extension Ribbon Path subject',
};

export const translateRibbonApiReference = (source: string): string => {
  if (!/[\u3400-\u9fff]/u.test(source)) return source;
  const translated = translations[source];
  if (translated === undefined) throw new Error(`Missing Ribbon API translation: ${source}`);
  return translated;
};
