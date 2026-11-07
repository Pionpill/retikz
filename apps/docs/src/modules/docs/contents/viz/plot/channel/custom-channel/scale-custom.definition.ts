import type { ScaleResolution } from '@retikz/data';
import { defineScale, resolveScale } from '@retikz/data';
import type { PositionChannelDefinition } from '@retikz/plot';
import { positionField } from '@retikz/plot';
import { z } from 'zod';

/** 分类数据使用固定品牌色板，数学映射复用 Data */
export const brandColorScale = defineScale({
  type: 'brand',
  paramsSchema: z.strictObject({}),
  isFieldCompatible: fieldType => fieldType === undefined || fieldType === 'categorical',
  resolve: context => resolveScale({ type: 'ordinal', range: ['#2563eb', '#16a34a', '#dc2626', '#d97706'] }, context),
});

const EasePositionParamsSchema = z.strictObject({
  exponent: z.number().positive().optional().describe('Positive exponent applied to normalized positions'),
});

/** 自定义位置映射提供独立范围重建与刻度能力 */
export const easePositionScale = defineScale({
  type: 'ease-position',
  paramsSchema: EasePositionParamsSchema,
  isFieldCompatible: fieldType => fieldType === undefined || fieldType === 'continuous',
  resolve: (context, params): ScaleResolution => {
    const numeric = context.values.map(Number).filter(Number.isFinite);
    const domainMin = numeric.length > 0 ? Math.min(...numeric) : 0;
    const domainMax = numeric.length > 0 ? Math.max(...numeric) : 1;
    const exponent = params.exponent ?? 2;
    const build = (currentRange: readonly [number, number]): ScaleResolution => ({
      map: value => {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue)) return undefined;

        const normalized = domainMax === domainMin ? 0.5 : (numericValue - domainMin) / (domainMax - domainMin);
        const eased = Math.min(1, Math.max(0, normalized)) ** exponent;

        return currentRange[0] + eased * (currentRange[1] - currentRange[0]);
      },
      domain: [domainMin, domainMax],
      range: [...currentRange],
      rebuild: changes => build(changes.range ?? currentRange),
      ticks: count => {
        if (domainMax === domainMin) return [domainMin];
        const total = Math.max(2, Math.floor(count ?? 5));
        return Array.from(
          { length: total },
          (_value, index) => domainMin + (index / (total - 1)) * (domainMax - domainMin),
        );
      },
    });
    const range = context.range ?? context.defaultRange ?? [0, 1];
    return build([Number(range[0]), Number(range[1])]);
  },
});

/** Position consumer explicitly opts into the custom mathematical mapping */
export const easePositionChannel: PositionChannelDefinition = {
  kind: 'position',
  channel: 'ease-x',
  role: 'x',
  pick: mark => positionField(mark.encodings?.position?.x),
  scales: { 'ease-position': { continuity: 'continuous', allowsBaseline: true } },
};
