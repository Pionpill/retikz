import type { DataFieldTypeValue, IRDataFieldDefinition } from '@retikz/data';

import { JsonObjectSchema } from '@retikz/core';
import { coerceTimestamp, DataFieldType, FieldOrderMode, inferCategoryDomain } from '@retikz/data';
import { isFiniteNumber } from '@retikz/math';

import type {
  AnyScaleDefinition,
  ChannelScaleResolution,
  ChannelScaleResolveContext,
  PositionScale,
} from '../../contract';
import type { IRPlotMarkOperation, IRPlotScale, IRPlotScaleOperation } from '../../schemas';
import type { ScaleResolveContext } from './types';

import { isBuiltinScaleOperation } from '../../contract';
import { RetikzPlotError } from '../../error';
import { safeExtent } from '../../providers';
import { isBuiltinMark, PathClosureKind, PlotMark, PlotScale } from '../../schemas';
import { resolvePaddedDomain } from './domain';

/**
 * 查找并校验 scale definition
 * @description 只负责 registry lookup；custom operation 的 schema 校验在实际调用 definition 前完成
 */
export const resolveScaleDefinition = (
  operation: IRPlotScaleOperation,
  context: ScaleResolveContext,
): AnyScaleDefinition => {
  const def = context.registry.get(operation.type);
  if (def === undefined) {
    throw new RetikzPlotError(
      `lowerPlots: scale type "${operation.type}" is not registered; pass a ScaleDefinition via options.scaleDefinitions`,
    );
  }
  return def;
};

const parseScaleOperation = (def: AnyScaleDefinition, operation: IRPlotScaleOperation): never => {
  if (isBuiltinScaleOperation(operation)) return operation as never;
  JsonObjectSchema.parse(operation);
  const parsed = def.schema.parse(operation) as never;
  JsonObjectSchema.parse(parsed);
  return parsed;
};

/**
 * 为内置 position scale 计算最终 domain
 * @description 默认值域、单值展开和 domain padding 都在 resolve 层完成；provider definition 只接收已确定的 operation 并构建运行时 scale。自定义 definition 保留原始 operation 与既有 contract
 */
const resolveBuiltinPositionOperation = (
  operation: IRPlotScaleOperation,
  values: Array<unknown>,
  fallbackRange: readonly [number, number],
): IRPlotScaleOperation => {
  if (!isBuiltinScaleOperation(operation)) return operation;
  const numericValues = values.filter(isFiniteNumber);
  switch (operation.type) {
    case PlotScale.Linear:
      return {
        ...operation,
        domain: resolvePaddedDomain({
          scaleName: operation.name,
          family: 'linear',
          domain: operation.domain ?? safeExtent(numericValues),
          range: operation.range ?? fallbackRange,
          domainPadding: operation.domainPadding,
          singleValueSpan: operation.singleValueSpan,
        }),
      };
    case PlotScale.Log: {
      const positiveValues = numericValues.filter(value => value > 0);
      const [lo, hi] = positiveValues.length === 0 ? [1, 10] : safeExtent(positiveValues);
      return {
        ...operation,
        domain: resolvePaddedDomain({
          scaleName: operation.name,
          family: 'log',
          domain: operation.domain ?? [lo, hi],
          range: operation.range ?? fallbackRange,
          domainPadding: operation.domainPadding,
          singleValueSpan: operation.singleValueSpan,
          base: operation.base,
        }),
      };
    }
    case PlotScale.Pow: {
      const sourceDomain = operation.domain ?? safeExtent(numericValues);
      const exponent = operation.exponent ?? 2;
      if (!Number.isInteger(exponent) && (sourceDomain[0] < 0 || sourceDomain[1] < 0)) {
        throw new RetikzPlotError(
          `lowerPlots: pow scale "${operation.name}" with non-integer exponent ${exponent} requires a non-negative domain (got [${sourceDomain[0]}, ${sourceDomain[1]}])`,
        );
      }
      return {
        ...operation,
        domain: resolvePaddedDomain({
          scaleName: operation.name,
          family: 'pow',
          domain: sourceDomain,
          range: operation.range ?? fallbackRange,
          domainPadding: operation.domainPadding,
          singleValueSpan: operation.singleValueSpan,
          exponent,
        }),
      };
    }
    case PlotScale.Sqrt:
      return {
        ...operation,
        domain: resolvePaddedDomain({
          scaleName: operation.name,
          family: 'sqrt',
          domain: operation.domain ?? safeExtent(numericValues.filter(value => value >= 0)),
          range: operation.range ?? fallbackRange,
          domainPadding: operation.domainPadding,
          singleValueSpan: operation.singleValueSpan,
        }),
      };
    case PlotScale.Symlog:
      return {
        ...operation,
        domain: resolvePaddedDomain({
          scaleName: operation.name,
          family: 'symlog',
          domain: operation.domain ?? safeExtent(numericValues),
          range: operation.range ?? fallbackRange,
          domainPadding: operation.domainPadding,
          singleValueSpan: operation.singleValueSpan,
          constant: operation.constant,
        }),
      };
    case PlotScale.Radial:
      return {
        ...operation,
        domain: resolvePaddedDomain({
          scaleName: operation.name,
          family: 'radial',
          domain: operation.domain ?? safeExtent(numericValues.filter(value => value >= 0)),
          range: operation.range ?? fallbackRange,
          domainPadding: operation.domainPadding,
          singleValueSpan: operation.singleValueSpan,
        }),
      };
    case PlotScale.Time: {
      const stamps = values.map(coerceTimestamp).filter((stamp): stamp is number => stamp !== null);
      return {
        ...operation,
        domain: resolvePaddedDomain({
          scaleName: operation.name,
          family: 'time',
          domain: operation.domain ?? safeExtent(stamps),
          range: fallbackRange,
          domainPadding: operation.domainPadding,
          singleValueSpan: operation.singleValueSpan,
        }),
      };
    }
    default:
      return operation;
  }
};

