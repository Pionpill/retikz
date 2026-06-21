import type { IRNode } from '@retikz/core';
import type { Channel, ExternalRow, LegendChannelValue, Mark, PlotFieldTypeValue, PlotSpec, ScalarValue } from '../schemas';

/**
 * 通道解析器（行 → 求值结果）的运行时契约。
 * @description 由 scale 解析阶段构造、交给 mark lowering 消费；函数本身不进 IR。
 */
export type VisualChannelValue = string | number;

export type ChannelValueResolver<T extends VisualChannelValue = VisualChannelValue> = (row: ExternalRow) => T | undefined;

/** 通道交付上下文：definition 可据 mark / row / point 形态决定是否落值。 */
export type ChannelDeliveryContext = {
  /** 正在下沉的 mark。 */
  mark: Mark;
  /** 当前数据行。 */
  row: ExternalRow;
  /** point mark 的具体 node 形态；文本点和 glyph 点的可写样式不同。 */
  nodeKind: 'pointGlyph' | 'pointText';
};

/** 单个视觉通道的逐行交付项：从 row 取值，再把值落到 core IRNode。 */
export type ChannelDelivery = {
  /** 通道名（诊断 / 调试用；不参与 IR）。 */
  channel: string;
  /** 逐行视觉量；undefined = 该行不应用、node 用默认。 */
  of: ChannelValueResolver;
  /** 把解析值落到 core IRNode 的既有属性。 */
  deliver: (node: IRNode, value: VisualChannelValue, context: ChannelDeliveryContext) => void;
};

/**
 * 一个 mark 下沉时消费的通道集合。
 * @description `values` 存放按名字索引的求值器（如 color / label 这种 mark 需要特殊消费的通道）；
 *   `defaults` 存放同名默认值；`deliveries` 存放所有会直接落到 IRNode 的视觉通道交付项。
 */
export type MarkChannels = {
  values?: Readonly<Record<string, ChannelValueResolver>>;
  defaults?: Readonly<Record<string, ScalarValue>>;
  deliveries?: ReadonlyArray<ChannelDelivery>;
};

/** addChannel 接受的通道形态：普通 channel 或 MarkValueType 的字段 / 常量引用。 */
export type FieldChannel = Channel | { kind: 'field' | 'constant'; value: unknown };

/** 字段收集器：把 mark / transform 声明中引用外部数据源的字段加入集合。 */
export type FieldCollector = {
  /** 加入一个字段名；undefined 表示该位置没有字段引用。 */
  addField: (field?: string) => void;
  /** 一次加入多个字段名；undefined 会被跳过。 */
  addFields: (...fields: Array<string | undefined>) => void;
  /** 加入普通 channel 或 MarkValueType 的字段引用；常量值不引用数据源。 */
  addChannel: (channel?: FieldChannel) => void;
};

/**
 * 通道 scale 描述符：legend 据此画 swatch / ramp / 分箱 / 梯度符号
 * @description lowering 内部类型、**不进 IR**（domain/range 是裸值数组，绝不含函数 / d3 对象）。
 *   resolver 与 legend 共读同一 descriptor，保证图例与实绘同源。
 */
export type ScaleDescriptor = {
  /** 描述的非位置通道（color / size / opacity / shape） */
  channel: LegendChannelValue;
  /** 绑定 scale 的 type 串（放宽接纳自定义 type；legend 形态改由 channel definition 的 legend 决定，不再据此闭集判） */
  scaleType: string;
  /** 域：连续 = [min, max]、分类 = 类别序、离散化 = 边界 / 类别 */
  domain: ReadonlyArray<ScalarValue>;
  /** 值域：色串 / 半径 / 不透明度 / shape 名（与 domain 同序或连续端点） */
  range: ReadonlyArray<ScalarValue>;
  /** 绑定字段名（legend 标题缺省 + 标签 formatter 选型用）；常量通道无字段 */
  field?: string;
  /** 绑定字段类型（标签 formatter 选型：数字 / 时间 / 分类）；常量 / 类型未知时省略 */
  fieldType?: PlotFieldTypeValue;
};

