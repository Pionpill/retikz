import type { FC } from 'react';

import { Axis, IntervalMark, Plot, RelationMark, Scale } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import {
  previewControlContract,
  RELATION_INTERVAL_CONTROL_IDS,
  relationDecreaseOperation,
  relationIncreaseOperation,
  relationIntervalControls,
  relationIntervalRowsOf,
} from './relation-interval.controls';

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const lineStyle = values[RELATION_INTERVAL_CONTROL_IDS.lineStyle];
  const labelSide = values[RELATION_INTERVAL_CONTROL_IDS.labelSide];
  const lineOptions =
    lineStyle === 'dashed'
      ? { dashPattern: [5, 4] }
      : lineStyle === 'dotted'
        ? { dashPattern: [1, 4], lineCap: 'round' as const }
        : {};
  const data = relationIntervalRowsOf(values);

  return (
    <Layout
      width={620}
      height={366}
      viewBox={{ x: -20, y: -50, width: 660, height: 390 }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <Plot data={data} width={620} height={320}>
        <Scale dimension="x" type="band" paddingOuter={0} />
        <Scale dimension="y" type="linear" domainPadding={{ lower: 0 }} />
        <Axis dimension="x" tickLabels={false} />
        <Axis dimension="y" grid ticks={{ count: 4 }} />
        <IntervalMark
          x="slot"
          y="value"
          color="phase"
          stroke="#ffffff"
          strokeWidth={0.8}
          label="label"
          labelPosition={values[RELATION_INTERVAL_CONTROL_IDS.barLabelPosition]}
          labelDistance={4}
          labelTextColor={values[RELATION_INTERVAL_CONTROL_IDS.barLabelColor]}
          labelFont={{ size: 10, weight: 'bold' }}
        />
        <RelationMark
          transform={[relationDecreaseOperation]}
          source={{ project: { x: 'sourceX', y: 'sourceY' } }}
          target={{ project: { x: 'targetX', y: 'targetY' } }}
          style={{
            color: { kind: 'constant', value: '#b91c1c' },
            strokeWidth: { kind: 'constant', value: values[RELATION_INTERVAL_CONTROL_IDS.strokeWidth] },
          }}
          path={{
            via: [{ project: { x: 'sourceX', y: 'sourceViaY' } }],
            routing: { kind: 'orthogonal', via: '-|', labelStep: 'main' },
            label: {
              text: { field: 'deltaLabel' },
              position: values[RELATION_INTERVAL_CONTROL_IDS.labelPosition],
              ...(labelSide === 'center' ? { placement: 'inside' as const } : { side: labelSide }),
              sloped: values[RELATION_INTERVAL_CONTROL_IDS.labelSloped],
              textColor: 'currentColor',
              font: { size: 10, weight: 'bold' },
            },
            options: {
              marks: [{ pos: 1, mark: { kind: 'arrow' } }],
              ...lineOptions,
            },
          }}
        />
        <RelationMark
          transform={[relationIncreaseOperation]}
          source={{ project: { x: 'sourceX', y: 'sourceY' } }}
          target={{ project: { x: 'targetX', y: 'targetY' } }}
          style={{
            color: { kind: 'constant', value: '#15803d' },
            strokeWidth: { kind: 'constant', value: values[RELATION_INTERVAL_CONTROL_IDS.strokeWidth] },
          }}
          path={{
            via: [{ project: { x: 'sourceX', y: 'sourceViaY' } }],
            routing: { kind: 'orthogonal', via: '-|', labelStep: 'main' },
            label: {
              text: { field: 'deltaLabel' },
              position: values[RELATION_INTERVAL_CONTROL_IDS.labelPosition],
              ...(labelSide === 'center' ? { placement: 'inside' as const } : { side: labelSide }),
              sloped: values[RELATION_INTERVAL_CONTROL_IDS.labelSloped],
              textColor: 'currentColor',
              font: { size: 10, weight: 'bold' },
            },
            options: {
              marks: [{ pos: 1, mark: { kind: 'arrow' } }],
              ...lineOptions,
            },
          }}
        />
      </Plot>
    </Layout>
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = relationIntervalControls;

const Demo: FC = controlledPreview.Component;

export default Demo;
