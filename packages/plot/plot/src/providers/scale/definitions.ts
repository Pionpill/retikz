import { JsonObjectSchema } from '@retikz/core';
import { isFiniteNumber } from '@retikz/math';
import { inferCategoryDomain } from '../../data';
import {
  type BandScale,
  BandScaleSchema,
  type DivergingColorScale,
  DivergingColorScaleSchema,
  type LinearScale,
  LinearScaleSchema,
  type LogScale,
  LogScaleSchema,
  type OrdinalScale,
  OrdinalScaleSchema,
  PlotFieldType,
  type PlotFieldTypeValue,
  PlotMark,
  PlotScale,
  type PointScale,
  PointScaleSchema,
  type PowScale,
  PowScaleSchema,
  type QuantileColorScale,
  QuantileColorScaleSchema,
  type QuantizeColorScale,
  QuantizeColorScaleSchema,
  type ScaleOperation,
  type SequentialColorScale,
  SequentialColorScaleSchema,
  type SqrtScale,
  SqrtScaleSchema,
  type ThresholdColorScale,
  ThresholdColorScaleSchema,
  type TimeScale,
  TimeScaleSchema,
} from '../../schemas';
import { type AnyScaleDefinition, type ChannelResolveContext, type ChannelScaleResolution, defineScale, extractScaleType, isBuiltinScaleOperation } from '../../contract/scale';
import {
  type ColorScaleEvaluator,
  type PositionScale,
  bandPositionScale,
  continuousPositionScale,
  discretizedBins,
  linearPositionScale,
  pointPositionScale,
  resolveBandScale,
  resolveDivergingColorScale,
  resolveLinearScale,
  resolveLogScale,
  resolveOrdinalScale,
  resolvePointScale,
  resolvePowScale,
  resolveQuantileColorScale,
  resolveQuantizeColorScale,
  resolveSequentialColorScale,
  resolveSqrtScale,
  resolveThresholdColorScale,
  resolveTimeScale,
  timePositionScale,
} from './scale';

/** 建 channel 取值用的数值序列：temporal 字段过 toTimestamp，其余取有限数。 */
const numericValuesOf = (values: Array<unknown>, ctx: ChannelResolveContext): Array<number> => {
  const toNumber = ctx.fieldType === PlotFieldType.Temporal ? ctx.toTimestamp : ctx.toNumber;
  return values.map(toNumber).filter((value): value is number => value !== null);
};

const continuousColorOf = (ctx: ChannelResolveContext, evaluate: ColorScaleEvaluator): ((value: unknown) => string | undefined) => {
  const toNumber = ctx.fieldType === PlotFieldType.Temporal ? ctx.toTimestamp : ctx.toNumber;
  return value => {
    const numeric = toNumber(value);
    return numeric === null ? undefined : evaluate(numeric);
  };
};

const sequentialScaleDefinition = defineScale<SequentialColorScale>({
  family: 'channel',
  schema: SequentialColorScaleSchema,
  isFieldCompatible: fieldType => fieldType === PlotFieldType.Continuous || fieldType === PlotFieldType.Temporal,
  resolve: (def, values, ctx) => {
    const numeric = numericValuesOf(values, ctx);
    const evaluate = resolveSequentialColorScale(def, numeric, ctx.resolveColorScheme);
    const [lo, hi] = def.domain ?? (numeric.length === 0 ? [0, 1] : [Math.min(...numeric), Math.max(...numeric)]);
    return { of: continuousColorOf(ctx, evaluate), legendForm: 'ramp', domain: [lo, hi], range: [], scaleType: PlotScale.Sequential };
  },
});

const divergingScaleDefinition = defineScale<DivergingColorScale>({
  family: 'channel',
  schema: DivergingColorScaleSchema,
  // diverging 中点对时间无意义 → 仅接连续数值，拒 temporal（与旧 makeColorResolver temporal+diverging fail-loud 对齐）
  isFieldCompatible: fieldType => fieldType === PlotFieldType.Continuous,
  resolve: (def, values, ctx) => {
    const numeric = numericValuesOf(values, ctx);
    const evaluate = resolveDivergingColorScale(def, numeric, ctx.resolveColorScheme);
    const extent: [number, number] = numeric.length === 0 ? [0, 1] : [Math.min(...numeric), Math.max(...numeric)];
    const [lo, hi] = def.domain ? [def.domain[0], def.domain[def.domain.length - 1]] : extent;
    return { of: continuousColorOf(ctx, evaluate), legendForm: 'ramp', domain: [lo, hi], range: [], scaleType: PlotScale.Diverging };
  },
});

