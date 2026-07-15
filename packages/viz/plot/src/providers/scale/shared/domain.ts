import type { z } from 'zod';

import { isFiniteNumber } from '@retikz/math';

import type { DomainPaddingSchema } from '../../../schemas';

/** position scale 的 domain padding 输入 */
export type DomainPaddingInput = z.infer<typeof DomainPaddingSchema>;

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
  /** domain 是否来自用户显式配置 */
  explicitDomain: boolean;
  /** 用户声明的 domain padding；数字代表两端同值，对象可分别指定上下界 */
  domainPadding?: DomainPaddingInput;
  /** 单值 domain 展开跨度 */
  singleValueSpan?: number;
  /** log scale 的对数底 */
  base?: number;
  /** pow scale 的指数 */
  exponent?: number;
  /** 推断 domain 时使用的默认 padding；显式 domain 默认不自动留白 */
  defaultDomainPadding?: number;
};

const finiteDomain = (domain: readonly [number, number], scaleName: string): [number, number] => {
  const [lo, hi] = domain;
  if (!isFiniteNumber(lo) || !isFiniteNumber(hi)) {
    throw new Error(`lowerPlots: scale "${scaleName}" domain must contain finite numbers (got [${lo}, ${hi}])`);
  }
  return [lo, hi];
};

const paddingSides = (
  padding: DomainPaddingInput | undefined,
  explicitDomain: boolean,
  defaultDomainPadding: number,
): { lower: number; upper: number } => {
  if (padding === undefined) {
    const value = explicitDomain ? 0 : defaultDomainPadding;
    return { lower: value, upper: value };
  }
  if (typeof padding === 'number') return { lower: padding, upper: padding };
  return { lower: padding.lower ?? 0, upper: padding.upper ?? 0 };
};

const defaultSingleValueSpan = (value: number): number => Math.max(Math.abs(value) * 0.2, 1);

const assertStrictlyPositive = (domain: readonly [number, number], scaleName: string, label: string): void => {
  if (domain[0] <= 0 || domain[1] <= 0) {
    throw new Error(
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
    throw new Error(
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

const applyAdditivePadding = (
  domain: readonly [number, number],
  padding: { lower: number; upper: number },
  clampLowerZero: boolean,
): [number, number] => {
  const span = Math.abs(domain[1] - domain[0]);
  const lower = domain[0] <= domain[1] ? domain[0] - span * padding.lower : domain[0] + span * padding.lower;
  const upper = domain[0] <= domain[1] ? domain[1] + span * padding.upper : domain[1] - span * padding.upper;
  return [clampLowerZero ? Math.max(0, lower) : lower, upper];
};

const resolveLogDomain = (options: ResolvePaddedDomainOptions): [number, number] => {
  const source = finiteDomain(options.domain, options.scaleName);
  assertStrictlyPositive(source, options.scaleName, 'source');
  const base = options.base ?? 10;
  const log = (value: number): number => Math.log(value) / Math.log(base);
  const pow = (value: number): number => Math.pow(base, value);
  const expanded =
    source[0] === source[1]
      ? ((): [number, number] => {
          const span = options.singleValueSpan ?? 1;
          const center = log(source[0]);
          return [pow(center - span / 2), pow(center + span / 2)];
        })()
      : source;
  const padding = paddingSides(options.domainPadding, options.explicitDomain, options.defaultDomainPadding ?? 0);
  const logLo = log(expanded[0]);
  const logHi = log(expanded[1]);
  const span = Math.abs(logHi - logLo);
  const padded: [number, number] =
    logLo <= logHi
      ? [pow(logLo - span * padding.lower), pow(logHi + span * padding.upper)]
      : [pow(logLo + span * padding.lower), pow(logHi - span * padding.upper)];
  assertStrictlyPositive(padded, options.scaleName, 'padded');
  return padded;
};

/**
 * 解析连续 position scale 的最终 domain。
 * @description 对推断 domain 添加默认弹性空间；对单值 domain 先展开，再按 scale 族约束处理 log / non-negative 等边界。
 */
export const resolvePaddedDomain = (options: ResolvePaddedDomainOptions): [number, number] => {
  if (options.family === 'log') return resolveLogDomain(options);

  const source = finiteDomain(options.domain, options.scaleName);
  const exponent = options.exponent ?? 2;
  const clampLowerZero =
    options.family === 'sqrt' ||
    options.family === 'radial' ||
    (options.family === 'pow' && !Number.isInteger(exponent));

  if (clampLowerZero) assertNonNegative(source, options.scaleName, options.family, 'source');

  const expanded =
    source[0] === source[1] ? expandAdditiveSingleValue(source[0], options.singleValueSpan, clampLowerZero) : source;
  const padded = applyAdditivePadding(
    expanded,
    paddingSides(options.domainPadding, options.explicitDomain, options.defaultDomainPadding ?? 0),
    clampLowerZero,
  );

  if (clampLowerZero) assertNonNegative(padded, options.scaleName, options.family, 'padded');
  return padded;
};
