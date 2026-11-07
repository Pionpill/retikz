import type { DataFieldType, IRDataScalarValue } from '@retikz/data';
import type { ValueOf } from '@retikz/foundation';

import type { IRPlotScale, IRPlotScaleOperation } from '../schemas';
import { BUILTIN_SCALE_TYPES } from '../schemas';

/** 刻度值 + 标签集（axis 与同维 grid 复用同一份） */
export type TickSet = {
  /** 按显示顺序排列的刻度原始值 */
  values: Array<IRDataScalarValue>;
  /** 与 values 逐项对应的格式化标签 */
  labels: Array<string>;
};

/** position scale 的刻度值族，用于 guide 标签格式化 */
export type PositionTickKind = 'number' | 'time' | 'category';

/** position scale 的拓扑连续性 */
export const PositionScaleContinuity = {
  /** 相邻值之间存在可解释的中间位置 */
  Continuous: 'continuous',
  /** 只定义独立类别位置 */
  Discrete: 'discrete',
} as const;

/** position scale 拓扑连续性值 */
export type PositionScaleContinuity = ValueOf<typeof PositionScaleContinuity>;

/**
 * 归一化位置 scale：连续 / band / point 对 projector & guide 暴露同一形态
 * @description 把「band 起点 vs 中心」「bandwidth 是否为 0」「类别 vs 数值刻度」收进一层；
 *   下游（projector / guide / bar）只认 coordinate + bandwidth + ticks，不各自分支 scale 类型。
 *   连续 scale 使用 bandwidth=0 + coordinate=scale(value)，与 band / point scale 对齐到同一接口
 */
export type PositionScale = {
  /** 数据值 → 坐标（连续=scale(value)；band=band 中心；point=点位）；非法值返回 NaN，调用方据此跳过 */
  coordinate: (value: unknown) => number;
  /** 当前输入域；连续 scale 返回 [min, max]，分类 scale 返回类别序列 */
  domain: () => ReadonlyArray<IRDataScalarValue>;
  /** band 宽（连续 / point = 0；band = scale.bandwidth()）；getter 反映 setRange 后的最新值 */
  readonly bandwidth: number;
  /** 最终 range 下的离散刻度间距（band / point 为正 step；continuous 为 0） */
  readonly step: number;
  /** 刻度 + 标签（连续走 scaleTicks；band / point = 每类别一刻度，落 band 中心 / 点位） */
  ticks: (count?: number) => TickSet;
  /** guide 标签格式化用的刻度值族；自定义 scale 可省略并保留原 tick 标签 */
  tickKind?: PositionTickKind;
  /** 当前 range [start, end]（屏幕坐标，y 可能倒置） */
  range: () => [number, number];
  /** 设置 range（显式 range 的 scale 由 expand 决定是否调用） */
  setRange: (range: readonly [number, number]) => void;
};

/**
 * channel scale 解析上下文（公开运行时契约）
 * @description 自定义 channel scale 用它把 raw 原始值强转为可解析量，并解析命名配色：
 *   values 一律传 raw 原始值，由 definition 据 fieldType 自行强转
 */
export type ChannelScaleResolveContext = {
  /** 绑定字段类型（continuous / temporal / categorical / undefined）；definition 据此选强转方式 */
  fieldType?: DataFieldType;
  /** 原始值 → 有限数（非有限 → null）；复用内置数值强转 */
  toNumber: (value: unknown) => number | null;
  /** 原始值 → epoch ms（temporal 字段；非法 → null）；复用内置 coerceTimestamp */
  coerceTimestamp: (value: unknown) => number | null;
  /** scheme 名 → interpolator（先查内置、再查 options.colorSchemes；未注册 throw） */
  resolveColorScheme: (name: string) => (t: number) => string;
  /** Plot 级默认分类调色板（ordinal range 缺省取 defaultPlot.palette.categorical） */
  defaultColors?: ReadonlyArray<string>;
  /** 连续单向色阶默认 scheme；显式 scale.scheme / range 优先 */
  defaultSequentialScheme?: string;
  /** 发散色阶默认 scheme；显式 scale.scheme / range 优先 */
  defaultDivergingScheme?: string;
};

/**
 * channel scale 解析结果：实绘 evaluator + legend 同源数据（单一来源，杜绝 domain/range/scheme 重算漂移）
 * @description of 逐值取色；legendForm 决定 legend 形态；domain/range/edges 供 legend 与实绘共读
 */
export type ChannelScaleResolution = {
  /** 逐值视觉量：原始值 → 颜色串；非法 → undefined（调用方回退默认色） */
  of: (value: unknown) => string | undefined;
  /** legend 形态：ramp（连续色带）/ swatch（离散块）——替代「legend 按 scaleType 闭集判 form」 */
  legendForm: 'ramp' | 'swatch';
  /** ramp：数值 domain [lo, hi]；ordinal：类别序；discretized：未用（看 edges） */
  domain: ReadonlyArray<IRDataScalarValue>;
  /** 档色 / 端点色（legend 与实绘同源） */
  range: ReadonlyArray<string>;
  /** discretized（quantize / threshold / quantile）档间内部边界；ramp / ordinal 省略 */
  edges?: Array<number>;
  /** 本 scale 的 type 串（descriptor 放宽为 string，承自定义 type） */
  scaleType: string;
};

/** 判断内置映射声明以读取其精确配置 */
export const isBuiltinScaleOperation = (operation: IRPlotScaleOperation): operation is IRPlotScale =>
  BUILTIN_SCALE_TYPES.has(operation.type);
