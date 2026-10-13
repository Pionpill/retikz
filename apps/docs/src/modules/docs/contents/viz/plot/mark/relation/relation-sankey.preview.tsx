import { IntervalMark, BuiltinPlotScale, RelationMark } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { PreviewPlot as Plot } from '@/modules/docs/components/component-preview/theme';

import { sankeyData } from './relation-sankey.data';

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
    <Plot data={sankeyData} width={620} height={320} position={[0, 42]}>
      <RelationMark
        kind="ribbon"
        source={{ project: { x: 'sourceX', y: 'sourceY' } }}
        target={{ project: { x: 'targetX', y: 'targetY' } }}
        style={{
          fill: { kind: 'field', value: 'flowFill' },
          stroke: { kind: 'constant', value: 'none' },
          opacity: { fill: { kind: 'constant', value: values.opacity } },
        }}
        ribbon={{
          width: { kind: 'field', value: 'width' },
          options: { sampling: { kind: 'fixed', samples: values.samples }, align: 'center' },
        }}
      />
      <IntervalMark
        bounds={{
          x: { kind: 'extent', from: 'nodeX0', to: 'nodeX1' },
          y: { kind: 'extent', from: 'nodeY0', to: 'nodeY1' },
        }}
        fill="nodeFill"
        stroke="#ffffff"
        strokeWidth={values.nodeStrokeWidth}
        label={{
          field: 'nodeLabel',
          position: values.nodeLabelPosition,
          distance: values.nodeLabelDistance,
          textColor: 'currentColor',
          font: { size: 11, weight: 'bold' },
        }}
      />
      <BuiltinPlotScale dimension="x" type="linear" domain={[0, 3]} domainPadding={0} />
      <BuiltinPlotScale dimension="y" type="linear" domain={[0, 100]} domainPadding={0} />
    </Plot>
  </Layout>
);
