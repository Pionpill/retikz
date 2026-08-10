import type { DataFieldTypeValue, IRDataScalarValue } from '@retikz/data';

import { z } from 'zod';

import type { IRPlotScale, IRPlotScaleOperation } from '../schemas';

import { BUILTIN_SCALE_TYPES } from '../schemas';

/** 刻度值 + 标签集（axis 与同维 grid 复用同一份） */
export type TickSet = { values: Array<IRDataScalarValue>; labels: Array<string> };

/** position scale 的刻度值族，用于 guide 标签格式化 */
export type PositionTickKind = 'number' | 'time' | 'category';

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
 * channel scale 解析上下文（公开运行时契约）。
 * @description 自定义 channel scale 用它把 raw 原始值强转为可解析量，并解析命名配色：
 *   values 一律传 raw 原始值，由 definition 据 fieldType 自行强转
 */
export type ChannelResolveContext = {
  /** 绑定字段类型（continuous / temporal / categorical / undefined）；definition 据此选强转方式 */
  fieldType?: DataFieldTypeValue;
  /** 原始值 → 有限数（非有限 → null）；复用内置数值强转 */
  toNumber: (value: unknown) => number | null;
  /** 原始值 → epoch ms（temporal 字段；非法 → null）；复用内置 coerceTimestamp */
  coerceTimestamp: (value: unknown) => number | null;
  /** scheme 名 → interpolator（先查内置、再查 options.colorSchemes；未注册 throw） */
  resolveColorScheme: (name: string) => (t: number) => string;
  /** Plot 级默认分类调色板（ordinal range 缺省取 plotTheme.palette.categorical） */
  defaultColors?: ReadonlyArray<string>;
  /** 连续单向色阶默认 scheme；显式 scale.scheme / range 优先 */
  defaultSequentialScheme?: string;
  /** 发散色阶默认 scheme；显式 scale.scheme / range 优先 */
  defaultDivergingScheme?: string;
};

/**
 * channel scale 解析结果：实绘 evaluator + legend 同源数据（单一来源，杜绝 domain/range/scheme 重算漂移）。
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

/** position 族：value → 坐标，喂 coordinate 投影 + guide 刻度（经 PositionScale 接口） */
export type PositionScaleDefinition<TScaleOperation extends IRPlotScaleOperation = IRPlotScaleOperation> = {
  /** 族判别：position scale 产坐标数值 */
  family: 'position';
  /** 完整 scale operation schema；必须含非空 z.literal('type') 供 registry 提取注册键 */
  schema: z.ZodType<TScaleOperation>;
  /** 字段兼容谓词（连续 scale 仅拒 categorical、band/point 仅拒 temporal）；undefined 字段类型放行 */
  isFieldCompatible: (fieldType: DataFieldTypeValue | undefined) => boolean;
  /** 能否作 interval / area 值轴（baseline 含 0）；默认 true，log/pow/sqrt → false */
  allowsBaseline?: boolean;
  /** 建 PositionScale（coordinate / bandwidth / ticks / range / setRange 全实现）；guide 经 ticks() 自动适配 */
  resolve: (def: TScaleOperation, values: Array<unknown>, fallbackRange: readonly [number, number]) => PositionScale;
};

/** channel 族：value → 视觉量（颜色），喂 color 通道 + legend；resolve 单次产 evaluator + legend 同源数据 */
export type ChannelScaleDefinition<TScaleOperation extends IRPlotScaleOperation = IRPlotScaleOperation> = {
  /** 族判别：channel scale 产视觉量（颜色） */
  family: 'channel';
  /** 完整 scale operation schema；必须含非空 z.literal('type') 供 registry 提取注册键 */
  schema: z.ZodType<TScaleOperation>;
  /** 字段兼容谓词（sequential 接 continuous + temporal、ordinal 接 categorical / 未知） */
  isFieldCompatible: (fieldType: DataFieldTypeValue | undefined) => boolean;
  /** 单次建 ChannelScaleResolution：实绘 evaluator + legend 同源数据（不拆 resolve / legend 两函数，守实绘 / legend 同源） */
  resolve: (def: TScaleOperation, values: Array<unknown>, ctx: ChannelResolveContext) => ChannelScaleResolution;
};

/**
 * scale runtime definition。
 * @description definition 是运行时对象，不进入 JSON IR；IR 只保存 `{ type, name, ...config }` 形态的 scale operation。
 *   family 判别 position（坐标）vs channel（颜色），两族产出契约不同
 */
export type ScaleDefinition<TScaleOperation extends IRPlotScaleOperation = IRPlotScaleOperation> =
  | PositionScaleDefinition<TScaleOperation>
  | ChannelScaleDefinition<TScaleOperation>;

/**
 * 定义一个 scale definition，保留 resolve 对 scale operation 的强类型（对齐 core defineComposite / defineTransform / defineCoordinate）。
 * @description 内置 15 个与自定义 scale 都经同一 registry 入口分派；family 决定 position / channel 解析通路。
 * @remarks 当前 helper 只做 `ScaleDefinition` 类型约束并原样返回定义对象；保留稳定入口是为了与其它 registry API 对齐，并为后续运行时校验、默认值归一或泛型收敛预留 contract hook
 */
export const defineScale = <TScaleOperation extends IRPlotScaleOperation>(
  def: ScaleDefinition<TScaleOperation>,
): ScaleDefinition<TScaleOperation> => def;

/**
 * registry 内部使用的宽类型。
 * @description registry 存放不同 scale operation 泛型的 definition；真正调用前必须用对应 schema parse 收窄（resolve 入参用 never 防误调）
 */
export type AnyScaleDefinition =
  | {
      family: 'position';
      schema: z.ZodType;
      isFieldCompatible: (fieldType: DataFieldTypeValue | undefined) => boolean;
      allowsBaseline?: boolean;
      resolve: (def: never, values: Array<unknown>, fallbackRange: readonly [number, number]) => PositionScale;
    }
  | {
      family: 'channel';
      schema: z.ZodType;
      isFieldCompatible: (fieldType: DataFieldTypeValue | undefined) => boolean;
      resolve: (def: never, values: Array<unknown>, ctx: ChannelResolveContext) => ChannelScaleResolution;
    };

/**
 * 从 scale definition schema 中提取 registry key。
 * @description definition schema 必须是含 `type: z.literal('<scale-type>')` 的 ZodObject；该 literal 值就是 registry 唯一键
 */
export const extractScaleType = (schema: z.ZodType): string => {
  if (!(schema instanceof z.ZodObject)) {
    throw new Error('lowerPlots: scale registration schema must be a ZodObject with a literal type field');
  }
  const typeSchema = schema.shape.type;
  if (!(typeSchema instanceof z.ZodLiteral) || typeof typeSchema.value !== 'string' || typeSchema.value.length === 0) {
    throw new Error('lowerPlots: scale registration schema must declare type as a non-empty z.literal string');
  }
  return typeSchema.value;
};

/** scale operation 是否内置（type 在内置集）；用于把 registry 取出的 operation 收窄回精确 Scale */
export const isBuiltinScaleOperation = (operation: IRPlotScaleOperation): operation is IRPlotScale =>
  BUILTIN_SCALE_TYPES.has(operation.type);
