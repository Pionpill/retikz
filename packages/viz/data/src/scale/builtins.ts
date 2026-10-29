import { isFiniteNumber } from '@retikz/math';
import {
  scaleBand as d3ScaleBand,
  scaleLinear as d3ScaleLinear,
  scaleLog as d3ScaleLog,
  scaleOrdinal as d3ScaleOrdinal,
  scalePoint as d3ScalePoint,
  scalePow as d3ScalePow,
  scaleQuantile as d3ScaleQuantile,
  scaleQuantize as d3ScaleQuantize,
  scaleRadial as d3ScaleRadial,
  scaleSymlog as d3ScaleSymlog,
  scaleThreshold as d3ScaleThreshold,
  scaleUtc as d3ScaleUtc,
} from 'd3-scale';
import type { ScaleContinuousNumeric as D3ScaleContinuousNumeric } from 'd3-scale';
import { array, boolean, enum as zodEnum, number, strictObject, string } from 'zod';

import { RetikzDataError } from '../error';
import { coerceTimestamp, DataFieldType } from '../model';
import type { IRDataScalarValue } from '../model';
import { BuiltinDataScale } from './constants';
import { defineScale } from './contract';
import type { ScaleDefinition, ScaleResolution, ScaleResolveContext, ScaleValue } from './contract';

/** 连续映射共享的实例参数 */
const continuousParamsSchema = strictObject({
  nice: boolean().default(false),
  clamp: boolean().default(false),
});

const linearParamsSchema = continuousParamsSchema.extend({
  interpolation: zodEnum(['number', 'color']).default('number'),
});
const logParamsSchema = continuousParamsSchema.extend({ base: number().gt(1).default(10) });
const powParamsSchema = continuousParamsSchema.extend({ exponent: number().default(2) });
const symlogParamsSchema = continuousParamsSchema.extend({ constant: number().positive().default(1) });
const ordinalParamsSchema = strictObject({
  unknown: zodEnum(['missing', 'extend']).default('missing'),
  step: number().int().positive().default(1),
  offset: number().int().nonnegative().default(0),
});
const bandParamsSchema = strictObject({
  paddingInner: number().min(0).max(1).default(0),
  paddingOuter: number().min(0).max(1).default(0),
  align: number().min(0).max(1).default(0.5),
});
const pointParamsSchema = strictObject({
  padding: number().min(0).max(1).default(0),
  align: number().min(0).max(1).default(0.5),
});
const binsParamsSchema = strictObject({ count: number().int().positive().optional() });
const thresholdParamsSchema = strictObject({ breakpoints: array(number()) });
const gradientParamsSchema = strictObject({ scheme: string().optional() });

/** 从有限观测推断 extent，空数据保持数学默认域 */
const numericDomain = (
  context: ScaleResolveContext,
  valid: (value: number) => boolean = () => true,
): [number, number] => {
  if (context.domain !== undefined) {
    const [start, end] = context.domain;
    if (!isFiniteNumber(start) || !isFiniteNumber(end))
      throw new RetikzDataError(
        `continuous scale requires a finite numeric domain (got [${context.domain.join(', ')}])`,
      );
    return [start, end];
  }
  let minimum = Infinity;
  let maximum = -Infinity;
  for (const value of context.values) {
    if (isFiniteNumber(value) && valid(value)) {
      minimum = Math.min(minimum, value);
      maximum = Math.max(maximum, value);
    }
  }
  return minimum === Infinity ? [0, 1] : [minimum, maximum];
};

/** 读取显式或宿主缺省范围，不引入视觉默认值 */
const outputRange = (context: ScaleResolveContext): Array<ScaleValue> => {
  const range = context.range ?? context.defaultRange;
  if (range === undefined || range.length === 0) throw new RetikzDataError('scale requires an output range');
  return [...range];
};

/** 连续数值映射使用两端数值范围 */
const numericRange = (context: ScaleResolveContext): [number, number] => {
  const range = context.range ?? context.defaultRange ?? [0, 1];
  if (range.length !== 2 || !isFiniteNumber(range[0]) || !isFiniteNumber(range[1]))
    throw new RetikzDataError('scale requires two finite numeric range endpoints');
  return [range[0], range[1]];
};

