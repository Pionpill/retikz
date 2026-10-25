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
        encodings={{ order: 'order', anchorId: 'id', position: { x: { field: 'x' }, y: { field: 'y' } } }}
        properties={{ stroke: '#0f766e', strokeWidth: 2.2, anchorId: { prefix: 'trend' } }}
      />
      <PointMark
        encodings={{ position: { x: { field: 'x' }, y: { field: 'y' } } }}
        properties={{ fill: '#ffffff', stroke: '#0f766e', strokeWidth: 1, size: 4.5 }}
      />
      <RelationMark
        transforms={[{ operation: relationPathOperationOf(values) }]}
        encodings={{
          source: { anchorId: 'sourceId' },
          target: { anchorId: 'targetId' },
          geometry: { label: { text: 'deltaLabel' } },
        }}
        properties={{
          source: { anchorId: { prefix: 'trend' } },
          target: { anchorId: { prefix: 'trend' } },
          color: values[RELATION_PATH_CONTROL_IDS.color],
          strokeWidth: values[RELATION_PATH_CONTROL_IDS.strokeWidth],
          geometry: {
            kind: 'path',
            routing: {
              kind: 'bend',
              bendDirection: values[RELATION_PATH_CONTROL_IDS.bendDirection],
              bendAngle: values[RELATION_PATH_CONTROL_IDS.bendAngle],
            },
            label: {
              position: values[RELATION_PATH_CONTROL_IDS.labelPosition],
              side: labelSide,
              sloped: true,
              textColor: 'currentColor',
              font: { size: 11, weight: 'bold' },
            },
            options: { arrow: { end: {} } },
          },
        }}
      />
      <PlotAxis dimension="x" grid />
      <PlotAxis dimension="y" grid />
    </Plot>
  );
};
