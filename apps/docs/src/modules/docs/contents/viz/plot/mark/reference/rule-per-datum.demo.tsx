import type { FC } from 'react';

import { Axis, Legend, Plot, ReferenceMark } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, RULE_PER_DATUM_OFFSET_ID } from './rule-per-datum.controls';
import { thresholds } from './rule-per-datum.data';

/** per-datum 阈值线：y 绑 threshold 字段（字符串 → field，每行一条水平 rule），color 绑 tier 字段按类别上色 */
const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const data = thresholds.map(row => ({
    ...row,
    threshold: Number(row.threshold) + values[RULE_PER_DATUM_OFFSET_ID],
  }));

  return (
    <Layout width={620} height={280} style={{ maxWidth: '100%', height: 'auto' }}>
      <Plot
        data={data}
        model={[
          { name: 'tier', type: 'categorical' },
          { name: 'threshold', type: 'continuous' },
        ]}
        width={300}
        height={220}
        x={0}
        y={30}
      >
        <ReferenceMark y="threshold" color="tier" />
        <Axis dimension="y" grid />
        <Legend channel="color" />
      </Plot>
      <Plot
        data={data}
        model={[
          { name: 'tier', type: 'categorical' },
          { name: 'threshold', type: 'continuous' },
        ]}
        width={260}
        height={260}
        coordinate="polar2D"
        x={350}
        y={0}
      >
        <ReferenceMark y="threshold" color="tier" />
        <Axis dimension="y" grid />
        <Legend channel="color" />
      </Plot>
    </Layout>
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

const Demo: FC = controlledPreview.Component;

export default Demo;
