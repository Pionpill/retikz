const translations: Partial<Record<string, string>> = {
  'Pattern 单条线 motif 的可序列化样式覆盖': 'Serializable style overrides for a pattern line motif',
  'Pattern 相邻线条的稀疏周期样式': 'Sparse repeating styles for adjacent pattern lines',
  'Pattern paint 的可序列化实例参数': 'Serializable pattern paint parameters',
  '可注册的 pattern 定义': 'A registrable pattern definition',
  '描述默认基础尺寸和 motif 几何生成能力；定义本身不进入 IR':
    'Defines the default base size and motif geometry generator; the definition itself does not enter IR',
  '`pattern.size` 省略时的基础尺寸（user units）；最终 tile 周期可由 emit 结果改写':
    'Base size in user units when `pattern.size` is omitted; the emit result may change the final tile period',
  '局部 tile 坐标中的 motif 几何': 'Motif geometry in local tile coordinates',
  'pattern 名称，由 IR pattern paint 的 `shape` 引用': 'Pattern name referenced by the IR pattern paint `shape`',
  透明背景: 'Transparent background',
  'motif 自定义默认值': 'Default chosen by the motif',
  'pattern emit 的运行时上下文': 'Runtime context for pattern emission',
  '提供基础尺寸、基础样式、可选方向/周期样式和取整函数，供定义生成 motif 几何':
    'Provides base size, base style, optional directional/cyclic styles, and rounding for motif generation',
  'tile 背景填充（CSS 串）；缺省透明（字段缺省）': 'Tile background fill as a CSS string; omitted means transparent',
  'motif 主色（CSS 串，缺省 `currentColor`）': 'Motif primary color as a CSS string; defaults to `currentColor`',
  '描边 dash offset': 'Stroke dash offset',
  '解析后的描边 dash pattern；已应用显式值与 dashed / dotted 预设优先级':
    'Resolved stroke dash pattern after applying explicit values and dashed/dotted preset precedence',
  '已继承基础字段并解析 preset 的横向线条样式': 'Horizontal line style with inherited base fields and resolved presets',
  描边端点线帽: 'Stroke endpoint cap',
  描边拐角连接: 'Stroke corner join',
  '已按 index 展开并解析继承关系的线条样式周期': 'Line-style cycle expanded by index with inheritance resolved',
  '线 / 网格描边宽；dots motif 用作半径': 'Line/grid stroke width; used as radius by dots',
  '仅当用户在 `pattern.lineWidth` 显式给值时存在；缺省时由 motif 自行决定默认值':
    'Present only when `pattern.lineWidth` is explicit; otherwise the motif chooses its own default',
  '精度取整函数（与 compile/render 同一 round，保几何一致）':
    'Precision rounding function shared with compile/render for consistent geometry',
  '解析后的基础尺寸或间距（user units）；最终 tile 周期可由 PatternEmitResult.tileSize 覆盖':
    'Resolved base size or spacing in user units; PatternEmitResult.tileSize may override the final period',
  '已继承基础字段并解析 preset 的纵向线条样式': 'Vertical line style with inherited base fields and resolved presets',
  'Pattern definition 可返回默认周期的 motif iterable，或显式 tile 周期结果':
    'A pattern definition returns a motif iterable with the default period or an explicit tile-period result',
  'Pattern definition 的扩展 tile 输出': 'Extended tile output from a pattern definition',
  '用于 motif 周期不同于 `context.size` 的图案；编译器校验并写入最终 Scene tile':
    'For patterns whose period differs from `context.size`; the compiler validates and writes the final Scene tile',
  '最终 tile 周期（user units），必须为 finite 正数': 'Final tile period in user units; must be finite and positive',
  '内置 pattern motif 名常量（用 const + ValueOf 派生，不用 TS enum）':
    'Built-in pattern motif names, using a const object and ValueOf rather than a TypeScript enum',
  '内置 3 motif：`lines`（横向阴影线）/ `dots`（波点）/ `grid`（横竖网格）。\n  各 motif 的 tile 几何由 `BUILTIN_PATTERNS` 的 `PatternDefinition.emit` 在 compile 期产出':
    'Three built-in motifs: `lines` (horizontal hatching), `dots`, and `grid`. Their tile geometry is emitted at compile time by PatternDefinition.emit in BUILTIN_PATTERNS.',
  '定义 pattern motif 注册项': 'Define a pattern motif registration',
  '当前是 typed identity；保留入口用于对齐 registry API，并为未来校验或归一化预留空间':
    'Currently a typed identity function; provides a consistent registry API entry and a location for future validation or normalization',
  'IR shadow 对象分支（可带 preset 与显式字段覆盖）':
    'IR shadow object with an optional preset and explicit field overrides',
  阴影预设档位值联合: 'Union of shadow preset values',
  '阴影预设档位关键字（Tailwind 风格刻度）': 'Shadow preset names using a Tailwind-style size scale',
  '预设字符串 `shadow="md"` 等价于对象 `{ preset:\'md\' }`；`SHADOW_PRESETS` 表为档位展开单一真源。\n  `none` = 显式无阴影（当前等价省略，为将来 scope 级联预留）':
    'The preset string `shadow="md"` is equivalent to `{ preset: \'md\' }`; SHADOW_PRESETS is the source for preset expansion. `none` explicitly disables shadow (described here as equivalent to omission, reserving scope cascading).',
  混合模式值联合: 'Union of blend-mode values',
  'W3C 分离式混合模式集（16 个）': 'The set of 16 W3C blend modes',
  '三端共有交集（SVG `mix-blend-mode` / Canvas `globalCompositeOperation`）；混合数学按 W3C 规范两端逐式相同。\n  `normal` 保留为显式值（= 省略，便于显式覆盖）':
    'Shared SVG mix-blend-mode and Canvas globalCompositeOperation modes using W3C compositing mathematics. `normal` is an explicit value equivalent to omission for overriding.',
  'preset 公共可调项（各 preset 在此之上加专有项；默认值由各 preset 给）':
    'Shared preset options; each preset adds specific options and supplies its own defaults',
  '首次迭代前延迟（毫秒）': 'Delay before the first iteration, in milliseconds',
  '单次迭代时长（毫秒）；缺省由各 preset 给':
    'Duration of one iteration in milliseconds; each preset supplies its default',
  '缓动：具名预设 / cubic-bezier 四元组 / 注册名；缺省由各 preset 给':
    'Named easing, cubic-bezier tuple, or registered name; each preset supplies its default',
  '播放触发器；缺省 load': 'Playback trigger; defaults to load',
  '`blink` 选项：谷值不透明度 + 闪烁次数（缺省无限）':
    'Blink options: minimum opacity and iteration count, defaulting to infinite',
  '闪烁谷值不透明度；缺省 0': 'Minimum opacity during flashing; defaults to 0',
  "闪烁次数；缺省 'infinite'": 'Flash iteration count; defaults to infinite',
  '`cameraTo` 选项：起止取景 `[x,y,w,h]`（均必填，纯工厂无法取当前 layout）':
    'CameraTo options: required start and end view boxes [x,y,w,h]; the pure factory cannot read the current layout',
  '起始取景 `[x, y, w, h]`（必填）': 'Required initial view box [x, y, w, h]',
  '终止取景 `[x, y, w, h]`（必填）': 'Required final view box [x, y, w, h]',
  '`colorShift` 选项：通道 + 起止色（均必填，纯工厂无法取 base 色）':
    'ColorShift options: channel and required start/end colors; the pure factory cannot read the base color',
  "变色通道；缺省 'fill'": 'Color channel; defaults to fill',
  '起始颜色（必填）': 'Required initial color',
  '终止颜色（必填）': 'Required final color',
  '`flash` 选项：谷值不透明度 + 闪烁次数': 'Flash options: minimum opacity and flash count',
  '闪烁次数；缺省 2': 'Flash count; defaults to 2',
  '`growUp` 选项：支点 `origin`（缺省底边中点，柱状图从基线长出）':
    'GrowUp options: origin, defaulting to bottom center for bars growing from a baseline',
  "缩放支点；缺省 'bottom'（底边中点）": 'Scale origin; defaults to bottom center',
  '时间轴动画 track（renderer 无关、JSON 可序列化、无函数；keyframe 给绝对展示值、末帧 = 元素 base 终态）':
    'Renderer-independent, JSON-serializable animation track without functions; keyframes contain absolute display values and the final frame represents the base settled state',
  单个动画关键帧: 'One animation keyframe',
  '`loop` 选项：循环次数 + 方向': 'Loop options: iteration count and direction',
  "每次迭代方向（如 'alternate'）": 'Direction of each iteration, such as alternate',
  "循环次数；缺省 'infinite'": 'Iteration count; defaults to infinite',
  '`pulse` 选项：峰值缩放 + 支点': 'Pulse options: peak scale and origin',
  '缩放支点（缺省几何中心）': 'Scale origin; defaults to the geometry center',
  '峰值缩放；缺省 1.1': 'Peak scale; defaults to 1.1',
  '`scaleIn` 选项：起始均匀缩放 `from` + 支点 `origin`': 'ScaleIn options: initial uniform scale from and origin',
  '起始缩放（末帧恒为 1 = base）；缺省 0.8': 'Initial scale; the final value is always 1 (base); defaults to 0.8',
  '`slideIn` 选项：轴向 + 起始位移': 'SlideIn options: axis and initial offset',
  "滑入轴向；缺省 'x'": 'Slide axis; defaults to x',
  '起始位移（末帧恒为 0 = base）；缺省 −20': 'Initial offset; the final value is always 0 (base); defaults to -20',
  '`spin` 选项：旋转支点': 'Spin options: rotation origin',
  '旋转支点（缺省几何中心）': 'Rotation origin; defaults to the geometry center',
  '`wiggle` 选项：抖动幅度（度）+ 支点 + 抖动次数':
    'Wiggle options: angular amplitude in degrees, origin, and iteration count',
  '抖动幅度（度）；缺省 5': 'Angular amplitude in degrees; defaults to 5',
  '抖动次数；缺省 3': 'Wiggle count; defaults to 3',
  '每次迭代的播放方向（抄 WAAPI / CSS animation-direction）':
    'Playback direction per iteration, following WAAPI/CSS animation-direction',
  '缓动具名预设（与 CSS 同名）；track / keyframe 亦可改用 cubic-bezier 四元组':
    'Named easing presets matching CSS; tracks and keyframes can instead use a cubic-bezier tuple',
  '活动区间外取值（抄 WAAPI / CSS animation-fill-mode）':
    'Values outside the active interval, following WAAPI/CSS animation-fill-mode',
  "可动画属性通道（renderer 无关；DrawWay 风格 const + 派生类型，裸字面量 'opacity' 仍第一形态）":
    'Renderer-independent animation channels represented by const names and derived types; literals such as opacity remain supported',
  '`viewBox` 仅在 scene 根合法（镜头），元素级 viewBox track 由 compile / render 拒；\n  `pathDraw` 是 0..1 路径画出进度；`scaleX` / `scaleY` 是非均匀缩放（柱状图从基线长出等），`scale` 是均匀缩放；\n  transform 通道（scale / scaleX / scaleY / rotate）的支点见 track 级 `origin`，缺省几何中心。\n  各后端按通道翻译：SVG WAAPI/CSS、Canvas rAF 几何 lerp':
    'viewBox is valid only at the scene root for camera animation; element-level viewBox tracks are rejected. pathDraw is stroke-reveal progress from 0 to 1. scaleX/scaleY are nonuniform scale; scale is uniform. Transform origins are specified by track.origin and default to the geometry center. SVG maps channels to WAAPI/CSS; Canvas uses animation-frame interpolation.',
  '播放触发器关键字（runtime 落地；DrawWay 风格 const + 派生类型，与其它 Animation 枚举单一真源一致）':
    'Playback trigger names implemented by the runtime, using the same const-and-derived-type convention as other animation enums',
  '持续闪烁：`opacity` 1→dim→1 无限循环（blink = 无限版 flash）':
    'Continuous flashing: opacity 1 to dim to 1 in an infinite loop; blink is the infinite form of flash',
  '镜头：scene 根 `viewBox` from→to（挂 `<Layout animations>` / IR 根 `animations`）':
    'Camera animation: scene-root viewBox from start to end, attached to Layout animations or IR root animations',
  '变色：`fill|stroke` from→to（oklch 插值，由 renderer 端处理）':
    'Color transition: fill or stroke from start to end, interpolated in OKLCH by the renderer',
  '描边画出：`pathDraw` 0→1（仅对有描边元素有效）': 'Stroke reveal: pathDraw from 0 to 1; requires a stroked element',
  '淡入：`opacity` 0→1（末帧 = base，降级见完整图）':
    'Fade in: opacity from 0 to 1; final frame matches the base value',
  '闪一下强调：`opacity` 1→dim→1，默认闪 2 次（末帧 = base = 完整可见）':
    'Flash emphasis: opacity 1 to dim to 1, twice by default; ends at base full visibility',
  '从无到有放大：`scaleIn` 的 `from: 0` 别名': 'Grow from zero: scaleIn with from set to 0',
  '从基线长出：`scaleY` 0→1，支点底边（柱状图入场）':
    'Grow from the baseline: scaleY from 0 to 1 around the bottom edge',
  '循环包装：给任意 track 叠加无限（或指定次数）循环 + 方向':
    'Loop wrapper: applies infinite or specified repetition and direction to any track',
  '脉冲：`scale` 1→peak→1 无限循环（强调 / 心跳）': 'Pulse: scale from 1 to peak and back to 1 in an infinite loop',
  '缩放入场：`scale` from→1（均匀，绕 origin）':
    'Scale entrance: uniform scale from the initial value to 1 around origin',
  '滑入：`translateX|Y` offset→0': 'Slide in: translateX or translateY from offset to zero',
  '旋转：`rotate` 0→360 无限循环、匀速（loader）': 'Spin: rotate from 0 to 360 in an infinite, constant-speed loop',
  '错峰：给一组 track 依次叠加 delay（`startMs + i*stepMs`），实现「N 元素依次入场」':
    'Stagger: assigns startMs + i * stepMs delays to tracks for sequential element entrances',
  '覆盖各 track 原有 delay（错峰编排以本 helper 为准）':
    'Overrides existing track delays; this helper owns the staggered timing',
  '抖动强调：`rotate` 0→+a→−a→+a→0 来回摆（末帧 = base 不旋转）':
    'Wiggle emphasis: rotate through 0, positive amplitude, negative amplitude, positive amplitude, and 0; ends at base rotation',
  '播放控制句柄（manual trigger / runtime 暴露给调用方）':
    'Playback handle exposed for manual triggers and runtime control',
  '停止并释放（rAF / observer / listener）': 'Stop and release animation frames, observers, and listeners',
  '暂停（保留当前时刻）': 'Pause while retaining the current time',
  '开始 / 继续播放': 'Start or resume playback',
  是否在播放: 'Whether playback is active',
  '跳到指定时刻（毫秒）并渲染该帧': 'Seek to a time in milliseconds and render that frame',
  '当前时刻（毫秒）': 'Current time in milliseconds',
  '单个自定义 property 的插值 + Canvas 应用定义':
    'Interpolation and Canvas application definition for one custom property',
  '把当下值应用到 Canvas context（绘制该 prim 前调用；在 ctx.save/restore 作用域内）':
    'Apply the current value to the Canvas context before drawing the primitive, inside save/restore',
  '两关键帧值 + 段进度 → 当下值（喂给 evaluateTrack 的 interpolateCustom）':
    'Map two keyframe values and segment progress to the current value for evaluateTrack.interpolateCustom',
  '自定义 property 注册表：property 名 → 定义': 'Custom property registry mapping names to definitions',
  '自定义缓动注册表：名 → cubic-bezier 四元组（CSS / WAAPI 通用）或函数（仅 Canvas / JS）':
    'Custom easing registry mapping names to cubic-bezier tuples (CSS/WAAPI) or functions (Canvas/JavaScript only)',
};

/** 缺少审阅后的中文说明翻译时阻止生成 */
export const translateVisualApiReference = (source: string): string => {
  const translated = translations[source];
  if (translated !== undefined) return translated;
  if (!/[\u3400-\u9fff]/u.test(source)) return source;
  throw new Error(`Missing visual API translation: ${source}`);
};
