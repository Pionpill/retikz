import type { FC } from 'react';

import { PathMark, Plot, PlotAxis, PointMark, RelationMark } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import {
  previewControlContract,
  RELATION_PATH_CONTROL_IDS,
  relationPathExtremesControls,
  relationPathOperationOf,
} from './relation-path-extremes.controls';
import { pathExtremeRelations } from './relation-path-extremes.data';

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const labelSide = values[RELATION_PATH_CONTROL_IDS.labelSide];

  return (
    <Plot data={pathExtremeRelations} width={620} height={320} style={{ maxWidth: '100%', height: 'auto' }}>
      <PathMark
        x="x"
        y="y"
        order="order"
        stroke="#0f766e"
        strokeWidth={2.2}
        anchorId={{ prefix: 'trend', field: 'id' }}
      />
      <PointMark x="x" y="y" fill="#ffffff" stroke="#0f766e" strokeWidth={1} size={4.5} />
      <RelationMark
        transform={[relationPathOperationOf(values)]}
        source={{ anchorId: { prefix: 'trend', field: 'sourceId' } }}
        target={{ anchorId: { prefix: 'trend', field: 'targetId' } }}
        style={{
          color: { kind: 'constant', value: values[RELATION_PATH_CONTROL_IDS.color] },
          strokeWidth: { kind: 'constant', value: values[RELATION_PATH_CONTROL_IDS.strokeWidth] },
        }}
        path={{
          routing: {
            kind: 'bend',
            bendDirection: values[RELATION_PATH_CONTROL_IDS.bendDirection],
            bendAngle: values[RELATION_PATH_CONTROL_IDS.bendAngle],
          },
          label: {
            text: { field: 'deltaLabel' },
            position: values[RELATION_PATH_CONTROL_IDS.labelPosition],
            ...(labelSide === 'center' ? { placement: 'inside' as const } : { side: labelSide }),
            sloped: true,
            textColor: 'currentColor',
            font: { size: 11, weight: 'bold' },
          },
          options: { marks: [{ pos: 1, mark: { kind: 'arrow' } }] },
        }}
      />
      <PlotAxis dimension="x" grid />
      <PlotAxis dimension="y" grid />
    </Plot>
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = relationPathExtremesControls;

const Demo: FC = controlledPreview.Component;

export default Demo;
