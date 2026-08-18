import type { PlotLineageOptions, PlotRowValueOptions } from '../../contract';
import type { EffectivePlotLineageOptions } from './types';

import { RetikzPlotError } from '../../error';

/** 校验 rowValues，避免默认记录整行 */
const resolvePlotRowValueOptions = (value: false | PlotRowValueOptions | undefined): false | PlotRowValueOptions => {
  if (value === undefined || value === false) return false;
  if (!Number.isInteger(value.maxRows) || value.maxRows < 1) {
    throw new RetikzPlotError('plot lineage: rowValues.maxRows must be a positive integer');
  }
  if (!Array.isArray(value.fields) || value.fields.length === 0) {
    throw new RetikzPlotError('plot lineage: rowValues.fields must be a non-empty field whitelist');
  }
  return { maxRows: value.maxRows, fields: [...value.fields] };
};

/** 解析 plot lineage 开关默认值 */
export const resolvePlotLineageOptions = (
  options: false | PlotLineageOptions | undefined,
): EffectivePlotLineageOptions => {
  if (options === false) {
    return {
      data: { sourceIdentity: false, transformSteps: false },
      markIdentity: false,
      markEncoding: false,
      transformScopes: false,
      scaleMappings: false,
      layoutContext: false,
      locatorAnchors: false,
      rowValues: false,
      hostMetadata: false,
    };
  }
  const value = options ?? {};
  return {
    data: value.data ?? {},
    markIdentity: value.markIdentity ?? true,
    markEncoding: value.markEncoding ?? true,
    transformScopes: value.transformScopes ?? true,
    scaleMappings: value.scaleMappings ?? false,
    layoutContext: value.layoutContext ?? false,
    locatorAnchors: value.locatorAnchors ?? false,
    rowValues: resolvePlotRowValueOptions(value.rowValues),
    hostMetadata: value.hostMetadata ?? false,
  };
};
