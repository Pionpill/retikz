import type { IRNode, IRPath, IRScope, IRShapeValue, JsonValue } from '@retikz/core';
import type {
  DataFieldTypeMap,
  DataFieldTypeValue,
  ExternalRow,
  IRDataFieldDefinition,
  IRDataScalarValue,
} from '@retikz/data';
import type { ValueOf } from '@retikz/foundation';

import type {
  IRPlotChannel,
  IRPlotMarkOperation,
  IRPlotScaleOperation,
  IRPlotSpec,
  LegendChannelValue,
} from '../schemas';
import type { DimensionRole } from './coordinate';
import type { ChannelScaleResolution, ChannelScaleResolveContext } from './scale';

/** 通道解析可见的 palette 默认值；由 PlotSpec.plotTheme 在 lowering 前解析 */
export type ChannelPaletteContext = {
  /** 分类 scale 默认颜色 */
  categorical: ReadonlyArray<string>;
  /** 无 color 编码的 mark / series 默认颜色 */
  series: ReadonlyArray<string>;
  /** 连续单向色阶默认 scheme */
  sequential: string;
  /** 发散色阶默认 scheme */
  diverging: string;
  /** 分类 shape 通道默认形状 */
  shape: ReadonlyArray<IRShapeValue>;
};

/**
 * 通道解析器的输出值。
 * @description 通道 definition 只产运行时值，不进入 PlotSpec / core IR；对象值若需要支持，必须先明确 JSON 契约与落点
 */
export type ChannelValue = JsonValue;

/** 逐行通道值解析器；返回 undefined 表示该行不应用该通道 */
export type ChannelValueResolver<T extends ChannelValue = ChannelValue> = (row: ExternalRow) => T | undefined;

/** 运行时 label 解析逃生舱，不进 IR */
export type ResolveLabel = (row: ExternalRow) => string;

/**
 * 通道 definition 类型。
 * @description 按最终消费面分类：position 由坐标系 role 消费，mark 由 mark lowering 按图元语义消费，
 *   scope / node / path 直接落到 core IRScope / IRNode / IRPath
 */
export const ChannelDefinitionKind = {
  /** 位置通道：由坐标系 role 消费 */
  Position: 'position',
  /** Mark 通道：解析后交给 mark definition 按图元语义消费 */
  Mark: 'mark',
  /** Scope 通道：解析后直接交付到 core IRScope 级联属性或 every-X 默认 */
  Scope: 'scope',
  /** Node 通道：解析后直接交付到 core IRNode 属性 */
  Node: 'node',
  /** Path 通道：解析后直接交付到 core IRPath 属性 */
  Path: 'path',
} as const;

/** 通道 definition 类型值 */
export type ChannelDefinitionKindValue = ValueOf<typeof ChannelDefinitionKind>;

/** Node 通道交付上下文：definition 可据 mark / row / point 形态决定是否落值 */
export type NodeChannelDeliveryContext = {
  /** 正在下沉的 mark */
  mark: IRPlotMarkOperation;
  /** 当前数据行 */
  row: ExternalRow;
  /** point mark 的具体 node 形态；文本点和 glyph 点的可写样式不同 */
  nodeKind: 'pointGlyph' | 'pointText' | 'cell';
};

/** 单个 Node 通道的逐行交付项：从 row 取值，再把值落到 core IRNode */
export type NodeChannelDelivery = {
  /** 通道名（诊断 / 调试用；不参与 IR） */
  channel: string;
  /** 逐行通道值解析器；undefined = 该行不应用、node 用默认 */
  resolver: ChannelValueResolver;
  /** 把解析值落到 core IRNode 的既有属性 */
  deliver: (node: IRNode, value: ChannelValue, context: NodeChannelDeliveryContext) => void;
};

/** Path 通道交付上下文：definition 可据 mark / row / path 形态决定是否落值 */
export type PathChannelDeliveryContext = {
  /** 正在下沉的 mark */
  mark: IRPlotMarkOperation;
  /** 当前数据行；series / 聚合 path 暂以代表行传入 */
  row: ExternalRow;
};

