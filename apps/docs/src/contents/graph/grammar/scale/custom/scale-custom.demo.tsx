import { type PlotSpec, defineScale } from '@retikz/plot';
import { Plot } from '@retikz/plot-react';
import type { FC } from 'react';
import { z } from 'zod';

import { scaleCustomRows } from './scale-custom.data';

// 自定义 channel scale：分类值 → 固定品牌色板；resolve 单次产 evaluator + legend 同源数据（legendForm swatch）。
const brandColor = defineScale({
  family: 'channel',
  schema: z.object({
    type: z.literal('brand').describe('Discriminator: custom brand color scale'),
    name: z.string().min(1).describe('Scale name referenced by a color channel'),
  }),
  isFieldCompatible: fieldType => fieldType === undefined || fieldType === 'categorical',
  resolve: (_def, values) => {
    const palette = ['#2563eb', '#16a34a', '#dc2626', '#d97706'];
    const domain = [...new Set(values.filter((value): value is string => typeof value === 'string'))];
    const colors = domain.map((_category, index) => palette[index % palette.length]);
    const colorByCategory = new Map(domain.map((category, index) => [category, colors[index]] as const));
    return {
      of: value => (typeof value === 'string' ? colorByCategory.get(value) : undefined),
      legendForm: 'swatch',
      domain,
      range: colors,
      scaleType: 'brand',
    };
  },
});

// 自定义 scale 不参与 React 自动派生：经完整 spec 的 scales 引用，definition 走 scaleDefinitions 注入。
const spec: PlotSpec = {
  namespace: 'plot',
  type: 'plot',
  data: { reference: 'pts' },
  scales: [
    { type: 'linear', name: 'x' },
    { type: 'linear', name: 'y' },
    { type: 'brand', name: 'col' },
  ],
  coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
  marks: [
    {
      type: 'point',
      size: { kind: 'constant', value: 7 },
      color: { kind: 'field', value: 'tier', scale: 'col' },
      encoding: { x: { field: 'x' }, y: { field: 'y' } },
    },
  ],
  guides: [
    { type: 'axis', dimension: 'x' },
    { type: 'axis', dimension: 'y', grid: true },
    { type: 'legend', channel: 'color' },
  ],
};

const Demo: FC = () => <Plot spec={spec} data={{ pts: scaleCustomRows }} scaleDefinitions={[brandColor]} width={420} height={260} style={{ maxWidth: '100%', height: 'auto' }} />;

export default Demo;
