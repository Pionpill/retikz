import { RetikzDataError } from '@retikz/data';
import type { JsonValue } from '@retikz/foundation';

import { RetikzChartError, RetikzChartErrorCode } from '../../error';
import type { IRChartSource } from '../schemas';

/** 在作者 JSON 中定位失败的拟合参数，保留 Data 精确 schema 的 cause */
export const contextualizeChartFailure = (source: IRChartSource, cause: unknown): unknown => {
  let current = cause;
  while (current instanceof Error) {
    if (current instanceof RetikzDataError && current.details.regressionMethod !== undefined) {
      const method = current.details.regressionMethod;
      const find = (value: JsonValue, path: Array<string | number>): Array<string | number> | undefined => {
        if (value === null || typeof value !== 'object') return undefined;
        if ('kind' in value && value.kind === method.kind && JSON.stringify(value) === JSON.stringify(method))
          return path;
        for (const [key, child] of Object.entries(value)) {
          const result = find(child, [...path, Array.isArray(value) ? Number(key) : key]);
          if (result !== undefined) return result;
        }
        return undefined;
      };
      const path = find(source.recipe as JsonValue, ['recipe']);
      if (path !== undefined)
        return new RetikzChartError({
          code: RetikzChartErrorCode.InvalidChartIR,
          message: `Chart regression failed at ${path.join('.')}`,
          details: { path },
          cause,
        });
      return cause;
    }
    current = current.cause;
  }
  return cause;
};
