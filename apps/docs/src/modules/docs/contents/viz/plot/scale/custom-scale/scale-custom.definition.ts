import type { PositionScale } from '@retikz/plot';

import { defineScale, PositionScaleContinuity } from '@retikz/plot';
import { z } from 'zod';

const BrandColorScaleSchema = z.strictObject({
  type: z.literal('brand').describe('Discriminator: custom brand color scale'),
  name: z.string().min(1).describe('Scale name referenced by a color channel'),
});

/** 自定义颜色比例尺：分类值映射到固定品牌色板 */
export const brandColorScale = defineScale({
  family: 'channel',
  schema: BrandColorScaleSchema,
  isFieldCompatible: fieldType => fieldType === undefined || fieldType === 'categorical',
  resolve: (_definition, values) => {
    const palette = ['#2563eb', '#16a34a', '#dc2626', '#d97706'];
    const domain = [...new Set(values.filter((value): value is string => typeof value === 'string'))];
    const colors = domain.map((_category, index) => palette[index % palette.length]);
    const colorByCategory = new Map(domain.map((category, index) => [category, colors[index]] as const));
    return {
      of: value => (typeof value === 'string' ? colorByCategory.get(value) : undefined),
      legendForm: 'swatch' as const,
      domain,
      range: colors,
      scaleType: 'brand',
    };
  },
});

const EasePositionScaleSchema = z.strictObject({
  type: z.literal('ease-position').describe('Discriminator: custom eased position scale'),
  name: z.string().min(1).describe('Scale name referenced by a coordinate role'),
  exponent: z.number().positive().optional().describe('Positive exponent applied to normalized positions'),
});

/** 自定义位置比例尺：把归一化位置按指数重新分布，同时实现完整 PositionScale 契约 */
export const easePositionScale = defineScale({
  family: 'position',
  continuity: PositionScaleContinuity.Continuous,
  schema: EasePositionScaleSchema,
  isFieldCompatible: fieldType => fieldType === undefined || fieldType === 'continuous',
  allowsBaseline: true,
  resolve: (definition, values, fallbackRange): PositionScale => {
    const numeric = values.map(Number).filter(Number.isFinite);
    const domainMin = numeric.length > 0 ? Math.min(...numeric) : 0;
    const domainMax = numeric.length > 0 ? Math.max(...numeric) : 1;
    const exponent = definition.exponent ?? 2;
    let currentRange: [number, number] = [fallbackRange[0], fallbackRange[1]];

    return {
      coordinate: value => {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue)) return Number.NaN;
        const normalized = domainMax === domainMin ? 0.5 : (numericValue - domainMin) / (domainMax - domainMin);
        const eased = Math.min(1, Math.max(0, normalized)) ** exponent;
        return currentRange[0] + eased * (currentRange[1] - currentRange[0]);
      },
      domain: () => [domainMin, domainMax],
      bandwidth: 0,
      ticks: count => {
        if (domainMax === domainMin) return { values: [domainMin], labels: [String(domainMin)] };
        const total = Math.max(2, Math.floor(count ?? 5));
        const tickValues = Array.from(
          { length: total },
          (_value, index) => domainMin + (index / (total - 1)) * (domainMax - domainMin),
        );
        return {
          values: tickValues,
          labels: tickValues.map(value => String(Number(value.toFixed(2)))),
        };
      },
      tickKind: 'number',
      range: () => [currentRange[0], currentRange[1]],
      setRange: range => {
        currentRange = [range[0], range[1]];
      },
    };
  },
});
