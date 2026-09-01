import type { FC } from 'react';

import { PathMark, Plot, PlotAxis, PlotScale } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import {
  LINE_CLOSURE_BASELINE_ID,
  LINE_CLOSURE_CONTROL_IDS,
  LINE_CLOSURE_HORIZONTAL_PADDING_ID,
  LINE_CLOSURE_VERTICAL_PADDING_ID,
  previewControlContract,
} from './line-closure.controls';
import { closureTrend } from './line-closure.data';

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const coordinate = values[LINE_CLOSURE_CONTROL_IDS.coordinate];
  const mode = values[LINE_CLOSURE_CONTROL_IDS.mode];
  const closure =
    mode === 'baseline'
      ? { kind: 'baseline' as const, baseline: values[LINE_CLOSURE_BASELINE_ID] }
      : mode === 'cycle'
        ? { kind: 'cycle' as const }
        : undefined;

  return (
    <Plot data={closureTrend} width={400} height={280} coordinate={coordinate === 'polar2D' ? 'polar2D' : undefined}>
      <PlotScale dimension="x" type="point" padding={values[LINE_CLOSURE_HORIZONTAL_PADDING_ID]} />
      <PlotScale
        dimension="y"
        type="linear"
        domainPadding={{
          kind: 'ratio',
          lower: values[LINE_CLOSURE_VERTICAL_PADDING_ID],
          upper: values[LINE_CLOSURE_VERTICAL_PADDING_ID],
        }}
      />
      <PathMark
        x="month"
        y="value"
        order="order"
        closure={closure}
        closed={coordinate === 'polar2D' && values[LINE_CLOSURE_CONTROL_IDS.closed]}
        fill={
          closure === undefined
            ? 'none'
            : {
                kind: 'constant',
                value: `rgba(56, 189, 248, ${values[LINE_CLOSURE_CONTROL_IDS.fillOpacity]})`,
              }
        }
        stroke="#0284c7"
        strokeWidth={3}
        lineJoin="round"
      />
      <PlotAxis dimension="x" />
      <PlotAxis dimension="y" grid />
    </Plot>
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

const Demo: FC = controlledPreview.Component;

export default Demo;
