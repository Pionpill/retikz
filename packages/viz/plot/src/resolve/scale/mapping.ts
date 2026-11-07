import { CssColorSchema } from '@retikz/core';
import { coerceTimestamp, DataFieldType, inferCategoryDomain, resolveScale } from '@retikz/data';
import type { IRDataScaleOperation, IRDataScalarValue, ScaleResolution } from '@retikz/data';
import type { JsonObject } from '@retikz/foundation';
import { scaleUtc, tickFormat } from 'd3-scale';

import type {
  ChannelScaleResolution,
  ChannelScaleMappingContext,
  ChannelScaleResolveContext,
  DomainPaddingScale,
  PositionScale,
  PositionScalePolicy,
} from '../../contract';
import { isBuiltinScaleOperation } from '../../contract';
import { RetikzPlotError } from '../../error';
import { DEFAULT_PLOT_COLORS, sampleSchemeColors, toHexColor } from '../../providers';
import type { IRPlotScaleOperation } from '../../schemas';
import type { ScaleResolveContext } from './types';

/** 将宿主配置交给 Data；属性通道在消费时校验输出 */
export const resolveAttributeMapping = (
  operation: IRPlotScaleOperation,
  context: ChannelScaleMappingContext,
  scales: ScaleResolveContext,
): ScaleResolution => {
  const definition = scales.registry.get(operation.type);
  if (definition === undefined) throw new RetikzPlotError(`unknown scale type "${operation.type}"`);
  if (!definition.isFieldCompatible(context.fieldType))
    throw new RetikzPlotError(`scale "${operation.name}" is incompatible with ${context.fieldType ?? 'untyped'} field`);
  try {
    return resolveScale(dataScaleOperationOf(operation), context, scales.registry);
  } catch (cause) {
    throw new RetikzPlotError(`scale "${operation.name}" failed to resolve`, { cause });
  }
};

/** 将宿主声明中的数学配置交给 Data，名称和布局选项不进入参数 */
export const dataScaleOperationOf = (operation: IRPlotScaleOperation): IRDataScaleOperation => {
  if (!isBuiltinScaleOperation(operation))
    return {
      type: operation.type,
      domain: operation.domain,
      range: operation.range,
      params: operation.params,
    };
  const params: JsonObject = {};
  if ('nice' in operation && operation.nice !== undefined) params.nice = operation.nice;
  if ('clamp' in operation && operation.clamp !== undefined) params.clamp = operation.clamp;
  if ('base' in operation && operation.base !== undefined) params.base = operation.base;
  if ('exponent' in operation && operation.exponent !== undefined) params.exponent = operation.exponent;
  if ('constant' in operation && operation.constant !== undefined) params.constant = operation.constant;
  if ('count' in operation && operation.count !== undefined) params.count = operation.count;
  if ((operation.type === 'sequential' || operation.type === 'diverging') && operation.scheme !== undefined)
    params.scheme = operation.scheme;
  if ('breakpoints' in operation) params.breakpoints = operation.breakpoints;
  if (operation.type === 'ordinal') {
    params.unknown = 'extend';
    if (operation.rangeIndex !== undefined) Object.assign(params, operation.rangeIndex);
  }
  if (operation.type === 'band') {
    params.paddingInner = operation.paddingInner ?? 0.1;
    params.paddingOuter = operation.paddingOuter ?? operation.paddingInner ?? 0.1;
    if (operation.align !== undefined) params.align = operation.align;
  }
  if (operation.type === 'point') {
    params.padding = operation.padding ?? 0.5;
    if (operation.align !== undefined) params.align = operation.align;
  }
  return {
    type: operation.type,
    domain: 'domain' in operation ? operation.domain : undefined,
    range: 'range' in operation ? operation.range : undefined,
    params,
  };
};

/** 从数据视图的未知单元值取得可映射标量 */
export const scaleScalarOf = (value: unknown): IRDataScalarValue =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? value : null;

