/** 经核对的 Scope API 英文说明，标识符保持源码原样 */
const translations: Readonly<Partial<Record<string, string>>> = {
  当前作用域内按声明顺序处理的子图元: 'Children processed in declaration order within this Scope',
  '局部变换列表，最后一项先作用于局部点；省略时不施加局部变换':
    'Local transform list; the last item acts on local points first. Omission applies no local transform',
  '固定为 scope 的容器判别字段': 'Container discriminator, fixed to scope',
  '按声明顺序处理的节点、路径、坐标点、作用域或复合组件':
    'Nodes, paths, coordinates, scopes, or composites processed in declaration order',

  创建一组图元的作者侧作用域输入: 'Create authoring input for a group of drawing elements',
  '作者侧 Scope 输入': 'Scope authoring input',
  '可选编译驱动自行解释的运行时载荷，不进入 Core IR':
    'Optional runtime payload interpreted by a compile driver; excluded from Core IR',
  可省略默认值的包络装饰: 'Envelope decoration whose defaulted fields may be omitted',
  '无法由 authoring 字段唯一识别时显式指定 Scope 类别':
    'Explicitly identify a Scope when its authoring fields do not uniquely identify it',
  '局部变换、样式、裁剪与引用配置': 'Local transforms, styles, clipping, and reference configuration',
  '按声明顺序保留的子图元，不复制子数组': 'Children retained in declaration order; the array is not copied',
  '保留配置与子图元引用的 Scope 输入，尚未归一化或编译':
    'Scope input retaining options and child references, before normalization or compilation',
  'Scope IR 类型——手写而非 z.infer 派生': 'Scope IR type, declared explicitly rather than inferred with z.infer',
  'ChildSchema 通过 z.lazy 延迟回灌，z.infer 推断 children 元素时拿不到精确的 IRNode | IRPath | IRCoordinate | IRScope union；手写让 children 类型显式表达递归 union。\n  Scope 通过 style 提供级联视觉值，通过 defaults 提供四个默认通道与 reset 继承屏障':
    'ChildSchema is populated lazily through z.lazy, so an explicit declaration preserves the recursive union of child types. Scope provides cascading visual values through style, and four default channels plus a reset barrier through defaults.',
  'Scope 外框的可省略默认值输入': 'Scope frame input with optional defaulted fields',
  'Scope 最终锚点对齐放置': 'Final anchor-aligned Scope placement',
  'Scope 除 `type` 与递归 `children` 外的完整 authored 属性集合':
    'Complete authored Scope properties excluding `type` and recursive `children`',

  '是否创建本地命名空间；true 时子节点 id 不向外层作用域公开':
    'Whether to create a local namespace; when true, child ids are hidden from outer scopes',
  '通过 id 引用整组图元时使用的包络形状；支持矩形或圆形，默认使用轴对齐矩形包络':
    'Envelope shape used when referencing the group by id; supports rectangles or circles and defaults to an axis-aligned rectangle',
  '将子图元组合为作用域，统一设置样式、变换、定位与裁剪':
    'Group child elements into a scope with shared styling, transforms, placement, and clipping',
  '为一组图元设置局部样式、命名空间、变换、裁剪和引用包络':
    'Configure local styles, namespaces, transforms, clipping, and reference bounds for a group of elements',

  '固有包络的独立外框；位于内容下方，不参与布局、引用或命中':
    'Independent intrinsic-envelope frame below all content; excluded from layout, references, and hit testing',
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
  '外部 path / position 可用 `scope.id` / `scope.id.<anchor>` / `scope.id.<deg>` 引用该包络；\n这个外部句柄不受 `localNamespace` 影响':
    'External paths and positions can reference these bounds using `scope.id`, `scope.id.<anchor>`, or `scope.id.<deg>`; this external handle is unaffected by `localNamespace`',
  '子节点 id 只在本 scope 内可引用；外部无法引用这些子节点 id，但 `scope.id` 自己仍可从外层引用':
    'Child IDs can only be referenced inside this Scope; they are inaccessible outside it, while `scope.id` itself remains accessible from the outer scope',
  'target 是父坐标系显式点或此前已完成的命名实体；selfAnchor 缺省为固有包络 center':
    'The target is an explicit point in parent coordinates or a previously completed named entity; selfAnchor defaults to the center of the intrinsic bounds',
  '支持 translate / polar-translate / at-translate / offset-translate / between-translate / rotate / scale':
    'Supports translate, polar-translate, at-translate, offset-translate, between-translate, rotate, and scale',
  'Scope 容器组件——TikZ `\\begin{scope}[...]...\\end{scope}` 同义':
    'Scope container, equivalent to TikZ `\\begin{scope}[...]...\\end{scope}`',
  '给一组节点 / 路径提供局部样式、命名空间、变换、最终锚点定位、裁剪和引用包络':
    'Provides local styles, namespaces, transforms, final anchor placement, clipping, and reference bounds for a group of nodes and paths',
  '—': '—',
  '': '',
  '级联样式子集（graphic state + 四通道 every-X）抽到共享 ScopeStyleProps，与 `<Layout>` 复用；\n  本类型额外带容器 / 命名空间 / 局部变换 / 屏障 / 栈序 / 裁剪等 scope 专属字段':
    'Cascading styles (graphic state and four element-default channels) are shared through ScopeStyleProps with `<Layout>`; this type adds Scope-specific container, namespace, transform, barrier, stacking, and clipping fields',
  'scope 整体的时间轴动画；渲染端播放或降级为静态，不参与布局，也不下传给子元素':
    'Timeline animations for the whole Scope; rendered as animation or a static fallback, without participating in layout or propagating to children',
  '可选 compile driver 自行解释的 runtime-only authoring 载荷，不进入 Core IR':
    'Optional runtime-only authoring payload interpreted by a compile driver; excluded from Core IR',
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
  '仅覆盖已声明字段并由后代 Composite 继承的局部 Theme':
    'Local Theme overriding only declared fields, inherited by descendant Composites',
  '局部 transform 列表；遵循 SVG transform list，最后一项先作用于局部点':
    'Local transform list following SVG transform-list order; the last item acts on a local point first',
  '显式栈序：作用于 scope 整体在父层的位置（不影响 scope 内部子元素相对栈序）；缺省 0 = 声明顺序':
    'Explicit stacking order of the whole Scope among siblings, without changing child order; defaults to 0, preserving declaration order',
  'Scope 的级联视觉覆盖与后代默认通道，Layout 通过 rootScope 承载':
    'Cascading visual overrides and child-default channels for Scope; Layout carries them through rootScope',
  '作用域级视觉覆盖；已声明字段按层级向后代 Composite 逐字段继承':
    'Scope-level visual overrides cascade declared fields to descendant Composites',
  '为后代 Node、Path、Label 与 Arrow 提供默认样式；元素显式值优先，reset 可阻断指定外层通道':
    'Default styles for descendant Nodes, Paths, Labels, and Arrows; explicit element values win and `reset` blocks selected outer channels',
};

/** 缺少新增中文说明的翻译时阻止生成 */
export const translateScopeApiReference = (source: string): string => {
  const translated = translations[source];
  if (translated !== undefined) return translated;
  if (!/[\u3400-\u9fff]/u.test(source)) return source;
  throw new Error(`Missing Scope API translation: ${source}`);
};
