/** 经核对的 Layout API 英文说明，签名与标识符保持源码原样 */
const translations: Readonly<Partial<Record<string, string>>> = {
  主题样式定义: 'Theme style definitions',
  '通过 JSX 声明的图形内容': 'Drawing content declared with JSX',
  处理作者输入的编译驱动: 'Compile driver that processes authoring input',
  '直接传入 ir 时使用的事件处理函数表': 'Event handlers used when ir is supplied directly',
  '选择 retained 增量更新或 static 完整编译模式；省略时使用 retained':
    'Select retained incremental updates or static full compilation; defaults to retained',
  动画缓动函数注册表: 'Animation easing registry',
  可动画属性注册表: 'Animatable property registry',
  请求生成的编译附加产物: 'Requested compilation artifacts',
  编译附加产物成功提交后的通知: 'Notification after compilation artifacts are committed successfully',
  '是否播放动画；由动画模式上下文优先决定，未指定时遵循系统减少动态效果偏好':
    'Whether to play animations; the animation-mode context takes precedence, otherwise an unspecified value follows the system reduced-motion preference',
  'SVG 资源 id 前缀；省略时由 React useId 生成': 'SVG resource ID prefix; generated from React useId when omitted',

  '供自定义 compileDriver 消费的 JSX 输入元数据；传入 ir 时忽略，不写入持久化 Scene IR':
    'JSX input metadata for a custom compileDriver; ignored when ir is supplied and excluded from persisted Scene IR',
  '渲染后端；显式值优先，否则继承 Renderer 上下文，未提供上下文时使用 SVG':
    'Rendering backend; an explicit value takes precedence, otherwise inherits the Renderer context and falls back to SVG when no context is provided',
  '节点相对定位的默认距离，单位为绘图单位；position 使用 direction/of 且省略 distance 时生效':
    'Default relative node distance in drawing units; applies when position uses direction/of without distance',
  '默认字号，单位为绘图单位；font.size 缺省时使用，同时作为字号预设与 rem 的根字号，不覆盖显式数字字号':
    'Default font size in drawing units; used when font.size is omitted and as the root size for presets and rem, without overriding explicit numeric sizes',
  '创建保留式 Runtime Session': 'Creates a retained Runtime Session',
  '按 Vanilla processing controller 的队列顺序接收 Runtime 结构化诊断':
    'Receives structured Runtime diagnostics in the queue order of the Vanilla processing controller',
  'Program 更新策略': 'Program update strategy',
  '不创建 Runtime Session，直接完整编译与物化':
    'Compiles and materializes the complete result directly, without creating a Runtime Session',
  'static 不创建 Runtime session，因此不产生 Runtime 结构化诊断':
    'Static mode creates no Runtime session and therefore emits no structured Runtime diagnostics',
  'static 不支持 Program 更新策略': 'Static mode does not support a Program update strategy',
  '为 Layout 注册自定义形状、箭头、裁剪及其他绘图扩展':
    'Register custom shapes, arrows, clips, and other drawing extensions for Layout',
  '通过 Layout 的 extensions 属性传入，各字段接收对应的定义数组；这些运行时定义不写入可持久化的场景数据':
    'Pass these options through the extensions prop of Layout. Each field accepts an array of definitions; these runtime definitions are excluded from persisted scene data.',
  形状定义: 'Shape definitions',
  连接表面定义: 'Connection boundary definitions',
  裁剪定义: 'Clip definitions',
  箭头定义: 'Arrow definitions',
  图案定义: 'Pattern definitions',
  路径生成器定义: 'Path generator definitions',
  路径种类定义: 'Path kind definitions',
  '运行时注入的 Core Theme style definitions': 'Core theme style definitions registered at runtime',
  '运行时注入的 Tier 2 composite 展开逻辑': 'Tier 2 composite definitions registered at runtime',
  'Tier 2 composite 展开逻辑': 'Tier 2 composite expansion logic',
  'Core 不预留官方 namespace 名称；未注册的 namespace/type 会触发 warning，并跳过该 composite 节点，重复的完整 namespace/type 键在注册期报错':
    'Core reserves no official namespaces. Unregistered namespace/type pairs produce a warning and skip that composite node; duplicate namespace/type keys fail during registration.',
  空注册表: 'Empty registry',
  '按能力分类的运行时扩展注册，复用 Core 编译契约':
    'Runtime extensions grouped by capability, using the Core compilation contract',
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
