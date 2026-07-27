import type { FC } from 'react';

import { Axis, Plot, PointMark, RelationMark } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import {
  previewControlContract,
  RELATION_BUBBLE_CONTROL_IDS,
  relationBubbleControls,
} from './relation-bubble.controls';
import { bubbleNodes } from './relation-bubble.data';

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const labelSide = values[RELATION_BUBBLE_CONTROL_IDS.labelSide];

  return (
    <Plot data={bubbleNodes} width={620} height={320} style={{ maxWidth: '100%', height: 'auto' }}>
      <PointMark
        x="x"
        y="y"
        size="value"
        color="segment"
        anchorId={{ prefix: 'bubble', field: 'id' }}
        label="label"
        labelPosition={values[RELATION_BUBBLE_CONTROL_IDS.nodeLabelPosition]}
        fillOpacity={values[RELATION_BUBBLE_CONTROL_IDS.nodeOpacity]}
        stroke="#0f172a"
        strokeWidth={0.8}
      />
      <RelationMark
        transform={[
          {
            kind: 'relate',
            source: { selector: { kind: 'max', by: 'value' }, fields: { id: 'id' } },
            target: { selector: { kind: 'max', by: 'y' }, fields: { id: 'id' } },
            measures: [{ op: 'difference', field: 'y', as: 'delta', labelAs: 'relLabel', labelPrefix: 'lift +' }],
          },
        ]}
        source={{ anchorId: { prefix: 'bubble', field: 'sourceId' }, boundary: true }}
        target={{ anchorId: { prefix: 'bubble', field: 'targetId' }, boundary: true }}
        style={{
          color: { kind: 'constant', value: values[RELATION_BUBBLE_CONTROL_IDS.color] },
          strokeWidth: { kind: 'constant', value: values[RELATION_BUBBLE_CONTROL_IDS.strokeWidth] },
        }}
        path={{
          label: {
            text: { field: 'relLabel' },
            position: values[RELATION_BUBBLE_CONTROL_IDS.labelPosition],
            ...(labelSide === 'center' ? { placement: 'inside' as const } : { side: labelSide }),
            sloped: values[RELATION_BUBBLE_CONTROL_IDS.labelSloped],
          },
          options: { marks: [{ pos: 1, mark: { kind: 'arrow' } }], roundedCorners: 8 },
        }}
      />
      <Axis dimension="x" grid />
      <Axis dimension="y" grid />
    </Plot>
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = relationBubbleControls;

const Demo: FC = controlledPreview.Component;

export default Demo;
