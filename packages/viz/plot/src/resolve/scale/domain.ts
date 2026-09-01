import { isFiniteNumber } from '@retikz/math';
import {
  scaleLinear as d3ScaleLinear,
  scaleLog as d3ScaleLog,
  scalePow as d3ScalePow,
  scaleRadial as d3ScaleRadial,
  scaleSymlog as d3ScaleSymlog,
} from 'd3-scale';

import type { IRPlotDomainPadding, PlotDomainPaddingKindValue } from '../../schemas';

import { RetikzPlotError } from '../../error';
import { PlotDomainPaddingKind } from '../../schemas';

/** 可按连续值域规则扩展的 position scale 族 */
export type PositionDomainFamily = 'linear' | 'time' | 'log' | 'pow' | 'sqrt' | 'symlog' | 'radial';

/** 解析带弹性值域时需要的 scale 上下文 */
export type ResolvePaddedDomainOptions = {
  /** scale 名称，用于报错定位 */
  scaleName: string;
  /** 连续 position scale 族 */
  family: PositionDomainFamily;
  /** 原始 domain，可能来自用户显式配置或数据推断 */
  domain: readonly [number, number];
  /** 当前 scale 使用的有效 range */
  range: readonly [number, number];
  /** 用户声明的 domain padding；数字与省略 kind 的对象使用 range 单位 */
  domainPadding?: IRPlotDomainPadding;
  /** 单值 domain 展开跨度 */
  singleValueSpan?: number;
  /** log scale 的对数底 */
  base?: number;
  /** pow scale 的指数 */
  exponent?: number;
  /** symlog scale 的近零线性区常量 */
  constant?: number;
};

type DomainPaddingResolution = Readonly<{
  kind: PlotDomainPaddingKindValue;
  lower: number;
  upper: number;
}>;

const finiteDomain = (domain: readonly [number, number], scaleName: string): [number, number] => {
  const [lower, upper] = domain;
  if (!isFiniteNumber(lower) || !isFiniteNumber(upper)) {
    throw new RetikzPlotError(
      `lowerPlots: scale "${scaleName}" domain must contain finite numbers (got [${lower}, ${upper}])`,
    );
  }
  return [lower, upper];
};

const resolveDomainPadding = (padding: IRPlotDomainPadding | undefined): DomainPaddingResolution => {
  if (padding === undefined) return { kind: PlotDomainPaddingKind.Range, lower: 0, upper: 0 };
  if (typeof padding === 'number') {
    return { kind: PlotDomainPaddingKind.Range, lower: padding, upper: padding };
  }
  return {
    kind: padding.kind ?? PlotDomainPaddingKind.Range,
    lower: padding.lower ?? 0,
    upper: padding.upper ?? 0,
  };
};

const defaultSingleValueSpan = (value: number): number => Math.max(Math.abs(value) * 0.2, 1);

const assertStrictlyPositive = (domain: readonly [number, number], scaleName: string, label: string): void => {
  if (domain[0] <= 0 || domain[1] <= 0) {
    throw new RetikzPlotError(
      `lowerPlots: log scale "${scaleName}" ${label} domain must be strictly positive (got [${domain[0]}, ${domain[1]}])`,
    );
  }
};

const assertNonNegative = (
  domain: readonly [number, number],
  scaleName: string,
  family: PositionDomainFamily,
  label: string,
): void => {
  if (domain[0] < 0 || domain[1] < 0) {
    throw new RetikzPlotError(
      `lowerPlots: ${family} scale "${scaleName}" ${label} domain must be non-negative (got [${domain[0]}, ${domain[1]}])`,
    );
  }
};

const expandAdditiveSingleValue = (
  value: number,
  singleValueSpan: number | undefined,
  clampLowerZero: boolean,
): [number, number] => {
  const span = singleValueSpan ?? defaultSingleValueSpan(value);
  if (clampLowerZero) return [Math.max(0, value - span / 2), value + span / 2];
  return [value - span / 2, value + span / 2];
};

const expandLogSingleValue = (value: number, singleValueSpan: number | undefined, base: number): [number, number] => {
  const logarithm = (sourceValue: number): number => Math.log(sourceValue) / Math.log(base);
  const power = (sourceValue: number): number => Math.pow(base, sourceValue);
  const span = singleValueSpan ?? 1;
  const center = logarithm(value);
  return [power(center - span / 2), power(center + span / 2)];
};

const applyAdditiveRatioPadding = (
  domain: readonly [number, number],
  padding: DomainPaddingResolution,
  clampLowerZero: boolean,
): [number, number] => {
  const span = Math.abs(domain[1] - domain[0]);
  const lower = domain[0] <= domain[1] ? domain[0] - span * padding.lower : domain[0] + span * padding.lower;
  const upper = domain[0] <= domain[1] ? domain[1] + span * padding.upper : domain[1] - span * padding.upper;
  return [clampLowerZero ? Math.max(0, lower) : lower, upper];
};

