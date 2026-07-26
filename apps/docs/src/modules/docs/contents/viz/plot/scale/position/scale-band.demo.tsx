import type { IRPlotScale, IRPlotSpec } from '@retikz/plot';

import { Plot } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, scaleBandControls } from './scale-band.controls';
import { segments } from './scale-band.data';

/** 注册回退使用的分类位置比例尺 controls */
export const previewControls = scaleBandControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const xScale: IRPlotScale =
    values.scaleType === 'band'
      ? {
          type: 'band',
          name: 'x',
          paddingInner: values.paddingInner,
          paddingOuter: values.paddingOuter,
        }
      : { type: 'point', name: 'x', padding: values.padding };

  const marks: IRPlotSpec['marks'] =
    values.scaleType === 'band'
      ? [
          {
            type: 'interval',
            encoding: { x: { field: 'segment' }, y: { field: 'revenue' } },
          },
        ]
      : [
          {
            type: 'path',
            encoding: { x: { field: 'segment' }, y: { field: 'revenue' } },
          },
          {
            type: 'point',
            size: { kind: 'constant', value: 6 },
            encoding: { x: { field: 'segment' }, y: { field: 'revenue' } },
          },
        ];

  const spec: IRPlotSpec = {
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [xScale, { type: 'linear', name: 'y' }],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks,
    guides: [
      { type: 'axis', dimension: 'x' },
      { type: 'axis', dimension: 'y', grid: true },
    ],
  };

  return (
    <Plot spec={spec} data={{ d: segments }} width={400} height={270} style={{ maxWidth: '100%', height: 'auto' }} />
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 用对应图元直接比较 band 格宽与 point 点位 */
export default controlledPreview.Component;