/** 连续 D3 映射的数学结果，重建始终使用独立副本 */
const continuousResolution = (
  scale: D3ScaleContinuousNumeric<number, number>,
  options: { valid?: (value: number) => boolean } = {},
): ScaleResolution => {
  const valid = options.valid ?? (() => true);
  const domain = scale.domain();
  const resolvedRange = scale.range();
  const map = (value: IRDataScalarValue): number | undefined => {
    if (!isFiniteNumber(value) || !valid(value)) return undefined;
    const mapped = scale(value);
    return Number.isFinite(mapped) ? mapped : undefined;
  };
  return {
    map,
    domain,
    range: resolvedRange,
    ticks: (count = 5) => scale.ticks(count),
    invert: value => {
      const input = scale.invert(value);
      return Number.isFinite(input) && valid(input) ? input : undefined;
    },
    rebuild: changes => {
      const copy = scale.copy();
      if (changes.domain !== undefined) {
        if (changes.domain.some(value => !isFiniteNumber(value) || !valid(value)))
          throw new RetikzDataError('rebuilt domain must satisfy the scale input constraints');
        copy.domain([...changes.domain]);
      }
      if (changes.range !== undefined) copy.range([...changes.range]);
      if (changes.clamp !== undefined) copy.clamp(changes.clamp);
      return continuousResolution(copy, options);
    },
  };
};

const continuousField = (fieldType: DataFieldType | undefined): boolean => fieldType !== DataFieldType.Categorical;
const categoryField = (fieldType: DataFieldType | undefined): boolean => fieldType !== DataFieldType.Temporal;

const linearDefinition = defineScale({
  type: BuiltinDataScale.Linear,
  paramsSchema: linearParamsSchema,
  isFieldCompatible: continuousField,
  resolve: (context, params) => {
    const domain = numericDomain(context);
    if (params.interpolation === 'color') {
      const range = outputRange(context);
      if (range.length !== 2 || typeof range[0] !== 'string' || typeof range[1] !== 'string')
        throw new RetikzDataError('color interpolation requires two string endpoints');
      const scale = d3ScaleLinear<string>()
        .domain(domain)
        .range([range[0], range[1]])
        .clamp(params.clamp ?? false);
      if (params.nice) scale.nice();
      const finalDomain = scale.domain();
      const map = (value: IRDataScalarValue): string | undefined => (isFiniteNumber(value) ? scale(value) : undefined);
      return {
        map,
        domain: finalDomain,
        range,
      };
    }
    const scale = d3ScaleLinear()
      .domain(domain)
      .range(numericRange(context))
      .clamp(params.clamp ?? false);
    if (params.nice) scale.nice();
    return continuousResolution(scale);
  },
});

const logDefinition = defineScale({
  type: BuiltinDataScale.Log,
  paramsSchema: logParamsSchema,
  isFieldCompatible: continuousField,
  resolve: (context, params) => {
    let domain = numericDomain(context, value => value > 0);
    if (context.domain === undefined && !context.values.some(value => isFiniteNumber(value) && value > 0))
      domain = [1, 10];
    if (domain.some(value => value <= 0)) throw new RetikzDataError('log domain must be strictly positive');
    const scale = d3ScaleLog()
      .base(params.base ?? logParamsSchema.shape.base.parse(undefined))
      .domain(domain)
      .range(numericRange(context))
      .clamp(params.clamp ?? false);
    if (params.nice) scale.nice();
    return continuousResolution(scale, { valid: value => value > 0 });
  },
});

const powDefinition = defineScale({
  type: BuiltinDataScale.Pow,
  paramsSchema: powParamsSchema,
  isFieldCompatible: continuousField,
  resolve: (context, params) => {
    const exponent = params.exponent ?? powParamsSchema.shape.exponent.parse(undefined);
    const domain = numericDomain(context);
    if (!Number.isInteger(exponent) && domain.some(value => value < 0))
      throw new RetikzDataError('non-integer power requires a non-negative domain');
    const scale = d3ScalePow()
      .exponent(exponent)
      .domain(domain)
      .range(numericRange(context))
      .clamp(params.clamp ?? false);
    if (params.nice) scale.nice();
    return continuousResolution(scale, {
      valid: value => Number.isInteger(exponent) || value >= 0,
    });
  },
});