/** 将独立数学映射投影为坐标消费者；更新范围不改变其他视图 */
export const positionScaleOf = (initial: ScaleResolution, type: string, policy: PositionScalePolicy): PositionScale => {
  let current = initial;
  const numericRange = (): [number, number] => {
    const [start, end] = current.range;
    if (typeof start !== 'number' || typeof end !== 'number')
      throw new RetikzPlotError(`position scale "${type}" requires a numeric range`);
    return [start, end];
  };
  numericRange();
  if (current.rebuild === undefined)
    throw new RetikzPlotError(`position scale "${type}" requires independent range rebuilding`);
  return {
    coordinate: value => {
      const result = current.map(scaleScalarOf(value));
      if (result === undefined) return NaN;
      if (typeof result !== 'number' || !Number.isFinite(result))
        throw new RetikzPlotError(`position scale "${type}" must produce finite numbers`);
      return result;
    },
    domain: () => current.domain,
    get bandwidth() {
      return current.bandwidth ?? 0;
    },
    get step() {
      return current.step ?? 0;
    },
    get tickKind() {
      return policy.tickKind ?? (policy.continuity === 'discrete' ? 'category' : 'number');
    },
    ticks: count => {
      if (policy.continuity === 'discrete') return { values: [...current.domain], labels: current.domain.map(String) };
      if (current.ticks === undefined) throw new RetikzPlotError(`scale "${type}" does not provide ticks`);
      const values = [...current.ticks(count)];
      const [low, high] = current.domain.map(Number);
      const format =
        policy.tickKind === 'time'
          ? (value: number) => scaleUtc().domain([low, high]).tickFormat(count)(new Date(value))
          : tickFormat(low, high, count ?? 5);
      return { values, labels: values.map(value => format(value)) };
    },
    range: numericRange,
    setRange: range => {
      if (current.rebuild === undefined) throw new RetikzPlotError(`scale "${type}" does not support range rebuilding`);
      current = current.rebuild({ range });
    },
  };
};

/** 为位置角色建立唯一的 Data 数学映射 */
export const resolvePositionMapping = (
  operation: IRPlotScaleOperation,
  values: ReadonlyArray<unknown>,
  range: readonly [number, number],
  context: ScaleResolveContext,
): ScaleResolution => {
  const mathematical = dataScaleOperationOf(operation);
  if ((operation.type === 'band' || operation.type === 'point') && mathematical.domain === undefined)
    mathematical.domain = inferCategoryDomain([...values]);
  try {
    return resolveScale(
      mathematical,
      {
        values: values.map(value => (operation.type === 'time' ? coerceTimestamp(value) : scaleScalarOf(value))),
        defaultRange: [...range],
      },
      context.registry,
    );
  } catch (cause) {
    throw new RetikzPlotError(`position scale "${operation.name}" failed to resolve`, { cause });
  }
};

/** 读取自动留白需要的数学能力，Plot 保留布局协调 */
export const domainPaddingScaleOf = (
  mapping: ScaleResolution,
  name: string,
  policy: PositionScalePolicy,
): DomainPaddingScale => {
  const rebuild = mapping.rebuild;
  if (rebuild === undefined) throw new RetikzPlotError(`scale "${name}" does not support mark domainPadding`);
  const normalized = rebuild({ range: [0, 1], clamp: false });
  const discrete = policy.continuity === 'discrete';
  const radial = policy.padding === 'radial';
  const square = (value: number): number => Math.sign(value) * value * value;
  const normalize = (value: unknown): number => {
    const mapped = normalized.map(scaleScalarOf(value));
    return typeof mapped === 'number' ? (radial ? square(mapped) : mapped) : NaN;
  };
  if (!discrete && normalized.invert === undefined)
    throw new RetikzPlotError(`scale "${name}" requires an inverse for mark domainPadding`);
  return {
    normalize,
    parameter: radial
      ? (position, range) => (square(position) - square(range[0])) / (square(range[1]) - square(range[0]))
      : undefined,
    createScale: (padding, range) => {
      const span = 1 / (1 - padding.lower - padding.upper);
      const invert = normalized.invert;
      const parameter = (value: number): number => (radial ? Math.sign(value) * Math.sqrt(Math.abs(value)) : value);
      const domain: [number, number] = discrete
        ? [0, 1]
        : [
            invert?.(parameter(-padding.lower * span)) ?? Number(mapping.domain[0]),
            invert?.(parameter(1 + padding.upper * span)) ?? Number(mapping.domain[mapping.domain.length - 1]),
          ];
      const build = (next: readonly [number, number]): ScaleResolution => {
        const nextRange: [number, number] = radial
          ? [...next]
          : [
              next[0] + (next[1] - next[0]) * (padding.lower + (discrete ? 0 : normalize(domain[0])) / span),
              next[0] + (next[1] - next[0]) * (padding.lower + (discrete ? 1 : normalize(domain[1])) / span),
            ];
        const padded = rebuild({ domain: discrete ? undefined : domain, range: nextRange });
        return { ...padded, range: [...next], rebuild: changes => build(changes.range ?? next) };
      };
      return positionScaleOf(build(range), name, policy);
    },
  };
};

