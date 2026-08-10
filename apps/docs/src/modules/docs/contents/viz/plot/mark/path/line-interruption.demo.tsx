import type { FC } from 'react';

import { Axis, Legend, PathMark, Plot, Scale } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import {
  LINE_INTERRUPTION_CONNECT_NULLS_ID,
  LINE_INTERRUPTION_CONTROL_IDS,
  previewControlContract,
} from './line-interruption.controls';
import { interruptedArea } from './line-interruption.data';

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const coordinate = values[LINE_INTERRUPTION_CONTROL_IDS.coordinate];
  return (
    <Plot
      data={interruptedArea}
      width={400}
      height={280}
      coordinate={coordinate === 'polar2D' ? 'polar2D' : undefined}
      plotTheme={{ palette: { categorical: ['#0f8f98', '#8cf27e'] } }}
    >
      <Scale dimension="x" type="linear" domainPadding={0} />
      <Scale dimension="y" type="linear" domainPadding={0} />
      {values[LINE_INTERRUPTION_CONTROL_IDS.showFill] ? (
        <PathMark
          x="year"
          y="amount"
          order="year"
          series="name"
          color="name"
          fill="name"
          closure={{ kind: 'baseline' }}
          closed={false}
          connectNulls={values[LINE_INTERRUPTION_CONNECT_NULLS_ID]}
          stroke="none"
          opacity={0.38}
        />
      ) : null}
      <PathMark
        x="year"
        y="amount"
        order="year"
        series="name"
        color="name"
        closed={coordinate === 'polar2D' && values[LINE_INTERRUPTION_CONTROL_IDS.closed]}
        connectNulls={values[LINE_INTERRUPTION_CONNECT_NULLS_ID]}
        strokeWidth={2.4}
      />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
      <Legend channel="color" />
    </Plot>
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

const Demo: FC = controlledPreview.Component;

export default Demo;