/** 单个 Path 通道的逐行交付项：从 row 取值，再把值落到 core IRPath */
export type PathChannelDelivery = {
  /** 通道名（诊断 / 调试用；不参与 IR） */
  channel: string;
  /** 逐行通道值解析器；undefined = 该行不应用、path 用默认 */
  resolver: ChannelValueResolver;
  /** 把解析值落到 core IRPath 的既有属性 */
  deliver: (path: IRPath, value: ChannelValue, context: PathChannelDeliveryContext) => void;
};

/** Scope 通道交付上下文：definition 可据 mark / layer rows 决定如何设置整层默认值 */
export type ScopeChannelDeliveryContext = {
  /** 正在下沉的 mark */
  mark: IRPlotMarkOperation;
  /** 当前 mark 使用的数据行 */
  rows: ReadonlyArray<ExternalRow>;
};

/** 单个 Scope 通道的交付项：把解析值落到 core IRScope */
export type ScopeChannelDelivery = {
  /** 通道名（诊断 / 调试用；不参与 IR） */
  channel: string;
  /** 已解析的整层通道值 */
  value: ChannelValue;
  /** 把解析值落到 core IRScope 的级联属性或 every-X 默认 */
  deliver: (scope: IRScope, value: ChannelValue, context: ScopeChannelDeliveryContext) => void;
};

/**
 * 一个 mark 下沉时消费的通道集合。
 * @description `values` 存放按名字索引的求值器（如 color / label 这种 mark 需要特殊消费的通道）；
 *   `defaults` 存放同名默认值；`scopeDeliveries` / `nodeDeliveries` / `pathDeliveries`
 *   存放直接落到 core IRScope / IRNode / IRPath 的通道交付项
 */
export type MarkChannels = {
  values?: Readonly<Record<string, ChannelValueResolver>>;
  defaults?: Readonly<Record<string, ChannelValue>>;
  scopeDeliveries?: ReadonlyArray<ScopeChannelDelivery>;
  nodeDeliveries?: ReadonlyArray<NodeChannelDelivery>;
  pathDeliveries?: ReadonlyArray<PathChannelDelivery>;
  descriptors?: ReadonlyArray<ScaleDescriptor>;
};

/** addChannel 接受的通道形态：普通 channel 或 mark 样式字段 / 常量引用 */
export type FieldChannel = IRPlotChannel | { kind: 'field' | 'constant'; value: unknown };

/** 字段收集器：把 mark / transform 声明中引用外部数据源的字段加入集合 */
export type FieldCollector = {
  /** 加入一个字段名；undefined 表示该位置没有字段引用 */
  addField: (field?: string) => void;
  /** 一次加入多个字段名；undefined 会被跳过 */
  addFields: (...fields: Array<string | undefined>) => void;
  /** 加入普通 channel 或 mark 样式字段引用；常量值不引用数据源 */
  addChannel: (channel?: FieldChannel) => void;
};

/**
 * 通道 scale 描述符：legend 据此画 swatch / ramp / 分箱 / 梯度符号。
 * @description lowering 内部类型，不进 IR。resolver 与 legend 共读同一 descriptor，保证图例与实绘同源
 */
export type ScaleDescriptor = {
  /** 描述的非位置通道（color / size / opacity / shape / 自定义通道） */
  channel: LegendChannelValue;
  /** 绑定 scale 的 type 串 */
  scaleType: string;
  /** 域：连续 = [min, max]、分类 = 类别序、离散化 = 边界 / 类别 */
  domain: ReadonlyArray<IRDataScalarValue>;
  /** 值域：色串 / 半径 / 不透明度 / shape 名 */
  range: ReadonlyArray<JsonValue>;
  /** 绑定字段名；常量通道无字段 */
  field?: string;
  /** 绑定字段类型；常量 / 类型未知时省略 */
  fieldType?: DataFieldTypeValue;
  /** 绑定 scale 名；legend.scale 据此在同通道多 scale 时消歧 */
  scaleName?: string;
  /** color scale 的 legend 解析结果；仅 color-like mark 通道需要 */
  colorScale?: ChannelScaleResolution;
};

