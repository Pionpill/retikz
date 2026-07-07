import { plotBuilder, renderPlot } from '@retikz/plot-vanilla';

import { sales } from './line-scatter.data';

/** plotBuilder 生成 plain PlotSpec；builder-only 字段会在 build() 前展开，不进入 IR */
const spec = plotBuilder({
  data: { reference: 'sales' },
  scales: [
    { type: 'linear', name: 'xMonth' },
    { type: 'linear', name: 'yRevenue' },
  ],
  coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
})
  .path({ type: 'path', order: 'month', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } })
  .point({ type: 'point', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } })
  .axis({ type: 'axis', dimension: 'x' })
  .axis({ type: 'axis', dimension: 'y', grid: true })
  .build();

/** renderPlot = Plot IR + 外部数据 → SVG 字符串（SSR / 零 DOM） */
export const svg = renderPlot(spec, { sales }, { width: 360, height: 200 });