/** 按颜色消费选择资源，实绘与图例从同一数学映射读取域和档位 */
export const resolveColorMapping = (
  operation: IRPlotScaleOperation,
  values: Array<unknown>,
  context: ChannelScaleResolveContext,
  scaleContext: ScaleResolveContext,
): ChannelScaleResolution => {
  const mathematical = dataScaleOperationOf(operation);
  const ordinal = operation.type === 'ordinal';
  const toNumber = context.fieldType === DataFieldType.Temporal ? context.coerceTimestamp : context.toNumber;
  const samples = ordinal ? inferCategoryDomain(values) : values.map(toNumber).filter(value => value !== null);
  const interpolators = new Map<string, (fraction: number) => string>();
  if (isBuiltinScaleOperation(operation)) {
    if (ordinal) {
      mathematical.domain ??= inferCategoryDomain(values);
      mathematical.range ??= [...(context.defaultColors ?? DEFAULT_PLOT_COLORS)];
    } else if (
      'scheme' in operation ||
      ['sequential', 'diverging', 'quantize', 'quantile', 'threshold'].includes(operation.type)
    ) {
      const scheme =
        ('scheme' in operation ? operation.scheme : undefined) ??
        (operation.type === 'diverging'
          ? (context.defaultDivergingScheme ?? 'rdbu')
          : (context.defaultSequentialScheme ?? 'viridis'));
      if (operation.type === 'sequential' || operation.type === 'diverging')
        mathematical.params = { ...mathematical.params, scheme };
      if (mathematical.range === undefined) {
        if (operation.type === 'quantize' || operation.type === 'quantile' || operation.type === 'threshold') {
          const count = operation.type === 'threshold' ? operation.breakpoints.length + 1 : (operation.count ?? 5);
          mathematical.range = sampleSchemeColors(scheme, count, context.resolveColorScheme);
        } else interpolators.set(scheme, context.resolveColorScheme(scheme));
      }
    }
  }
  const mapping = resolveScale(
    mathematical,
    {
      values: isBuiltinScaleOperation(operation) ? samples : values.map(scaleScalarOf),
      interpolators,
    },
    scaleContext.registry,
  );
  const legend =
    operation.type === 'ordinal'
      ? 'categories'
      : mapping.thresholds !== undefined || ['quantize', 'quantile', 'threshold'].includes(operation.type)
        ? 'bins'
        : mapping.ticks !== undefined ||
            operation.type === 'sequential' ||
            operation.type === 'diverging' ||
            context.fieldType === DataFieldType.Continuous ||
            context.fieldType === DataFieldType.Temporal
          ? 'continuous'
          : 'categories';
  for (const value of mapping.range) {
    if (typeof value !== 'string' || !CssColorSchema.safeParse(value).success)
      throw new RetikzPlotError(`scale "${operation.name}" is not a color scale`);
  }
  const edges = mapping.thresholds;
  const categories = legend === 'categories';
  const convert = (value: IRDataScalarValue): string | undefined => {
    const mapped = mapping.map(value);
    if (mapped === undefined) return undefined;
    if (typeof mapped !== 'string' || !CssColorSchema.safeParse(mapped).success)
      throw new RetikzPlotError(`scale "${operation.name}" is not a color scale`);
    return operation.type === 'sequential' || operation.type === 'diverging' ? toHexColor(mapped) : mapped;
  };
  return {
    of: value => convert(isBuiltinScaleOperation(operation) && !ordinal ? toNumber(value) : scaleScalarOf(value)),
    legendForm: legend === 'continuous' ? 'ramp' : 'swatch',
    domain: legend === 'bins' ? [] : mapping.domain,
    range: !categories ? (mapping.range as ReadonlyArray<string>) : mapping.domain.map(value => convert(value) ?? ''),
    edges: edges === undefined ? undefined : [...edges],
    scaleType: operation.type,
  };
};