/** 单通道解析结果：逐行通道值函数 + 供 legend 的可复用 descriptor */
export type ChannelResolution<T> = {
  /** 逐行通道值解析器 */
  resolver: (row: ExternalRow) => T | undefined;
  /** scale descriptor；常量 value 编码通常不入 legend */
  descriptor?: ScaleDescriptor;
};

/**
 * 通道的输出空间。
 * @description 用判别 union 描述 range / palette，避免 number 通道配 symbol 调色板这类非法组合
 */
export type ChannelOutputSpace =
  | { outputKind: 'color' }
  | { outputKind: 'number'; range: readonly [number, number]; clamp?: boolean }
  | { outputKind: 'symbol'; palette: ReadonlyArray<IRShapeValue> }
  | { outputKind: 'boolean' }
  | { outputKind: 'array' }
  | { outputKind: 'object' }
  | { outputKind: 'json' };

/** 通道解析上下文：spec + 规整后的数据行 + 字段类型表 */
export type ChannelDefinitionResolveContext = {
  node: IRPlotSpec;
  rows: Array<ExternalRow>;
  fieldTypes: DataFieldTypeMap;
  /** 最终字段类型具有声明、resolver 或有效数据观测依据的字段；省略时由 definition 就地判断 */
  fieldTypeEvidence?: ReadonlySet<string>;
  /** 解析 channel scale；由 resolve 层注入，provider 不直接依赖 scale resolver */
  resolveChannelScale: (
    operation: IRPlotScaleOperation,
    values: Array<unknown>,
    context: ChannelScaleResolveContext,
  ) => ChannelScaleResolution;
  /** 按 IR data.model 的 order 计算分类 domain；由 resolve 层注入 */
  resolveCategoryDomain: (
    values: Array<unknown>,
    order?: NonNullable<IRDataFieldDefinition['order']>,
  ) => Array<string | number>;
  resolveColorScheme: (name: string) => (t: number) => string;
  palette?: ChannelPaletteContext;
};

/** Node 通道 definition 使用的窄运行时上下文 */
export type NodeChannelDefinitionResolveContext = ChannelDefinitionResolveContext;

/** Path 通道 definition 使用的窄运行时上下文 */
export type PathChannelDefinitionResolveContext = ChannelDefinitionResolveContext;

/** Scope 通道 definition 使用的窄运行时上下文 */
export type ScopeChannelDefinitionResolveContext = ChannelDefinitionResolveContext;

/** Mark 通道解析结果：塞入 MarkChannels.values，由 mark definition 自行消费 */
export type MarkChannelResolution<T extends ChannelValue = ChannelValue> = {
  /** 逐行通道值解析器 */
  resolver: ChannelValueResolver<T>;
  /** 默认值，供 mark 在无字段编码时上提到 nodeDefault / pathDefault */
  defaultValue?: ChannelValue;
  /** 可选 legend descriptor */
  descriptor?: ScaleDescriptor;
};

/** Scope 通道解析结果：整层共享值 + 可选 legend descriptor */
export type ScopeChannelResolution<T extends ChannelValue = ChannelValue> = {
  /** 整层共享的通道值 */
  value: T;
  /** 可选 legend descriptor */
  descriptor?: ScaleDescriptor;
};

/** 读取某 mark 上某通道绑定的统一入口 */
export type ChannelBindingResolver = (mark: IRPlotMarkOperation) => IRPlotChannel | undefined;

/** 通道 definition 的公共基座 */
export type BaseChannelDefinition<TKind extends ChannelDefinitionKindValue> = {
  /** 通道注册键 */
  channel: string;
  /** 通道类型：position / mark / node / path */
  kind: TKind;
};

/** 位置通道定义：角色由 CoordinateDefinition.roles 提供，本 definition 只承接统一命名和绑定读取 */
export type PositionChannelDefinition = BaseChannelDefinition<typeof ChannelDefinitionKind.Position> & {
  /** 坐标系 role 名 */
  role: DimensionRole;
  /** 从 mark 上读取该位置角色的 channel 绑定 */
  pick: ChannelBindingResolver;
};

