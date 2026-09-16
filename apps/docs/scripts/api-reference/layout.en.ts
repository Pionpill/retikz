/** 经核对的 Layout API 英文说明，签名与标识符保持源码原样 */
const translations: Readonly<Partial<Record<string, string>>> = {
  'Layout 的运行时扩展注册，不进入持久化 IR': 'Runtime extension registrations for Layout, excluded from persisted IR',
  '按能力分类的运行时扩展注册，复用 Core 编译契约': 'Runtime extensions grouped by capability, using the Core compilation contract',
  'React Layout 的公开属性': 'Public props for React Layout',
  '': '',
  是否播放动画: 'Whether to play animations',
  'animation property registry': 'Animation property registry',
  动画控制器出口: 'Animation controller ref',
  'Scene 根动画': 'Scene-root animations',
  自定义箭头定义: 'Custom arrow definitions',
  'artifact 请求': 'Requested compilation artifacts',
  '只供 Vanilla compile driver 消费的 runtime metadata': 'Runtime metadata consumed only by the Vanilla compile driver',
  自定义边界定义: 'Custom boundary definitions',
  'Kernel 或 Sugar JSX children': 'Kernel or Sugar JSX children',
  '宿主 className': 'Host className',
  自定义裁剪定义: 'Custom clip definitions',
  'Vanilla 领域中立 compile driver': 'Domain-neutral Vanilla compile driver',
  'Tier 2 composite definitions': 'Tier 2 composite definitions',
  'easing registry': 'Easing registry',
  默认字号: 'Default font size',
  'IR 模式下的水合 handler 注册表': 'Hydration handler registry for IR input',
  'SVG 或 Canvas CSS 高度；缺省取内容高度，CSS 字符串尺寸由浏览器排版':
    'CSS height of SVG or Canvas; defaults to content height, while CSS strings use browser layout',
  'SVG 资源 id 前缀': 'SVG resource id prefix',
  '直接传入持久化 Source IR，与 children 二选一': 'Persisted Source IR, used instead of children',
  公式下沉能力: 'Formula lowering capability',
  '默认 node 距离': 'Default node distance',
  'artifacts 成功提交通知': 'Notification after artifacts are committed successfully',
  'Core 完整编译结果通知': 'Notification of the complete Core compilation result',
  '自定义 path generator 定义': 'Custom path generator definitions',
  '自定义 path kind 定义': 'Custom path kind definitions',
  '自定义 pattern 定义': 'Custom pattern definitions',
  渲染目标: 'Rendering target',
  'JSX 子图的隐式根 Scope 覆盖；完整 ir 优先，style 宿主 CSS 独立生效':
    'Implicit root Scope overrides for JSX children; complete IR takes precedence, while host CSS style applies independently',
  'retained 或 static processing 模式': 'Retained or static processing mode',
  自定义形状定义: 'Custom shape definitions',
  静态动画采样时刻: 'Time at which to sample a static animation frame',
  宿主内联样式: 'Host inline styles',
  '写入 Scene 根并由后代 Composite 继承的 Theme':
    'Theme written to the Scene root and inherited by descendant Composites',
  'Core Theme style definitions': 'Core Theme style definitions',
  显式视框: 'Explicit viewport',
  'SVG 或 Canvas CSS 宽度；缺省取内容宽度，单轴数值尺寸按内容比例补齐另一轴':
    'CSS width of SVG or Canvas; defaults to content width, with a single numeric axis deriving the other from the content aspect ratio',
  'React Layout retained Runtime 配置': 'Retained Runtime configuration for React Layout',
  'React Layout 宿主执行模式取值': 'React Layout host execution mode value',
  'React Layout 的判别 Runtime 配置': 'Discriminated Runtime configuration for React Layout',
  'React Layout static Runtime 配置': 'Static Runtime configuration for React Layout',
  'React Layout：JSX 转 Vanilla Input，随后只宿主化 Vanilla processing result':
    'React Layout converts JSX to Vanilla Input, then hosts the Vanilla processing result',
  'React 不创建 Core Program、Runtime session 或 retained renderer；所有处理状态归 Vanilla':
    'React does not create Core Programs, Runtime sessions, or retained renderers; Vanilla owns all processing state',
  'React Layout 的宿主执行模式': 'React Layout host execution modes',
};

/** 新增说明缺少翻译时阻止生成 */
export const translateLayoutApiReference = (source: string): string => {
  const translated = translations[source];
  if (translated !== undefined) return translated;
  if (!/[\u3400-\u9fff]/u.test(source)) return source;
  throw new Error(`Missing Layout API translation: ${source}`);
};