/** 单视觉通道解析结果：逐行视觉量函数 + 供 legend 的可复用 descriptor（字段编码才有 descriptor；常量编码无） */
export type ChannelResolution<T> = {
  /** 逐行视觉量函数（mark 实绘用） */
  of: (row: ExternalRow) => T | undefined;
  /** scale descriptor（字段编码 + 经 scale 才产；常量 value 编码 → undefined，不入 legend） */
  descriptor?: ScaleDescriptor;
};

/**
 * 视觉通道的输出空间（判别 union——`outputKind` 判别 range / palette，杜绝 number 通道配 symbol 调色板这类非法组合）。
 * @description color 输出颜色串、范围来自所选色阶；number 输出数值（半径 / alpha / 宽度）；symbol 输出 glyph 名串。
 */
export type ChannelOutputSpace =
  | { outputKind: 'color' }
  | { outputKind: 'number'; range: readonly [number, number]; clamp?: boolean }
  | { outputKind: 'symbol'; palette: ReadonlyArray<string> };

/** 视觉通道解析上下文：spec + 规整后的数据行 + 字段类型表（resolve 据此建逐 mark 解析器）。 */
export type VisualChannelContext = {
  node: PlotSpec;
  rows: Array<ExternalRow>;
  fieldTypes: Map<string, PlotFieldTypeValue>;
};

/**
 * 视觉通道定义（运行时对象，不进 IR）。
 * @description 与 ScaleDefinition 同范式：scale 管 domain→归一化数学（通道无关），visual channel 管输出空间 + 默认范围 + legend 形态，
 *   挑一个 scale（连续 builder / ordinal）解析后投到本通道输出空间。内置与自定义通道都经同一 registry 解析和交付。
 *   注意与 contract/scale.ts 的 `ChannelScaleDefinition`（scale 的 channel family）区分：那是「产视觉量的 scale」，这是「视觉通道本身」。
 */
export type VisualChannelDefinition<T extends VisualChannelValue = VisualChannelValue> = {
  /** 通道注册键。 */
  channel: string;
  /** 输出空间 + 默认范围 / 调色板（判别 union） */
  output: ChannelOutputSpace;
  /** legend 形态（size→梯度气泡 / opacity→ramp / shape→symbol）；无 legend 的通道（如 strokeWidth）省略 */
  legend?: 'swatch' | 'ramp' | 'size' | 'symbol';
  /** 建逐 mark 解析器（行→视觉量 + 可选 legend descriptor）；内部委托 scale registry / 连续 builder / ordinal */
  resolve: (ctx: VisualChannelContext) => (mark: Mark) => ChannelResolution<T> | undefined;
  /**
   * 把逐行解析值落到 core IRNode 的既有样式属性。
   * @description 只允许写 core IRNode 既有样式属性（opacity / rotate / fill / stroke / …），不写 position / 几何；新渲染能力下沉补 core。
   */
  deliver: (node: IRNode, value: T, context: ChannelDeliveryContext) => void;
};

/** 定义一个视觉通道（对齐 defineScale / defineCoordinate / defineTransform；保留 resolve / deliver 的输出强类型）。 */
export const defineVisualChannel = <T extends VisualChannelValue>(def: VisualChannelDefinition<T>): VisualChannelDefinition<T> => def;

/**
 * registry / options 注入用的宽类型（擦除输出泛型，承异构 T 的 VisualChannelDefinition）。
 * @description 与 AnyScaleDefinition 同范式：resolve 产 `ChannelResolution<ScalarValue>`、deliver 入参 `never`，
 *   消费方在交付边界 `as never` 还原。`defineVisualChannel<number>(...)` 等具体定义因协变 / 逆变可赋给本类型。
 */
export type AnyVisualChannelDefinition = {
  channel: string;
  output: ChannelOutputSpace;
  legend?: 'swatch' | 'ramp' | 'size' | 'symbol';
  resolve: (ctx: VisualChannelContext) => (mark: Mark) => ChannelResolution<VisualChannelValue> | undefined;
  deliver: (node: IRNode, value: never, context: ChannelDeliveryContext) => void;
};
