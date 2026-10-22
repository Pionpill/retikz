/** 已审阅的通道公开契约英文说明 */
const translations: Partial<Record<string, string>> = {
  附属标签的字段外观通道: 'Field-driven visual channel for an attached label',
  按原始标签索引投递的字段样式: 'Field styles delivered by the original label index',
  '标签几何宿主，沿用 Core 的两个标签消费面': 'Label geometry host using the two Core label surfaces',
  '标签通道共用的 Core 投递目标': 'Core delivery target shared by label channels',
  '标签字段通道定义，内置与自定义共用注册、解析和投递入口':
    'Label field channel definition with shared registration, resolution and delivery for built-ins and extensions',
  允许消费本通道的标签宿主: 'Label hosts allowed to consume this channel',
  根据字段绑定与宿主解析逐行值: 'Resolves row values from a field binding and host',
  '将确定值写入 Core 标签': 'Writes a resolved value to a Core label',
  '定义标签通道，不创建独立 registry': 'Defines a label channel using the shared registry',
  保留声明索引的标签样式投递: 'Label style delivery retaining its declaration index',
  原始标签索引: 'Original label index',
  已绑定宿主与诊断上下文的逐行投递: 'Row delivery bound to its host and diagnostic context',
  '附属标签的 Core 宿主；有标签编码时必须声明': 'Core host of attached labels; required for label style encodings',

  '无有效字段编码时使用的固定 paint 属性': 'Fixed paint property used when no effective field encoding exists',
  读取字段编码在当前行中的原始值: 'Reads the raw value of a field encoding in the current row',
  '字段绑定；省略表示未绑定': 'Field binding; omitted when unbound',
  '字段值；绑定或字段缺失时返回 undefined': 'Field value; undefined when the binding or field is missing',
  'resolveLabel 最高优先；有字段编码时读取字段，否则使用固定内容':
    'resolveLabel takes precedence; reads the encoded field when present, otherwise uses fixed content',
  固定文本内容: 'Fixed text content',
  '可选的字段编码；无效值不回退到固定内容': 'Optional field encoding; invalid values do not fall back to fixed content',
  字段值的显示格式: 'Display format for field values',
  '获取字段绑定的字段路径，不解释固定属性': 'Reads the field path of a binding without interpreting fixed properties',
  获取字段绑定显式指定的比例尺名称: 'Reads the scale name explicitly specified by a field binding',
  '读取内置视觉目标的编码，透明度因子使用其声明成员':
    'Reads a visual target encoding, using the declared member for each opacity factor',
  '加入编码引用的字段路径，固定属性不经过字段收集器':
    'Adds the field path referenced by an encoding; fixed properties do not enter field collection',
  字段解析器产出的视觉值类型: 'Visual value type produced by the field resolver',
  '字段编码；省略时不产生解析结果': 'Field encoding; omitted to produce no resolution',
  字段类型限制与值解析策略: 'Field type constraints and value parsing policy',
  '逐行解析器与字段元数据；未绑定时返回 undefined': 'Row resolver and field metadata; undefined when unbound',
  'registry / options 注入用的通用宽类型': 'Wide type for injecting definitions through a registry or options',
  通道注册键: 'Channel registration key',
  '通道类型：position / mark / scope / node / path': 'Channel kind: position / mark / scope / node / path',
  '从 mark 上读取该位置角色的 channel 绑定': 'Reads the channel binding for this position role from a mark',
  '坐标系 role 名': 'Coordinate role name',
  在通道注册表中唯一的名称: 'Unique name in the channel registry',
  '决定通道由 mark 消费还是交付给 Node、Scope 或 Path':
    'Determines whether the channel is consumed by a mark or delivered to a Node, Scope, or Path',
  '结合数据上下文与图元绑定解析通道；无绑定时可返回 undefined':
    'Resolves the channel from the data context and mark binding; may return undefined when unbound',
  '把已解析的视觉值写入对应 Core 宿主的已有属性':
    'Writes the resolved visual value to existing properties of the corresponding Core host',
  该通道用于图例展示的视觉形式: 'Visual representation used by this channel in a legend',
  视觉值的输出种类与数值范围或符号候选: 'Output kind and numeric range or symbol candidates for visual values',
  '通道 definition 的公共基座': 'Shared base for channel definitions',
  决定通道消费方式的类型判别值: 'Kind discriminator that determines how the channel is consumed',
  '内置 paint 通道 definition 的按名称索引类型': 'Name-indexed built-in paint channel definitions',
  '供 mark 消费的主颜色通道': 'Primary color channel consumed by marks',
  '供 mark 消费的填充通道': 'Fill channel consumed by marks',
  '供 mark 消费的描边通道': 'Stroke channel consumed by marks',
  '内置 position channel definition 的扩展形态': 'Extended form of a built-in position channel definition',
  '创建用于读取 mark 位置绑定的函数': "Creates a function that reads a mark's position binding",
  '创建内置文本通道时可注入的运行时 label resolver':
    'Runtime label resolvers that can be injected when creating built-in text channels',
  '按 mark id 索引的运行时标签回调': 'Runtime label callbacks indexed by mark id',
  '内置文本通道 definition 的按名称索引类型': 'Name-indexed built-in text channel definitions',
  '把数据值解析为 mark 标签内容的通道': 'Channel that resolves data values into mark label content',
  当前待解析的图元: 'Mark currently being resolved',
  '通道绑定；未绑定时返回 undefined': 'Channel binding, or undefined when unbound',
  '通道定义：所有通道类型共用的 registry 元素': 'Channel definition: a registry element shared by all channel kinds',
  '通道解析、传递或整层共享的视觉值类型': 'Visual value type resolved, delivered, or shared across a layer',
  '结合数据上下文与图元绑定，返回逐行解析器及可选图例描述；无绑定时返回 undefined':
    'Combines the data context and mark binding to return a row resolver and optional legend descriptor; returns undefined when unbound',
  '把解析值落到 core IRScope 的既有属性或 every-X 默认':
    'Writes the resolved value to existing core IRScope properties or every-X defaults',
  'legend 形态；无 legend 的通道省略': 'Legend representation; omitted for channels without a legend',
  '输出空间 + 默认范围 / 调色板': 'Output space and default range or palette',
  '结合数据上下文与图元绑定，返回整层共享值及可选图例描述；无绑定时返回 undefined':
    'Combines the data context and mark binding to return a layer-wide value and optional legend descriptor; returns undefined when unbound',
  '把逐行解析值落到 core IRNode 的既有属性': 'Writes each resolved row value to existing core IRNode properties',
  '不写 position / 几何；新渲染能力应先下沉到 core':
    'Does not write position or geometry; new rendering capabilities belong in core first',
  'legend 形态（size→梯度气泡 / opacity→ramp / shape→symbol）；无 legend 的通道省略':
    'Legend representation: size uses graduated bubbles, opacity a ramp, and shape symbols; omitted for channels without a legend',
  '把逐行解析值落到 core IRPath 的既有属性': 'Writes each resolved row value to existing core IRPath properties',
  'legend 形态（opacity→ramp / strokeWidth→size）；无 legend 的通道省略':
    'Legend representation: opacity uses a ramp and strokeWidth size; omitted for channels without a legend',
  '通道解析上下文：当前 Plot、有效数据行与完整字段模型':
    'Channel resolution context: the current Plot, effective rows, and complete field model',
  '当前数据的完整字段模型；未定类型字段仍保留':
    'Complete field model for the current data, including fields without a resolved type',
  '当前通道所属的完整 Plot 源描述': 'Complete Plot source description that owns this channel',
  当前主题提供的分类与连续颜色上下文: 'Categorical and continuous color context provided by the current theme',
  '按 IR data.model 的 order 计算分类 domain；由 resolve 层注入':
    'Computes the categorical domain using IR data.model order; injected by the resolve layer',
  '解析 channel scale；由 resolve 层注入，provider 不直接依赖 scale resolver':
    'Resolves a channel scale; injected by the resolve layer so providers do not depend directly on the scale resolver',
  按注册名称取得从归一化位置到颜色的插值函数:
    'Looks up a registered interpolation function from normalized positions to colors',
  当前解析作用域内的有效数据行: 'Effective rows in the current resolution scope',
  通道的输出空间: 'Channel output space',
  '用判别 union 描述 range / palette，避免 number 通道配 symbol 调色板这类非法组合':
    'A discriminated union for ranges and palettes that prevents invalid combinations such as a symbol palette on a numeric channel',
  '区分颜色、数值、符号及其他 JSON 视觉值': 'Distinguishes colors, numbers, symbols, and other JSON visual values',
  是否把连续映射结果限制在输出区间内: 'Whether continuous mapping results are clamped to the output interval',
  数值通道缺省的输出区间: 'Default output interval for a numeric channel',
  符号通道可选用的形状序列: 'Shape sequence available to a symbol channel',
  '通道解析可见的 palette 默认值；由 IRPlot.defaultPlot 在 lowering 前解析':
    'Palette defaults visible to channel resolution, resolved from IRPlot.defaultPlot before lowering',
  '分类 scale 默认颜色': 'Default colors for categorical scales',
  '发散色阶默认 scheme': 'Default scheme for diverging color scales',
  '连续单向色阶默认 scheme': 'Default scheme for sequential color scales',
  '无 color 编码的 mark / series 默认颜色': 'Default mark or series color when no color encoding is present',
  '分类 shape 通道默认形状': 'Default shapes for categorical shape channels',
  '包含 definition 顺序视图的通道 registry': 'Channel registry with an ordered view of all definitions',
  当前注册表持有的完整通道定义列表: 'Complete list of definitions held by the current registry',
  '解析通道 registry 时可传入的自定义 definition 与文本选项':
    'Custom definitions and text options accepted when resolving a channel registry',
  加入当前注册表的自定义通道定义: 'Custom channel definitions added to the current registry',
  '按 mark id 注入内置标签通道的运行时回调': 'Runtime callbacks injected into the built-in label channel by mark id',
  '单通道解析结果：逐行通道值函数 + 供 legend 的可复用 descriptor':
    'Single-channel resolution: a row value function and reusable legend descriptor',
  'scale descriptor；常量 value 编码通常不入 legend':
    'Scale descriptor; constant value encodings usually do not appear in legends',
  逐行通道值解析器: 'Row-wise channel value resolver',
  通道解析器的输出值: 'Output value of a channel resolver',
  '通道 definition 只产运行时值，不进入 IRPlot / core IR；对象值若需要支持，必须先明确 JSON 契约与落点':
    'Channel definitions produce runtime values only, outside IRPlot and core IR; object values require an explicit JSON contract and delivery target',
  当前图元使用的数据行: 'Data row used by the current mark',
  '该行的视觉值；undefined 表示该行不应用此通道': 'Visual value for this row; undefined skips this channel for the row',
  '颜色通道 definition 的名称、取值与图例配置':
    'Name, binding reader, and legend configuration for a color channel definition',
  创建的颜色类通道名称: 'Name of the color channel to create',
  '是否允许常量分支使用颜色以外的 paint 输入': 'Whether constant branches may accept paint inputs other than colors',
  '从 mark 中读取该通道的绑定': "Reads this channel's binding from a mark",
  'addChannel 接受的通道形态：普通 channel 或 mark 样式字段 / 常量引用':
    'Channel forms accepted by addChannel: a regular channel or a mark style field or constant reference',
  区分数据字段引用与不依赖数据的常量: 'Distinguishes a data field reference from a data-independent constant',
  '字段名称或常量值，由 kind 决定解释方式': 'Field name or constant value, interpreted according to kind',
  '字段收集器：把 mark / transform 声明中引用外部数据源的字段加入集合':
    'Collects fields referenced from external data sources by mark or transform declarations',
  '加入普通 channel 或 mark 样式字段引用；常量值不引用数据源':
    'Adds a regular channel or mark style field reference; constants do not reference data sources',
  '加入一个字段名；undefined 表示该位置没有字段引用':
    'Adds a field name; undefined means there is no field reference at this position',
  '一次加入多个字段名；undefined 会被跳过': 'Adds multiple field names, skipping undefined entries',
  'Mark 通道定义：解析成 MarkChannels.values/defaults，供 mark definition 消费':
    'Mark channel definition: resolves into MarkChannels.values/defaults for consumption by a mark definition',
  'Mark 通道解析结果：塞入 MarkChannels.values，由 mark definition 自行消费':
    'Mark channel resolution: stored in MarkChannels.values for the mark definition to consume',
  '默认值，供 mark 在无字段编码时上提到 nodeDefault / pathDefault':
    'Default value that a mark may promote to nodeDefault or pathDefault when no field encoding is present',
  '可选 legend descriptor': 'Optional legend descriptor',
  '一个 mark 下沉时消费的通道集合': 'Channels consumed while lowering a mark',
  '`values` 存放按名字索引的求值器（如 color / label 这种 mark 需要特殊消费的通道）；\n  `defaults` 存放同名默认值；`scopeDeliveries` / `nodeDeliveries` / `pathDeliveries`\n  存放直接落到 core IRScope / IRNode / IRPath 的通道交付项':
    '`values` holds named evaluators for channels such as color and label that require mark-specific consumption. `defaults` holds defaults under the same names. `scopeDeliveries`, `nodeDeliveries`, and `pathDeliveries` hold deliveries to core IRScope, IRNode, and IRPath.',
  '未应用逐行编码时由 mark 消费的通道默认值':
    'Channel defaults consumed by a mark when no row-wise encoding is applied',
  与实际通道映射同源的图例尺度描述: 'Legend scale descriptors derived from the same mapping as the rendered channel',
  '应用于各 Node 图元的逐行通道交付项': 'Row-wise channel deliveries applied to Node primitives',
  '应用于各 Path 图元的逐行通道交付项': 'Row-wise channel deliveries applied to Path primitives',
  '应用于整层 Scope 的共享通道交付项': 'Shared channel deliveries applied to the layer Scope',
  按通道名称索引的逐行视觉值解析函数: 'Row-wise visual value resolvers indexed by channel name',
  'mark 样式值解析出的逐行 resolver 与字段元数据': 'Row resolver and field metadata resolved from a mark style value',
  '逐行解析后交给 mark 的视觉值类型': 'Visual value type delivered to a mark after row resolution',
  '绑定的数据字段名；常量值没有字段名': 'Bound data field name; constants have no field name',
  '绑定字段的解析类型；常量值或未知字段类型时省略':
    'Resolved type of the bound field; omitted for constants or unknown field types',
  '创建 mark 样式值 resolver 时的字段类型与常量处理策略':
    'Field type and constant handling policy for a mark style value resolver',
  原始字段解析成功时返回的视觉值类型: 'Visual value type returned after successfully parsing a raw field',
  '用于错误信息的属性 / 通道名': 'Property or channel name used in errors',
  '常量变体是否也产出 resolver；需要把常量收敛进默认属性时可显式跳过':
    'Whether constant variants also produce a resolver; explicitly skip them when promoting constants to default properties',
  '字段变体允许的字段类型；省略表示不做类型限制':
    'Allowed field types for field variants; omitted to allow any field type',
  '把数据行中的原始字段值转换为属性值；返回 undefined 表示该行跳过该属性':
    'Converts a raw row field into a property value; undefined skips the property for that row',
  'Node 通道定义（运行时对象，不进 IR）': 'Node channel definition: a runtime object outside IR',
  '解析通道值后直接落到 core IRNode 既有属性。`size`、`shape`、`opacity` 这类点图元属性属于这一类':
    'Resolves channel values directly into existing core IRNode properties, including point properties such as `size`, `shape`, and `opacity`',
  'Node 通道 definition 使用的窄运行时上下文': 'Narrow runtime context used by a Node channel definition',
  '单个 Node 通道的逐行交付项：从 row 取值，再把值落到 core IRNode':
    'Row-wise delivery for a Node channel: reads a row value and writes it to core IRNode',
  '通道名（诊断 / 调试用；不参与 IR）': 'Channel name for diagnostics and debugging, outside IR',
  '把解析值落到 core IRNode 的既有属性': 'Writes the resolved value to existing core IRNode properties',
  '逐行通道值解析器；undefined = 该行不应用、node 用默认':
    'Row-wise value resolver; undefined skips the channel so the node uses its default',
  'Node 通道交付上下文：definition 可据 mark / row / point 形态决定是否落值':
    'Node delivery context; a definition can use the mark, row, or point form to decide whether to apply a value',
  '正在下沉的 mark': 'Mark being lowered',
  'point mark 的具体 node 形态；文本点和 glyph 点的可写样式不同':
    'Specific node form of a point mark; text points and glyph points support different writable styles',
  当前数据行: 'Current data row',
  'Path 通道定义（运行时对象，不进 IR）': 'Path channel definition: a runtime object outside IR',
  '用于一一落到 core IRPath 既有标量属性的通道，例如 strokeWidth / opacity 这类路径级属性。\n  `color` 这种不同 mark 会映射到 node fill、path stroke 或 path fill 的通道应保持为 MarkChannelDefinition':
    'Channels mapped directly to existing scalar core IRPath properties, such as strokeWidth and opacity. Channels such as `color`, whose target varies between node fill, path stroke, and path fill, remain MarkChannelDefinition.',
  'Path 通道 definition 使用的窄运行时上下文': 'Narrow runtime context used by a Path channel definition',
  '单个 Path 通道的逐行交付项：从 row 取值，再把值落到 core IRPath':
    'Row-wise delivery for a Path channel: reads a row value and writes it to core IRPath',
  '把解析值落到 core IRPath 的既有属性': 'Writes the resolved value to existing core IRPath properties',
  '逐行通道值解析器；undefined = 该行不应用、path 用默认':
    'Row-wise value resolver; undefined skips the channel so the path uses its default',
  'Path 通道交付上下文：definition 可据 mark / row / path 形态决定是否落值':
    'Path delivery context; a definition can use the mark, row, or path form to decide whether to apply a value',
  '当前数据行；series / 聚合 path 暂以代表行传入':
    'Current data row; series and aggregate paths currently pass a representative row',
  'plot 通道可下沉到 core 的颜色或 paint 值': 'Color or paint value that a Plot channel can lower to core',
  '位置通道定义：角色由 CoordinateDefinition.roles 提供，本 definition 只承接统一命名和绑定读取':
    'Position channel definition: CoordinateDefinition.roles supplies the roles; this definition provides shared naming and binding access',
  该行的标签文本: 'Label text for this row',
  '通道 scale 描述符：legend 据此画 swatch / ramp / 分箱 / 梯度符号':
    'Channel scale descriptor used by legends to render swatches, ramps, bins, or graduated symbols',
  'lowering 内部类型，不进 IR。resolver 与 legend 共读同一 descriptor，保证图例与实绘同源':
    'Internal lowering type, outside IR. Resolvers and legends share the same descriptor to keep legends consistent with rendering.',
  '描述的非位置通道（color / size / opacity / shape / 自定义通道）':
    'Non-position channel described: color, size, opacity, shape, or a custom channel',
  'color scale 的 legend 解析结果；仅 color-like mark 通道需要':
    'Resolved color-scale legend; required only by color-like mark channels',
  '未绑定分类颜色时，mark 使用的有效默认颜色':
    'Effective default color used by a mark without a categorical color binding',
  '域：连续 = [min, max]、分类 = 类别序、离散化 = 边界 / 类别':
    'Domain: [min, max] for continuous data, ordered categories for categorical data, or boundaries and categories for discretization',
  '绑定字段名；常量通道无字段': 'Bound field name; constant channels have no field',
  '绑定字段类型；常量 / 类型未知时省略': 'Bound field type; omitted for constants or unknown types',
  '值域：色串 / 半径 / 不透明度 / shape 名': 'Output range: color strings, radii, opacity values, or shape names',
  '绑定 scale 名；legend.scale 据此在同通道多 scale 时消歧':
    'Bound scale name; legend.scale uses it to distinguish multiple scales for the same channel',
  '绑定 scale 的 type 串': 'Type string of the bound scale',
  'Scope 通道定义（运行时对象，不进 IR）': 'Scope channel definition: a runtime object outside IR',
  '用于一一落到 core IRScope 既有属性，或写入 `nodeDefault` / `pathDefault` / `labelDefault` / `arrowDefault`。\n  它表达“这一层共享默认值”；逐 datum 的属性应使用 NodeChannelDefinition / PathChannelDefinition':
    'Maps directly to existing core IRScope properties or `nodeDefault`, `pathDefault`, `labelDefault`, and `arrowDefault`. It represents shared layer defaults; per-datum properties use NodeChannelDefinition or PathChannelDefinition.',
  'Scope 通道 definition 使用的窄运行时上下文': 'Narrow runtime context used by a Scope channel definition',
  '单个 Scope 通道的交付项：把解析值落到 core IRScope':
    'Delivery for a Scope channel: writes the resolved value to core IRScope',
  '把解析值落到 core IRScope 的级联属性或 every-X 默认':
    'Writes the resolved value to cascading core IRScope properties or every-X defaults',
  已解析的整层通道值: 'Resolved layer-wide channel value',
  'Scope 通道交付上下文：definition 可据 mark / layer rows 决定如何设置整层默认值':
    'Scope delivery context; a definition can use the mark and layer rows to set shared defaults',
  '当前 mark 使用的数据行': 'Rows used by the current mark',
  'Scope 通道解析结果：整层共享值 + 可选 legend descriptor':
    'Scope channel resolution: a layer-wide value and optional legend descriptor',
  整层共享的通道值: 'Channel value shared by the whole layer',
  '保留的内置通道名集：扩展通道的 `channel` 不得撞这些':
    'Reserved built-in channel names; extension `channel` names must not conflict with these',
  '含内置 mark / scope / node / path channel + 位置通道 x/y/z；同名内置通道可按 kind 注册多个 definition':
    'Includes built-in mark, scope, node, and path channels plus x/y/z position channels; built-in names may have multiple definitions with different kinds',
  '内置 Node 通道定义：scale 管数学、node channel 管输出空间 + 默认范围 + legend 形态':
    'Built-in Node channel definitions: scales own the math; node channels own output space, default ranges, and legend representation',
  '内置和自定义通道在 lowering 前合并进同一个 registry；差别只在 definition 来源':
    'Built-in and custom channels are merged into one registry before lowering; only their definition sources differ',
  '允许直接交付到 core Path 的内置通道名集合': 'Names of built-in channels that can be delivered directly to core Path',
  '允许直接交付到 core Scope 的内置通道名集合':
    'Names of built-in channels that can be delivered directly to core Scope',
  '通道 definition 类型': 'Channel definition kind',
  '按最终消费面分类：position 由坐标系 role 消费，mark 由 mark lowering 按图元语义消费，\n  scope / node / path 直接落到 core IRScope / IRNode / IRPath':
    'Classifies channels by their consumer: coordinate roles consume position channels, mark lowering consumes mark channels, and scope, node, and path channels write directly to core IRScope, IRNode, and IRPath.',
  '汇集向 Core 节点、路径与作用域交付属性的内置通道定义':
    'Built-in channel definitions that deliver properties to Core nodes, paths, and scopes',
  '内置 Node 通道 definition 集合': 'Collection of built-in Node channel definitions',
  'opacity 通道连续映射的最小不透明度（range 下界，避免最小值全透明不可见）；契约常量，测试 import 断言':
    'Minimum opacity for continuous channel mapping; the lower range bound keeps the minimum value visible. A contract constant imported by tests.',
  '内置 Path 通道 definition 集合': 'Collection of built-in Path channel definitions',
  '内置 Scope 通道 definition 集合': 'Collection of built-in Scope channel definitions',
  'size 通道自动半径映射的默认最大值': 'Default maximum radius for automatic size mapping',
  'size 通道最小 / 最大半径（px，user units；对齐散点默认直径 10 量级）；core 换算细节，不外泄 IR':
    'Minimum and maximum size-channel radii in user units (px), aligned with a default scatter diameter around 10; core conversion details stay outside IR',
  数值描边宽度通道的默认最大输出值: 'Default maximum output for numeric stroke width channels',
  'strokeWidth 通道连续映射的最小 / 最大描边宽度（user units）；避免最小值落成不可见边框':
    'Minimum and maximum stroke widths for continuous strokeWidth mapping in user units, keeping the minimum border visible',
  '取通道值：value 常量优先，否则 field 路径解析':
    'Reads a channel value: a value constant takes precedence; otherwise resolves the field path',
  '字段或常量绑定；省略表示未绑定': 'Field or constant binding; omitted when unbound',
  '常量或字段值；绑定或字段缺失时返回 undefined':
    'Constant or field value; undefined when the binding or field is missing',
  '创建内置 paint channel definitions': 'Creates built-in paint channel definitions',
  '新建的 color、fill、stroke 通道定义集合': 'New collection of color, fill, and stroke channel definitions',
  '创建内置 text channel definitions': 'Creates built-in text channel definitions',
  '按图元标识注入标签回调；省略时只读取声明的标签绑定':
    'Label callbacks injected by mark id; omitted to read only declared label bindings',
  '包含 label 通道的新定义集合': 'New definition collection containing the label channel',
  '创建 plot 字段收集器，支持 channel 结构并把所有写入落到传入 Set':
    'Creates a Plot field collector that accepts channel structures and writes into the supplied Set',
  '接收字段名的可变集合；收集操作直接写入此集合':
    'Mutable set that receives field names directly from collection operations',
  '共享传入集合的字段收集器，常量绑定不会加入字段':
    'Field collector sharing the supplied set; constant bindings add no fields',
  '把坐标系 roles 包成 position channel definitions，供校验、域收集和 scale 推导共用同一读取入口':
    'Wraps coordinate roles as position channel definitions so validation, domain collection, and scale inference share one binding reader',
  '坐标系声明的位置角色；同名角色在索引中保留最后一项':
    'Position roles declared by the coordinate system; the last role wins for duplicate names',
  按角色名称索引的位置通道定义: 'Position channel definitions indexed by role name',
  '定义一个通道（统一入口）；具体 kind 决定解析后进入 position / mark / scope / node / path 哪条消费路径':
    'Defines a channel through a unified entry point; kind selects the position, mark, scope, node, or path consumption route',
  原样返回的具体通道定义类型: 'Specific channel definition type returned unchanged',
  '包含种类判别、绑定读取或解析回调的通道定义':
    'Channel definition with a kind discriminator and binding reader or resolution callback',
  '原样返回传入的定义对象，不执行注册或解析':
    'Returns the supplied definition unchanged, without registering or resolving it',
  '定义一个 Node 通道（对齐 defineScale / defineCoordinate / defineTransform；保留 resolve / deliver 的输出强类型）':
    'Defines a Node channel, aligned with defineScale, defineCoordinate, and defineTransform, preserving strongly typed resolve and deliver outputs',
  '通道定义；kind 可省略，返回时固定为对应种类':
    'Channel definition; kind is optional and fixed to the corresponding kind in the result',
  '补充种类判别后的新定义对象；回调保持原引用':
    'New definition object with the kind discriminator supplied; callback references are preserved',
  '定义一个 Path 通道（对齐 defineNodeChannel；保留 resolve / deliver 的输出强类型）':
    'Defines a Path channel, aligned with defineNodeChannel, preserving strongly typed resolve and deliver outputs',
  '定义一个 Scope 通道（保留 resolve / deliver 的输出强类型）':
    'Defines a Scope channel, preserving strongly typed resolve and deliver outputs',
  'text 内容通道某行解析为标签串': 'Resolves a text content channel to a label string for one row',
  'resolveLabel 最高优先；其次 field 解析值；再次 value 常量':
    'resolveLabel takes precedence, followed by the resolved field value, then the value constant',
  字段或常量文本内容及可选展示格式: 'Field or constant text content with an optional display format',
  '字段类型；temporal 使用 UTC 时间格式，其余使用数值格式':
    'Field type; temporal fields use UTC date formatting, others use numeric formatting',
  '优先于声明内容的运行时标签回调；省略时读取 text':
    'Runtime label callback taking precedence over declared content; omitted to read text',
  '格式化文本或常量内容；字段为空或没有内容时返回 undefined':
    'Formatted text or constant content; undefined for an empty field or absent content',
  '创建 color-like mark 通道（color / fill / stroke）': 'Creates a color-like mark channel: color, fill, or stroke',
  '常量 value 直返；字段值经 channel scale registry 取色。连续 / temporal 字段必须显式引用 color scale':
    'Constants are returned directly; fields obtain colors through the channel scale registry. Continuous and temporal fields must explicitly reference a color scale.',
  '通道名称、绑定读取函数与常量 paint 策略': 'Channel name, binding reader, and constant paint policy',
  '使用颜色比例尺解析字段的 mark 通道定义；创建时不解析数据':
    'Mark channel definition that resolves fields through color scales; creation does not resolve data',
  '把 schema 定义的 mark 样式值解析为「行 → 属性值」函数，供内置 mark 与自定义 mark 复用':
    'Resolves a schema-defined mark style value into a row-to-property function shared by built-in and custom marks',
  常量或字段解析器产出的视觉值类型: 'Visual value type produced by a constant or field resolver',
  '字段或常量样式值；省略时不产生解析结果': 'Field or constant style value; omitted to produce no resolution',
  当前数据的完整字段模型: 'Complete field model for the current data',
  '字段类型限制、值解析与常量处理策略': 'Field type constraints, value parsing, and constant handling policy',
  '逐行解析器与字段元数据；未绑定或跳过常量时返回 undefined':
    'Row resolver and field metadata; undefined when unbound or when constants are skipped',
  '已知字段类型与 expectedFieldType 不一致': 'Known field type does not match expectedFieldType',
  '解析通道 registry：内置 definition 先注册，自定义 definition 再合并':
    'Resolves a channel registry: built-in definitions are registered first, then custom definitions are merged',
  '名称索引保留首个同名内置定义；definitions 保留全部定义和注册顺序':
    'The name index keeps the first built-in definition for each name; definitions preserves all definitions in registration order',
  '自定义定义与标签回调；省略时仅注册内置定义':
    'Custom definitions and label callbacks; omitted to register only built-in definitions',
  新建的名称索引及其完整定义列表: 'New name index and its complete definition list',
  '自定义名称为空、重复或与内置保留名称冲突':
    'A custom name is empty, duplicated, or conflicts with a reserved built-in name',
};

const missing = new Set<string>();

/** 从生成期翻译表读取说明，保留代码标识符 */
export const translatePlotChannel = (source: string): string => {
  const text = source.trim();
  if (translations[text] !== undefined) return translations[text];
  if (/\p{Script=Han}/u.test(text)) missing.add(text);
  return text;
};

/** 缺少英文说明时阻止生成英文参考 */
export const assertPlotChannelTranslated = (): void => {
  if (missing.size) throw new Error(`Missing channel translations: ${JSON.stringify([...missing], null, 2)}`);
};
