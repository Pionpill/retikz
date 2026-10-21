import { Plot, PointMark, RelationMark } from '@retikz/plot-react';

import { scatterRelations } from './relation-scatter.data';

/** 图形参数 */
export type RelationScatterPreviewValues = {
  routing: 'line' | 'bend' | 'orthogonal';
  labelSide: 'top' | 'bottom' | 'center';
  nodeLabelPosition: 'top' | 'bottom' | 'right' | 'left';
  color: string;
  opacity: number;
  strokeWidth: number;
  labelPosition: number;
  labelSloped: boolean;
};

/** 绘制示例图形 */
export const RelationScatterPreview = (values: RelationScatterPreviewValues) => {
  const routingKind = values.routing;
  const labelSide = values.labelSide;
  const routing =
    routingKind === 'orthogonal'
      ? ({ kind: 'orthogonal', via: '-|' } as const)
      : routingKind === 'bend'
        ? ({ kind: 'bend' } as const)
        : ({ kind: 'line' } as const);

  return (
    <Plot data={scatterRelations} width={620} height={320}>
      <PointMark
        id="scatter-nodes"
        encodings={{ anchorId: 'id', color: 'group', label: { content: 'label' }, position: { x: 'x', y: 'y' } }}
        properties={{
          anchorId: { prefix: 'node' },
          label: { position: values.nodeLabelPosition, textColor: 'currentColor' },
          fill: '#f8fafc',
          stroke: '#334155',
          strokeWidth: 1,
          size: 7,
          zIndex: 2,
        }}
      />
      <RelationMark
        encodings={{
          source: { anchorId: 'id' },
          target: { anchorId: 'target' },
          geometry: { label: { text: 'relation' } },
        }}
        properties={{
          source: { anchorId: { prefix: 'node' } },
          target: { anchorId: { prefix: 'node' } },
          color: values.color,
          strokeWidth: values.strokeWidth,
          zIndex: 1,
          opacity: { overall: values.opacity },
          geometry: {
            kind: 'path',
            label: {
              position: values.labelPosition,
              ...(labelSide === 'center' ? { placement: 'inside' as const } : { side: labelSide }),
              sloped: values.labelSloped,
              textColor: 'currentColor',
            },
            routing,
            options: { marks: [{ pos: 1, mark: { kind: 'arrow' } }] },
          },
        }}
      />
    </Plot>
  );
};
