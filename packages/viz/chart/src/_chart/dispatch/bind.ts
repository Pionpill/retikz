import { z } from 'zod';

import type { BoundChart } from '../../_shared';

import { BaseChartType } from '../../_shared';
import { ChartDispatchSchema } from '../schemas';
import { BaseChartRecipe } from './base';
import { ChartResolveError, ChartResolveErrorCode } from './errors';

/** 将首个数据结构问题转换为稳定的 Chart 输入路径 */
export const chartIssuePathOf = (error: z.ZodError): ReadonlyArray<string | number> => {
  const issue = error.issues.at(0);
  const path = (issue?.path ?? []).map(part => (typeof part === 'symbol' ? String(part) : part));
  const unrecognizedKey = issue?.code === 'unrecognized_keys' ? issue.keys.at(0) : undefined;
  return unrecognizedKey === undefined ? path : [...path, unrecognizedKey];
};

/** 将数据结构解析失败转换为稳定的 Chart 解析错误 */
export const invalidChartSchemaError = (
  code: typeof ChartResolveErrorCode.InvalidChartIR | typeof ChartResolveErrorCode.InvalidResolvedPlot,
  error: z.ZodError,
  cause: unknown = error,
): ChartResolveError => new ChartResolveError(code, { path: chartIssuePathOf(error), cause });

/** 解析并绑定 Base Chart 输入 */
export const bindChart = (input: unknown): BoundChart => {
  let envelope: z.infer<typeof ChartDispatchSchema>;
  try {
    envelope = ChartDispatchSchema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) throw invalidChartSchemaError(ChartResolveErrorCode.InvalidChartIR, error);
    throw error;
  }

  if (envelope.type !== BaseChartType.Base) {
    throw new ChartResolveError(ChartResolveErrorCode.UnknownType, { path: ['type'] });
  }

  try {
    return BaseChartRecipe.bind(BaseChartRecipe.schema.parse(input));
  } catch (error) {
    if (error instanceof z.ZodError) throw invalidChartSchemaError(ChartResolveErrorCode.InvalidChartIR, error);
    throw error;
  }
};
