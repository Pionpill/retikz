import type { FC } from 'react';

import { IntervalMark, RelationMark, Scale } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { PreviewPlot as Plot } from '@/modules/docs/components/component-preview/theme';
import { defineControlledPreview } from '@/modules/docs/preview';

import {
  previewControlContract,
  RELATION_SANKEY_CONTROL_IDS,
  relationSankeyControls,
} from './relation-sankey.controls';
import { sankeyData } from './relation-sankey.data';

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Layout
    width={620}
    height={360}
    viewBox={{ x: 0, y: 0, width: 620, height: 360 }}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <Plot data={sankeyData} width={620} height={320} y={42}>
      <RelationMark
        kind="ribbon"
        source={{ project: { x: 'sourceX', y: 'sourceY' } }}
        target={{ project: { x: 'targetX', y: 'targetY' } }}
        style={{
          fill: { kind: 'field', value: 'flowFill' },
          fillOpacity: { kind: 'constant', value: values[RELATION_SANKEY_CONTROL_IDS.opacity] },
          stroke: { kind: 'constant', value: 'none' },
        }}
        ribbon={{
          width: { kind: 'field', value: 'width' },
          options: { samples: values[RELATION_SANKEY_CONTROL_IDS.samples], align: 'center' },
        }}
      />
      <IntervalMark
        bounds={{
          x: { kind: 'extent', from: 'nodeX0', to: 'nodeX1' },
          y: { kind: 'extent', from: 'nodeY0', to: 'nodeY1' },
        }}
        fill="nodeFill"
        stroke="#ffffff"
        strokeWidth={values[RELATION_SANKEY_CONTROL_IDS.nodeStrokeWidth]}
        label="nodeLabel"
        labelPosition={values[RELATION_SANKEY_CONTROL_IDS.nodeLabelPosition]}
        labelDistance={values[RELATION_SANKEY_CONTROL_IDS.nodeLabelDistance]}
        labelTextColor="currentColor"
        labelFont={{ size: 11, weight: 'bold' }}
      />
      <Scale dimension="x" type="linear" domain={[0, 3]} domainPadding={0} />
      <Scale dimension="y" type="linear" domain={[0, 100]} domainPadding={0} />
    </Plot>
  </Layout>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = relationSankeyControls;

const Demo: FC = controlledPreview.Component;

export default Demo;
