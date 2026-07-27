import type { FC } from 'react';

import { Plot, PointMark, RelationMark } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import {
  previewControlContract,
  RELATION_SCATTER_CONTROL_IDS,
  relationScatterControls,
} from './relation-scatter.controls';
import { scatterRelations } from './relation-scatter.data';

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const routingKind = values[RELATION_SCATTER_CONTROL_IDS.routing];
  const labelSide = values[RELATION_SCATTER_CONTROL_IDS.labelSide];
  const routing =
    routingKind === 'orthogonal'
      ? ({ kind: 'orthogonal', via: '-|' } as const)
      : routingKind === 'bend'
        ? ({ kind: 'bend' } as const)
        : ({ kind: 'line' } as const);

  return (
    <Plot data={scatterRelations} width={620} height={320} style={{ maxWidth: '100%', height: 'auto' }}>
      <PointMark
        id="scatter-nodes"
        x="x"
        y="y"
        anchorId={{ prefix: 'node', field: 'id' }}
        color="group"
        label="label"
        labelPosition={values[RELATION_SCATTER_CONTROL_IDS.nodeLabelPosition]}
        fill="#f8fafc"
        stroke="#334155"
        strokeWidth={1}
        size={7}
        zIndex={2}
      />
      <RelationMark
        source={{ anchorId: { prefix: 'node', field: 'id' } }}
        target={{ anchorId: { prefix: 'node', field: 'target' } }}
        style={{
          color: { kind: 'constant', value: values[RELATION_SCATTER_CONTROL_IDS.color] },
          opacity: { kind: 'constant', value: values[RELATION_SCATTER_CONTROL_IDS.opacity] },
          strokeWidth: { kind: 'constant', value: values[RELATION_SCATTER_CONTROL_IDS.strokeWidth] },
          zIndex: { kind: 'constant', value: 1 },
        }}
        path={{
          label: {
            text: { field: 'relation' },
            position: values[RELATION_SCATTER_CONTROL_IDS.labelPosition],
            ...(labelSide === 'center' ? { placement: 'inside' as const } : { side: labelSide }),
            sloped: values[RELATION_SCATTER_CONTROL_IDS.labelSloped],
          },
          routing,
          options: { marks: [{ pos: 1, mark: { kind: 'arrow' } }] },
        }}
      />
    </Plot>
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = relationScatterControls;

const Demo: FC = controlledPreview.Component;

export default Demo;
