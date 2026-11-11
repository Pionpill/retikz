/** 比例尺与坐标系公开契约的英文说明 */
const translations: Partial<Record<string, string>> = {
  位置比例尺声明组件: 'Position scale declaration component',
  '绑定哪个定位维度；polar 下 x 为角向，y 为径向':
    'Position dimension to bind; x is angular and y radial in polar coordinates',
  '位置留白；分类尺度保留类别域并压缩输出范围':
    'Position padding; categorical scales retain their category domain and compress the output range',
  '对数底数；省略时为 10': 'Logarithm base; defaults to 10 when omitted',
  '显式数值 / 时间 domain；省略时从绑定数据推断':
    'Explicit numeric or temporal domain; inferred from bound data when omitted',
  '单值 domain 展开跨度；省略时按 scale 类型默认':
    'Span used to expand a single-value domain; the default depends on the scale type',
  '对数位置 scale': 'Logarithmic position scale',
  '线性区宽度常数；省略时为 1': 'Width constant of the linear region; defaults to 1 when omitted',
  '对称对数位置 scale': 'Symmetric logarithmic position scale',
  '除 log / symlog 外的连续位置 scale': 'Continuous position scale other than log or symlog',
  '首尾留白在范围两端的分配方式；省略时为 0.5':
    'Distribution of outer padding between the two range ends; defaults to 0.5',
  '显式分类 domain；省略时按数据出现顺序推断':
    'Explicit category domain; inferred in data encounter order when omitted',
  '相邻 band 间距占 step 的比例；省略时为 0.1': 'Gap between adjacent bands as a fraction of step; defaults to 0.1',
  '首尾外侧留白占 step 的比例；省略时等于 paddingInner':
    'Outer padding as a fraction of step; defaults to paddingInner',
  '分类带宽 scale 类型': 'Category band scale type',
  '首尾外侧留白占 step 的比例；省略时为 0.5': 'Outer padding as a fraction of step; defaults to 0.5',
  '分类点位 scale 类型；不接受连续 domain 配置':
    'Category point scale type; does not accept continuous domain configuration',
  'React DSL 里当前暴露的位置 scale 类型': 'Position scale types currently exposed by the React DSL',
  '<PlotScale> props：声明某个坐标维度使用的 scale 类型':
    '<PlotScale> props: declares the scale type for a position dimension',
  '位置 scale 可配置的坐标维度': 'Configurable position scale dimension',
  将离散类别映射为带宽区间的比例尺: 'Scale that maps discrete categories to bands',
  '分类标量：类别取值': 'Categorical scalar value',
  '自定义 scale operation（运行时由 ScaleDefinition 精确校验并解析；type 排除内置）':
    'Custom scale operation validated and resolved by ScaleDefinition at runtime; type excludes built-ins',
  'diverging color scale（连续发散色阶；有中点的量两侧异色）':
    'Diverging continuous color scale with different colors on either side of a midpoint',
  'position scale 的 domain padding': 'Position scale domain padding',
  '线性 scale': 'Linear scale',
  'log scale（连续对数，domain 全正）': 'Continuous logarithmic scale with a strictly positive domain',
  'ordinal scale（分类 → 离散输出，颜色）': 'Ordinal scale mapping categories to discrete color outputs',
  将离散类别映射为等距点的比例尺: 'Scale that maps discrete categories to equally spaced points',
  'pow scale（连续幂）': 'Continuous power scale',
  'quantile color scale（分位离散化；按数据分位切档 → 离散色，无显式数值 domain）':
    'Quantile color scale that partitions data into quantiles; no explicit numeric domain',
  'quantize color scale（等宽离散化；连续 domain 等宽切档 → 离散色）':
    'Quantize color scale that divides a continuous domain into equal-width bins',
  'radial scale（径向，面积感知半径；极坐标 / 玫瑰图值轴）':
    'Radial scale with area-proportional radii for polar and rose charts',
  '比例尺联合，包含连续、离散、时间、颜色及分段映射类型':
    'Scale union covering continuous, discrete, temporal, color, and piecewise mappings',
  'scale operation（内置精确 13-union ∪ 自定义 type 开放配置）':
    'Scale operation combining built-in configurations with open custom type configuration',
  'sequential color scale（连续顺序色阶；continuous / temporal color 主力）':
    'Sequential continuous color scale for continuous or temporal color values',
  'sqrt scale（连续平方根，面积感知；size 通道默认派生目标）':
    'Square-root scale with area-proportional sizing; the default derived scale for size channels',
  'symlog scale（对称对数，近零线性、尾部对数；跨零 / 含负的宽幅数据）':
    'Symmetric logarithmic scale: linear near zero and logarithmic in the tails, supporting negative and mixed-sign data',
  'threshold color scale（阈值离散化；自定义升序断点切档 → 离散色）':
    'Threshold color scale partitioned by custom ascending breakpoints',
  'time scale（连续时间，epoch ms）': 'Continuous time scale using epoch milliseconds',
  '归一化位置 scale：连续 / band / point 对 projector & guide 暴露同一形态':
    'Normalized position scale shared by continuous, band, and point mappings for projectors and guides',
  '把「band 起点 vs 中心」「bandwidth 是否为 0」「类别 vs 数值刻度」收进一层；\n  下游（projector / guide / bar）只认 coordinate + bandwidth + ticks，不各自分支 scale 类型。\n  连续 scale 使用 bandwidth=0 + coordinate=scale(value)，与 band / point scale 对齐到同一接口':
    'Unifies band centers, bandwidth, and categorical or numeric ticks. Projectors, guides, and bars consume coordinate, bandwidth, and ticks without branching on the scale type. Continuous scales use bandwidth=0 and coordinate=scale(value).',
  'band 宽（连续 / point = 0；band = scale.bandwidth()）；getter 反映 setRange 后的最新值':
    'Band width: zero for continuous and point scales; the getter reflects the latest setRange call',
  '数据值 → 坐标（连续=scale(value)；band=band 中心；point=点位）；非法值返回 NaN，调用方据此跳过':
    'Maps a data value to a coordinate: continuous output, band center, or point position; invalid values return NaN for the caller to skip',
  '当前输入域；连续 scale 返回 [min, max]，分类 scale 返回类别序列':
    'Current input domain: [min, max] for continuous scales or an ordered category sequence',
  '当前 range [start, end]（屏幕坐标，y 可能倒置）': 'Current screen-coordinate range [start, end]; y may be reversed',
  '设置 range（显式 range 的 scale 由 expand 决定是否调用）':
    'Sets the range; expand determines whether this is called for scales with an explicit range',
  '最终 range 下的离散刻度间距（band / point 为正 step；continuous 为 0）':
    'Discrete tick spacing in the final range: a positive step for band and point scales, zero for continuous scales',
  'guide 标签格式化用的刻度值族；自定义 scale 可省略并保留原 tick 标签':
    'Tick value family used by guide formatters; custom scales may omit it to preserve original labels',
  '刻度 + 标签（连续走 scaleTicks；band / point = 每类别一刻度，落 band 中心 / 点位）':
    'Ticks and labels: continuous scales use scaleTicks; band and point scales return one tick per category at its center or point',
  'position scale 的刻度值族，用于 guide 标签格式化': 'Position scale tick value family used by guide formatters',
  '刻度值 + 标签集（axis 与同维 grid 复用同一份）':
    'Tick values and labels shared by axes and grids of the same dimension',
  '与 values 逐项对应的格式化标签': 'Formatted labels corresponding one-to-one with values',
  按显示顺序排列的刻度原始值: 'Raw tick values in display order',
  'position scale 的拓扑连续性': 'Topological continuity of a position scale',
  '`<Plot coordinate>` 入口形态：字符串简写、内置对象配置或自定义坐标配置':
    '`<Plot coordinate>` input: string shorthand, built-in object configuration, or custom coordinate configuration',
  'registry 内部使用的宽类型': 'Wide type used by the registry',
  'registry 需要存放不同 operation 泛型的 definition；取出后由具体 schema parse 收窄，因此 resolve 入参在表内用 never 防止误调':
    'The registry stores definitions with different operation types. Each schema narrows its operation before invocation; never prevents calling resolve directly through the wide registry type.',
  '内部宽类型占位；真正调用前必须用该 definition.schema 解析 operation':
    'Wide internal placeholder; parse the operation with this definition.schema before invocation',
  '泛型擦除后的可选 scale binding；调用前必须先由 schema 收窄 operation':
    'Optional scale binding with its generic type erased; narrow the operation with the schema before invocation',
  '不同 definition 的 schema 泛型不同，registry 只关心能从中提取 type 并执行 parse':
    'Definitions have different schema types; the registry only needs to extract type and parse operations',
  '正交 cell（scale 输出空间的一段 primary 带 × 一段 secondary 区间）':
    'Orthogonal cell: a primary band multiplied by a secondary interval in scale output space',
  '区间类 mark（interval / sector / rect）的坐标系无关描述：cartesian primary=x 像素带 [lo,hi]、\n  secondary=y 像素 [base,value]；polar primary=角度带 [start°,end°]、secondary=半径 [inner,outer]。\n  frame.projectCell 把它投影成 CellGeometry。区间端点不要求有序（投影方各自处理方向 / swap）':
    'Coordinate-independent input for interval, sector, and rectangle marks. Cartesian primary is an x pixel band and secondary a y interval; polar primary is an angular band in degrees and secondary a radial interval. frame.projectCell projects it to CellGeometry. Endpoints need not be ordered; each projection handles direction.',
  '按位置角色记录的输出区间；各坐标系只读取自己声明的 roles':
    'Output intervals indexed by position role; each coordinate reads only its declared roles',
  'frame 投影 cell 的产物：闭式快路（rect / sector）⊕ contour 兜底（判别 union）':
    'Projected cell geometry: closed-form rectangles or sectors, or a contour',
  'cartesian → rect（轴对齐矩形）、polar → sector（环楔），皆 O(1) 闭式参数；曲线 / 自定义 frame\n  经自身投影把四边密采样成 contour 顶点环。mark 侧据 kind 统一装配 core Node（rect→rectangle、sector→sector、\n  contour→contour shape），不再按坐标系分叉':
    'Cartesian coordinates produce axis-aligned rectangles and polar coordinates annular sectors using constant-time parameters. Curved or custom frames sample cell edges into a contour. Marks assemble Core nodes by geometry kind: rectangle, sector, or contour, without branching on coordinate type.',
  投影后矩形的完整高度: 'Full height of the projected rectangle',
  '区分矩形、环形扇区与一般轮廓投影': 'Distinguishes rectangle, annular sector, and general contour projections',
  投影后矩形中心的屏幕坐标: 'Screen coordinates of the projected rectangle center',
  投影后矩形的完整宽度: 'Full width of the projected rectangle',
  环形扇区圆心的屏幕坐标: 'Screen coordinates of the annular sector center',
  '扇区终止角，单位为度': 'Sector end angle in degrees',
  环形扇区的内侧半径: 'Inner radius of the annular sector',
  环形扇区的外侧半径: 'Outer radius of the annular sector',
  '扇区起始角，单位为度': 'Sector start angle in degrees',
  按边界顺序排列的屏幕坐标顶点: 'Screen-coordinate vertices in boundary order',
  '具备 cell 几何投影能力的运行时坐标帧': 'Runtime coordinate frame supporting cell geometry projection',
  '原始角色值经各 role 的 position scale 映射；支持 role-space placement 时必须提供':
    'Maps raw role values through their position scales; required for role-space placement',
  'role-space containment 所需的 coordinate 边界度量；未提供时不能消费要求自动 containment 的 adjustment':
    'Coordinate boundary metrics for role-space containment; required by adjustments requesting automatic containment',
  '投影别名：2 通道便捷形态，委托 projectRoles；不适用时返回 null':
    'Convenient two-channel projection delegating to projectRoles; returns null when inapplicable',
  '正交 cell → CellGeometry（可选）：实现了才支持 cell 类 mark（interval / sector / rect）\n将各角色的尺度输出区间投影为可绘制单元几何':
    'Optional orthogonal cell-to-CellGeometry projection for interval, sector, and rectangle marks. Projects role output intervals into renderable cell geometry.',
  '曲线 / 自定义 frame 自行把 cell 四边经自身几何投影密采样成 contour（用引擎 helper densifyCellContour）；\n不回传 → cell 类 mark 在该坐标系 fail-loud（无引擎自动兜底——「输出空间→屏幕」后段映射只有 frame 自己有）':
    'Curved or custom frames sample cell edges using their own projection and densifyCellContour. Without this capability, cell marks fail explicitly; the engine cannot supply the frame-specific output-to-screen mapping.',
  '已映射角色值投影到屏幕；支持 role-space placement 时必须提供':
    'Projects mapped role values to the screen; required for role-space placement',
  'N 通道投影：按 roles 序传值 → 屏幕点；非有限 → null（跳过）':
    'Projects values in roles order to a screen point; non-finite inputs return null and are skipped',
  '映射后的角色端点沿坐标几何连接；无法投影时返回 null':
    'Connects mapped role endpoints along coordinate geometry; returns null when projection is impossible',
  '位置角色序（消费哪些 mark 通道，按序喂 projectRoles）':
    'Position role order determining which mark channels feed projectRoles',
  '各角色的位置 scale（可选）：供 guide 画轴用——取该角色刻度、其余角色锚在各自 domain 起点，\n沿 projectRoles 密采样得曲线轴线 + 刻度点。不回传 → 该坐标系不画轴':
    "Optional position scales by role for guides. Guides take each role's ticks, anchor other roles at their domain starts, and sample projectRoles to form curved axes and tick positions. Omitted scales disable axes.",
  '是否支持绘图区背景、边框和区域锚点': 'Whether plot-area backgrounds, borders, and region anchors are supported',
  '映射后角色参数递增时的屏幕切向；与 mapRoles / projectMappedRoles 同源':
    'Screen tangent as a mapped role parameter increases; shares the split projection model',
  '返回有限非零向量；奇点或尖点返回 null。显式节点定向要求提供此能力，Guide 缺省仍可数值求切向':
    'Returns a finite nonzero vector, or null at a singularity or cusp. Explicit node orientation requires this capability; guides can otherwise estimate tangents numerically.',
  '坐标系注册 type；内置用其判别串（如 `cartesian2D`），自定义用自己的 type（如 `bridge` / `sine`）':
    'Registered coordinate type: a built-in discriminator such as cartesian2D or a custom name such as bridge or sine',
  坐标单元投影选项: 'Cell projection options',
  '默认沿坐标几何连接；straight 直接连接投影后的角点':
    'Follows coordinate geometry by default; straight connects projected corners directly',
  坐标系运行时定义: 'Runtime coordinate definition',
  'definition 是含函数的运行时对象，不进入 JSON IR；IR 只保存 `{ type, ...config }` 形态的 coordinate operation':
    'A definition is a runtime object containing functions and is not stored in JSON IR; IR stores only the coordinate operation as `{ type, ...config }`',
  '坐标系 schema 解析的操作类型，关联尺度绑定与坐标解析':
    'Operation type parsed by the coordinate schema, connecting scale bindings with coordinate resolution',
  位置角色的输出空间边界度量能力: 'Output-space boundary metrics for position roles',
  '将 coordinate operation 解析成运行时 frame 与 guide 层':
    'Resolves a coordinate operation into a runtime frame and guide layers',
  '该坐标系消费的定位角色序，用于 required-channel 与 guide-dimension 校验':
    'Position roles consumed by the coordinate, used to validate required channels and guide dimensions',
  'operation 字段与统一位置 role 之间的可选 scale binding；默认使用 role 同名字段':
    'Optional binding between operation fields and position roles; defaults to fields with the same names as the roles',
  "完整 coordinate operation schema；必须含非空 z.literal('type') 供 registry 提取注册键":
    'Complete coordinate operation schema with a nonempty literal type field used as the registry key',
  '坐标系 definition.resolve 的共享上下文': 'Shared context for coordinate definition.resolve',
  '这里暴露的是坐标系无关的能力：画布尺寸、数据取值、scale 解析、guide 下沉与 provenance。\n  definition 不应该绕过这些 helper 另建平行数据 / scale 语义':
    'Provides coordinate-independent capabilities: canvas dimensions, data access, scale resolution, guide lowering, and provenance. Definitions should use these helpers to preserve shared data and scale semantics.',
  '校验 interval / area 等依赖 baseline 的 mark 是否可安全使用当前 scale 类型（type 串，含自定义）':
    'Checks whether baseline-dependent marks such as intervals and areas can safely use the scale type, including custom types',
  '当前 plot 内所有 axis guide；definition 决定如何将其下沉到 grid / axis 层':
    'All axis guides in the current plot; the definition controls lowering into grid and axis layers',
  '把 scale operation 与数据域、屏幕 range 组合成可投影的位置 scale':
    'Combines a scale operation, data domain, and screen range into a position scale',
  为角色位置由区间边界推导的标记覆盖坐标轴刻度:
    'Overrides axis ticks for marks whose role positions are derived from interval bounds',
  '按内置坐标系语义收集定位值；会保留 interval bounds / baseline 的既有特殊域贡献':
    'Collects position values using built-in coordinate semantics, preserving interval-bound and baseline contributions to the domain',
  '按定位角色收集 mark 通道原始值；includeBaseline 用于需要把 baseline 纳入连续域的值轴':
    'Collects raw mark channel values by position role; includeBaseline adds the baseline to continuous value-axis domains',
  'guide / label 使用的基础字号': 'Base font size for guides and labels',
  '坐标轴与网格的 role 边界覆盖；空对象使用布局范围，省略时沿用最终 role range，刻度仍使用映射比例尺':
    'Role boundary overrides for axes and grids; an empty object uses layout bounds, omission uses the final role range, and ticks still use the mapping scale',
  画布高度: 'Canvas height',
  'guide title / composition label 固定间距': 'Fixed spacing for guide titles and composition labels',
  'plot layout / decoration 触发的自动预留；内置坐标系把它叠加到自动 plotArea 边距':
    'Automatic space reserved by plot layout or decorations; built-in coordinates add it to automatic plot-area margins',
  'legend 预留区域；内置坐标系用它收窄 plotArea，自定义坐标系 v1 通常保持满画布':
    'Legend reservation; built-in coordinates narrow the plot area while custom coordinates generally retain the full canvas',
  '下沉曲线坐标轴的入口，依赖 frame.roleScales 与 frame.projectRoles':
    'Curved-axis lowering using frame.roleScales and frame.projectRoles',
  '下沉直线 / 内置 guide 的通用入口': 'Shared lowering entry for straight and built-in guides',
  '用户传入的边距覆盖；自定义坐标系可选择是否消费':
    'User margin overrides; custom coordinates may choose whether to consume them',
  '当前 plot 的 mark 列表；主要用于 scale 兼容性与坐标系特定校验':
    'Marks in the current plot, primarily for scale compatibility and coordinate-specific validation',
  'overlay scope 共享的目标 plotArea；给定时坐标系仍独立训练 scale，但使用该矩形作为 range':
    'Target plot area shared by overlay scopes; coordinates still train scales independently but use this rectangle as their range',
  'provenance 上下文，透传给 guide 下沉以保留诊断来源':
    'Provenance context passed into guide lowering to retain diagnostic sources',
  '解析轴 / 网格候选刻度；由 resolve 层注入，provider 不直接依赖 guide resolver':
    'Resolves candidate axis and grid ticks; injected by the resolve layer so providers do not depend directly on guide resolvers',
  '读取已注册 position scale definition 的拓扑连续性；channel scale 与未注册 type 会 fail-loud':
    'Reads the continuity of a registered position scale definition; channel scales and unregistered types fail explicitly',
  '解析某个定位角色的 scale operation；未指定 scaleName 时按数据推导默认 scale（含自定义 type）':
    'Resolves the scale operation for a position role; an omitted scaleName derives a default from the data, including custom types',
  '按 guide density 从候选刻度中筛出可见刻度；由 resolve 层注入':
    'Filters candidate ticks by guide density; injected by the resolve layer',
  '指定 role 的最终 range；用于 scaffold track 把局部 role 映射进 track band':
    'Final range for a role, allowing scaffold tracks to map local roles into their track band',
  '已解析的外部数据行；高级坐标系可按需读取完整数据': 'Resolved external data rows available to advanced coordinates',
  '当前 Core 编译环境的标签测量': 'Label measurement from the current Core compile environment',
  画布宽度: 'Canvas width',
  'Coordinate 提供各角色的绘图区边界度量': 'Plot-area boundary metrics provided by a coordinate for each role',
  '将屏幕外缘及净空转成两端 role range 距离；循环角色返回 null，不制造接缝':
    'Converts glyph extents and clearance into distances at both ends of the role range; cyclic roles return null to avoid introducing a seam',
  支持逐点留白的轴向角色: 'Axis roles supporting per-point padding',
  '运行时坐标帧的能力契约（抽象基座）': 'Capability contract for runtime coordinate frames',
  'grammar of graphics 的 coordinate 层：scale 把值归一化后，frame 负责归一化→2D 点。\n  内置坐标系（cartesian / polar）与自定义注册坐标系都满足这一契约——内置帧是它的结构子类型，\n  带各自专属字段（如 primary/secondary scale），需要时由 providers 的 `isXxxCoordinateFrame` 守卫收窄。\n  lowering 算一次，mark / guide / locator 共享同一帧；投影函数由实现/注册 definition 提供，不进入 JSON IR。\n  `type` 保持 definition 注册的真实判别串；非有限值返回 null（跳过该点）':
    'The coordinate layer projects scale outputs to 2D points. Built-in Cartesian and polar frames and registered custom frames share this contract. Built-in frames add specialized fields and can be narrowed using provider guards. Lowering computes one frame shared by marks, guides, and locators; projection functions remain runtime capabilities outside JSON IR. The registered type discriminator is preserved, and non-finite values return null to skip the point.',
  '正交 cell → CellGeometry（可选）：实现了才支持 cell 类 mark（interval / sector / rect）':
    'Optional orthogonal cell-to-CellGeometry projection; required by interval, sector, and rectangle marks',
  'createCoordinateFrame 的可选运行时能力': 'Optional runtime capabilities for createCoordinateFrame',
  '原始角色值经 position scale 映射；支持 role-space placement 时与 projectMappedRoles 一起提供':
    'Maps raw role values through position scales; provide with projectMappedRoles for role-space placement',
  'role-space placement containment 的 coordinate 边界度量':
    'Coordinate boundary metrics for role-space placement containment',
  '正交 cell → CellGeometry；实现了才支持 cell 类 mark（interval / sector），省略 → cell 类 mark fail-loud':
    'Projects an orthogonal cell to CellGeometry; required by cell marks such as intervals and sectors, which fail explicitly when it is omitted',
  '已映射角色值投影到屏幕；支持 role-space placement 时与 mapRoles 一起提供':
    'Projects mapped role values to the screen; provide with mapRoles for role-space placement',
  映射后的角色端点沿坐标几何连接: 'Connects mapped role endpoints along coordinate geometry',
  '各角色位置 scale；供 guide 画轴。省略 → 该坐标系无轴':
    'Position scales by role for drawing axes; omission disables axes',
  '映射后角色递增的屏幕切向；提供时必须同时提供两段投影':
    'Screen tangent as a mapped role increases; requires both split projection functions',
  '坐标系解析后可用的绘图区矩形，单位是最终画布坐标': 'Resolved plot-area rectangle in final canvas coordinates',
  绘图区高度: 'Plot-area height',
  绘图区宽度: 'Plot-area width',
  '绘图区左上角 x 坐标': "x coordinate of the plot area's top-left corner",
  '绘图区左上角 y 坐标': "y coordinate of the plot area's top-left corner",
  '坐标系 definition 的解析结果': 'Resolution result of a coordinate definition',
  'frame 负责 mark 投影；plotArea 供布局 / clipping / locator 使用；gridLayers 与 axisLayers\n  是坐标系在解析阶段同步下沉出的 guide 层，避免 mark 与 guide 使用不同的临时投影状态':
    'frame projects marks; plotArea supports layout, clipping, and locators. gridLayers and axisLayers are guide layers lowered during coordinate resolution, keeping marks and guides on the same projection state.',
  'guide axis 下沉后的 IR scope 列表': 'IR scopes produced by axis-guide lowering',
  'mark / guide / locator 共用的运行时坐标帧': 'Runtime coordinate frame shared by marks, guides, and locators',
  'guide grid 下沉后的 IR scope 列表': 'IR scopes produced by grid-guide lowering',
  当前坐标系计算出的绘图区: 'Plot area computed by the current coordinate',
  '坐标 Definition 的位置 scale binding 契约': 'Position scale binding contract for a coordinate definition',
  'read 把 operation 自有字段投影为统一 role；bind 将统一 role 写回 operation 自有字段。\n  省略该契约时，Plot 默认读取和写入与 role 同名的 operation 字段':
    'read maps operation-specific fields to position roles; bind writes roles back to those fields. When omitted, Plot reads and writes operation fields with the same names as the roles.',
  '将按 role 命名的 scale 写入坐标 operation，并保留其它配置':
    'Writes role-indexed scale names into the coordinate operation while preserving other configuration',
  '从坐标 operation 读取按 role 命名的 scale': 'Reads role-indexed scale names from a coordinate operation',
  '坐标 operation 中按位置角色索引的命名 scale binding':
    'Named scale bindings indexed by position role in a coordinate operation',
  '坐标系位置角色：mark 按 frame.roles 序从 encoding 取对应通道值喂 projectRoles':
    'Coordinate position roles: marks read channel values in frame.roles order and pass them to projectRoles',
  '内置坐标系使用 x / y；自定义 CoordinateDefinition 可声明任意非空字符串角色。\n  schema 只保留 JSON 形状，角色是否被坐标系支持由 definition.roles 在 lowering 阶段校验':
    'Built-in coordinates use x and y; custom definitions may declare any nonempty role strings. Schemas retain JSON structure, while definition.roles validates supported roles during lowering.',
  '一维直线坐标系（cartesian1D）': 'One-dimensional straight-line coordinate system (cartesian1D)',
  '内置坐标系（cartesian2D | polar2D | cartesian1D | polar1D）':
    'Built-in coordinate systems: cartesian2D, polar2D, cartesian1D, and polar1D',
  '坐标系 operation（内置 ∪ 自定义 type 开放配置）':
    'Coordinate operation combining built-in and open custom configuration',
  '自定义坐标系 operation（投影由运行时 CoordinateDefinition 提供）':
    'Custom coordinate operation projected by a runtime CoordinateDefinition',
  '一维圆周坐标系（polar1D）': 'One-dimensional circular coordinate system (polar1D)',
  '二维极坐标系（polar2D）': 'Two-dimensional polar coordinate system (polar2D)',
  '按 Definition 契约把位置 scale 名称写回 coordinate operation':
    'Writes position scale names into a coordinate operation according to its definition',
  '消费已精确解析的 operation；自定义 hook 与默认同名字段路径直接返回类型化绑定结果，不重复解析':
    'Consumes an already parsed operation. Custom hooks and the default same-name field path return typed bindings directly without reparsing.',
  建通用坐标帧: 'Creates a generic coordinate frame',
  '把 definition 注册 type、roles 与 projectRoles 包成 CoordinateFrame。`type` 会保留调用方注册的真实判别值，\n  不会压成 `custom`；point/path/region 等按 `projectRoles` 投影。第四参 options 逐项声明额外能力：\n  roleScales 允许 guide / interval 构造读取 scale，mapRoles / projectMappedRoles 开启两段 position projection，\n  placementBoundary 开启 role-space containment，tangentAt 提供局部切向，projectSegment 提供坐标路径，projectCell 开启 cell 类 mark。\n  supportsPlotArea 默认开启，可显式设为 false；其它未声明的能力保持不可用并由消费方 fail-loud':
    'Wraps the registered type, roles, and projectRoles into a CoordinateFrame, preserving the actual type rather than replacing it with custom. Marks project through projectRoles. Options declare role scales, split projection, placement boundaries, tangents, coordinate paths, and cell projection. Plot-area support defaults to enabled and can be disabled explicitly; undeclared capabilities remain unavailable and consumers fail explicitly when they require them.',
  '定义一个坐标系 definition': 'Defines a coordinate system',
  '这是坐标系扩展的唯一注册单元：schema 决定 IR 中允许的 coordinate operation，\n  roles 决定 mark 必填位置通道，resolve 把 JSON operation 解析成运行时 frame 与 guide 层。内置坐标系和\n  自定义坐标系都应通过这个对象进入 registry，避免内置白名单与扩展补丁接口分叉':
    'The shared registration unit for built-in and custom coordinates. schema defines permitted IR operations, roles defines required position channels, and resolve produces the runtime frame and guide layers.',
  '当前 helper 只做 `CoordinateDefinition` 类型约束并原样返回定义对象；保留稳定入口是为了与其它 registry API 对齐，并为后续运行时校验、默认值归一或泛型收敛预留 contract hook':
    'This helper currently enforces the CoordinateDefinition type and returns the object unchanged. Its stable entry aligns with other registry APIs and leaves room for future validation, normalization, or generic constraints.',
  '判断坐标帧是否支持 cell 类几何投影': 'Checks whether a coordinate frame supports cell geometry projection',
  'interval、reference band 等 mark 先构造逻辑 Cell，再要求 frame.projectCell 把 Cell 投成 rect / sector / contour。\n  这个 guard 只表示“能投 cell”，不表示 mark 侧一定能构造 cell；自定义 interval 仍需要 roleScales':
    'Interval and reference-band marks construct a logical Cell and require frame.projectCell to produce a rectangle, sector, or contour. This guard confirms projection support only; custom intervals still need roleScales to construct cells.',
  '按 Definition 契约读取已精确解析的 coordinate operation 的位置 scale 名称':
    'Reads position scale names from an already parsed coordinate operation according to its definition',
  '解析坐标系 registry': 'Resolves the coordinate registry',
  '内置坐标系总是先注册；用户自定义 definition 不能覆盖内置 type，也不能彼此重复。\n  返回值是一次 lowering 使用的完整 registry，后续通过 coordinate.type 找到 definition，再由该 definition.schema parse\n  operation，并调用 definition.resolve 得到运行时 frame':
    'Built-ins are registered first. Custom definitions cannot replace built-in types or duplicate each other. The returned registry is used for one lowering pass: coordinate.type selects a definition, its schema parses the operation, and resolve produces the runtime frame.',
  坐标定义及其位置角色和可选绑定钩子: 'Coordinate definition with its roles and optional binding hooks',
  已按该定义解析的坐标操作: 'Coordinate operation already parsed by this definition',
  当前定义角色上的具名比例尺绑定: 'Named scale bindings for the roles of the current definition',
  待写入的位置角色与比例尺名称: 'Position roles and scale names to write',
  保留其它配置并写入适用绑定的坐标操作:
    'Coordinate operation with applicable bindings written and other configuration preserved',
  '坐标配置 Schema、位置角色与解析能力': 'Coordinate configuration schema, position roles, and resolution capability',
  原样返回传入的定义对象: 'The supplied definition object, unchanged',
  已注册的坐标类型名称: 'Registered coordinate type name',
  投影函数接收的位置角色顺序: 'Order of position roles accepted by the projection function',
  原始角色值到屏幕位置的投影函数: 'Projection from raw role values to a screen position',
  '按需声明比例尺、分段投影与单元几何等能力': 'Optional scale, split projection, and cell geometry capabilities',
  '供图元、坐标轴与定位器共用的坐标帧': 'Coordinate frame shared by marks, axes, and locators',
  待检查的运行时坐标帧: 'Runtime coordinate frame to check',
  '是否提供可调用的 projectCell 能力': 'Whether a callable projectCell capability is available',
  '自定义坐标定义；省略时仅注册内置坐标系': 'Custom coordinate definitions; omitted to register only built-ins',
  按坐标类型索引的完整定义表: 'Complete definition registry indexed by coordinate type',
  'Schema 缺少非空字面量 type、位置角色重复或注册类型冲突':
    'The schema lacks a nonempty literal type, position roles are duplicated, or registered types conflict',
};
const missing = new Set<string>();
/** 只翻译说明，代码标识符保持原样 */
export const translatePlotSpatial = (source: string): string => {
  const text = source.trim();
  if (translations[text] !== undefined) return translations[text];
  if (/\p{Script=Han}/u.test(text)) missing.add(text);
  return text;
};
/** 缺译时阻止写入英文产物 */
export const assertPlotSpatialTranslated = (): void => {
  if (missing.size) throw new Error(`Missing spatial translations: ${JSON.stringify([...missing], null, 2)}`);
};