const sqrtDefinition = defineScale({
  type: BuiltinDataScale.Sqrt,
  paramsSchema: continuousParamsSchema,
  isFieldCompatible: continuousField,
  resolve: (context, params) => {
    const domain = numericDomain(context, value => value >= 0);
    if (domain.some(value => value < 0)) throw new RetikzDataError('sqrt domain must be non-negative');
    const scale = d3ScalePow()
      .exponent(0.5)
      .domain(domain)
      .range(numericRange(context))
      .clamp(params.clamp ?? false);
    if (params.nice) scale.nice();
    return continuousResolution(scale, { valid: value => value >= 0 });
  },
});

const symlogDefinition = defineScale({
  type: BuiltinDataScale.Symlog,
  paramsSchema: symlogParamsSchema,
  isFieldCompatible: continuousField,
  resolve: (context, params) => {
    const scale = d3ScaleSymlog()
      .constant(params.constant ?? symlogParamsSchema.shape.constant.parse(undefined))
      .domain(numericDomain(context))
      .range(numericRange(context))
      .clamp(params.clamp ?? false);
    if (params.nice) scale.nice();
    return continuousResolution(scale);
  },
});

const radialDefinition = defineScale({
  type: BuiltinDataScale.Radial,
  paramsSchema: continuousParamsSchema,
  isFieldCompatible: continuousField,
  resolve: (context, params) => {
    const scale = d3ScaleRadial()
      .domain(numericDomain(context, value => value >= 0))
      .range(numericRange(context))
      .clamp(params.clamp ?? false);
    if (params.nice) scale.nice();
    return continuousResolution(scale);
  },
});

const timeDefinition = defineScale({
  type: BuiltinDataScale.Time,
  paramsSchema: continuousParamsSchema,
  isFieldCompatible: continuousField,
  resolve: (context, params) => {
    const values: Array<number> = [];
    for (const value of context.values) {
      const stamp = coerceTimestamp(value);
      if (stamp !== null) values.push(stamp);
    }
    const domain = numericDomain({ ...context, values });
    const scale = d3ScaleUtc()
      .domain(domain)
      .range(numericRange(context))
      .clamp(params.clamp ?? false);
    if (params.nice) scale.nice();
    const createResolution = (current: typeof scale, finalDomain = current.domain().map(Number)): ScaleResolution => {
      const numeric = d3ScaleLinear().domain(finalDomain).range(current.range()).clamp(current.clamp());
      return {
        map: value => {
          const stamp = coerceTimestamp(value);
          return stamp === null ? undefined : numeric(stamp);
        },
        domain: finalDomain,
        range: current.range(),
        ticks: (count = 5) => current.ticks(count).map(Number),
        invert: value => numeric.invert(value),
        rebuild: changes => {
          const copy = current.copy();
          if (changes.domain !== undefined) copy.domain([...changes.domain]);
          if (changes.range !== undefined) copy.range([...changes.range]);
          if (changes.clamp !== undefined) copy.clamp(changes.clamp);
          return createResolution(copy, changes.domain === undefined ? finalDomain : [...changes.domain]);
        },
      };
    };
    return createResolution(scale, params.nice ? undefined : domain);
  },
});

/** 分类值域保持首次出现顺序，缺值不加入分类 */
const categoryDomain = (context: ScaleResolveContext): Array<string | number | boolean> => {
  const domain = new Set<string | number | boolean>();
  for (const value of context.domain ?? context.values) if (value !== null) domain.add(value);
  return [...domain];
};

const ordinalDefinition = defineScale({
  type: BuiltinDataScale.Ordinal,
  paramsSchema: ordinalParamsSchema,
  isFieldCompatible: categoryField,
  resolve: (context, params) => {
    const domain = categoryDomain(context);
    const range = outputRange(context);
    const step = params.step ?? ordinalParamsSchema.shape.step.parse(undefined);
    const offset = params.offset ?? ordinalParamsSchema.shape.offset.parse(undefined);
    const indexedRange = range.map((_value, index) => range[(index * step + offset) % range.length]);
    const scale = d3ScaleOrdinal<string | number | boolean, ScaleValue, undefined>().domain(domain).range(indexedRange);
    const extend = params.unknown === 'extend';
    if (!extend) scale.unknown(undefined);
    return {
      map: value => (value === null ? undefined : scale(value)),
      get domain() {
        return scale.domain();
      },
      range: indexedRange,
    };
  },
});

