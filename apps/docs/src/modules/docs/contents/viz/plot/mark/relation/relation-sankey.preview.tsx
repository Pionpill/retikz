import { IntervalMark, PlotScale, RelationMark } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { PreviewPlot as Plot } from '@/modules/docs/components/component-preview/theme';

import { sankeyNodes, sankeyRelations } from './relation-sankey.data';

/** 图形参数 */
export type RelationSankeyPreviewValues = {
  opacity: number;
  samples: number;
  nodeStrokeWidth: number;
  nodeLabelPosition: 'top' | 'bottom' | 'right' | 'left';
  nodeLabelDistance: number;
};

/** 绘制示例图形 */
export const RelationSankeyPreview = (values: RelationSankeyPreviewValues) => (
  <Layout viewBox={{ x: 0, y: 0, width: 620, height: 360 }}>
    <Plot data={sankeyRelations} width={620} height={320} position={[0, 42]}>
      <RelationMark
        encodings={{
          source: { position: { x: { field: 'sourceX' }, y: { field: 'sourceY' } } },
          target: { position: { x: { field: 'targetX' }, y: { field: 'targetY' } } },
          fill: 'flowFill',
          geometry: { width: 'width' },
        }}
        properties={{
          stroke: 'none',
          opacity: { fill: values.opacity },
          geometry: {
            kind: 'ribbon',
            options: { sampling: { kind: 'fixed', samples: values.samples }, align: 'center' },
          },
        }}
      />
      <PlotScale dimension="x" type="linear" domain={[0, 3]} domainPadding={0} />
      <PlotScale dimension="y" type="linear" domain={[0, 100]} domainPadding={0} />
    </Plot>
    <Plot data={sankeyNodes} width={620} height={320} position={[0, 42]}>
      <IntervalMark
        encodings={{
          bounds: {
            x: { from: { field: 'nodeX0' }, to: { field: 'nodeX1' } },
            y: { from: { field: 'nodeY0' }, to: { field: 'nodeY1' } },
          },
          fill: 'nodeFill',
          label: { text: 'nodeLabel' },
        }}
        properties={{
          bounds: { x: { kind: 'extent' }, y: { kind: 'extent' } },
          stroke: '#ffffff',
          strokeWidth: values.nodeStrokeWidth,
          label: {
            position: values.nodeLabelPosition,
            distance: values.nodeLabelDistance,
            textColor: 'currentColor',
            font: { size: 11, weight: 'bold' },
          },
        }}
      />
      <PlotScale dimension="x" type="linear" domain={[0, 3]} domainPadding={0} />
      <PlotScale dimension="y" type="linear" domain={[0, 100]} domainPadding={0} />
    </Plot>
  </Layout>
);