/** Mark 通道定义：解析成 MarkChannels.values/defaults，供 mark definition 消费 */
export type MarkChannelDefinition<T extends ChannelValue = ChannelValue> = BaseChannelDefinition<
  typeof ChannelDefinitionKind.Mark
> & {
  /** 建逐 mark 解析器（行→通道值 + 可选 legend descriptor） */
  resolve: (
    ctx: ChannelDefinitionResolveContext,
  ) => (mark: IRPlotMarkOperation) => MarkChannelResolution<T> | undefined;
};

/**
 * Node 通道定义（运行时对象，不进 IR）。
 * @description 解析通道值后直接落到 core IRNode 既有属性。`size`、`shape`、`opacity` 这类点图元属性属于这一类
 */
export type NodeChannelDefinition<T extends ChannelValue = ChannelValue> = BaseChannelDefinition<
  typeof ChannelDefinitionKind.Node
> & {
  /** 输出空间 + 默认范围 / 调色板 */
  output: ChannelOutputSpace;
  /** legend 形态（size→梯度气泡 / opacity→ramp / shape→symbol）；无 legend 的通道省略 */
  legend?: 'swatch' | 'ramp' | 'size' | 'symbol';
  /** 建逐 mark 解析器（行→通道值 + 可选 legend descriptor） */
  resolve: (
    ctx: NodeChannelDefinitionResolveContext,
  ) => (mark: IRPlotMarkOperation) => ChannelResolution<T> | undefined;
  /**
   * 把逐行解析值落到 core IRNode 的既有属性。
   * @description 不写 position / 几何；新渲染能力应先下沉到 core
   */
  deliver: (node: IRNode, value: T, context: NodeChannelDeliveryContext) => void;
};

/**
 * Scope 通道定义（运行时对象，不进 IR）。
 * @description 用于一一落到 core IRScope 既有属性，或写入 `nodeDefault` / `pathDefault` / `labelDefault` / `arrowDefault`。
 *   它表达“这一层共享默认值”；逐 datum 的属性应使用 NodeChannelDefinition / PathChannelDefinition
 */
export type ScopeChannelDefinition<T extends ChannelValue = ChannelValue> = BaseChannelDefinition<
  typeof ChannelDefinitionKind.Scope
> & {
  /** 输出空间 + 默认范围 / 调色板 */
  output: ChannelOutputSpace;
  /** legend 形态；无 legend 的通道省略 */
  legend?: 'swatch' | 'ramp' | 'size' | 'symbol';
  /** 建逐 mark 解析器（整层共享值 + 可选 legend descriptor） */
  resolve: (
    ctx: ScopeChannelDefinitionResolveContext,
  ) => (mark: IRPlotMarkOperation) => ScopeChannelResolution<T> | undefined;
  /** 把解析值落到 core IRScope 的既有属性或 every-X 默认 */
  deliver: (scope: IRScope, value: T, context: ScopeChannelDeliveryContext) => void;
};

/**
 * Path 通道定义（运行时对象，不进 IR）。
 * @description 用于一一落到 core IRPath 既有标量属性的通道，例如 strokeWidth / opacity 这类路径级属性。
 *   `color` 这种不同 mark 会映射到 node fill、path stroke 或 path fill 的通道应保持为 MarkChannelDefinition
 */
export type PathChannelDefinition<T extends ChannelValue = ChannelValue> = BaseChannelDefinition<
  typeof ChannelDefinitionKind.Path
> & {
  /** 输出空间 + 默认范围 / 调色板 */
  output: ChannelOutputSpace;
  /** legend 形态（opacity→ramp / strokeWidth→size）；无 legend 的通道省略 */
  legend?: 'swatch' | 'ramp' | 'size' | 'symbol';
  /** 建逐 mark 解析器（行→通道值 + 可选 legend descriptor） */
  resolve: (
    ctx: PathChannelDefinitionResolveContext,
  ) => (mark: IRPlotMarkOperation) => ChannelResolution<T> | undefined;
  /** 把逐行解析值落到 core IRPath 的既有属性 */
  deliver: (path: IRPath, value: T, context: PathChannelDeliveryContext) => void;
};