const applyLogRatioPadding = (
  domain: readonly [number, number],
  padding: DomainPaddingResolution,
  base: number,
): [number, number] => {
  const logarithm = (value: number): number => Math.log(value) / Math.log(base);
  const power = (value: number): number => Math.pow(base, value);
  const lower = logarithm(domain[0]);
  const upper = logarithm(domain[1]);
  const span = Math.abs(upper - lower);
  return lower <= upper
    ? [power(lower - span * padding.lower), power(upper + span * padding.upper)]
    : [power(lower + span * padding.lower), power(upper - span * padding.upper)];
};

const invertRangeEndpoints = (
  options: ResolvePaddedDomainOptions,
  domain: readonly [number, number],
  range: readonly [number, number],
): [number, number] => {
  switch (options.family) {
    case 'linear':
    case 'time': {
      const scale = d3ScaleLinear().domain([domain[0], domain[1]]).range([range[0], range[1]]);
      return [scale.invert(options.range[0]), scale.invert(options.range[1])];
    }
    case 'log': {
      const scale = d3ScaleLog()
        .base(options.base ?? 10)
        .domain([domain[0], domain[1]])
        .range([range[0], range[1]]);
      return [scale.invert(options.range[0]), scale.invert(options.range[1])];
    }
    case 'pow': {
      const scale = d3ScalePow()
        .exponent(options.exponent ?? 2)
        .domain([domain[0], domain[1]])
        .range([range[0], range[1]]);
      return [scale.invert(options.range[0]), scale.invert(options.range[1])];
    }
    case 'sqrt': {
      const scale = d3ScalePow().exponent(0.5).domain([domain[0], domain[1]]).range([range[0], range[1]]);
      return [scale.invert(options.range[0]), scale.invert(options.range[1])];
    }
    case 'symlog': {
      const scale = d3ScaleSymlog()
        .constant(options.constant ?? 1)
        .domain([domain[0], domain[1]])
        .range([range[0], range[1]]);
      return [scale.invert(options.range[0]), scale.invert(options.range[1])];
    }
    case 'radial': {
      const scale = d3ScaleRadial().domain([domain[0], domain[1]]).range([range[0], range[1]]);
      return [scale.invert(options.range[0]), scale.invert(options.range[1])];
    }
  }
};

const applyRangePadding = (
  options: ResolvePaddedDomainOptions,
  domain: readonly [number, number],
  padding: DomainPaddingResolution,
): [number, number] => {
  if (padding.lower === 0 && padding.upper === 0) return [domain[0], domain[1]];

  const [rangeStart, rangeEnd] = options.range;
  const rangeLength = Math.abs(rangeEnd - rangeStart);
  if (!isFiniteNumber(rangeStart) || !isFiniteNumber(rangeEnd) || rangeLength === 0) {
    throw new RetikzPlotError(
      `lowerPlots: scale "${options.scaleName}" domainPadding range units require a finite non-zero range`,
    );
  }
  if (padding.lower + padding.upper >= rangeLength) {
    throw new RetikzPlotError(
      `lowerPlots: scale "${options.scaleName}" domainPadding range-unit sum must be less than range length ${rangeLength}`,
    );
  }

  const direction = Math.sign(rangeEnd - rangeStart);
  const innerRange: [number, number] = [rangeStart + direction * padding.lower, rangeEnd - direction * padding.upper];
  return finiteDomain(invertRangeEndpoints(options, domain, innerRange), options.scaleName);
};

/**
 * 解析连续 position scale 的最终 domain
 * @description 对单值 domain 先展开，再按显式 domain padding 单位与 scale 族约束处理 log / non-negative 等边界
 */
export const resolvePaddedDomain = (options: ResolvePaddedDomainOptions): [number, number] => {
  const source = finiteDomain(options.domain, options.scaleName);
  const exponent = options.exponent ?? 2;
  const base = options.base ?? 10;
  const clampLowerZero =
    options.family === 'sqrt' ||
    options.family === 'radial' ||
    (options.family === 'pow' && !Number.isInteger(exponent));

  if (options.family === 'log') assertStrictlyPositive(source, options.scaleName, 'source');
  if (clampLowerZero) assertNonNegative(source, options.scaleName, options.family, 'source');

  const expanded =
    source[0] !== source[1]
      ? source
      : options.family === 'log'
        ? expandLogSingleValue(source[0], options.singleValueSpan, base)
        : expandAdditiveSingleValue(source[0], options.singleValueSpan, clampLowerZero);
  const padding = resolveDomainPadding(options.domainPadding);
  const padded =
    padding.kind === PlotDomainPaddingKind.Range
      ? applyRangePadding(options, expanded, padding)
      : options.family === 'log'
        ? applyLogRatioPadding(expanded, padding, base)
        : applyAdditiveRatioPadding(expanded, padding, clampLowerZero);

  if (options.family === 'log') assertStrictlyPositive(padded, options.scaleName, 'padded');
  if (clampLowerZero) assertNonNegative(padded, options.scaleName, options.family, 'padded');
  return padded;
};
