/** 经核对的绘制 API 英文说明，源码标识符保持不变 */
const translations: Readonly<Partial<Record<string, string>>> = {
  '折角 step 鉴别字面量': 'Discriminant for a fold step',
  折角终点: 'Fold endpoint',
  两段折角走向: 'Two-segment fold direction',
  三段折角走向: 'Three-segment fold direction',
  中间腿的归一化位置: 'Normalized position of the middle leg',

  '路径配置，way 与 children 互斥': 'Path configuration; way and children are mutually exclusive',
  保留配置字段的路径作者输入: 'Path authoring input preserving the configuration fields',

  '椭圆的 x、y 轴半径': 'Ellipse radii on the x and y axes',
  '用步骤或路径简写声明路径，并设置样式、箭头与交互':
    'Declare a path with steps or shorthand, and configure its style, arrows, and interactions',
  '路径种类，省略时使用内置 stroke；自定义种类通过 Layout.extensions.pathKinds 注册':
    'Path kind; defaults to built-in stroke. Register custom kinds through Layout.extensions.pathKinds',
  '所选路径种类的 JSON 参数；内置 stroke 不接受此字段':
    'JSON options for the selected path kind; built-in stroke does not accept this field',
  附着于整条路径的一个或多个几何标签: 'One or more geometry labels attached to the whole path',
  '创建作者侧路径输入，身份由配置中的 id 声明':
    'Create path authoring input, with identity declared by the configuration id',
  '路径步骤序列；与 way 互斥': 'Path steps; mutually exclusive with way',

  'Arc action：按起末角度绘制圆弧 / 椭圆弧段；圆心缺省取游标，可显式指定（TikZ `arc[start angle=…, end angle=…, radius=…]`）':
    'Arc action: draw a circular or elliptical arc between angles; the center defaults to the cursor and can be specified explicitly (TikZ `arc[start angle=…, end angle=…, radius=…]`)',
  '显式圆心；缺省取游标（上一 step anchor）': 'Explicit center; defaults to the cursor (the previous step anchor)',
  'sugar 形态': 'Sugar form',
  '终止角度（度），sweep 方向由 startAngle vs endAngle 决定':
    'End angle in degrees; sweep direction follows the relationship between startAngle and endAngle',
  '弧段 step 鉴别字面量': 'Discriminant for an arc step',
  边标注: 'Edge label',
  '弧半径；number 表示正圆，{ x, y } 表示椭圆': 'Arc radius: a number for a circle, or { x, y } for an ellipse',
  '起始角度（度，0° = +x、90° = +y screen-down；与 ArcStep / Node label 角度约定一致）':
    'Start angle in degrees: 0° is +x and 90° is screen-down +y, matching ArcStep and Node labels',
  'Axis-line action：把目标投影到当前 host 的一个局部轴并画单段直线':
    'Axis-line action: project a target onto one local axis of the current host and draw a straight segment',
  '保持的当前 host 局部轴': 'Local host axis whose current coordinate is preserved',
  '单轴连接 step 鉴别字面量': 'Discriminant for a single-axis step',
  '投影目标，仅支持笛卡尔坐标、NodeTarget 或对应字符串 shorthand':
    'Projection target: Cartesian coordinates, a NodeTarget, or the corresponding string shorthand',
  'Bend action：弧形简记，自动算控制点生成 cubic（TikZ `to[bend left=N]` / `to[out=…, in=…]`）':
    'Bend action: curve shorthand that computes cubic control points (TikZ `to[bend left=N]` or `to[out=…, in=…]`)',
  '支持对称弯与非对称弯 / 自环两种模式；同给时 out/in 优先（编译层）。\n  三者全省时默认 left 对称弯。`from == to`（同节点 / 同坐标）配合 out/in 画自环':
    'Supports symmetric bends and asymmetric bends or loops. Explicit out/in angles take precedence during compilation. With all three omitted, defaults to a symmetric left bend. When `from == to`, explicit out/in angles create a loop',
  '对称弯模式的弯角度（度），缺省 30': 'Symmetric bend angle in degrees; defaults to 30',
  "对称弯模式的弯向：'left' / 'right'（视觉左右，相对 from→to）；可选，与 out/in 互补":
    "Symmetric bend direction: 'left' or 'right' relative to from→to; optional alongside the out/in form",
  '非对称弯 / 自环模式的入射角（度，TikZ `in=`）；与 outAngle 一起编译成 cubic':
    'Incoming angle in degrees for asymmetric bends or loops (TikZ `in=`); combined with outAngle into a cubic',
  '弧形简记 step 鉴别字面量': 'Discriminant for a bend step',
  '非对称弯 / 自环模式的曲线松紧系数（TikZ `looseness=`，控制控制点距离），缺省约 1；也缩放自环默认大小':
    'Control-point distance multiplier for asymmetric bends or loops (TikZ `looseness=`); defaults to approximately 1 and also scales the default loop size',
  '非对称弯 / 自环模式的出射角（度，TikZ `out=`）；与 inAngle 一起编译成 cubic，给定时优先于 bendDirection':
    'Outgoing angle in degrees for asymmetric bends or loops (TikZ `out=`); combined with inAngle into a cubic and takes precedence over bendDirection',
  终点: 'Endpoint',
  'CirclePath action：以游标为圆心绘制圆；无角度=整圆（画完回圆心），带角度=部分圆（TikZ `circle[radius=…]`）':
    'CirclePath action: draw around the cursor; without angles, draw a full circle and return to its center; with angles, draw a partial circle (TikZ `circle[radius=…]`)',
  '闭合模式：无角度=closed（整圆）；带角度=chord（弦，默认）/ sector（连回中心）/ open（纯弧）':
    'Closure: without angles, closed; with angles, chord (default), sector (back to center), or open (arc only)',
  '部分圆终止角（度）': 'Partial-circle end angle in degrees',
  '整圆 step 鉴别字面量': 'Discriminant for a circle-path step',
  '圆半径（user units）': 'Circle radius in user units',
  '部分圆起始角（度）；与 endAngle 同给才生效':
    'Partial-circle start angle in degrees; applies only together with endAngle',
  'Cubic action：三次贝塞尔，两个控制点（TikZ `.. controls (B) and (C) ..`）':
    'Cubic action: cubic Bézier with two control points (TikZ `.. controls (B) and (C) ..`)',
  '第一控制点（影响起点切线）': 'First control point, affecting the start tangent',
  '第二控制点（影响终点切线）': 'Second control point, affecting the end tangent',
  '三次贝塞尔 step 鉴别字面量': 'Discriminant for a cubic Bézier step',
  曲线终点: 'Curve endpoint',
  'Curve action：二次贝塞尔，一个控制点（TikZ `.. controls (B) ..`）':
    'Curve action: quadratic Bézier with one control point (TikZ `.. controls (B) ..`)',
  '控制点（仅支持笛卡尔 `[x, y]`）': 'Control point; only Cartesian `[x, y]` is supported',
  '二次贝塞尔 step 鉴别字面量': 'Discriminant for a quadratic Bézier step',
  'Cycle action：把当前子路径闭合回最近一次 move 起点（TikZ `cycle`）':
    'Cycle action: close the current subpath to the most recent move point (TikZ `cycle`)',
  '闭合 step 鉴别字面量；无 `to` / `label` / `children`——不可挂边标注、不消耗目标点':
    'Closure discriminant; accepts no `to`, `label`, or `children`, attaches no edge label, and consumes no target',
  'Draw 的作者侧属性': 'Authoring props for Draw',
  路径级箭头方向: 'Path-level arrow direction',
  箭头详细配置: 'Detailed arrow configuration',
  箭头端点放置配置: 'Endpoint arrow placement',
  折线拐角几何圆角半径: 'Geometric rounding radius at polyline corners',
  '实例视觉覆盖，逐字段覆盖继承默认值': 'Instance visual overrides, replacing inherited defaults field by field',
  '语义 stroke 档位糖': 'Semantic stroke-width shorthand',
  'TikZ 风格的路径走向简写': 'TikZ-style route shorthand',
  '同层 stack 顺序': 'Stack order among siblings',
  'EllipsePath action：以游标为圆心绘制椭圆；无角度=整椭圆（画完回圆心），带角度=部分椭圆（TikZ `ellipse[x radius=…, y radius=…]`）':
    'EllipsePath action: draw around the cursor; without angles, draw a full ellipse and return to its center; with angles, draw a partial ellipse (TikZ `ellipse[x radius=…, y radius=…]`)',
  '闭合模式：无角度=closed（整椭圆）；带角度=chord（默认）/ sector（连回中心）/ open':
    'Closure: without angles, closed; with angles, chord (default), sector (back to center), or open',
  '部分椭圆终止角（度）': 'Partial-ellipse end angle in degrees',
  '整椭圆 step 鉴别字面量': 'Discriminant for an ellipse-path step',
  '椭圆 x 轴半径': 'Ellipse radius along the x axis',
  '部分椭圆起始角（度）；与 endAngle 同给才生效':
    'Partial-ellipse start angle in degrees; applies only together with endAngle',
  'Fold action：两段或三段正交折线': 'Fold action: a two- or three-segment orthogonal polyline',
  '`-|` / `|-` 使用一个转折点；`-|-` / `|-|` 使用两个转折点，并可用归一化 `fraction` 调整中间腿位置':
    '`-|` and `|-` use one turn; `-|-` and `|-|` use two turns, with normalized `fraction` controlling the middle leg',
  'Generator action：调用内置或运行时注册的 path generator 生成一段低层路径命令':
    'Generator action: invoke a built-in or registered path generator to produce low-level path commands',
  '生成器 step 鉴别字面量': 'Discriminant for a generator step',
  'path generator 名称；内置名或 `<Layout extensions={{ pathGenerators }}>` 注册名':
    'Path generator name: a built-in name or one registered through Layout extensions.pathGenerators',
  'JSON-safe 参数对象；目标引用需写在 generator 的 `targetParams` 顶层 key 上':
    "JSON-safe parameter object; target references must occupy top-level keys listed in the generator's `targetParams`",
  '可选终点，会作为 generator context 的 `to` 传入': 'Optional endpoint passed as `to` in the generator context',
  'Line action：从当前游标到目标点画直线（TikZ `(A) -- (B)`）':
    'Line action: draw from the cursor to a target (TikZ `(A) -- (B)`)',
  'sugar 形态：`<Step><EdgeLabel>...</EdgeLabel></Step>`；其它 children 静默忽略':
    'Sugar form: `<Step><EdgeLabel>...</EdgeLabel></Step>`; other children are silently ignored',
  "直线 step 鉴别字面量；省略时默认 'line'": "Line-step discriminant; defaults to 'line' when omitted",
  '边标注，等价于 sugar `<EdgeLabel>` child': 'Edge label, equivalent to a sugar `<EdgeLabel>` child',
  直线终点: 'Line endpoint',
  'Move action：移动游标但不绘制（TikZ `(A)`）': 'Move action: move the cursor without drawing (TikZ `(A)`)',
  '移动 step 鉴别字面量': 'Discriminant for a move step',
  移动目标点: 'Move target',
  '路径级时间轴动画；渲染端播放或降级为静态，不参与布局':
    'Path-level timeline animation; rendered as animation or a static fallback, without participating in layout',
  "`'->'` 终点 / `'<-'` 起点 / `'<->'` 两端；省略或 `'none'` 无箭头":
    "`'->'` at the end, `'<-'` at the start, or `'<->'` at both ends; omitted or `'none'` means no arrows",
  '顶层默认 + 可选 `start` / `end` 子对象逐字段 merge override。空心 shape\n（open / openStealth / openDiamond / openCircle）上 `fill` silent no-op':
    'Top-level defaults with optional `start` and `end` overrides merged field by field. On hollow shapes (open, openStealth, openDiamond, and openCircle), `fill` is a silent no-op',
  '`overlap` 为实际端点共享值，`start` / `end` 可逐端覆盖；比例从默认位置插值到最终视觉后缘与逻辑端点对齐的位置':
    'Shared `overlap` for actual endpoints, with per-end `start` and `end` overrides; interpolates from default placement to alignment of the final visual back edge with the logical endpoint',
  '可选 compile driver 自行解释的 runtime-only authoring 载荷，不进入 Core IR':
    'Optional runtime-only authoring payload interpreted by a compile driver; excluded from Core IR',
  '应当全部是 `<Step />`': 'All children should be `<Step />`',
  '路径 id；其他 path / position 通过这个 id 引用本路径，也作为水合挂点供事件 handler 绑定':
    'Path id, used by other paths or positions to reference it and by hydration to bind event handlers',
  '沿路径在归一化位置放标记（首批仅箭头）': 'Place marks at normalized positions along the path; currently only arrows',
  "每个 `{ pos, mark }`：`pos∈[0,1]`，`mark.kind:'arrow'` + 视觉子集（shape 为已注册箭头名，方向随路径切线）":
    "Each `{ pos, mark }` uses `pos∈[0,1]` and `mark.kind:'arrow'` plus visual settings; shape is a registered arrow name and direction follows the path tangent",
  '用户自定义元数据；可在事件 / 水合上下文中读取，不参与布局。须为 JSON 可序列化对象':
    'JSON-serializable user metadata available in event and hydration contexts; does not participate in layout',
  '单击该图元（DOM `click`）': 'Click on this element (DOM `click`)',
  '双击该图元（DOM `dblclick`）': 'Double-click on this element (DOM `dblclick`)',
  '指针在该图元上按下（DOM `pointerdown`）': 'Pointer pressed on this element (DOM `pointerdown`)',
  '指针进入该图元（由 `pointermove` + 命中 id 状态机合成，跨子元素不重复触发）':
    'Pointer enters this element, synthesized from `pointermove` and hit-ID state; moving between children does not trigger it again',
  '指针离开该图元（由 `pointermove` + 命中 id 状态机合成）':
    'Pointer leaves this element, synthesized from `pointermove` and hit-ID state',
  '指针在该图元上移动（DOM `pointermove`）': 'Pointer moves over this element (DOM `pointermove`)',
  '指针在该图元上抬起（DOM `pointerup`）': 'Pointer released on this element (DOM `pointerup`)',
  '右键该图元（DOM `contextmenu`）；默认不抑制浏览器菜单，handler 自行 `event.preventDefault()`':
    'Context menu on this element (DOM `contextmenu`); call `event.preventDefault()` in the handler to suppress the browser menu',
  '在该图元上滚轮（DOM `wheel`）': 'Wheel input over this element (DOM `wheel`)',
  '整条 path 旋转（度，绕包围盒中心，正向 = 屏幕 y-down 视觉顺时针）':
    'Rotate the whole path in degrees about its bounding-box center; positive angles are visually clockwise in screen-down coordinates',
  '等价把 path 包一层绕其包围盒中心旋转的 Scope；端点先在当前 scope resolve 再整体旋转':
    'Equivalent to a Scope rotating the path around its bounding-box center; endpoints resolve in the current scope before rotation',
  '折线拐角几何圆角半径（TikZ `rounded corners=`）':
    'Geometric rounding radius at polyline corners (TikZ `rounded corners=`)',
  '对每个 line↔line 接缝插切圆弧、改路径几何（区别于 lineJoin 仅描边）；curve / arc / bezier / fold 接缝保持尖；按相邻段长 clamp；省略 = 尖角':
    'Insert a tangent arc at each line-to-line joint, changing geometry rather than only stroke appearance. Curve, arc, Bézier, and fold joints stay sharp; the radius is clamped to adjacent segment lengths. Omission keeps sharp corners',
  '整条 path 缩放（绕包围盒中心）：number 等比，或 `{ x, y }` 非等比':
    'Scale the whole path around its bounding-box center: a number for uniform scaling or `{ x, y }` for independent axes',
  '语义 stroke 档位糖（TikZ `ultra thin` … `ultra thick`）；构造 IR 时解析为 `strokeWidth`，显式 `strokeWidth` 始终优先':
    'Semantic stroke-width shorthand (TikZ `ultra thin` through `ultra thick`), normalized to `strokeWidth`; explicit `strokeWidth` takes precedence',
  'TikZ 风格路径走向简写，由 Vanilla 统一解析为步骤': 'TikZ-style route shorthand, parsed into steps by Vanilla',
  '显式栈序：大者在上；缺省 0 = 声明顺序；同值稳定保序；只在同层子节点间生效':
    'Explicit stack order: larger values are above; defaults to 0, equal values preserve declaration order, and comparison is limited to siblings',
  'Rectangle action：两对角定义的轴对齐矩形（可圆角）；编译为 path 命令（TikZ `(a) rectangle (b)`）':
    'Rectangle action: an axis-aligned rectangle from opposite corners, optionally rounded, compiled to path commands (TikZ `(a) rectangle (b)`)',
  '四角同圆角半径；缺省直角，compile clamp 到边长一半':
    'Shared corner radius; omitted means sharp corners, and compilation clamps it to half the side length',
  一角: 'One corner',
  '矩形 step 鉴别字面量': 'Discriminant for a rectangle step',
  '对角（顺序无关）': 'Opposite corner; order is irrelevant',
  'Smooth action：过当前游标 + `points` 的平滑曲线（TikZ `plot[smooth]` / Hobby 风格）':
    'Smooth action: a smooth curve through the cursor and `points` (TikZ `plot[smooth]` or Hobby-style input)',
  '游标为隐式首 knot，曲线依次穿过 `points` 每个点；编译期经 centripetal Catmull-Rom 转成 cubic 链。\n  需前置 step 设游标；游标终于 `points` 末项。`tension` 缺省 1（标准 centripetal CR），<1 更紧、>1 更鼓':
    'The cursor is the implicit first knot; the curve passes through each entry in `points`, using centripetal Catmull–Rom converted to cubics. A preceding step must set the cursor, which ends at the last point. `tension` defaults to 1; values below 1 tighten the curve and values above 1 increase the bulge',
  '平滑曲线 step 鉴别字面量': 'Discriminant for a smooth step',
  '边标注，沿生成 cubic 按贝塞尔参数定位': 'Edge label positioned by Bézier parameter along the generated cubics',
  '游标之后依次穿过的点（顺序敏感）；单点 = 一段曲线，游标终于末点':
    'Ordered points after the cursor; one point creates one segment, and the cursor ends at the last point',
  '切线长度乘子（TikZ `tension`）；缺省 1，<1 更紧、>1 更鼓':
    'Tangent-length multiplier (TikZ `tension`); defaults to 1, with lower values tighter and higher values more rounded',
  "十四种 kind：'move' / 'line'（默认） / 'axis-line'（单轴投影连接） / 'fold'（折角） / 'cycle'（闭合） / 'curve'（二次贝塞尔） / 'cubic'（三次贝塞尔） / 'bend'（弧形简记） / 'arc'（圆 / 椭圆弧段） / 'circlePath'（整圆 / 部分圆） / 'ellipsePath'（整椭圆 / 部分椭圆） / 'rectangle'（矩形） / 'smooth'（过点平滑曲线） / 'generator'（内置或注册路径生成器）。除 'move' / 'cycle' / 'rectangle' 外均可挂 `label?: IRStepLabel`，等价于 sugar `<EdgeLabel>` child（prop 优先）；'smooth' 用 `points` 而非 `to`，'generator' 用 `name` + JSON-safe `params`。每个 kind 有对应 named type export，便于 wrapper / forwardRef / `Pick<>` 派生":
    "Fourteen kinds: 'move', 'line' (default), 'axis-line' (single-axis projection), 'fold', 'cycle', 'curve' (quadratic Bézier), 'cubic', 'bend', 'arc', 'circlePath', 'ellipsePath', 'rectangle', 'smooth', and 'generator'. All except 'move', 'cycle', and 'rectangle' accept `label?: IRStepLabel`, equivalent to an `<EdgeLabel>` child with the prop taking precedence. 'smooth' uses `points` instead of `to`; 'generator' uses `name` and JSON-safe `params`. Named types for each kind support wrappers and derived props",
  'Sugar 组件，将路径 grammar 原样调度给 Vanilla': 'Sugar component forwarding path grammar to Vanilla unchanged',
  'React 只负责 JSX sugar；`normalizePath` 是 `way` 的唯一 parser 调度位置':
    'React only provides JSX sugar; `normalizePath` is the sole parser dispatch point for `way`',
  'Path 用一组 `<Step>` 声明路径': 'Path declares a route using a sequence of `<Step>` elements',
  '本组件自身不渲染 DOM；最终路径由 `<Layout>` 根据 step 序列、样式、箭头和标记输出':
    'This component does not render DOM itself; `<Layout>` produces the final path from steps, styles, arrows, and marks',
  'Step 是 DSL 标记组件——本身不渲染': 'Step is a DSL marker component and does not render itself',
  '声明路径中的一个动作，例如移动、连线、曲线、圆弧、闭合或生成器片段':
    'Declares one path action, such as a move, line, curve, arc, closure, or generator segment',
  作者侧路径输入: 'Authoring input for a path',
  箭头的顶层默认与端点覆盖配置: 'Top-level arrow defaults and endpoint overrides',
  箭头端点的共享与逐端放置配置: 'Shared and per-end arrow placement settings',
  '可选编译驱动自行解释的运行时载荷，不进入 Core IR':
    'Optional runtime payload interpreted by a compile driver; excluded from Core IR',
  路径描边宽度语法糖: 'Path stroke-width shorthand',
  '无法由 authoring 字段唯一识别时显式指定路径类别':
    'Explicit path category when authoring fields cannot identify it uniquely',
  作者侧路径步骤: 'Authoring path step',
  '创建作者侧路径输入，支持 id 简写与完整配置':
    'Create authoring path input with an id shorthand or full configuration',
  '可注册的 arrow 定义': 'Registerable arrow definition',
  '描述箭头 marker 的尺寸、接触点和几何生成能力；定义本身不进入 IR':
    'Describes marker dimensions, contact points, and geometry generation; the definition itself is not IR',
  'marker 基础几何沿箭头轴向承诺的包络后缘，必须不晚于线接触点':
    'Promised back edge of the base marker geometry along its axis; must not lie beyond the line contact point',
  'marker 局部基准边长（viewBox `0 0 baseSize baseSize`，refY = baseSize/2）；缺省 10':
    'Marker-local base size (viewBox `0 0 baseSize baseSize`, refY = baseSize/2); defaults to 10',
  '默认箭头长度（length fallback）；缺省 8': 'Fallback arrow length; defaults to 8',
  '默认箭头宽度（width fallback）；缺省 8': 'Fallback arrow width; defaults to 8',
  '局部坐标 marker 几何（renderer-agnostic）；adapter 把产物嵌进 `<marker>`':
    'Renderer-independent marker geometry in local coordinates; an adapter embeds the result in `<marker>`',
  '空心标志：true 时由描边表达外轮廓，并按 lineWidth 修正接触点':
    'Hollow flag: when true, stroke defines the outline and lineWidth adjusts the contact point',
  '线接触点静态 base，决定 path shrink 与 marker refX':
    'Base line contact point, used for path shortening and marker refX',
  'arrow 名称，由 IR `marks[].mark.shape` 引用；作者侧使用 `arrowDetail.shape`':
    'Arrow name referenced by IR `marks[].mark.shape`; authoring input uses `arrowDetail.shape`',
  '外轮廓补偿量（marker 局部坐标）；缺省时空心箭头用 lineWidth/2，实心箭头用 0':
    'Outer-outline compensation in marker-local coordinates; defaults to lineWidth/2 for hollow arrows and 0 for solid arrows',
  '尖端 x（shrink 用）；缺省 = baseSize': 'Tip x coordinate used for shortening; defaults to baseSize',
  'arrow emit 的运行时上下文': 'Runtime context for arrow emission',
  '提供已解析的颜色、描边粗细和取整函数，供定义生成 marker 几何':
    'Resolved colors, stroke width, and rounding function used to generate marker geometry',
  '填充颜色（实心箭头主导色；空心箭头会按 `hollow` 处理后传入）':
    'Fill color, the main color for solid arrows; processed according to `hollow` for hollow arrows',
  '描边粗细（marker 局部坐标，user units）；空心箭头据此画外轮廓':
    'Stroke width in marker-local user units, used to draw hollow outlines',
  '精度取整函数（与 compile/render 同一 round，保几何一致）':
    'Precision rounding shared with compile and render to keep geometry consistent',
  "描边颜色（无 override 时 = `{ kind: 'contextStroke' }`，继承 path stroke）":
    "Stroke color; without an override, `{ kind: 'contextStroke' }` inherits the path stroke",
  '可注册的 path generator 定义': 'Registerable path generator definition',
  '描述 JSON 参数、可解析 target 参数和命令生成能力；定义本身不进入 IR':
    'Describes JSON parameters, resolvable target parameters, and command generation; the definition itself is not IR',
  '根据上下文生成低层 path 命令': 'Generate low-level path commands from the context',
  '返回命令使用与上下文一致的局部坐标；可返回 `move` 形成 sub-path':
    'Commands use the same local coordinates as the context and may contain `move` to start a subpath',
  'generator 名称，由 generator step 的 `name` 引用': "Generator name referenced by the generator step's `name`",
  '实例参数 schema': 'Instance parameter schema',
  '解析结果必须是 JSON object': 'Parsed output must be a JSON object',
  '需要解析为当前 Path 局部坐标的 params 顶层 key':
    "Top-level parameter keys to resolve into the current Path's local coordinates",
  'path generator 的运行时上下文': 'Runtime context for a path generator',
  '坐标均位于当前 Path 的局部坐标系，返回的命令由所属 GroupPrim 统一应用 scope transform':
    'All coordinates are local to the current Path; the owning GroupPrim applies the Scope transform to the returned commands',
  '当前游标局部坐标（上一段终点 / sub-path 起点）':
    'Current local cursor position: the preceding segment endpoint or subpath start',
  'paramsSchema 校验后的参数对象': 'Parameter object validated by paramsSchema',
  'targetParams 顶层 key 到当前 Path 局部坐标的解析结果':
    "Resolution of top-level targetParams keys into the current Path's local coordinates",
  '精度取整函数，与 compile/render 使用同一 round': 'Precision rounding shared with compile and render',
  'step.to resolve 后的局部坐标\n缺省表示 step 未给 `to`':
    'Local coordinates after resolving step.to; absent when the step omits `to`',
  '使用当前 `path`': 'Use the current `path`',
  'path kind 编译上下文': 'Path-kind compilation context',
  '自定义 kind 可以完全接管输出，也可以调用回调复用标准描边逻辑':
    'A custom kind can take over output completely or reuse standard stroke logic through callbacks',
  '已解析的 renderer-neutral 宿主外观': 'Resolved renderer-neutral host appearance',
  '编译共享宿主标签，并支持 kind 提供边界偏移':
    'Compile shared host labels with optional boundary offsets supplied by the kind',
  '复用 core 标准描边编译逻辑；不传 path 时使用当前 `path`':
    "Reuse Core's standard stroke compiler; omission uses the current `path`",
  '物化选定 steps，不应用 marker、dash、fill 或 kind-specific geometry':
    'Materialize selected steps without applying markers, dashes, fill, or kind-specific geometry',
  '当前 Path kind 的最终所属者产物 publisher': 'Publisher for the final output owned by the current Path kind',
  '经该 definition 完整 schema 解析后的 path subject': "Path subject parsed through this definition's complete schema",
  '与本次 compile 一致的取整函数': 'Rounding function shared with the current compilation',
  'path kind 编译结果': 'Path-kind compilation result',
  'path kind definition 把高层 path 形态编译成当前 Path 局部坐标系中的 Scene primitive，\n  并返回同一坐标系内参与 bbox / transform 计算的关键点集合':
    "A path-kind definition compiles a high-level path into Scene primitives in the current Path's local coordinates and returns points in that same space for bounds and transform calculations",
  '当前 Path 局部坐标系中的 layout 与路径级 rotate / scale 几何依据':
    "Geometry used for layout and path-level rotate/scale in the current Path's local coordinates",
  '当前 Path 局部坐标系中的实际渲染输出': "Actual rendering output in the current Path's local coordinates",
  'way DSL 数组：sugar `<Draw way={...}>` 输入形态': 'Way DSL array accepted by sugar `<Draw way={...}>`',
  'Sugar 层 way 数组 DSL 元素': 'An element of the sugar way-array DSL',
  '节点 id 字符串/笛卡尔/极坐标 → line（首项 move）；`{position,type}` 相对偏移对象 → IR relative/relativeAccumulate；horizontalTo/verticalTo → axis-line；四种裸 via 或 `{via,fraction}` 与下一项合并 fold；DrawWay.Cycle → cycle；curve/cubic/bend infix 与下一项合并；arc/circle/ellipse infix 以上一项为圆心不消耗下一项。Cycle/Relative/Accumulate 底层字符串刻意写丑避节点 id 撞结构':
    'Node-id strings, Cartesian points, and polar points become line steps (the first becomes move). Relative objects become IR relative/relativeAccumulate targets. horizontalTo/verticalTo become axis-line. A bare via or `{via,fraction}` combines with the next target into a fold. DrawWay.Cycle closes the subpath. curve/cubic/bend consume the next target, while arc/circle/ellipse use the previous position as center without consuming the next item. Internal Cycle/Relative/Accumulate strings avoid collisions with node ids',
  'Sugar 层 way 数组的关键字常量': 'Keyword constants for the sugar way-array DSL',
  'Cycle 闭合到 way 起点（底层字符串故意写丑避节点 id 冲突，只通过 DrawWay.Cycle 引用）；Hv/Vh/Hvh/Vhv 是两段或三段折角算子；Relative/Accumulate 相对偏移 way item 的 type 鉴别值（Relative=TikZ `(+x,+y)` 不推进 prevEnd，Accumulate=TikZ `(++x,++y)` 累积更新）。用 const + as const 而非 TS enum 避免 reverse-mapping 与字面量不互通':
    'Cycle closes to the way start and must be referenced through DrawWay.Cycle. Hv/Vh/Hvh/Vhv describe two- or three-segment folds. Relative/Accumulate discriminate relative-offset items: Relative preserves prevEnd, while Accumulate updates it cumulatively. A const object with as const avoids TypeScript enum reverse mappings and literal incompatibility',
  '定义 arrow 注册项': 'Define an arrow registry entry',
  '当前是 typed identity；保留入口用于对齐 registry API，并为未来校验或归一化预留空间':
    'Currently a typed identity, retained to align registry APIs and allow future validation or normalization',
  '定义 path generator 注册项': 'Define a path-generator registry entry',
  '当 name 为空时': 'When name is empty',
  'generator 输出的 JSON-safe 校验仍由 compile 阶段负责':
    'JSON-safe validation of generator output remains the responsibility of compilation',
  '`<Arc>` 形态：圆弧（radius number）/ 椭圆弧（radius {x,y}）；必给角度（startAngle / endAngle / sweepAngle 三选二）':
    '`<Arc>` inputs: circular arc (numeric radius) or elliptical arc (radius {x,y}); exactly two of startAngle, endAngle and sweepAngle are required',
  '默认开放弧；给 `close="chord"`（弦闭合）或 `close="sector"`（连回圆心成扇形）可闭合成可填充区域。\n  `label` 透传到底层弧 step，文字沿弧定位（`position` 缺省 midway，按 startAngle..endAngle 线性映射）':
    'Open by default; `close="chord"` joins the endpoints, while `close="sector"` joins them to the center to form a fillable region. `label` is forwarded to the arc step, placing text along the arc (`position` defaults to midway and maps linearly across startAngle..endAngle).',
  "闭合方式：缺省 / `'open'` 开放弧；`'chord'` 两端点连弦闭合；`'sector'` 连回圆心成扇形（均可填充）":
    "Closure: omitted or `'open'` leaves an open arc; `'chord'` joins endpoints; `'sector'` joins them through the center. Closed regions can be filled.",
  '弧上边标注（透传到底层 step；`position` 缺省 midway，沿弧 startAngle..endAngle 线性映射）':
    'Arc label forwarded to the underlying step; `position` defaults to midway and maps linearly across startAngle..endAngle',
  '`<Rectangle>` 形态：四选一定两对角': '`<Rectangle>` inputs: one of four forms determines two opposite corners',
  '`<RegularPolygon>` 形态：中心 + 外接圆半径（或边长）+ 边数':
    '`<RegularPolygon>` inputs: center, circumradius (or side length), and side count',
  '`<Sector>` 形态：扇形（wedge 经圆心闭合）；圆 / 椭圆；必给角度（三选二）':
    '`<Sector>` inputs: a circular or elliptical wedge closed through its center; exactly two angle inputs are required',
  '实心扇形走 circlePath / ellipsePath 的 `closed="sector"`，圆心 = 游标，故 `center` 可为\n  节点 id / 极坐标等任意 Target。给 innerRadius（圆）或 innerRadiusX + innerRadiusY（椭圆）画**空心扇形**\n  （环形扇区 / donut 切片）；空心需算内 / 外弧端点，`center` 须 literal 笛卡尔。\n  `label` 透传到弧 step，沿弧定位（`position` 缺省 midway）':
    'Solid sectors use circlePath / ellipsePath with `closed="sector"`; the center is the cursor, so `center` accepts any Target, including node IDs and polar coordinates. Supply an inner radius to draw a hollow sector (annular sector / donut slice). Hollow sectors calculate inner and outer arc endpoints and require a literal Cartesian center. `label` is forwarded to the arc step and defaults to midway.',
  '`<Star>` 形态：中心 + 外/内半径（或外半径 + 内半径比例）+ 角数':
    '`<Star>` inputs: center, outer/inner radii (or outer radius and inner ratio), and point count',
  'Arc sugar——弧线（默认开放，可弦闭合 / 扇形闭合）':
    'Arc sugar: an open arc by default, optionally closed by a chord or through the center',
  'center 透传（任意 Target，可为节点 id / 极坐标）。\n  开放弧展开为 `<Path><Step move(center)><Step arc(center)></Path>`（pen 停在弧端点，输出与旧版一致）；\n  `close="chord"|"sector"` 改走 circlePath / ellipsePath 的对应 closed 模式（圆心 = 游标）':
    'Forwards center as any Target, including node IDs and polar coordinates. An open arc expands to `<Path><Step move(center)><Step arc(center)></Path>` and leaves the cursor at the arc endpoint. `close="chord"|"sector"` uses the matching closed mode of circlePath / ellipsePath, with the center as the cursor.',
  'Circle sugar——展开为 Path + circlePath step': 'Circle sugar: expands to Path and a circlePath step',
  'Ellipse sugar——展开为 Path + ellipsePath step': 'Ellipse sugar: expands to Path and an ellipsePath step',
  'Rectangle sugar——展开为 `<Path><Step move(from)><Step rectangle(from,to)></Path>`':
    'Rectangle sugar: expands to `<Path><Step move(from)><Step rectangle(from,to)></Path>`',
  '`{ corner1, corner2 }` 透传（任意 Target，直接作 rectangle 的 from/to）；其余形态需算坐标 → 限 literal 笛卡尔':
    '`{ corner1, corner2 }` forwards any Target directly as rectangle from/to; other forms compute coordinates and require literal Cartesian inputs',
  'RegularPolygon sugar——正多边形，展开为 `<Path>` 的 `move + (sides-1) line + cycle`':
    'RegularPolygon sugar: a regular polygon expanded to `<Path>` with `move + (sides-1) line + cycle`',
  '纯几何 sugar，无 IR 改动。center 须 literal 笛卡尔（组件内算顶点）。`sides >= 3`。\n  边长形态由 `R = sideLength / (2·sin(π/sides))` 反算外接半径':
    'Pure geometric sugar with no IR changes. Center must be literal Cartesian coordinates because vertices are computed in the component. `sides >= 3`. The side-length form derives circumradius as `R = sideLength / (2·sin(π/sides))`.',
  'Sector sugar——扇形': 'Sector sugar: a sector',
  '实心（无内半径）：`move(center) → circlePath/ellipsePath(closed="sector")`——圆心 = 游标，\n  center 接任意 Target。空心（给内半径）：`move(外弧起点) → 外弧 → line(内弧终点) → 内弧(反向) → line(回外弧起点)`——\n  末段用 line 回起点而非 cycle（内弧不在 hasTo 内，cycle 会从前一段闭合而错位），需 literal center 算端点':
    'Solid sectors (without an inner radius): `move(center) → circlePath/ellipsePath(closed="sector")`, with center as cursor and any Target accepted. Hollow sectors: move to the outer arc start, draw the outer arc, line to the inner arc end, draw the reversed inner arc, and line back to the outer start. The last segment uses line rather than cycle to avoid closing from the wrong previous segment; endpoint calculations require a literal center.',
  'Star sugar——星形，展开为 `<Path>` 的 `move + (2·points-1) line + cycle`（交替外/内半径顶点）':
    'Star sugar: expands to `<Path>` with `move + (2·points-1) line + cycle`, alternating outer and inner vertices',
  '纯几何 sugar，无 IR 改动。center 须 literal 笛卡尔。`points >= 2`。\n  缺省 innerRadius = outerRadius × 0.5':
    'Pure geometric sugar with no IR changes. Center must be literal Cartesian coordinates. `points >= 2`. By default, innerRadius = outerRadius × 0.5.',
};

/** 缺少中文说明的翻译时阻止参考生成 */
export const translateDrawApiReference = (source: string): string => {
  const translated = translations[source];
  if (translated !== undefined) return translated;
  if (!/[\u3400-\u9fff]/u.test(source)) return source;
  throw new Error(`Missing Draw API translation: ${source}`);
};
