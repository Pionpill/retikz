import { PathMark, Plot, PlotAxis, PointMark, RelationMark } from '@retikz/plot-react';

import { RELATION_PATH_CONTROL_IDS, relationPathOperationOf } from './relation-path-extremes.controls';
import { pathExtremeRelations } from './relation-path-extremes.data';

/** 图形参数 */
export type RelationPathExtremesPreviewValues = {
  'relation-path-anchor': 'x' | 'y';
  'relation-path-bend-direction': 'right' | 'left';
  'relation-path-bend-angle': number;
  'relation-path-color': string;
  'relation-path-stroke-width': number;
  'relation-path-label-position': number;
  'relation-path-label-side': 'top' | 'bottom' | 'center';
};

/** 绘制示例图形 */
export const RelationPathExtremesPreview = (values: RelationPathExtremesPreviewValues) => {
  const labelSide = values[RELATION_PATH_CONTROL_IDS.labelSide];

  return (
    <Plot data={pathExtremeRelations} width={620} height={320}>
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
        transform={[{ operation: relationPathOperationOf(values) }]}
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
};
