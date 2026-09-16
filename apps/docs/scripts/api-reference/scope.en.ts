/** 经核对的 Scope API 英文说明，标识符保持源码原样 */
const translations: Readonly<Partial<Record<string, string>>> = {
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
  '局部 transform 列表；数组顺序应用，与 SVG transform list 一致':
    'Local transform list using SVG transform-list order',
  '显式栈序：作用于 scope 整体在父层的位置（不影响 scope 内部子元素相对栈序）；缺省 0 = 声明顺序':
    'Explicit stacking order of the whole Scope among siblings, without changing child order; defaults to 0, preserving declaration order',
  'Scope 的级联视觉覆盖与后代默认通道，Layout 通过 rootScope 承载':
    'Cascading visual overrides and child-default channels for Scope; Layout carries them through rootScope',
};

/** 缺少新增中文说明的翻译时阻止生成 */
export const translateScopeApiReference = (source: string): string => {
  const translated = translations[source];
  if (translated !== undefined) return translated;
  if (!/[\u3400-\u9fff]/u.test(source)) return source;
  throw new Error(`Missing Scope API translation: ${source}`);
};
