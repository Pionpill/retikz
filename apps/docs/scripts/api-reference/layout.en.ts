/** 经核对的 Layout API 英文说明，签名与标识符保持源码原样 */
const translations: Readonly<Partial<Record<string, string>>> = {
  '渲染后端；缺省使用 SVG，框架宿主可从上下文继承':
    'Renderer; defaults to SVG and may be inherited from framework context',
  'SVG 资源 id 前缀；省略时由宿主生成': 'SVG resource ID prefix; supplied by the host when omitted',
  '是否播放动画；未指定时遵循系统减少动态效果偏好': 'Enable playback; defaults to the system reduced-motion preference',
  '按图元 id 绑定的初始事件处理函数表': 'Initial event handlers keyed by drawing element ID',
  'DOM 与框架宿主共享的场景视图配置': 'Scene view options shared by DOM and framework hosts',
  编译选项: 'Compile options',
  '协调器执行选项；提交目标由宿主接入': 'Reconciler execution options; the host supplies the commit target',
  接收协调器的结构化诊断: 'Receives structured reconciler diagnostics',
  '统一设置子树的动画模式；嵌套时以最近的设置为准':
    'Sets the animation mode for descendants; the nearest provider takes precedence',
  动画模式提供器: 'Animation mode provider',
  '设置子树的默认渲染后端；Layout 的 renderer 优先':
    'Sets the default backend for descendants; an explicit Layout renderer takes precedence',
  渲染模式提供器: 'Renderer mode provider',
  '创建场景时传给 scene 的对象选项': 'Object options accepted by scene',
  沿路径放置的标记定义: 'Definitions of markers placed along a path',
  '自定义文字测量；省略时使用 Vanilla 的环境测量与估算降级':
    'Custom text measurement; omitted uses Vanilla environment measurement with estimation when unavailable',
  缓动能力注册表: 'easing registry',
  '基线以上的高度；省略时由 resolveTextMetrics 根据总高度与 descent 补齐，两者均省略时各取总高度的一半':
    'Height above the baseline; resolveTextMetrics derives an omitted value from total height and descent, or assigns half the total height when both are omitted',
  '基线以下的深度；省略时由 resolveTextMetrics 根据总高度与 ascent 补齐，两者均省略时各取总高度的一半':
    'Depth below the baseline; resolveTextMetrics derives an omitted value from total height and ascent, or assigns half the total height when both are omitted',
  '固定为 layer 的作者分层标识': 'Authoring layer discriminator, fixed to layer',
  '作者输入不接受版本号；归一化时写入当前 IR 版本':
    'Authoring input excludes a version; normalization supplies the current IR version',
  '作者侧 Layer 输入': 'Authoring input for a layer',
  作者侧图层: 'Authoring input for a layer',
  在视口内唯一的名称: 'Unique layer name in the viewport',
  本层的编译选项: 'Compile options for this layer',
  本层的协调器执行选项: 'Reconciler execution options for this layer',
  按声明顺序归一的子节点: 'Children normalized in declaration order',
  分层身份标识: 'Layer identity',
  同值保持声明顺序的分层排序值: 'Layer stacking order; equal values preserve declaration order',
  '作者侧 Scene 输入': 'Scene authoring input',
  '归一化时保留的作者元数据，不进入 Core IR': 'Authoring metadata retained during normalization; excluded from Core IR',
  '单图作者输入，归一化时转换为 Core IR': 'Single-scene authoring input normalized into Core IR',
  '构造单图作者输入，不编译或复制子图元': 'Build a single scene input without compiling or copying its children',
  '当前层的完整 Core IR': 'Complete Core IR for this layer',
  '仅随当前场景参与编译的嵌入绑定，不属于图层默认配置': 'Embed bindings for this scene only; not layer defaults',
  '创建图层时将作者输入一次转换为 IR，并保留其嵌入绑定':
    'Normalize authored input once when creating a layer and retain its embed bindings',
  覆盖层栈的执行配置: 'Execution options overriding the layer stack defaults',
  创建作者侧分层输入: 'Create layer authoring input',
  '分层名称、排序、计算配置与场景': 'Layer name, stacking order, processing options, and scene',
  '带 layer 类别的输入，不编译或复制场景': 'Input tagged as a layer; does not compile or copy the scene',
  'retikz 顶层绘制 IR，可序列化 JSON 形式的绘制描述': 'Root drawing IR, a JSON-serializable description of a drawing',
  '显式视框 IR 类型 `{ x, y, width, height }`': 'Explicit viewport IR: `{ x, y, width, height }`',

  'SVG 或 Canvas CSS 宽度；缺省按内容尺寸计算，单轴数值尺寸按内容比例补齐另一轴，CSS 字符串尺寸由浏览器排版':
    'CSS width of SVG or Canvas; derived from content dimensions when omitted. A single numeric dimension determines the other from the content aspect ratio; CSS strings use browser layout',
  'SVG 或 Canvas CSS 高度；缺省按内容尺寸计算，单轴数值尺寸按内容比例补齐另一轴，CSS 字符串尺寸由浏览器排版':
    'CSS height of SVG or Canvas; derived from content dimensions when omitted. A single numeric dimension determines the other from the content aspect ratio; CSS strings use browser layout',
  '显式视框，使用绘图坐标；优先于 ir.viewBox，省略时沿用场景视框，场景未指定时按内容计算':
    'Explicit viewport in drawing coordinates; overrides ir.viewBox. When omitted, uses the scene viewport or derives it from content if the scene has none',
  '动画采样时刻，单位为毫秒；指定后定格在该时刻，不播放动画，优先于 animate':
    'Animation sampling time in milliseconds; freezes the drawing at that time without playback and takes precedence over animate',
  绘图容器: 'Drawing container',
  '将 JSX 子图元或完整 IR 渲染为 SVG 或 Canvas，必须选择一种输入':
    'Renders either JSX children or a complete IR scene as SVG or Canvas; exactly one input is required',
  主题样式定义: 'Theme definitions',
  '通过 JSX 声明的图形内容': 'Drawing content declared with JSX',
  '直接传入 ir 时使用的事件处理函数表': 'Event handlers used when ir is supplied directly',
  动画缓动函数注册表: 'Animation easing registry',
  可动画属性注册表: 'Animatable property registry',
  请求生成的编译附加产物: 'Requested compilation artifacts',
  编译附加产物成功提交后的通知: 'Notification after compilation artifacts are committed successfully',
  '是否播放动画；由动画模式上下文优先决定，未指定时遵循系统减少动态效果偏好':
    'Whether to play animations; the animation-mode context takes precedence, otherwise an unspecified value follows the system reduced-motion preference',
  'SVG 资源 id 前缀；省略时由 React useId 生成': 'SVG resource ID prefix; generated from React useId when omitted',

  '归一化时收集的 JSX 作者元数据；传入 ir 时忽略，不写入持久化 Scene IR':
    'JSX authoring metadata collected during normalization; ignored when ir is supplied and excluded from persisted Scene IR',
  '渲染后端；显式值优先，否则继承 Renderer 上下文，未提供上下文时使用 SVG':
    'Rendering backend; an explicit value takes precedence, otherwise inherits the Renderer context and falls back to SVG when no context is provided',
  '节点相对定位的默认距离，单位为绘图单位；position 使用 direction/of 且省略 distance 时生效':
    'Default relative node distance in drawing units; applies when position uses direction/of without distance',
  '默认字号，单位为绘图单位；font.size 缺省时使用，同时作为字号预设与 rem 的根字号，不覆盖显式数字字号':
    'Default font size in drawing units; used when font.size is omitted and as the root size for presets and rem, without overriding explicit numeric sizes',
  '为 Layout 注册自定义形状、箭头、裁剪及其他绘图扩展':
    'Register custom shapes, arrows, clips, and other drawing extensions for Layout',
  形状定义: 'Shape definitions',
  连接表面定义: 'Connection boundary definitions',
  裁剪定义: 'Clip definitions',
  箭头定义: 'Arrow definitions',
  图案定义: 'Pattern definitions',
  路径定义: 'Path definitions',
  '运行时注入的 Core Theme definitions': 'Core theme definitions registered at runtime',
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
  自定义边界定义: 'Custom boundary definitions',
  'Kernel 或 Sugar JSX children': 'Kernel or Sugar JSX children',
  '宿主 className': 'Host className',
  自定义裁剪定义: 'Custom clip definitions',
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
  '自定义 path 定义': 'Custom path definitions',
  '自定义 pattern 定义': 'Custom pattern definitions',
  渲染目标: 'Rendering target',
  'JSX 子图的隐式根 Scope 覆盖；完整 ir 优先，style 宿主 CSS 独立生效':
    'Implicit root Scope overrides for JSX children; complete IR takes precedence, while host CSS style applies independently',
  自定义形状定义: 'Custom shape definitions',
  静态动画采样时刻: 'Time at which to sample a static animation frame',
  宿主内联样式: 'Host inline styles',
  '写入 Scene 根并由后代 Composite 继承的 Theme':
    'Theme written to the Scene root and inherited by descendant Composites',
  'Core Theme definitions': 'Core Theme definitions',
  显式视框: 'Explicit viewport',
  'SVG 或 Canvas CSS 宽度；缺省取内容宽度，单轴数值尺寸按内容比例补齐另一轴':
    'CSS width of SVG or Canvas; defaults to content width, with a single numeric axis deriving the other from the content aspect ratio',
  'React Layout：JSX 转 Vanilla Input，随后只宿主化 Vanilla processing result':
    'React Layout converts JSX to Vanilla Input, then hosts the Vanilla processing result',
  'React 不创建 Core Computation、Runtime 或 renderer；所有处理状态归 Vanilla':
    'React does not create Core Computations, Runtimes, or renderers; Vanilla owns all processing state',
};

/** 新增说明缺少翻译时阻止生成 */
export const translateLayoutApiReference = (source: string): string => {
  const translated = translations[source];
  if (translated !== undefined) return translated;
  if (!/[\u3400-\u9fff]/u.test(source)) return source;

  throw new Error(`Missing Layout API translation: ${source}`);
};
