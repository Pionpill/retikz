/** Flow API 页经人工核对的英文说明 */
const translations: Readonly<Partial<Record<string, string>>> = {
  '弯曲角度，单位为度': 'Bend angle in degrees',
  相对源到目标方向的弯曲侧: 'Bend side relative to the source-to-target direction',
  标识已经确定参数的弯曲参考路线: 'Identifies a bend reference route with resolved parameters',
  '按 source 到 target 排列的根局部参考端点':
    'Reference endpoints in root-local coordinates, ordered from source to target',
  '终点一侧控制方向的角度，单位为度': 'Control direction at the target endpoint, in degrees',
  控制曲线控制臂长度的松紧系数: 'Looseness factor controlling curve control-arm lengths',
  '从起点出发的切线角，单位为度': 'Outgoing tangent angle at the source endpoint, in degrees',
  选择布局已确定的参考路线种类: 'Selects the reference route kind resolved by layout',
  '按源到目标顺序排列的 Flow 根局部参考点':
    'Reference points in Flow root-local coordinates, ordered from source to target',
  轴对齐折线转角的圆角半径: 'Corner radius for axis-aligned polyline turns',
  本次编排已确定的物理宽度约束: 'Physical width constraint resolved for this layout execution',
  '以真实 Core 边界查询布局后的端点': 'Query positioned endpoints against real Core boundaries',
  已补全默认的关系端点布局约束: 'Relation endpoint layout constraints with effective defaults',
  持久化关系端点约束: 'Persistent relation endpoint constraints',
  '编译结果中可直接交给 Core 的端点目标': 'Compiled endpoint target ready for Core consumption',

  '起点 Entity 或 Group 的有效连接约束': 'Effective connection constraints for the source Entity or Group',
  '终点 Entity 或 Group 的有效连接约束': 'Effective connection constraints for the target Entity or Group',
  已分配起点: 'Assigned source endpoint',
  已分配终点: 'Assigned target endpoint',
  '支持端点选侧、固定锚点与自动分离': 'Supports side selection, fixed anchors and automatic endpoint separation',
  '目标 Entity 或 Group': 'Target Entity or Group',
  同侧落点许可: 'Connection point overlap policy',
  自动分配的指定侧: 'Required side for automatic placement',
  '作者固定的 Core 锚点': 'Authored fixed Core anchor',

  '基于完整的根局部元素边界计算关系路线和标签预留，不改变输入或元素位置':
    'Compute routes and label reservations from complete root-local element bounds without mutating inputs or moving elements',
  '已测量的布局输入，关系输出保持输入顺序': 'Measured layout input; relation outputs retain input order',
  '全部元素的最终根局部边界，与布局返回的元素一致':
    'Final root-local bounds for all elements, identical to the returned layout elements',
  '布局执行上下文，解析 smooth 经过点时必需': 'Layout execution context, required for resolving smooth waypoints',
  '按输入关系顺序排列的路由输出，由调用方与元素一起返回并接受布局输出校验':
    'Routes in input relation order, returned together with elements by the caller for layout output validation',
  '显式折点比例 0.25、0.5 或 0.75；省略时继承或中点优先自动避让，对齐端点保持直连':
    'Explicit turn fraction 0.25, 0.5 or 0.75; omission inherits or searches midpoint-first. Aligned endpoints stay straight',
  '显式或继承的间隙比例，省略时自动选择': 'Explicit or inherited gap fraction; omitted for automatic selection',
  '作者的有效比例；自动选择不重复存储': 'Effective authored fraction; automatic selection is not stored redundantly',

  'Flow Layout Definition 调用作者 placement 的同步执行边界':
    'Synchronous execution context for Flow placement and waypoint queries',
  与最终输出一致的全部根局部元素矩形: 'All root-local element bounds, identical to the final output',
  '作者指定或 Core 补全的控制臂倍率': 'Authored tangent multiplier or the Core default',
  关系终点身份: 'Relation target identity',
  关系起点身份: 'Relation source identity',
  '包含 source 和 target 的完整数值点列': 'Complete numeric knot chain including source and target',
  '已补全 tension 的经过点路由意图': 'Through-point routing intent with effective tension',
  '已解析的样条参考点列，保留合法重复点': 'Resolved spline reference knots, retaining valid repeats',
  '当前布局中的真实经过点查询，不持有跨编译缓存':
    'Real waypoint query within this layout, with no cross-compilation cache',
  '按已测量尺寸执行作者的固定排列，返回容器局部坐标中的边界和子项位置':
    'Execute authored placement using measured sizes and return container-local bounds and child positions',
  显式经过点样条: 'Explicit through-point spline',
  有序中间目标: 'Ordered intermediate Targets',
  '有序中间目标，不包括自动追加的关系终点':
    'Ordered intermediate Targets, excluding the automatically appended relation target',
  '正数控制臂倍率，使用 Core 默认值': 'Positive tangent multiplier using the Core default',
  '用真实 Graph 几何解析经过点，返回包含首尾的根局部点列':
    'Resolve waypoints against real Graph geometry, returning a root-local chain including endpoints',
  经过点样条: 'Through-point spline',
  二次贝塞尔输入: 'Quadratic Bezier input',
  三次贝塞尔输入: 'Cubic Bezier input',
  'Flow 根坐标控制点，省略时自动生成': 'Control in Flow root coordinates; omit for automatic generation',
  自动三次必须同时省略两个控制点: 'Automatic cubic input must omit both controls',
  'Flow 根坐标的起点切线控制点，显式值不可移动':
    'Source tangent control in Flow root coordinates; explicit values must not move',
  'Flow 根坐标的终点切线控制点，显式值不可移动':
    'Target tangent control in Flow root coordinates; explicit values must not move',
  '按 source 到 target 排列的中心参考端点': 'Center reference endpoints ordered from source to target',
  二次贝塞尔参考几何: 'Quadratic Bezier reference geometry',
  三次贝塞尔参考几何: 'Cubic Bezier reference geometry',
  '已确定的二次控制点，不是曲线经过点': 'Resolved quadratic control, not a point on the curve',
  已确定的起点切线控制点: 'Resolved source tangent control',
  已确定的终点切线控制点: 'Resolved target tangent control',
  支持既有完整输入语义的常规路由: 'Regular routing with its complete existing input semantics',
  支持的贝塞尔种类: 'Supported Bezier kind',
  '可消费的自动或显式输入，非空且无重复；Source 不填写 mode':
    'Supported automatic or explicit inputs; nonempty and unique. Source has no mode field',

  '自动或完整显式的贝塞尔输入，不存储可推导的 mode':
    'Automatic or complete explicit Bezier input without a redundant mode field',
  完整数值贝塞尔参考路线: 'Complete numeric Bezier reference route',
  每种路由及其可消费的作者输入语义: 'Each routing kind and its supported authoring modes',
  '默认路由种类，必须包含在 capabilities.routing 中':
    'Default routing kind, which must be declared in capabilities.routing',

  'Flow layout provider 使用的有效路由': 'Effective routing consumed by the Flow layout provider',
  'Flow layout relation 输入': 'Measured Flow layout relation input',
  省略时由布局比较左右候选: 'Omission lets layout compare left and right candidates',
  '省略时由布局比较 30、45、60 度；显式及继承值必须保留':
    'Omission lets layout compare 30, 45 and 60 degrees; explicit and inherited values must be preserved',
  'bend 参考几何，仅保留一个生效参数族': 'Bend reference geometry containing only the active parameter family',
  '一条 Flow relation 的根坐标系布局输出': 'Layout output for one Flow relation in root coordinates',
  '完整标签提供给布局的几何配置，不包含文字或外观':
    'Complete-label geometry provided to layout, excluding text and appearance',
  '完整标签的几何投影；空对象仍表示使用 Core 默认，紧凑标签省略此项':
    'Complete-label geometry; an empty object still requests Core defaults, while compact labels omit this field',
  '已测量的标签尺寸；无标签时省略': 'Measured label dimensions; omitted without a label',
  已补全参数的关系路由: 'Relation routing with effective parameters',
  已解析的语义箭头方向: 'Resolved semantic arrow direction',
  '布局已确定的参考路由，实际端点裁剪与箭头缩短由 Core 执行':
    'Reference route determined by layout; Core performs actual endpoint clipping and arrow shortening',
  '标签在 Flow 根坐标系中的预留矩形，倾斜标签使用旋转后的 AABB；有标签时必须提供，无标签时必须省略':
    'Reserved rectangle in Flow root coordinates, using the rotated AABB for sloped labels; required with a label and omitted otherwise',
  根坐标系中的有判别参考几何: 'Discriminated reference geometry in root coordinates',
  '终点 Entity 或 Group 的作者 id': 'Authored id of the target Entity or Group',
  '起点 Entity 或 Group 的作者 id': 'Authored id of the source Entity or Group',

  'Flow 声明与运行时扩展；由 adapter 在编译时组装 Source 和 provider':
    'Flow declarations and runtime extensions; the adapter assembles the Source and providers during compilation',
  'RetikzDiagramError 布局定义无效、名称冲突或默认布局未注册时抛出':
    'RetikzDiagramError is thrown for an invalid layout definition, conflicting names, or an unregistered default layout',
  '不含 namespace 与 type 的类型化 Flow 声明': 'Typed Flow declarations without namespace and type',
  '与 Core Theme style 同名的 Diagram Theme definitions；使用命名主题时需提供匹配定义':
    'Diagram Theme definitions with the same name as a Core Theme style; a named theme requires a matching definition',
  '与 Core Theme style 同名的 Flow Theme definitions；使用命名主题时需提供匹配定义':
    'Flow Theme definitions with the same name as a Core Theme style; a named theme requires a matching definition',
  传入的同一个布局定义对象: 'The same layout definition object passed in',
  '保留 input 对象引用的 embed 节点，不在此处执行布局':
    'An embed node that retains the input object reference without running layout here',
  '可交给 Core 编译器的只读 provider 贡献，包含 Flow 根入口及其依赖':
    'A readonly provider contribution for the Core compiler, including the Flow root entry and its dependencies',
  '扩展选项随 provider 保存，在编译组装时解析并校验':
    'Extension options are retained with the provider and resolved and validated when compilation assembles the definitions',
  '完整的布局定义；此函数仅保留类型并原样返回，注册时才校验':
    'A complete layout definition; this function preserves its type and returns it unchanged, with validation deferred to registration',
  '当前编译使用的布局名称，必须已注册；省略时使用内置 layered 布局':
    'The registered layout name used for compilation; omission selects the built-in layered layout',
  '按内置、自定义顺序排列的布局目录，标记当前默认项并省略布局回调':
    'A catalog ordered by built-in then custom layouts, marking the selected default and omitting layout callbacks',
  '自定义布局与默认布局选择；省略时列出内置布局并选择 layered':
    'Custom layouts and the default selection; omission lists built-in layouts and selects layered',
  '补入固定判别字段并复制目录与 children 数组的 Source；不执行布局或 Schema 解析':
    'Source with fixed discriminators added and catalog and children arrays copied, without layout execution or Schema parsing',
  '运行时扩展与默认布局选择；省略时使用空配置和内置能力':
    'Runtime extensions and the default layout selection; omission uses an empty configuration and built-in capabilities',
  '追加到内置布局目录的自定义定义；名称不能与不同定义重复':
    'Custom definitions appended to the built-in layout catalog; different definitions cannot share a name',
  '唯一且非空的注册名称，供 defaultFlowLayout 选择':
    'A unique, non-empty registration name selected through defaultFlowLayout',
  '非空的布局用途说明，供目录、工具和 LLM 查询':
    'A non-empty description of the layout purpose for catalogs, tools, and LLMs',
  '此布局支持的结构、箭头方向与路由；布局前据此检查输入':
    'Structures, arrow directions, and routing supported by this layout, used to check input before layout execution',
  'Source 和祖先配置均未指定时采用的方向、间距与路由':
    'Direction, spacing, and routing used when neither Source nor ancestor configuration specifies a value',
  '测量完成后同步计算几何；为全部元素返回 bounds，按输入顺序返回关系；每个固定 Layout 必须调用 context.placeLayout 一次':
    'Synchronously compute geometry after measurement: return bounds for every element and relations in input order, and call context.placeLayout once for each fixed Layout',
  'Flow Diagram Source root 的 InputEmbed adapter': 'InputEmbed adapter for a Flow Diagram Source root',
  'Flow Diagram embed 同时携带 Source authoring 输入与 definitions':
    'A Flow Diagram embed carries Source authoring input and definitions together',
  'Flow Diagram provider assembly 可注入的完整运行时能力':
    'Full runtime capabilities injected into a Flow Diagram provider assembly',
  'Flow Diagram 的持久化 Source IR': 'Persistable Source IR for a Flow Diagram',
  'Flow Entity 的 React 编写参数': 'React authoring props for a Flow Entity',
  'Flow Group 的 React 编写参数': 'React authoring props for a Flow Group',
  'Flow Layout 的 React 编写参数': 'React authoring props for a Flow Layout',
  'Flow Relation 的 React 编写参数': 'React authoring props for a Flow Relation',
  'Flow 批量 Entity 的 React 编写参数': 'React authoring props for a batch of Flow Entities',
  'Flow 批量 Relation 的 React 编写参数': 'React authoring props for a batch of Flow Relations',
  'FlowDiagram React 编写参数': 'React authoring props for FlowDiagram',
  '与 Core Theme style 同名的 Flow Theme definitions': 'Flow Theme definitions sharing a Core Theme style name',
  '与 Core Theme style 同名的 Graph Theme definitions': 'Graph Theme definitions sharing a Core Theme style name',
  '从同一次真实 registry 投影稳定的 JSON-safe catalog': 'Project a stable JSON-safe catalog from the live registry',
  '创建 Flow Diagram Source root 的 authoring embed 节点': 'Create an authoring embed for a Flow Diagram Source root',
  '创建 Flow Diagram 及全部 Graph / Foundation 依赖的完整provider contribution':
    'Create the complete provider contribution for Flow Diagram and its Graph and Foundation dependencies',
  '单次 Flow Diagram 编译产生的 renderer-neutral artifact':
    'Renderer-neutral artifact produced by one Flow Diagram compilation',
  '同步确定 Flow element bounds、relation route 与 label reservation 的布局定义':
    'Layout definition that synchronously determines Flow element bounds, relation routes, and label reservations',
  '在 FlowDiagram 根级批量声明 Relation': 'Declare a batch of Relations at the FlowDiagram root',
  '在当前位置批量声明 Flow Entity': 'Declare Flow Entities in a batch at the current position',
  '声明 FlowDiagram 中无外壳的作者指定布局': 'Declare an authored, shell-free Layout inside FlowDiagram',
  '声明 FlowDiagram 中的 Entity': 'Declare an Entity inside FlowDiagram',
  '声明 FlowDiagram 中的可见 Group': 'Declare a visible Group inside FlowDiagram',
  '声明 FlowDiagram 根级 Relation': 'Declare a Relation at the FlowDiagram root',
  '定义一个可注册的同步 Flow Layout': 'Define a registrable synchronous Flow Layout',
  '将 FlowDiagram Source root 接入 React 编写与 Layout 宿主':
    'Connect a FlowDiagram Source root to React authoring and the Layout host',
  '将类型化 Flow authoring 输入组装为唯一 Diagram Source IR':
    'Assemble typed Flow authoring input into one Diagram Source IR',
  '当前 assembly 选中的 Flow Layout definition 名称':
    'Name of the Flow Layout definition selected by the current assembly',
  '按 authoring 顺序展开的 Entity 文本或完整输入': 'Entity text or full input expanded in authoring order',
  '按 authoring 顺序展开的 endpoint tuple 或完整输入': 'Endpoint tuple or full input expanded in authoring order',
  '是否作为 Flow 根的完整 Relation 清单，启用后不能与其它 Relation marker 共存':
    'Whether this is the complete Relation list at the Flow root; if true, no other Relation marker may coexist',
  '是否作为当前 owner 的完整 Entity 清单，启用后不能与同 owner 的其它 Entity marker 共存':
    'Whether this is the complete Entity list for the current owner; if true, no other Entity marker may coexist',
  '根级 Flow Entity、Group、Layout 与 Relation markers': 'Root-level Flow Entity, Group, Layout, and Relation markers',
  '省略固定根判别字段的 Flow Diagram Vanilla authoring 输入':
    'Flow Diagram Vanilla authoring input without fixed root discriminators',
  '自定义 Entity kind definitions': 'Custom Entity kind definitions',
  '自定义 Entity predicate definitions': 'Custom Entity predicate definitions',
  '自定义 Entity role definitions': 'Custom Entity role definitions',
  '自定义 Flow Layout definitions': 'Custom Flow Layout definitions',
  '自定义 Relation kind definitions': 'Custom Relation kind definitions',
  '自定义 Relation predicate definitions': 'Custom Relation predicate definitions',
  '自定义 Relation role definitions': 'Custom Relation role definitions',
  '递归 Flow Entity、Group 或 Layout children': 'Recursive Flow Entity, Group, or Layout children',
};

const missing = new Set<string>();

/** 缺译时记录原文，完成整页投影后统一报错 */
export const translateFlowApiReference = (source: string): string => {
  if (['', '—', 'false', '[]', '[0,0]', 'LayeredFlowLayoutDefinition.name'].includes(source)) return source;

  const value = translations[source.replace(/\r/g, '')];
  if (value !== undefined) return value;

  missing.add(source);

  return source;
};

/** 阻止缺译的英文 include 写入页面 */
export const assertFlowApiReferenceTranslated = (): void => {
  if (missing.size === 0) return;
  throw new Error(`Flow API translations missing:\n${[...missing].sort().join('\n')}`);
};
