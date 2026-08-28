import type { FC } from 'react';

import { Plot, PlotAxis, PlotLegend, ReferenceMark } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import {
  previewControlContract,
  RULE_PER_DATUM_COORDINATE_ID,
  RULE_PER_DATUM_OFFSET_ID,
} from './rule-per-datum.controls';
import { thresholds } from './rule-per-datum.data';

/** per-datum 阈值线：y 绑 threshold 字段（字符串 → field，每行一条水平 rule），color 绑 tier 字段按类别上色 */
const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const data = thresholds.map(row => ({
    ...row,
    threshold: Number(row.threshold) + values[RULE_PER_DATUM_OFFSET_ID],
  }));

  return (
    <Plot
      data={data}
      model={[
        { name: 'tier', type: 'categorical' },
        { name: 'threshold', type: 'continuous' },
      ]}
      width={400}
      height={280}
      coordinate={values[RULE_PER_DATUM_COORDINATE_ID] === 'polar2D' ? 'polar2D' : undefined}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <ReferenceMark y="threshold" color="tier" />
      <PlotAxis dimension="y" grid />
      <PlotLegend channel="color" />
    </Plot>
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

const Demo: FC = controlledPreview.Component;

export default Demo;
