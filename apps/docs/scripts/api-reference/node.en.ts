/** 经审阅的节点 API 英文说明，代码标识符保持原样 */
const translations: Readonly<Partial<Record<string, string>>> = {
  '结果与 `rect` 同心、同旋转；不含 stroke、shadow、filter 或 label 的视觉外扩。未提供时 tight boundary 回退到 bounds 并发出 warning':
    'The result shares the center and rotation of `rect`, excluding visual expansion from strokes, shadows, filters, or labels. When omitted, tight boundaries fall back to bounds and emit a warning',
  '适用于 params 含角度等非长度字段的 shape；省略时按 Math.sqrt(sx * sy) 深度缩放 params 中的数值叶子':
    'Use for shapes whose params contain non-length fields such as angles; when omitted, numeric leaves in params are recursively scaled by Math.sqrt(sx * sy)',
  未提供时使用视觉矩形: 'Uses the visual rectangle when omitted',
  '未提供时由调用方回退或报告不支持该 anchor':
    'When omitted, the caller falls back or reports that the anchor is unsupported',
  'fraction 表示所选边界上的归一化位置，省略时使用 0.5':
    'fraction is the normalized position along the selected boundary and defaults to 0.5',
  '节点配置，包含位置及可选的 id、文字和样式': 'Node configuration with a position and optional id, text, and style',
  '带 node 类别的作者输入': 'Authoring input with the node discriminator',
  坐标标识与位置配置: 'Coordinate identifier and position',
  '带 coordinate 类别的作者输入': 'Authoring input with the coordinate discriminator',

  标签附着的节点边界方向: 'Side of the node boundary to which the label attaches',
  '标签位置；省略时位于节点上方，支持方向、角度或边界比例':
    'Label position; defaults to above the node, accepting a direction, angle, or boundary fraction',
  '节点类别标识，可省略': 'Optional node discriminator',
  '节点中心位置，支持坐标、相对定位和锚点对齐':
    'Node center position, supporting coordinates, relative positioning, and anchor alignment',
  附着于节点的一个或多个标签: 'One or more labels attached to the node',

  '命名坐标点的 React 输入，不绘制可见内容': 'React input for a named coordinate with no visible content',
  '可选编译驱动解释的运行时载荷，不进入 Core IR':
    'Optional runtime payload interpreted by a compile driver; excluded from Core IR',
  '坐标点 id；路径端点和节点定位通过它引用此位置':
    'Coordinate ID used by path endpoints and node positioning to reference this position',
  '坐标点位置；不支持 Node 专属的自身锚点对齐': 'Coordinate position; does not support Node-only self-anchor alignment',
  '笛卡尔 `[x, y]` / 极坐标 `{ angle, radius, origin? }` / 相对定位 `{ direction, of, distance? }` / 偏移定位 `{ of, offset }` / 比例位置 `{ between: [A, B], fraction }`':
    'Cartesian `[x, y]`, polar `{ angle, radius, origin? }`, relative `{ direction, of, distance? }`, offset `{ of, offset }`, or between `{ between: [A, B], fraction }`',
  '可定位、可连接的节点输入，组合文字、视觉形状和连接面':
    'Positionable, connectable node input combining text, visual shape, and connection surface',
  '元素级时间轴动画；每条 track 描述一个可动画属性，渲染端播放或降级为静态，不参与布局':
    'Element timeline tracks; each animates one property, with renderer playback or static fallback and no layout effect',
  '连线接触的边界；省略时沿用视觉形状，也可选择已注册的连接面或形状，不改变节点外观':
    'Connection boundary; follows the visual shape when omitted, or selects a registered boundary or shape without changing appearance',
  'children 内容：文本': 'Text supplied as children',
  '与 `text` 二选一、`text` 优先；支持字符串内嵌 `\\n` / 模板字面量 / 字符串数组 / 混 `<Text>` 带样式行。\n字符串里可写行内公式 `$...$`（inline）/ `$$...$$`（display），编译期在注入 `<Layout lowerTex>` 时解析；未注入则字面渲染':
    'Choose children or `text`; `text` takes precedence. Supports embedded `\\n`, template literals, string arrays, and styled `<Text>` lines. Strings may contain `$...$` inline or `$$...$$` display formulas, parsed when `<Layout lowerTex>` is supplied and rendered literally otherwise',
  "圆角半径（用户单位）；只对 `rectangle` shape 生效。建议用形状 params 形式 `shape={{ type: 'rectangle', params: { cornerRadius } }}`":
    "Corner radius in user units; affects only `rectangle`. Prefer shape parameters: `shape={{ type: 'rectangle', params: { cornerRadius } }}`",
  '节点 id；其他 Path/Draw 通过这个 id 引用本节点': 'Node ID used by other Path/Draw elements to reference this node',
  '节点附加标签，支持单对象或数组': 'Additional node labels, as one object or an array',
  '标签可附着到命名方向、中心、角度或边界比例位置；支持内外侧摆放、旋转、切向对齐和外侧引线，不参与节点形状尺寸计算。缺省位置为 top，间距继承编译配置 labelDistance':
    'Attach labels to named directions, center, angles, or boundary fractions. Supports inside/outside placement, rotation, tangent alignment, and outside leader lines without affecting shape size. Position defaults to top; distance inherits compile labelDistance',
  '节点尺寸、间距与文本布局': 'Node size, spacing, and text layout',
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
    'Context menu on this element (DOM `contextmenu`); the browser menu is not suppressed by default, so call `event.preventDefault()` in the handler when needed',
  '在该图元上滚轮（DOM `wheel`）': 'Wheel input over this element (DOM `wheel`)',
  节点中心位置: 'Node center position',
  "六种形态：笛卡尔 `[x, y]` / 极坐标 `{ angle, radius, origin? }` / 相对定位 `{ direction, of, distance? }` / 偏移定位 `{ of, offset }` / 比例位置 `{ between: [A, B], fraction }` / 锚点对齐 `{ kind: 'anchor', target, selfAnchor? }`。锚点对齐会先完成当前 Node 的文本、shape、padding、margin、scale、rotate 布局，再整体平移；双方 anchor 缺省为 center":
    "Six forms: Cartesian `[x, y]`, polar `{ angle, radius, origin? }`, relative `{ direction, of, distance? }`, offset `{ of, offset }`, between `{ between: [A, B], fraction }`, or anchor alignment `{ kind: 'anchor', target, selfAnchor? }`. Anchor alignment lays out text, shape, padding, margin, scale, and rotation before translating the node; both anchors default to center",
  '绕节点中心旋转的角度，单位为度；正值顺时针': 'Rotation around the node center in degrees; positive is clockwise',
  '均匀或分轴缩放；影响节点尺寸、字号、间距和路径附着点':
    'Uniform or per-axis scaling of node size, font size, spacing, and path attachment points',
  '视觉形状：无必填参数时可写名称，带参形状使用 `{ type, params }`；可选形状通过 Layout.extensions.shapes 注册':
    'Visual shape: use a name when no parameters are required, or `{ type, params }` for parameterized shapes; register optional shapes through Layout.extensions.shapes',
  '实例视觉覆盖，逐字段覆盖继承默认值': 'Instance visual overrides, applied field by field over inherited defaults',
  '显式 text，优先级高于 children': 'Explicit text, taking precedence over children',
  '`string` 单行（可含 `$...$` 公式）/ `Array<string | IRLine>` 多行可对单行覆盖 fill / opacity / font，\n或行内混排 `{ runs: [{ text }, { tex }] }`（每 run 可单独着色）':
    'A `string` (optionally containing `$...$` formulas), `Array<string | IRLine>` with per-line fill/opacity/font overrides, or mixed runs `{ runs: [{ text }, { tex }] }` with per-run colors',
  '同层元素的栈序；大者在上，同值保持声明顺序':
    'Stacking among siblings; higher values draw on top and ties preserve declaration order',
  'Node 内单行文字的内容与样式覆盖': 'Content and style overrides for one text line inside Node',
  '行内容（字符串或数字；数字按文本渲染）': 'Line content as a string or number; numbers render as text',
  '行级覆盖颜色；不填走 Node 块级默认': 'Per-line color override; inherits the Node block default when omitted',
  '行级字体覆盖；缺省字段继承 Node 的 `font` 块级值':
    'Per-line font overrides; missing fields inherit the Node block font',
  '行级透明度 0~1；不填走 Node 块级默认': 'Per-line opacity from 0 to 1; inherits the Node block default when omitted',
  '命名坐标点——TikZ `\\coordinate (id) at (x, y);` 同义':
    'Coordinate placeholder, equivalent to TikZ `\\coordinate (id) at (x, y);`',
  '命名一个可引用的点，供后续 path 与其它 node 的 `at.of` 使用；自身不渲染、不参与 viewBox 扩展':
    'Names a referenceable point for paths and other node positions; emits no visible output and does not enlarge the viewBox',
  'Node 声明一个可引用的节点': 'Node declares a referenceable node',
  '声明一个带位置、文本、形状和样式的可引用节点；组件自身不渲染 DOM，最终由 `<Layout>` 输出到\n  SVG 或 Canvas':
    'Declares a referenceable node with position, text, shape, and style. The component itself creates no DOM; `<Layout>` renders it to SVG or Canvas',
  'Text 是 Node 内的"行级"标记组件——本身不渲染': 'Text is a line marker inside Node and does not render independently',
  '声明一行节点文本；与字符串内容按 JSX 顺序合并，字段只覆盖当前这一行':
    'Declares one text line, combined with strings in JSX order; overrides apply only to this line',
  作者侧命名坐标输入: 'Authoring input for a named coordinate',
  作者侧节点输入: 'Node authoring input',
  作者侧节点标签: 'Node label authoring input',
  作者侧节点标签边界位置: 'Node label boundary-position authoring input',
  作者侧节点标签位置: 'Node label position authoring input',
  创建作者侧命名坐标输入: 'Create authoring input for a named coordinate',
  '创建作者侧节点输入，身份由配置中的 id 声明':
    'Create node authoring input with identity declared by id in the configuration',
  '连接面命名 anchor 的名字': 'Name of a boundary anchor',
  '类型接受字符串；Node 引用解析仅将非中心的标准方位名交给 boundary，中心与形状专属名称由视觉 shape 解析':
    'The type accepts strings; Node reference resolution passes only non-center standard directions to the boundary. The visual shape resolves the center and shape-specific names',
  '不支持；调用方回退或报告不支持该 anchor':
    'Unsupported; the caller falls back or reports that the anchor is unsupported',
  '直接使用视觉 rect': 'Use the visual rect directly',
  'Boundary 定义的擦除形态：registry 存这个': 'Erased Boundary definition stored by the registry',
  '可选的标准方位 anchor 支持；Node 引用中的中心与形状专属名称不调用此回调':
    'Optional standard directional anchors; Node references to the center or shape-specific names do not call this callback',
  '从中心指向 toward 的射线与连接面的交点':
    'Intersection between the boundary and a ray from the center toward the target',
  '注册表 key，由 IR `boundary` 引用': 'Registry key referenced by IR `boundary`',
  '返回与解析后 rect 同坐标系的精确闭合连接面轮廓；空数组表示合法空几何':
    'Return an exact closed boundary outline in the resolved rect coordinate system; an empty array is valid empty geometry',
  '运行时连接面参数的 schema': 'Runtime schema for boundary parameters',
  '根据视觉 shape 和实例 params 解析本连接面使用的矩形':
    'Resolve the boundary rectangle from the visual shape and instance parameters',
  'boundary definition 的作者侧输入形态': 'Authoring input for a boundary definition',
  'Boundary provider 解析实例连接矩形时可用的视觉几何上下文':
    'Visual geometry context available while a boundary provider resolves its connection rectangle',
  '获取视觉 shape 对指定规则连接面的安全包络':
    'Get a safe envelope of the visual shape for a standard connection surface',
  '节点视觉 shape 的外接矩形': 'Bounding rectangle of the node visual shape',
  "Coordinate IR 类型 `{ type:'coordinate', id, position }`":
    "Coordinate IR type `{ type:'coordinate', id, position }`",
  '节点：可定位的形状容器（矩形/圆/椭圆/菱形）+ 可选文本标签': 'Node: a positioned shape container with optional text',
  'Node label IR 类型': 'Node label IR type',
  '内置 boundary provider 注册项': 'Built-in boundary provider definitions',
  'Node 文字颜色的宿主专用关键字': 'Host-specific keyword for node text color',
  '定义 boundary 注册项，并把参数泛型擦除为 registry 可存储形态':
    'Define a boundary registry entry and erase its parameter generic for registry storage',
  '当前只集中封装擦除边界；保留入口用于对齐 registry API，并为未来校验或归一化预留空间':
    'Currently centralizes type erasure; the entry point aligns registry APIs and leaves room for future validation or normalization',
  '不支持；tight boundary 回退到 bounds 并发出 warning':
    'Unsupported; tight boundary falls back to bounds and emits a warning',
  不支持: 'Unsupported',
  '按 `Math.sqrt(sx * sy)` 深度缩放 params 中的数值叶子': 'Deep-scale numeric leaves in params by `Math.sqrt(sx * sy)`',
  'shape 定义的擦除形态：registry 存这个': 'Erased shape definition stored in the registry',
  '所有函数收 `JsonObject`（实际类型由 `paramsSchema.parse` 在编译期保证）；registry 同构\n  不泛型化（避免逆变 / 落 any）。定义点用 `defineShape<TParams>` 拿类型安全':
    'All functions receive `JsonObject`; `paramsSchema.parse` guarantees the concrete type during compilation. The registry is homogeneous and non-generic to avoid variance issues or any. Use `defineShape<TParams>` for type safety at the definition site.',
  '解析命名 anchor 的世界坐标；不支持时返回 `undefined`':
    'Resolve a named anchor in world coordinates; return `undefined` when unsupported',
  '返回从 rect 中心指向 `toward` 的射线与 shape 边界的交点':
    'Return the intersection of the shape boundary with a ray from the rect center toward `toward`',
  '`rect` 可包含旋转；实现需要按需转换坐标': '`rect` may include rotation; transform coordinates as needed',
  '根据内容半轴和 params 计算完整 shape 的外接 AABB 半轴':
    'Compute the complete shape AABB half-axes from content half-axes and params',
  '外接 AABB 中心相对 node `position` 的未旋转局部偏移':
    'Unrotated local offset of the AABB center relative to the node `position`',
  返回安全包含视觉几何轮廓的规则连接面半轴:
    'Return regular connection-envelope half-axes that safely contain the visual outline',
  '结果与 `rect` 同心、同旋转；不含 stroke、shadow、filter 或 label 的视觉外扩':
    'Shares the center and rotation of `rect`; excludes visual expansion from stroke, shadow, filter and label',
  '解析标准 side 上 `t ∈ [0, 1]` 的比例点': 'Resolve a proportional point at `t ∈ [0, 1]` on a standard side',
  '`rect` 可包含旋转；未实现表示该 shape 不支持 side anchor':
    '`rect` may include rotation; omission means side anchors are unsupported',
  '生成轴对齐 rect 内的视觉 primitive': 'Emit visual primitives inside an axis-aligned rect',
  '返回 provider 命名的稳定结构关键点；名称在同一实例内必须唯一':
    'Return stable provider-named structural key points; names must be unique within an instance',
  'shape 名称，由 IR `node.shape` 引用': 'Shape name referenced by IR `node.shape`',
  '返回与 rect 同坐标系的精确闭合视觉轮廓；空数组表示合法空几何':
    'Return the exact closed visual outline in the coordinate system of rect; an empty array represents valid empty geometry',
  '实例参数 schema': 'Instance parameter schema',
  '解析结果必须是 JSON object；无参 shape 使用 `z.strictObject({})`':
    'The parsed result must be a JSON object; use `z.strictObject({})` for a shape without parameters',
  '返回 node scale 后的 params': 'Return params after applying node scale',
  '适用于 params 含角度等非长度字段的 shape': 'Use for shapes whose params include angles or other non-length fields',
  '可注册的 shape 定义': 'A registrable shape definition',
  '描述第三方作者和内置 shape 共同实现的运行时能力契约；定义本身不进入 IR。\n  每个能力函数都以实例级 `params` 作为末位参数':
    'Runtime capability contract shared by third-party and built-in shapes; the definition itself is not stored in IR. Each capability function receives instance-level `params` as its last argument.',
  '内置 shape provider 注册项；circle / diamond 是 IR 内置 shape preset，不占独立 provider key':
    'Built-in shape provider definitions; circle and diamond are IR shape presets without separate provider keys',
  '定义 shape 注册项，并把参数泛型擦除为 registry 可存储形态':
    'Define a shape registry entry and erase the parameter generic for registry storage',
};

/** 新增中文说明缺译时阻止生成 */
export const translateNodeApiReference = (source: string): string => {
  const translated = translations[source.replace(/\r/g, '')];
  if (translated !== undefined) return translated;
  if (!/[\u3400-\u9fff]/u.test(source)) return source;
  throw new Error(`Missing Node API translation: ${source}`);
};
