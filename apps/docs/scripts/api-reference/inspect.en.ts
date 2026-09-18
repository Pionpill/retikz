const translations: Record<string, string> = {
  'callback 消费的已解析 options 类型': 'Resolved options type consumed by the callback',
  '通过 subject schema 解析后的被观察对象类型': 'Observed subject type parsed by the subject schema',
  'options schema 解析后的 options 类型': 'Options type parsed by the options schema',
  '传入 options schema 前的原始 options 输入类型': 'Raw options input type before it reaches the options schema',
  '当前 Scene 可用的 Composite Definition 集合': 'Composite Definition collection available to the current Scene',
  '渲染后端；显式值优先，否则继承 Renderer 上下文，未提供上下文时使用 SVG':
    'Rendering backend; an explicit value takes priority, otherwise inherits the Renderer context and uses SVG when no context is provided',
  '供自定义 compileDriver 消费的 JSX 输入元数据；传入 ir 时忽略，不写入持久化 Scene IR':
    'JSX input metadata consumed by a custom compileDriver; ignored when ir is provided and excluded from persistent Scene IR',
  '默认字号，单位为绘图单位；font.size 缺省时使用，同时作为字号预设与 rem 的根字号，不覆盖显式数字字号':
    'Default font size in drawing units; used when font.size is omitted and as the root size for font presets and rem, without overriding explicit numeric font sizes',
  '节点相对定位的默认距离，单位为绘图单位；position 使用 direction/of 且省略 distance 时生效':
    'Default distance for relative node positioning in drawing units; applies when position uses direction/of and omits distance',
  '具体 subject/context 类型由调用前的 schema 恢复':
    'Concrete subject and context types are restored by the schema before invocation',
  '合并已准入的原始 options，不消费 schema 变换后的结果':
    'Merges admitted raw options, without consuming schema-transformed results',
  '擦除后仍产出已应用默认值与变换的 JSON object options':
    'Produces JSON object options with defaults and transforms applied, even after type erasure',
  '被观察的 Core owner': 'Core owner being observed',
  '具体 options 类型由准入 schema 恢复': 'Concrete options type restored by the admission schema',
  '擦除后仍恢复 JSON-safe subject': 'Restores a JSON-safe subject even after type erasure',
  'resolved request 连续序号': 'Consecutive index of the resolved request',
  '由当前 Theme categorical palette 派生的常规颜色':
    'Regular colors derived from the current Theme categorical palette',
  '当前 Core Theme 的共享语义颜色': 'Shared semantic colors of the current Core Theme',
  '按请求顺序排列的回调警告与 fragment warnings': 'Callback and fragment warnings in request order',
  '全部 callback 无输出时为 null': 'Null when every callback produces no output',
  '普通 Core compile 的 primary': 'Primary result of regular Core compilation',
  '回调 code/message 与来源路径，或 Core warning 的原样投影':
    'Callback code, message, and source path, or an unchanged projection of a Core warning',
  'warning 对应的 request 与 output': 'Request and output associated with the warning',
  '与 callback 非空 outputs 一一对应的 entries': 'Entries corresponding one-to-one to nonempty callback outputs',
  'request 级连续颜色序号': 'Consecutive color index at request level',
  '生成该 entry 的 Inspector': 'Inspector that produced this entry',
  '最终 occurrence': 'Final occurrence',
  '被观察 owner': 'Owner being observed',
  '辅助 Scene 到 primary Scene 的矩阵；scene 模式为单位矩阵':
    'Matrix from the auxiliary Scene to the primary Scene; the identity matrix in scene mode',
  '完整 admission 后参与级联的规则': 'Rules participating in cascading after complete admission',
  从外到内排列的最终逻辑容器链条: 'Final logical container chain, ordered from outermost to innermost',
  'callback 前分配的外观上下文': 'Appearance context allocated before the callback',
  '当前 Inspector key': 'Current Inspector key',
  '当前最终 occurrence': 'Current final occurrence',
  '当前被观察的 Core owner': 'Core owner currently being observed',
  'probe/replay 来源': 'Probe or replay origin',
  'observation-local 到主 Scene 的最终仿射变换':
    'Final affine transform from observation-local coordinates to the primary Scene',
  '声明当前 callback 可以省略的部分结果': 'Declares which partial results the current callback may omit',
  'Inspector 所属命名空间': 'Namespace containing the Inspector',
  命名空间内类型: 'Type within the namespace',
  导致当前失败的原始异常或值: 'Original exception or value that caused this failure',
  稳定错误码: 'Stable error code',
  失败上下文的结构化详情: 'Structured details of the failure context',
  面向调用方的原始错误消息: 'Original error message for the caller',
  '坐标点 id；路径端点和节点定位通过它引用此位置':
    'Coordinate ID used by path endpoints and node positioning to reference this position',
  '坐标点位置；不支持 Node 专属的自身锚点对齐': 'Coordinate position; does not support Node-only self-anchor alignment',
  '当前 Coordinate 的单项或多项检查请求': 'One or more inspection requests for the current Coordinate',
  '笛卡尔 `[x, y]` / 极坐标 `{ angle, radius, origin? }` / 相对定位 `{ direction, of, distance? }` / 偏移定位 `{ of, offset }` / 比例位置 `{ between: [A, B], fraction }`':
    'Cartesian `[x, y]`, polar `{ angle, radius, origin? }`, relative `{ direction, of, distance? }`, offset `{ of, offset }`, or between `{ between: [A, B], fraction }`',
  是否播放动画: 'Whether to play animations',
  动画控制器出口: 'Animation controller ref',
  'Scene 根动画': 'Scene-root animations',
  'artifact 请求': 'Requested compilation artifacts',
  'Kernel 或 Sugar JSX children': 'Kernel or Sugar JSX children',
  '宿主 className': 'Host className',
  '按能力分类的运行时扩展注册，复用 Core 编译契约':
    'Runtime extensions grouped by capability, using the Core compilation contract',
  默认字号: 'Default font size',
  'IR 模式下的水合 handler 注册表': 'Hydration handler registry for IR input',
  'SVG 或 Canvas CSS 高度；缺省取内容高度，CSS 字符串尺寸由浏览器排版':
    'CSS height of SVG or Canvas; defaults to content height, while CSS strings use browser layout',
  'SVG 资源 id 前缀': 'SVG resource id prefix',
  '直接传入持久化 Source IR，与 children 二选一': 'Persisted Source IR, used instead of children',
  公式下沉能力: 'Formula lowering capability',
  '默认 node 距离': 'Default node distance',
  'artifacts 成功提交通知': 'Notification after artifacts are committed successfully',
  '同 revision Inspect compile result 通知': 'Notification of the Inspect compilation result for the same revision',
  'Core 完整编译结果通知': 'Notification of the complete Core compilation result',
  'committed diagnostics 逐条通知': 'Notification for each committed diagnostic',
  '当前 Layout 使用的 Inspector registry': 'Inspector registry used by the current Layout',
  渲染目标: 'Rendering target',
  '可选 scene requests，false 表示全图 barrier': 'Optional scene requests; false sets a barrier for the entire drawing',
  'JSX 子图的隐式根 Scope 覆盖；完整 ir 优先，style 宿主 CSS 独立生效':
    'Implicit root Scope overrides for JSX children; complete IR takes precedence, while host CSS style applies independently',
  'retained 或 static processing 模式': 'Retained or static processing mode',
  '与 authored wrapper rules 合并的显式 selection': 'Explicit selection merged with authored wrapper rules',
  静态动画采样时刻: 'Time at which to sample a static animation frame',
  宿主内联样式: 'Host inline styles',
  '写入 Scene 根并由后代 Composite 继承的 Theme':
    'Theme written to the Scene root and inherited by descendant Composites',
  显式视框: 'Explicit viewport',
  'SVG 或 Canvas CSS 宽度；缺省取内容宽度，单轴数值尺寸按内容比例补齐另一轴':
    'CSS width of SVG or Canvas; defaults to content width, with a single numeric axis deriving the other from the content aspect ratio',
  '元素级时间轴动画；每条 track 描述一个可动画属性，渲染端播放或降级为静态，不参与布局':
    'Element timeline animations; each track describes one animatable property, played by the renderer or rendered statically, without participating in layout',
  "连接面：边与本节点相交时使用的边界形状（TikZ `connect as`）；默认 'shape'（沿用视觉形状）；'circle' = 真圆；其它已注册 shape 名或 `{ type, params }` = 借用该 shape 边界":
    "Boundary shape used where edges intersect this node (TikZ `connect as`); defaults to 'shape', using the visual shape; 'circle' uses a true circle, while another registered shape name or `{ type, params }` uses that shape's boundary",
  'children 内容：文本': 'Text content supplied as children',
  "圆角半径（user units）；只对 `rectangle` shape 生效。建议用形状 params 形式 `shape={{ type: 'rectangle', params: { cornerRadius } }}`":
    "Corner radius in user units, effective only for the `rectangle` shape. Prefer shape parameters: `shape={{ type: 'rectangle', params: { cornerRadius } }}`",
  '节点 id；其他 Path/Draw 通过这个 id 引用本节点':
    'Node ID used by other Path or Draw elements to reference this node',
  '节点附属标签——TikZ `[label=top:foo]` 同义': 'Labels attached to the node, equivalent to TikZ `[label=top:foo]`',
  '节点尺寸、间距与文本布局': 'Node dimensions, spacing, and text layout',
  '用户自定义元数据；可在事件 / 水合上下文中读取，不参与布局。须为 JSON 可序列化对象':
    'User metadata available in event and hydration contexts; excluded from layout and required to be a JSON-serializable object',
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
    'Context menu on this element (DOM `contextmenu`); the browser menu is not suppressed by default, so the handler must call `event.preventDefault()` if needed',
  '在该图元上滚轮（DOM `wheel`）': 'Wheel input over this element (DOM `wheel`)',
  节点中心位置: 'Position of the node center',
  '当前 Node 的单项或多项检查请求': 'One or more inspection requests for the current Node',
  '旋转角度（度数，与 TikZ 一致），绕节点中心；正值顺时针':
    'Rotation in degrees around the node center, as in TikZ; positive values rotate clockwise',
  '均匀缩放因子；同时影响 bbox / 字号 / padding / margin / 路径附着点（与 TikZ scale 一致）':
    'Uniform scale factor affecting bounds, font size, padding, margin, and path attachment points, as with TikZ scale',
  '节点形状：rectangle（默认）/ circle / ellipse / diamond':
    'Node shape: rectangle (default), circle, ellipse, or diamond',
  '实例视觉覆盖，逐字段覆盖继承默认值':
    'Visual overrides for this instance, replacing inherited defaults field by field',
  '显式 text，优先级高于 children': 'Explicit text, taking precedence over children',
  '显式栈序：大者在上；缺省 0 = 声明顺序；同值稳定保序；只在同层（同 scope / 顶层）子节点间生效':
    'Explicit stacking order: larger values appear above smaller ones; defaults to 0 and declaration order; equal values preserve order, applying only among siblings in the same scope or at the root',
  '与 `text` 二选一、`text` 优先；支持字符串内嵌 `\\n` / 模板字面量 / 字符串数组 / 混 `<Text>` 带样式行。\n字符串里可写行内公式 `$...$`（inline）/ `$$...$$`（display），编译期在注入 `<Layout lowerTex>` 时解析；未注入则字面渲染':
    'Alternative to `text`, which takes precedence; supports strings with embedded `\\n`, template literals, string arrays, and styled lines containing `<Text>`. Strings may include `$...$` inline or `$$...$$` display formulas, parsed during compilation when `<Layout lowerTex>` is provided; otherwise rendered literally',
  "单对象或数组；每条 label 接 `text` / `position?` / `distance?` / 样式继承；`position` 接 8 方向枚举或数字角度（`label=30:foo` 等价 `position: 30`），缺省 'top'，distance 缺省 12":
    "One object or an array; each label accepts `text`, optional `position` and `distance`, and inherited styles. Position accepts an eight-direction enum or angle in degrees (`label=30:foo` equals `position: 30`), defaulting to 'top'; distance defaults to 12",
  "六种形态：笛卡尔 `[x, y]` / 极坐标 `{ angle, radius, origin? }` / 相对定位 `{ direction, of, distance? }` / 偏移定位 `{ of, offset }` / 比例 partway `{ between: [A, B], fraction }` / 锚点对齐 `{ kind: 'anchor', target, selfAnchor? }`。锚点对齐会先完成当前 Node 的文本、shape、padding、margin、scale、rotate 布局，再整体平移；双方 anchor 缺省为 center":
    "Six forms: Cartesian `[x, y]`, polar `{ angle, radius, origin? }`, relative `{ direction, of, distance? }`, offset `{ of, offset }`, partway `{ between: [A, B], fraction }`, or anchor alignment `{ kind: 'anchor', target, selfAnchor? }`. Anchor alignment lays out the node's text, shape, padding, margin, scale, and rotation before translating the whole node; both anchors default to center",
  '`string` 单行（可含 `$...$` 公式）/ `Array<string | IRLine>` 多行可对单行覆盖 fill / opacity / font，\n或行内混排 `{ runs: [{ text }, { tex }] }`（每 run 可单独着色）':
    'A single-line `string` (optionally containing `$...$` formulas), multiline `Array<string | IRLine>` with per-line fill, opacity, and font overrides, or inline mixed content `{ runs: [{ text }, { tex }] }` with per-run colors',
  '路径级时间轴动画；渲染端播放或降级为静态，不参与布局':
    'Path timeline animations, played by the renderer or rendered statically, without participating in layout',
  路径级箭头方向: 'Arrow direction for the path',
  箭头详细配置: 'Detailed arrow configuration',
  箭头端点放置配置: 'Arrow endpoint placement configuration',
  '应当全部是 `<Step />`': 'All children should be `<Step />` elements',
  '路径 id；其他 path / position 通过这个 id 引用本路径，也作为水合挂点供事件 handler 绑定':
    'Path ID used by other paths or positions to reference this path, and as the hydration attachment point for event handlers',
  '沿路径在归一化位置放标记（首批仅箭头）':
    'Markers at normalized positions along the path, currently limited to arrows',
  '当前 authored Path 的 Inspector request': 'Inspector request for the current authored Path',
  '整条 path 旋转（度，绕包围盒中心，正向 = 屏幕 y-down 视觉顺时针）':
    'Rotation of the entire path in degrees around its bounds center; positive values appear clockwise in screen coordinates with y pointing down',
  '折线拐角几何圆角半径（TikZ `rounded corners=`）': 'Geometric corner radius for polylines (TikZ `rounded corners=`)',
  '整条 path 缩放（绕包围盒中心）：number 等比，或 `{ x, y }` 非等比':
    'Scale of the entire path around its bounds center: a number for uniform scaling, or `{ x, y }` for nonuniform scaling',
  '语义 stroke 档位糖（TikZ `ultra thin` … `ultra thick`）；构造 IR 时解析为 `strokeWidth`，显式 `strokeWidth` 始终优先':
    'Semantic stroke-width shorthand (TikZ `ultra thin` through `ultra thick`), resolved to `strokeWidth` when constructing IR; an explicit `strokeWidth` always takes precedence',
  'TikZ 风格路径走向简写，由 Vanilla 统一解析为步骤': 'TikZ-style path routing shorthand, parsed into steps by Vanilla',
  '显式栈序：大者在上；缺省 0 = 声明顺序；同值稳定保序；只在同层子节点间生效':
    'Explicit stacking order: larger values appear above smaller ones; defaults to 0 and declaration order; equal values preserve order, applying only among siblings',
  "`'->'` 终点 / `'<-'` 起点 / `'<->'` 两端；省略或 `'none'` 无箭头":
    "`'->'` at the end, `'<-'` at the start, or `'<->'` at both ends; omitted or `'none'` means no arrows",
  '顶层默认 + 可选 `start` / `end` 子对象逐字段 merge override。空心 shape\n（open / openStealth / openDiamond / openCircle）上 `fill` silent no-op':
    'Top-level defaults are merged field by field with optional `start` and `end` overrides. For open shapes (open, openStealth, openDiamond, openCircle), `fill` silently has no effect',
  '`overlap` 为实际端点共享值，`start` / `end` 可逐端覆盖；比例从默认位置插值到最终视觉后缘与逻辑端点对齐的位置':
    '`overlap` is shared by the active endpoints, with per-end `start` and `end` overrides; the ratio interpolates from the default position to the position where the final visual rear edge aligns with the logical endpoint',
  "每个 `{ pos, mark }`：`pos∈[0,1]`，`mark.kind:'arrow'` + 视觉子集（shape 为已注册箭头名，方向随路径切线）":
    "Each `{ pos, mark }` has `pos` in [0, 1] and `mark.kind: 'arrow'` with a subset of visual options; shape is a registered arrow name, and direction follows the path tangent",
  '等价把 path 包一层绕其包围盒中心旋转的 Scope；端点先在当前 scope resolve 再整体旋转':
    'Equivalent to wrapping the path in a Scope rotated around its bounds center; endpoints are resolved in the current scope before the whole path rotates',
  '对每个 line↔line 接缝插切圆弧、改路径几何（区别于 lineJoin 仅描边）；curve / arc / bezier / fold 接缝保持尖；按相邻段长 clamp；省略 = 尖角':
    'Inserts a tangent arc at each line-to-line join, changing path geometry rather than only the stroke as lineJoin does; curve, arc, bezier, and fold joins stay sharp; clamped to adjacent segment lengths; omitted means sharp corners',
  'scope 整体的时间轴动画；渲染端播放或降级为静态，不参与布局，也不下传给子元素':
    'Timeline animations for the whole Scope; rendered as animation or a static fallback, without participating in layout or propagating to children',
  "scope id 注册的 synthetic 包络形状（受控枚举 'rectangle' | 'circle'，非 Node shape 那种开放 shape 引用）；缺省为 'rectangle'（AABB）":
    "Synthetic reference-envelope shape for the Scope id: the closed enum 'rectangle' | 'circle', rather than an open Node shape reference; defaults to 'rectangle' (axis-aligned bounding box)",
  'scope 子节点：嵌套 Node / Path / Coordinate / Scope': 'Scope children: nested Node, Path, Coordinate, or Scope',
  '裁剪区（rect / circle / ellipse / polygon / path / compound / custom，scope 局部坐标）；设值则裁剪 scope 内全部子元素':
    'Clip region in Scope-local coordinates (rect, circle, ellipse, polygon, path, compound, or custom); clips all children when supplied',
  '可选 scope 引用 id；设值后可把整个 scope 的包络当作引用目标':
    'Optional Scope reference id; makes the group envelope available as a reference target',
  '是否创建本地命名空间；true 时子节点 id 不向父 frame 传播（外部不可见）':
    'Whether to create a local namespace; when true, child ids do not propagate to the parent frame and are not externally visible',
  '用户自定义元数据；可在事件 / 水合上下文中读取，不参与布局，也不下传给子元素。须为 JSON 可序列化对象':
    'JSON-serializable user metadata available in event and hydration contexts; does not participate in layout or propagate to children',
  'Scope 最终锚点对齐定位': 'Final anchor-aligned Scope placement',
  '当前 subtree 的 requests，false 表示不可重开的 barrier':
    'Requests for the current subtree; false establishes a barrier that descendants cannot reopen',
  '仅覆盖已声明字段并由后代 Composite 继承的局部 Theme':
    'Local Theme overriding only declared fields, inherited by descendant Composites',
  '局部 transform 列表；数组顺序应用，与 SVG transform list 一致':
    'Local transform list using SVG transform-list order',
  '显式栈序：作用于 scope 整体在父层的位置（不影响 scope 内部子元素相对栈序）；缺省 0 = 声明顺序':
    'Explicit stacking order of the whole Scope among siblings, without changing child order; defaults to 0, preserving declaration order',
  '外部 path / position 可用 `scope.id` / `scope.id.<anchor>` / `scope.id.<deg>` 引用该包络；\n这个外部句柄不受 `localNamespace` 影响':
    'External paths and positions can reference these bounds using `scope.id`, `scope.id.<anchor>`, or `scope.id.<deg>`; this external handle is unaffected by `localNamespace`',
  '子节点 id 只在本 scope 内可引用；外部无法引用这些子节点 id，但 `scope.id` 自己仍可从外层引用':
    'Child IDs can only be referenced inside this Scope; they are inaccessible outside it, while `scope.id` itself remains accessible from the outer scope',
  'target 是父坐标系显式点或此前已完成的命名实体；selfAnchor 缺省为固有包络 center':
    'The target is an explicit point in parent coordinates or a previously completed named entity; selfAnchor defaults to the center of the intrinsic bounds',
  '支持 translate / polar-translate / at-translate / offset-translate / between-translate / rotate / scale':
    'Supports translate, polar-translate, at-translate, offset-translate, between-translate, rotate, and scale',
  '含 revision primary、plane 与 diagnostics 成功提交后的通知':
    'Notification after successful commit of the revision primary, plane, and diagnostics',
  '每条 committed Inspect diagnostic 的通知': 'Notification for each committed Inspect diagnostic',
  '本次宿主使用的 Inspector registry': 'Inspector registry used by this host',
  '与 plain authoring rules 合并的显式 selection': 'Explicit selection merged with plain authoring rules',
  '要请求的 Inspector key': 'Inspector key to request',
  'sparse options、true 或继承关闭 false': 'Sparse options, true, or false to disable inherited inspection',
  按本次主图编译精度舍入数值: 'Rounds a value using the precision of the current primary compile',
  '作者侧 Inspector 定义；仅在对应输入输出可由默认行为满足时允许省略选项字段':
    'Author-facing Inspector definition; options fields may be omitted only when defaults satisfy their input and output types',
  'registry 接收的异构作者定义，注册时统一补齐选项 schema 与 resolver':
    'Heterogeneous author definitions accepted by registries, with options schemas and resolvers completed at registration',
  '以保留作者输入类型的方式定义 Inspector': 'Defines an Inspector while preserving its author-input type',
  '按辅助片段 coordinateSpace 生成的只读 Scene': 'A readonly Scene placed according to its fragment coordinateSpace',
  带显式坐标空间的辅助片段: 'An auxiliary fragment with an explicit coordinate space',
  '辅助片段判别字段，不属于 Core IR': 'The auxiliary fragment discriminator; not part of Core IR',
  当前片段采用的坐标空间: 'The coordinate space used by this fragment',
  '交给 Core 隔离编译的普通 IR child': 'An ordinary IR child compiled in isolation by Core',
  '裸 Core child 使用局部坐标；显式片段可逐项选择坐标空间':
    'Plain Core children use local coordinates; explicit fragments select a coordinate space per item',
  '内置 Clip application Inspector': 'The built-in Clip application Inspector',
  '内置 Core Clip Inspector key': 'The built-in Core Clip Inspector key',
  '内置已解析 Coordinate 点 Inspector': 'The built-in resolved Coordinate point Inspector',
  '内置 Core Coordinate Inspector key': 'The built-in Core Coordinate Inspector key',
  '内置 Node Scene-space AABB Inspector': 'The built-in Node Scene-space AABB Inspector',
  '内置 Core Node Scene bounds Inspector key': 'The built-in Core Node Scene bounds Inspector key',
  '内置 Node 几何 Inspector': 'The built-in Node geometry Inspector',
  '内置 Core Node Inspector key': 'The built-in Core Node Inspector key',
  '内置 Scope 层级与坐标框 Inspector': 'The built-in Scope hierarchy and coordinate-frame Inspector',
  '内置 Core Scope Inspector key': 'The built-in Core Scope Inspector key',
  '一条回调或 fragment warning 的 Inspect-owned diagnostic':
    'An Inspect-owned diagnostic for a callback or fragment warning',
  'Inspect 失败、回调警告及 fragment diagnostic 的结构化来源':
    'Structured origins of Inspect failures, callback warnings, and fragment diagnostics',
  'Inspector callback 输出所采用的坐标约定': 'The coordinate convention used by Inspector callback output',
  '内置 Clip Inspector 选项及默认值': 'Options and defaults for the built-in Clip Inspector',
  '内置 Coordinate Inspector 选项及默认值': 'Options and defaults for the built-in Coordinate Inspector',
  '内置 Node Scene bounds Inspector 选项及默认值': 'Options and defaults for the built-in Node Scene bounds Inspector',
  '内置 Node Inspector 选项及默认值': 'Options and defaults for the built-in Node Inspector',
  '内置 Scope Inspector 选项及默认值': 'Options and defaults for the built-in Scope Inspector',
  '只选择当前 Coordinate 的可选 Inspector wrapper props':
    'Props for an optional Inspector wrapper selecting only the current Coordinate',
  '只选择当前 Node 的可选 Inspector wrapper props':
    'Props for an optional Inspector wrapper selecting only the current Node',
  '复用基础 Coordinate，仅附加运行时检查请求':
    'Reuses the base Coordinate and only attaches runtime inspection requests',
  '复用基础 Node，仅附加运行时检查请求': 'Reuses the base Node and only attaches runtime inspection requests',
  'Inspect 包统一的结构化错误': 'The structured error shared by the Inspect package',
  'registry 内擦除具体泛型后的 Inspector 定义':
    'An Inspector definition with concrete generic types erased for registry storage',
  'Inspector callback 的稳定外观上下文': 'Stable appearance context for Inspector callbacks',
  'primary 与辅助结果的原子 compile 输出': 'Atomic compilation output containing primary and auxiliary results',
  '一个 fragment warning 的 Inspect-owned diagnostic': 'An Inspect-owned diagnostic for a fragment warning',
  'Inspect fail-loud 错误及非致命 fragment diagnostic 的结构化来源':
    'Structured origins of thrown Inspect errors and non-fatal fragment diagnostics',
  '有序、只读的 Inspector 辅助平面': 'An ordered, read-only Inspector auxiliary plane',
  '一个辅助 Scene plane entry': 'An auxiliary Scene plane entry',
  '一次 compile 的 runtime-only Inspector selection': 'Runtime-only Inspector selection for one compilation',
  'Inspector selection 的单条规则：request 控制单个 Inspector，barrier 封锁一个范围内的全部 Inspector':
    'One selection rule: a request controls one Inspector; a barrier blocks all Inspectors within a scope',
  'Inspector selection 的目标 locator': 'The target locator for Inspector selection',
  'Inspector callback 读取的最终 occurrence 上下文': 'Final occurrence context available to an Inspector callback',
  '独立于 Core owner Definition 的 Inspector 定义': 'An Inspector definition independent of the Core owner Definition',
  'Inspector registry 的公开复合键': 'The public composite key for an Inspector registry',
  'Inspector 可返回的普通 Core IR child': 'Ordinary Core IR children that an Inspector can return',
  'Inspector Definition 的 immutable registry': 'An immutable registry of Inspector Definitions',
  '已注册 Inspector 的不透明容器': 'An opaque container for registered Inspectors',
  'selection 解析出的 canonical request': 'A canonical request resolved from selection rules',
  'Inspect 包稳定错误码取值': 'Stable error code values for the Inspect package',
  'Inspect 包错误的结构化构造参数': 'Structured constructor options for Inspect errors',
  '默认 registry 使用的内置 Inspector definitions': 'Built-in Inspector definitions used by the default registry',
  '按 Core 的编译顺序比较两个实例定位器': 'Compares two occurrence locators in Core compilation order',
  'Inspect 使用的单一 Core observer key': 'The single Core observer key used by Inspect',
  'Inspect 包稳定错误码': 'Stable error codes for the Inspect package',
  '内置 stroke Path 控制点 Inspector': 'The built-in stroke Path control-point Inspector',
  '内置 Core stroke Path Inspector key': 'The built-in Core stroke Path Inspector key',
  '内置 stroke Path Inspector 选项及默认值': 'Options and defaults for the built-in stroke Path Inspector',
  '在 Core 遍历前校验选择结构、定位器、注册表与稀疏选项':
    'Validates selection structure, locators, registries, and sparse options before Core traversal',
  '判断作者站点是否可能命中选择规则，以便按需发布所属者产物':
    'Checks whether an authored site may match selection rules so owner output can be published on demand',
  '校验、脱离并深冻结 JSON-safe plain data': 'Validates, detaches, and deeply freezes JSON-safe plain data',
  '基于 Core observed compile 执行一次原子 Inspector compile':
    'Runs an atomic Inspector compilation using Core observed compilation',
  '创建内置优先、第三方同路的默认 Inspector registry':
    'Creates the default Inspector registry with built-ins first and the same path for third-party definitions',
  '为 static 或 retained Core compile 创建一次 Inspect observer definition':
    'Creates an Inspect observer definition for static or retained Core compilation',
  '创建无全局状态的 Inspector registry': 'Creates an Inspector registry without global state',
  '合并多个已创建的 registry，保持各 registry 的定义顺序':
    'Merges created registries while preserving the definition order of each registry',
  '校验并冻结一个独立 Inspector Definition': 'Validates and freezes an independent Inspector Definition',
  '把公开 Inspector key 转为无歧义的 registry 内部键':
    'Converts a public Inspector key into an unambiguous internal registry key',
  '消费已准入规则；observer 的多次 session 复用同一稀疏 Source':
    'Consumes admitted rules; observer sessions reuse the same sparse Source',
  '从同 revision Core primary 与 observer outputs 组装原子 Inspect 结果':
    'Assembles an atomic Inspect result from Core primary and observer outputs of the same revision',
  '根据最终观察结果解析选择规则，并分配连续的外观颜色序号':
    'Resolves selection rules against final observations and assigns consecutive appearance color indices',
  '移除辅助 Scene 的公共 identity、meta 与 animation，并深冻结保留资源引用':
    'Removes public identity, meta, and animation from an auxiliary Scene and deeply freezes retained resource references',
  '校验并冻结 registry 与公开 define 共用的擦除后 Definition':
    'Validates and freezes the type-erased Definition shared by the registry and public define helper',
  'callback output 做 JSON-safe 脱离、dense 校验与 Core child schema 恢复':
    'Detaches callback output as JSON-safe data, checks array density, and parses it with the Core child schema',
  '绑定 Inspect registry/selection/callback 的可选 Layout wrapper props':
    'Optional Layout wrapper props binding an Inspect registry, selection, and callbacks',
  '可选 Inspect Path wrapper props': 'Props for the optional Inspect Path wrapper',
  '可选 Inspect Scope wrapper props': 'Props for the optional Inspect Scope wrapper',
  '复用基础 Layout/static/retained runtime 的 Inspect 可选宿主':
    'An optional Inspect host reusing the base Layout and static or retained runtime',
  '复用基础 Path lowering、只附加 runtime-only Inspector authoring 标记':
    'Reuses base Path lowering and only attaches a runtime-only Inspector authoring marker',
  '复用基础 Scope lowering、只附加 runtime-only Inspector authoring 标记':
    'Reuses base Scope lowering and only attaches a runtime-only Inspector authoring marker',
  'Inspect Vanilla 编译驱动的固定配置': 'Fixed configuration for the Inspect Vanilla compilation driver',
  'Vanilla site 可声明一个 request、多个 request，或 barrier':
    'A Vanilla site can declare one request, multiple requests, or a barrier',
  'Vanilla 可选 authoring 声明的一项 Inspector request':
    'One Inspector request in an optional Vanilla authoring declaration',
  '创建只由 Inspect Vanilla 驱动识别的 opaque authoring 标记':
    'Creates an opaque authoring marker recognized only by the Inspect Vanilla driver',
  '创建绑定 Inspector registry、selection 与 committed callbacks 的 Vanilla 编译驱动':
    'Creates a Vanilla compilation driver binding an Inspector registry, selection, and committed callbacks',
  '把一个 Vanilla authored site 的可选标记转换为通用 InspectionSelection rules':
    'Converts optional markers on a Vanilla authored site into shared InspectionSelection rules',
};

/** 缺少受审阅英文说明时终止生成，避免中文回退进入英文参考 */
export const translateInspectApiReference = (source: string): string => {
  if (!/[\u3400-\u9fff]/u.test(source)) return source;
  const translation = translations[source];
  if (translation) return translation;
  throw new Error(`缺少 @retikz/inspect API Reference 的审阅后英文翻译：${source}`);
};