const discretizedResolution = (
  scaleType: string,
  def: QuantizeColorScale | ThresholdColorScale | QuantileColorScale,
  values: Array<unknown>,
  ctx: ChannelResolveContext,
  evaluate: ColorScaleEvaluator,
): ChannelScaleResolution => {
  const numeric = numericValuesOf(values, ctx);
  const { colors, edges } = discretizedBins(def, numeric, ctx.resolveColorScheme);
  return { of: continuousColorOf(ctx, evaluate), legendForm: 'swatch', domain: [], range: colors, edges, scaleType };
};

const quantizeScaleDefinition = defineScale<QuantizeColorScale>({
  family: 'channel',
  schema: QuantizeColorScaleSchema,
  isFieldCompatible: fieldType => fieldType === PlotFieldType.Continuous || fieldType === PlotFieldType.Temporal,
  resolve: (def, values, ctx) => discretizedResolution(PlotScale.Quantize, def, values, ctx, resolveQuantizeColorScale(def, numericValuesOf(values, ctx), ctx.resolveColorScheme)),
});

const thresholdScaleDefinition = defineScale<ThresholdColorScale>({
  family: 'channel',
  schema: ThresholdColorScaleSchema,
  isFieldCompatible: fieldType => fieldType === PlotFieldType.Continuous || fieldType === PlotFieldType.Temporal,
  resolve: (def, values, ctx) => discretizedResolution(PlotScale.Threshold, def, values, ctx, resolveThresholdColorScale(def, ctx.resolveColorScheme)),
});

const quantileScaleDefinition = defineScale<QuantileColorScale>({
  family: 'channel',
  schema: QuantileColorScaleSchema,
  isFieldCompatible: fieldType => fieldType === PlotFieldType.Continuous || fieldType === PlotFieldType.Temporal,
  resolve: (def, values, ctx) => discretizedResolution(PlotScale.Quantile, def, values, ctx, resolveQuantileColorScale(def, numericValuesOf(values, ctx), ctx.resolveColorScheme)),
});

const ordinalScaleDefinition = defineScale<OrdinalScale>({
  family: 'channel',
  schema: OrdinalScaleSchema,
  // ordinal 接分类与未知（旧 makeColorResolver 把 undefined 字段类型当分类走 ordinal）
  isFieldCompatible: fieldType => fieldType === undefined || fieldType === PlotFieldType.Categorical,
  resolve: (def, values, ctx) => {
    // range 缺省取 plot 默认调色板（与旧 withPlotColorRange 一致）；domain 缺省按数据序去重
    const withPalette: OrdinalScale = def.range !== undefined ? def : ctx.defaultColors !== undefined ? { ...def, range: [...ctx.defaultColors] } : def;
    const ordinal = resolveOrdinalScale(withPalette, values);
    const domain = withPalette.domain ?? inferCategoryDomain(values);
    return {
      of: value => (typeof value === 'string' || typeof value === 'number' ? ordinal(value) : undefined),
      legendForm: 'swatch',
      domain,
      range: domain.map(category => ordinal(category)),
      scaleType: PlotScale.Ordinal,
    };
  },
});

const linearScaleDefinition = defineScale<LinearScale>({
  family: 'position',
  schema: LinearScaleSchema,
  isFieldCompatible: fieldType => fieldType !== PlotFieldType.Categorical,
  allowsBaseline: true,
  resolve: (def, values, range) => linearPositionScale(resolveLinearScale(def, values.filter(isFiniteNumber), range)),
});

const bandScaleDefinition = defineScale<BandScale>({
  family: 'position',
  schema: BandScaleSchema,
  isFieldCompatible: fieldType => fieldType !== PlotFieldType.Temporal,
  allowsBaseline: true,
  resolve: (def, values, range) => bandPositionScale(resolveBandScale(def, values, range)),
});