/** 通道定义：所有通道类型共用的 registry 元素 */
export type ChannelDefinition<T extends ChannelValue = ChannelValue> =
  | PositionChannelDefinition
  | MarkChannelDefinition<T>
  | ScopeChannelDefinition<T>
  | NodeChannelDefinition<T>
  | PathChannelDefinition<T>;

/**
 * 定义一个通道（统一入口）；具体 kind 决定解析后进入 position / mark / scope / node / path 哪条消费路径。
 * @remarks 当前 helper 只做 `ChannelDefinition` 类型约束并原样返回定义对象；保留稳定入口是为了与其它 registry API 对齐，并为后续运行时校验、默认值归一或泛型收敛预留 contract hook
 */
export const defineChannel = <T extends ChannelDefinition>(def: T): T => def;

/** 定义一个 Scope 通道（保留 resolve / deliver 的输出强类型） */
export const defineScopeChannel = <T extends ChannelValue>(
  def: Omit<ScopeChannelDefinition<T>, 'kind'> & { kind?: typeof ChannelDefinitionKind.Scope },
): ScopeChannelDefinition<T> => ({ ...def, kind: ChannelDefinitionKind.Scope });

/** 定义一个 Node 通道（对齐 defineScale / defineCoordinate / defineTransform；保留 resolve / deliver 的输出强类型） */
export const defineNodeChannel = <T extends ChannelValue>(
  def: Omit<NodeChannelDefinition<T>, 'kind'> & { kind?: typeof ChannelDefinitionKind.Node },
): NodeChannelDefinition<T> => ({ ...def, kind: ChannelDefinitionKind.Node });

/** 定义一个 Path 通道（对齐 defineNodeChannel；保留 resolve / deliver 的输出强类型） */
export const definePathChannel = <T extends ChannelValue>(
  def: Omit<PathChannelDefinition<T>, 'kind'> & { kind?: typeof ChannelDefinitionKind.Path },
): PathChannelDefinition<T> => ({ ...def, kind: ChannelDefinitionKind.Path });

/** registry / options 注入用的通用宽类型 */
export type AnyChannelDefinition =
  | PositionChannelDefinition
  | {
      channel: string;
      kind: typeof ChannelDefinitionKind.Mark;
      resolve: (
        ctx: ChannelDefinitionResolveContext,
      ) => (mark: IRPlotMarkOperation) => MarkChannelResolution<ChannelValue> | undefined;
    }
  | {
      channel: string;
      kind: typeof ChannelDefinitionKind.Node;
      output: ChannelOutputSpace;
      legend?: 'swatch' | 'ramp' | 'size' | 'symbol';
      resolve: (
        ctx: NodeChannelDefinitionResolveContext,
      ) => (mark: IRPlotMarkOperation) => ChannelResolution<ChannelValue> | undefined;
      deliver: (node: IRNode, value: never, context: NodeChannelDeliveryContext) => void;
    }
  | {
      channel: string;
      kind: typeof ChannelDefinitionKind.Scope;
      output: ChannelOutputSpace;
      legend?: 'swatch' | 'ramp' | 'size' | 'symbol';
      resolve: (
        ctx: ScopeChannelDefinitionResolveContext,
      ) => (mark: IRPlotMarkOperation) => ScopeChannelResolution<ChannelValue> | undefined;
      deliver: (scope: IRScope, value: never, context: ScopeChannelDeliveryContext) => void;
    }
  | {
      channel: string;
      kind: typeof ChannelDefinitionKind.Path;
      output: ChannelOutputSpace;
      legend?: 'swatch' | 'ramp' | 'size' | 'symbol';
      resolve: (
        ctx: PathChannelDefinitionResolveContext,
      ) => (mark: IRPlotMarkOperation) => ChannelResolution<ChannelValue> | undefined;
      deliver: (path: IRPath, value: never, context: PathChannelDeliveryContext) => void;
    };