/**
 * 根据 position scale operation 建立位置 scale
 * @description 统一处理 definition lookup、custom operation schema boundary 与 position/channel family 诊断
 */
export const resolvePositionScale = (
  operation: IRPlotScaleOperation,
  values: Array<unknown>,
  fallbackRange: readonly [number, number],
  context: ScaleResolveContext,
): PositionScale => {
  const def = resolveScaleDefinition(operation, context);
  if (def.family !== 'position') {
    throw new RetikzPlotError(
      `resolvePositionScale: ${operation.type} scale "${operation.name}" cannot drive a positional (x/y) channel; color scales bind the color channel only`,
    );
  }
  const effectiveOperation = resolveBuiltinPositionOperation(operation, values, fallbackRange);
  return def.resolve(parseScaleOperation(def, effectiveOperation), values, fallbackRange);
};

/**
 * 根据 channel scale operation 建立颜色通道解析结果
 * @description position scale 绑定 color 通道与字段类型不兼容都会 fail-loud；legend 只解析外观时可关闭字段兼容诊断
 */
export const resolveChannelScale = (
  operation: IRPlotScaleOperation,
  values: Array<unknown>,
  context: ChannelScaleResolveContext,
  scaleContext: ScaleResolveContext,
  options: { checkFieldCompatible?: boolean } = {},
): ChannelScaleResolution => {
  const def = resolveScaleDefinition(operation, scaleContext);
  if (def.family !== 'channel') {
    throw new RetikzPlotError(
      `lowerPlots: scale "${operation.name}" of type "${operation.type}" is not a color scale (color channels bind ordinal / sequential / diverging / quantize / threshold / quantile)`,
    );
  }
  if (options.checkFieldCompatible !== false && !def.isFieldCompatible(context.fieldType)) {
    throw new RetikzPlotError(
      `lowerPlots: color scale "${operation.name}" (${operation.type}) is incompatible with a ${context.fieldType ?? 'untyped'} field`,
    );
  }
  return def.resolve(parseScaleOperation(def, operation), values, context);
};

/**
 * 校验 position scale 与字段类型是否兼容
 * @description 只对 position family 生效，未知 type 与 channel family 交由对应 scale resolver 报错
 */
export const assertScaleFieldCompatible = (
  role: string,
  scaleType: string,
  fieldType: DataFieldTypeValue,
  scaleName: string,
  context: ScaleResolveContext,
): void => {
  const def = context.registry.get(scaleType);
  if (def === undefined || def.family !== 'position') return;
  if (!def.isFieldCompatible(fieldType)) {
    throw new RetikzPlotError(
      `lowerPlots: coordinate.${role} scale "${scaleName}" (${scaleType}) is incompatible with ${fieldType} field`,
    );
  }
};

/**
 * 校验值轴 scale 是否允许 baseline mark
 * @description interval、baseline area 与 stack closure 需要值域包含 0；不允许的非线性 scale fail-loud
 */
export const assertBaselineScaleCompatible = (
  valueScaleType: string,
  marks: ReadonlyArray<IRPlotMarkOperation>,
  context: ScaleResolveContext,
): void => {
  const def = context.registry.get(valueScaleType);
  if (def === undefined || def.family !== 'position' || def.allowsBaseline !== false) return;
  const hasBaselineMark = marks.some(
    mark =>
      isBuiltinMark(mark) &&
      (mark.type === PlotMark.Interval ||
        (mark.type === PlotMark.Path &&
          (mark.closure?.kind === PathClosureKind.Baseline || mark.closure?.kind === PathClosureKind.Stack))),
  );
  if (hasBaselineMark) {
    throw new RetikzPlotError(
      `nonlinear continuous scale (${valueScaleType}) cannot be used with interval/area/path closure because their baseline participates in the value axis; use a linear value scale or an open point/line mark`,
    );
  }
};

/**
 * 按字段类型派生默认 position scale operation
 * @description continuous→linear、temporal→time、categorical→band；无字段绑定时使用 linear
 */
export const derivePositionScale = (fieldType: DataFieldTypeValue | undefined, name: string): IRPlotScale => {
  switch (fieldType) {
    case DataFieldType.Temporal:
      return { type: PlotScale.Time, name };
    case DataFieldType.Categorical:
      return { type: PlotScale.Band, name };
    default:
      return { type: PlotScale.Linear, name };
  }
};

/** IR data model 的分类排序契约 */
export type CategoryOrder = NonNullable<IRDataFieldDefinition['order']>;

/**
 * 按字段 order 得到分类 position scale 的显式 domain
 * @description appearance/undefined 保留出现序；ascending/descending 按值排序；数组顺序优先并追加未声明类别
 */
export const orderedCategoryDomain = (
  values: Array<unknown>,
  order: CategoryOrder | undefined,
): Array<string | number> => {
  const deduped = inferCategoryDomain(values);
  if (order === undefined || order === FieldOrderMode.Appearance) return deduped;
  if (order === FieldOrderMode.Ascending || order === FieldOrderMode.Descending) {
    const allNumber = deduped.every(value => typeof value === 'number');
    const sorted = [...deduped].sort((a, b) =>
      allNumber ? (a as number) - (b as number) : String(a).localeCompare(String(b)),
    );
    return order === FieldOrderMode.Descending ? sorted.reverse() : sorted;
  }
  const inArray = new Set<string | number>(order);
  const appended = deduped.filter(value => !inArray.has(value));
  return [...order, ...appended];
};