const pointScaleDefinition = defineScale<PointScale>({
  family: 'position',
  schema: PointScaleSchema,
  isFieldCompatible: fieldType => fieldType !== PlotFieldType.Temporal,
  allowsBaseline: true,
  resolve: (def, values, range) => pointPositionScale(resolvePointScale(def, values, range)),
});

const timeScaleDefinition = defineScale<TimeScale>({
  family: 'position',
  schema: TimeScaleSchema,
  isFieldCompatible: fieldType => fieldType !== PlotFieldType.Categorical,
  allowsBaseline: true,
  resolve: (def, values, range) => timePositionScale(resolveTimeScale(def, values, range)),
});

const logScaleDefinition = defineScale<LogScale>({
  family: 'position',
  schema: LogScaleSchema,
  isFieldCompatible: fieldType => fieldType !== PlotFieldType.Categorical,
  allowsBaseline: false,
  resolve: (def, values, range) => continuousPositionScale(resolveLogScale(def, values.filter(isFiniteNumber), range), value => isFiniteNumber(value) && value > 0),
});

const sqrtScaleDefinition = defineScale<SqrtScale>({
  family: 'position',
  schema: SqrtScaleSchema,
  isFieldCompatible: fieldType => fieldType !== PlotFieldType.Categorical,
  allowsBaseline: false,
  resolve: (def, values, range) => continuousPositionScale(resolveSqrtScale(def, values.filter(isFiniteNumber), range), value => isFiniteNumber(value) && value >= 0),
});

const powScaleDefinition = defineScale<PowScale>({
  family: 'position',
  schema: PowScaleSchema,
  isFieldCompatible: fieldType => fieldType !== PlotFieldType.Categorical,
  allowsBaseline: false,
  resolve: (def, values, range) => {
    const integerExponent = Number.isInteger(def.exponent ?? 2);
    const isValidInput = integerExponent ? isFiniteNumber : (value: unknown): boolean => isFiniteNumber(value) && value >= 0;
    return continuousPositionScale(resolvePowScale(def, values.filter(isFiniteNumber), range), isValidInput);
  },
});

/** 内置 scale definition 列表（7 position + 6 channel = 13）；与自定义 scale 共享同一 registry 分派流程。 */
export const BUILTIN_SCALES: ReadonlyArray<AnyScaleDefinition> = [
  linearScaleDefinition,
  bandScaleDefinition,
  pointScaleDefinition,
  timeScaleDefinition,
  logScaleDefinition,
  powScaleDefinition,
  sqrtScaleDefinition,
  ordinalScaleDefinition,
  sequentialScaleDefinition,
  divergingScaleDefinition,
  quantizeScaleDefinition,
  thresholdScaleDefinition,
  quantileScaleDefinition,
] as ReadonlyArray<AnyScaleDefinition>;

/**
 * 解析 scale registry。
 * @description 内置 scale 总是先注册；用户自定义 definition 不能覆盖内置 type，也不能彼此重复。
 */
export const resolveScaleRegistry = (custom?: ReadonlyArray<AnyScaleDefinition>): Map<string, AnyScaleDefinition> => {
  const registry = new Map<string, AnyScaleDefinition>();
  for (const def of BUILTIN_SCALES) {
    registry.set(extractScaleType(def.schema), def);
  }
  for (const def of custom ?? []) {
    const type = extractScaleType(def.schema);
    if (registry.has(type)) {
      throw new Error(`lowerPlots: duplicate scale registration: "${type}"`);
    }
    registry.set(type, def);
  }
  return registry;
};

const scaleDefinitionOf = (operation: ScaleOperation, registry: ReadonlyMap<string, AnyScaleDefinition>): AnyScaleDefinition => {
  const def = registry.get(operation.type);
  if (def === undefined) {
    throw new Error(`lowerPlots: scale type "${operation.type}" is not registered; pass a ScaleDefinition via options.scaleDefinitions`);
  }
  return def;
};

/**
 * 解析并校验单个 scale operation；返回可安全喂给 definition 的宽类型。
 * @description 内置 op 已是精确 Scale 形态（PlotSpecSchema 静态校验 + resolve* 运行时深校验，如 finite domain / 升序断点），
 *   直接透传以保留信息化错误；自定义 op 才用 definition.schema 深解析 + JSON 可序列化双校验。
 */