/** band/point 的分类映射结果，只有 band 提供区间宽度 */
const categoryResolution = (
  scale:
    | ReturnType<typeof d3ScaleBand<string | number | boolean>>
    | ReturnType<typeof d3ScalePoint<string | number | boolean>>,
  band: boolean,
): ScaleResolution => {
  const domain = scale.domain();
  const map = (value: IRDataScalarValue): number | undefined => {
    if (value === null) return undefined;
    const start = scale(value);
    return start === undefined ? undefined : start + (band ? scale.bandwidth() / 2 : 0);
  };
  return {
    map,
    domain,
    range: scale.range(),
    bandwidth: band ? scale.bandwidth() : undefined,
    step: scale.step(),
    rebuild: changes => {
      const copy = scale.copy();
      if (changes.domain !== undefined) copy.domain([...changes.domain]);
      if (changes.range !== undefined) copy.range([...changes.range]);
      return categoryResolution(copy, band);
    },
  };
};

const bandDefinition = defineScale({
  type: BuiltinDataScale.Band,
  paramsSchema: bandParamsSchema,
  isFieldCompatible: categoryField,
  resolve: (context, params) =>
    categoryResolution(
      d3ScaleBand<string | number | boolean>()
        .domain(categoryDomain(context))
        .range(numericRange(context))
        .paddingInner(params.paddingInner ?? bandParamsSchema.shape.paddingInner.parse(undefined))
        .paddingOuter(params.paddingOuter ?? bandParamsSchema.shape.paddingOuter.parse(undefined))
        .align(params.align ?? bandParamsSchema.shape.align.parse(undefined)),
      true,
    ),
});

const pointDefinition = defineScale({
  type: BuiltinDataScale.Point,
  paramsSchema: pointParamsSchema,
  isFieldCompatible: categoryField,
  resolve: (context, params) =>
    categoryResolution(
      d3ScalePoint<string | number | boolean>()
        .domain(categoryDomain(context))
        .range(numericRange(context))
        .padding(params.padding ?? pointParamsSchema.shape.padding.parse(undefined))
        .align(params.align ?? pointParamsSchema.shape.align.parse(undefined)),
      false,
    ),
});

/** 分档映射和边界均来自同一 D3 实例 */
const binsResolution = (
  domain: Array<number>,
  range: Array<ScaleValue>,
  edges: Array<number>,
  evaluate: (value: number) => ScaleValue | undefined,
): ScaleResolution => ({
  map: value => (isFiniteNumber(value) ? evaluate(value) : undefined),
  domain,
  range,
  thresholds: edges,
});

const quantizeDefinition = defineScale({
  type: BuiltinDataScale.Quantize,
  paramsSchema: binsParamsSchema,
  isFieldCompatible: continuousField,
  resolve: (context, params) => {
    const range = outputRange(context);
    if (params.count !== undefined && params.count !== range.length)
      throw new RetikzDataError('range length must equal count');
    const scale = d3ScaleQuantize<ScaleValue>().domain(numericDomain(context)).range(range);
    return binsResolution(scale.domain(), range, scale.thresholds(), scale);
  },
});

const quantileDefinition = defineScale({
  type: BuiltinDataScale.Quantile,
  paramsSchema: binsParamsSchema,
  isFieldCompatible: continuousField,
  resolve: (context, params) => {
    const range = outputRange(context);
    if (params.count !== undefined && params.count !== range.length)
      throw new RetikzDataError('range length must equal count');
    const scale = d3ScaleQuantile<ScaleValue>().domain(context.values.filter(isFiniteNumber)).range(range);
    if (scale.domain().length === 0) {
      return { map: value => (isFiniteNumber(value) ? scale(value) : undefined), domain: [], range };
    }
    return binsResolution(scale.domain(), range, scale.quantiles(), scale);
  },
});

