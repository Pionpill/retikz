import type { TextMetrics } from '../../contract';
import { createCompositeContractError } from '../diagnostics';
import { guardProviderOutput } from '../provider';
import type { CanonicalTextMetrics } from './types';

/** 校验并规范化单次文字度量结果 */
export const resolveTextMetrics = (metrics: TextMetrics): CanonicalTextMetrics =>
  guardProviderOutput('resolveTextMetrics', () => {
    const { width, height, ascent: rawAscent, descent: rawDescent } = metrics;

    const assertMetric = (name: keyof TextMetrics, value: number): number => {
      if (!Number.isFinite(value) || value < 0) {
        throw createCompositeContractError(
          `resolveTextMetrics: invalid ${name} '${String(value)}'; must be a non-negative finite number`,
        );
      }

      return value;
    };

    const normalizedWidth = assertMetric('width', width);
    const normalizedHeight = assertMetric('height', height);
    const measuredAscent = rawAscent === undefined ? undefined : assertMetric('ascent', rawAscent);
    const measuredDescent = rawDescent === undefined ? undefined : assertMetric('descent', rawDescent);

    let ascent: number;
    let descent: number;
    if (measuredAscent !== undefined && measuredDescent !== undefined) {
      const measuredVerticalSpan = measuredAscent + measuredDescent;
      if (!Number.isFinite(measuredVerticalSpan)) {
        throw createCompositeContractError(
          `resolveTextMetrics: invalid ascent/descent sum '${measuredVerticalSpan}'; must be a non-negative finite number`,
        );
      }

      const visualHeight = Math.max(normalizedHeight, measuredVerticalSpan);
      const leadingHalf = (visualHeight - measuredVerticalSpan) / 2;
      ascent = measuredAscent + leadingHalf;
      descent = measuredDescent + leadingHalf;
    } else if (measuredAscent !== undefined) {
      const visualHeight = Math.max(normalizedHeight, measuredAscent);
      ascent = measuredAscent;
      descent = visualHeight - measuredAscent;
    } else if (measuredDescent !== undefined) {
      const visualHeight = Math.max(normalizedHeight, measuredDescent);
      ascent = visualHeight - measuredDescent;
      descent = measuredDescent;
    } else {
      ascent = normalizedHeight / 2;
      descent = normalizedHeight / 2;
    }

    return {
      width: normalizedWidth,
      height: ascent + descent,
      ascent,
      descent,
    };
  });