const parseScaleOperation = (def: AnyScaleDefinition, operation: ScaleOperation): never => {
  if (isBuiltinScaleOperation(operation)) return operation as never;
  JsonObjectSchema.parse(operation);
  const parsed = def.schema.parse(operation) as never;
  JsonObjectSchema.parse(parsed);
  return parsed;
};

/**
 * 据 scale operation 建对应 PositionScale（registry 分派，family='position'）。
 * @description channel scale 作位置通道 → fail-loud（color scale 只绑 color 通道）。
 */
export const resolvePositionScale = (
  operation: ScaleOperation,
  values: Array<unknown>,
  fallbackRange: readonly [number, number],
  registry: ReadonlyMap<string, AnyScaleDefinition>,
): PositionScale => {
  const def = scaleDefinitionOf(operation, registry);
  if (def.family !== 'position') {
    throw new Error(`resolvePositionScale: ${operation.type} scale "${operation.name}" cannot drive a positional (x/y) channel; color scales bind the color channel only`);
  }
  return def.resolve(parseScaleOperation(def, operation), values, fallbackRange);
};

/**
 * 据 scale operation 建 channel 解析（registry 分派，family='channel'）。
 * @description position scale 作 color 通道 → fail-loud。fieldType 不兼容 → fail-loud（连续字段须连续 / 离散化色阶，分类字段须 ordinal）。
 */
export const resolveChannelScale = (
  operation: ScaleOperation,
  values: Array<unknown>,
  ctx: ChannelResolveContext,
  registry: ReadonlyMap<string, AnyScaleDefinition>,
  options: { checkFieldCompatible?: boolean } = {},
): ChannelScaleResolution => {
  const def = scaleDefinitionOf(operation, registry);
  if (def.family !== 'channel') {
    throw new Error(`lowerPlots: scale "${operation.name}" of type "${operation.type}" is not a color scale (color channels bind ordinal / sequential / diverging / quantize / threshold / quantile)`);
  }
  // 字段绑定（mark 取色）强制 fieldType 兼容；legend 只渲 scale 外观、不绑字段，跳过该校验。
  if (options.checkFieldCompatible !== false && !def.isFieldCompatible(ctx.fieldType)) {
    throw new Error(`lowerPlots: color scale "${operation.name}" (${operation.type}) is incompatible with a ${ctx.fieldType ?? 'untyped'} field`);
  }
  return def.resolve(parseScaleOperation(def, operation), values, ctx);
};

/**
 * 类型 ↔ scale 兼容校验（fail-loud，不强转）：position 族经 registry 的 isFieldCompatible 谓词判定。
 * @description 仅对 position 族 scale 生效；channel scale 作位置通道由 resolvePositionScale fail-loud。
 */
export const assertScaleFieldCompatible = (
  role: string,
  scaleType: string,
  fieldType: PlotFieldTypeValue,
  scaleName: string,
  registry: ReadonlyMap<string, AnyScaleDefinition>,
): void => {
  const def = registry.get(scaleType);
  if (def === undefined || def.family !== 'position') return;
  if (!def.isFieldCompatible(fieldType)) {
    throw new Error(`lowerPlots: coordinate.${role} scale "${scaleName}" (${scaleType}) is incompatible with ${fieldType} field`);
  }
};

/**
 * 值轴 baseline 兼容校验（fail-loud）：position 族 allowsBaseline=false 的 scale 不能作 interval / area 值轴。
 * @description 柱 / 面积 baseline 含 0，与 log/pow/sqrt 结构冲突（log(0)=-∞）；仅查值轴（cartesian=y、polar=radius）。
 */
export const assertBaselineScaleCompatible = (
  valueScaleType: string,
  marks: ReadonlyArray<{ type: string }>,
  registry: ReadonlyMap<string, AnyScaleDefinition>,
): void => {
  const def = registry.get(valueScaleType);
  if (def === undefined || def.family !== 'position' || def.allowsBaseline !== false) return;
  if (marks.some(mark => mark.type === PlotMark.Interval || mark.type === PlotMark.Region)) {
    throw new Error(
      `nonlinear continuous scale (${valueScaleType}) cannot be used with interval/area because their baseline includes 0; use point/line or wait for explicit positive baseline support`,
    );
  }
};