const thresholdDefinition = defineScale({
  type: BuiltinDataScale.Threshold,
  paramsSchema: thresholdParamsSchema,
  isFieldCompatible: continuousField,
  resolve: (context, params) => {
    const range = outputRange(context);
    const edges = params.breakpoints;
    if (range.length !== edges.length + 1)
      throw new RetikzDataError('threshold range length must equal breakpoints.length + 1');
    if (edges.some((edge, index) => index > 0 && edge <= edges[index - 1]))
      throw new RetikzDataError('breakpoints must be strictly increasing');
    const scale = d3ScaleThreshold<number, ScaleValue>().domain(edges).range(range);
    return binsResolution([...edges], range, [...edges], scale);
  },
});

/** 保留单向和发散色带的既有退化分支，配色资源由宿主提供 */
const gradientResolution = (
  context: ScaleResolveContext,
  scheme: string | undefined,
  diverging: boolean,
): ScaleResolution => {
  const extent = numericDomain(context);
  const domain = context.domain ?? (diverging ? [extent[0], (extent[0] + extent[1]) / 2, extent[1]] : extent);
  if (!domain.every(isFiniteNumber))
    throw new RetikzDataError(`gradient domain requires finite numbers (got [${domain.join(', ')}])`);
  if (context.domain !== undefined && domain.some((value, index) => index > 0 && value <= domain[index - 1]))
    throw new RetikzDataError('gradient domain must be strictly increasing');
  const range = context.range ?? context.defaultRange;
  const interpolator = scheme === undefined ? undefined : context.interpolators?.get(scheme);
  if (range === undefined && interpolator === undefined)
    throw new RetikzDataError('gradient requires a range or registered interpolator');
  const expected = diverging ? 3 : 2;
  if (domain.length !== expected) throw new RetikzDataError(`gradient requires ${expected} domain endpoints`);
  if (range !== undefined && (range.length !== expected || !range.every(value => typeof value === 'string')))
    throw new RetikzDataError(`gradient requires ${expected} string endpoints`);
  const linear = range === undefined ? undefined : d3ScaleLinear<ScaleValue>().domain(domain).range(range).clamp(true);
  const map = (value: IRDataScalarValue): ScaleValue | undefined => {
    if (!isFiniteNumber(value)) return undefined;
    if (linear !== undefined) return linear(value);
    const low = domain[0];
    const high = domain[domain.length - 1];
    let fraction: number;
    if (!diverging) fraction = high === low ? 0.5 : Math.max(0, Math.min(1, (value - low) / (high - low)));
    else if (value <= low) fraction = 0;
    else if (value >= high) fraction = 1;
    else {
      const mid = domain[1];
      fraction =
        value <= mid
          ? mid === low
            ? 0
            : (0.5 * (value - low)) / (mid - low)
          : high === mid
            ? 1
            : 0.5 + (0.5 * (value - mid)) / (high - mid);
    }
    return interpolator?.(fraction);
  };
  return {
    map,
    domain,
    range: range ?? domain.map(value => map(value) ?? ''),
  };
};

const sequentialDefinition = defineScale({
  type: BuiltinDataScale.Sequential,
  paramsSchema: gradientParamsSchema,
  isFieldCompatible: continuousField,
  resolve: (context, params) => gradientResolution(context, params.scheme, false),
});
const divergingDefinition = defineScale({
  type: BuiltinDataScale.Diverging,
  paramsSchema: gradientParamsSchema,
  isFieldCompatible: fieldType => fieldType === undefined || fieldType === DataFieldType.Continuous,
  resolve: (context, params) => gradientResolution(context, params.scheme, true),
});

/** 所有内置映射与自定义映射进入同一注册路径 */
export const BUILTIN_SCALES: ReadonlyArray<ScaleDefinition> = [
  linearDefinition,
  logDefinition,
  powDefinition,
  sqrtDefinition,
  symlogDefinition,
  radialDefinition,
  timeDefinition,
  ordinalDefinition,
  bandDefinition,
  pointDefinition,
  quantizeDefinition,
  quantileDefinition,
  thresholdDefinition,
  sequentialDefinition,
  divergingDefinition,
];
