import type { PlotSpec } from '@retikz/plot';
import { renderPlot } from '@retikz/plot-vanilla';

import { sales } from './line-scatter.data';

/** vanilla 暂无组合 DSL，直接写规范化 Plot IR（与 React 端 <Plot>{marks} 装配出的等价） */
const spec: PlotSpec = {
  namespace: 'plot',
  type: 'plot',
  data: { ref: 'sales' },
  scales: [
    { type: 'linear', name: 'xMonth' },
    { type: 'linear', name: 'yRevenue' },
  ],
  coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
  marks: [
    { type: 'line', order: 'month', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } },
    { type: 'point', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } },
  ],
};

/** renderPlot = Plot IR + 外部数据 → SVG 字符串（SSR / 零 DOM） */
export const svg = renderPlot(spec, { sales }, { width: 360, height: 200 });
