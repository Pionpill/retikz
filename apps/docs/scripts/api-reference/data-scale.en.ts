const translations: Readonly<Partial<Record<string, string>>> = {
  独立重建数值映射时替换的数学配置: 'Mathematical configuration replaced when rebuilding a numeric mapping',
  '替换输入域，省略时保留当前域': 'Replacement domain; omitted values retain the current domain',
  '替换输出范围，省略时保留当前范围': 'Replacement range; omitted values retain the current range',
  '替换钳位设置，省略时保留当前设置': 'Replacement clamping; omitted values retain the current setting',
  '算法生成的代表性输入值；不包含标签或坐标轴语义':
    'Representative input values computed by the algorithm, without labels or axis semantics',
  '数值输出的反向映射；超出算法合法输入域时返回 undefined':
    'Inverse numeric mapping; returns undefined outside the algorithm input constraints',
  '使用替换配置创建独立映射，不修改当前映射':
    'Creates an independent mapping with replacement settings without changing the current mapping',
  '分类区间的宽度，仅区间映射提供': 'Category interval width, provided only by interval mappings',
  相邻分类位置的间隔: 'Spacing between adjacent category positions',
  '分档映射的内部边界；无有效样本时省略': 'Internal bin boundaries; omitted when there are no valid samples',
  映射声明: 'Mapping declaration',
  '可选运行时输入；省略 values 等同空样本，定义回调始终收到数组':
    'Optional runtime inputs; omitting values means no samples, while definition callbacks always receive an array',
  '映射定义注册表，省略时使用内置定义': 'Mapping definition registry; defaults to built-in definitions',
  独立的数学映射与算法结果: 'Independent mathematical mapping and algorithm results',
  内置通用映射类型: 'Built-in general mapping types',
  '合并内置与自定义数学定义，禁止重复注册':
    'Combines built-in and custom mathematical definitions and rejects duplicate registrations',
  通用映射的输出标量: 'Output scalar of a general mapping',
  '解析后的纯数学映射；不持有名称、图元、图例或布局状态':
    'Resolved mathematical mapping without names, marks, legends, or layout state',
  '输入标量到输出值；缺值返回 undefined': 'Maps input scalars to outputs; missing values return undefined',
  实际使用的输入域: 'Effective input domain',
  实际输出范围: 'Effective output range',
  '数学解析所需的输入与资源，默认选择由宿主完成':
    'Inputs and resources for mathematical resolution; the host selects defaults',
  '参与映射训练的样本，保留真实重复观测': 'Samples used to train the mapping, preserving repeated observations',
  显式域优先于样本推断: 'An explicit domain takes precedence over sample inference',
  显式范围: 'Explicit range',
  宿主选定的缺省范围: 'Default range selected by the host',
  '命名字符串插值器；不携带主题对象': 'Named string interpolators without theme objects',
  内置与自定义映射共同实现的定义: 'Definition shared by built-in and custom mappings',
  '实例参数的 JSON 对象类型': 'JSON object type of instance parameters',
  映射唯一注册类型: 'Unique registered mapping type',
  专有参数的外部解析契约: 'External parsing contract for algorithm-specific parameters',
  判断声明的字段语义是否兼容: 'Checks compatibility with declared field semantics',
  根据公共输入和实例参数构建独立映射: 'Builds an independent mapping from common inputs and instance parameters',
  '异构映射注册项，定义时通过 defineScale 保留参数关联':
    'Heterogeneous registry entry; defineScale preserves parameter association at definition time',
  '定义映射，不注册或解析实例参数': 'Defines a mapping without registering or parsing instance parameters',
  '在外部输入边界解析公共声明与注册参数，内部消费不重复解析':
    'Parses common declarations and registered parameters at the external boundary without repeated internal parsing',
  '从已类型化声明建立数学映射，宿主负责样本与默认策略选择':
    'Resolves a typed declaration; the host selects samples and default policies',
  所有内置映射与自定义映射进入同一注册路径: 'Built-in and custom mappings use the same registration path',
};
const missing = new Set<string>();

/** 使用已核对的比例尺英文说明 */
export const translateDataScale = (source: string): string => {
  const text = source.trim();
  if (translations[text] !== undefined) return translations[text];
  if (/\p{Script=Han}/u.test(text)) missing.add(text);
  return text;
};

/** 缺译时阻止生成英文参考 */
export const assertDataScaleTranslated = (): void => {
  if (missing.size > 0) throw new Error(`Missing scale translations: ${JSON.stringify([...missing])}`);
};
