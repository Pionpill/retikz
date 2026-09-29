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
        x="x"
        y="y"
        anchorId={{ prefix: 'node', field: 'id' }}
        color="group"
        label="label"
        labelPosition={values.nodeLabelPosition}
        labelTextColor="currentColor"
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
          color: { kind: 'constant', value: values.color },
          opacity: { kind: 'constant', value: values.opacity },
          strokeWidth: { kind: 'constant', value: values.strokeWidth },
          zIndex: { kind: 'constant', value: 1 },
        }}
        path={{
          label: {
            text: { field: 'relation' },
            position: values.labelPosition,
            ...(labelSide === 'center' ? { placement: 'inside' as const } : { side: labelSide }),
            sloped: values.labelSloped,
            textColor: 'currentColor',
          },
          routing,
          options: { marks: [{ pos: 1, mark: { kind: 'arrow' } }] },
        }}
      />
    </Plot>
  );
};
