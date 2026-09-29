import { Plot, PlotAxis, PointMark, RelationMark } from '@retikz/plot-react';

import { relationBubbleOperation } from './relation-bubble.controls';
import { bubbleNodes } from './relation-bubble.data';

/** 图形参数 */
export type RelationBubblePreviewValues = {
  labelSide: 'top' | 'bottom' | 'center';
  nodeLabelPosition: 'top' | 'bottom' | 'right' | 'left';
  nodeOpacity: number;
  color: string;
  strokeWidth: number;
  labelPosition: number;
  labelSloped: boolean;
};

/** 绘制示例图形 */
export const RelationBubblePreview = (values: RelationBubblePreviewValues) => {
  const labelSide = values.labelSide;

  return (
    <Plot data={bubbleNodes} width={620} height={320}>
      <PointMark
        x="x"
        y="y"
        size="value"
        color="segment"
        anchorId={{ prefix: 'bubble', field: 'id' }}
        label="label"
        labelPosition={values.nodeLabelPosition}
        labelTextColor="currentColor"
        fillOpacity={values.nodeOpacity}
        stroke="#0f172a"
        strokeWidth={0.8}
      />
      <RelationMark
        transform={[relationBubbleOperation]}
        source={{ anchorId: { prefix: 'bubble', field: 'sourceId' }, boundary: true }}
        target={{ anchorId: { prefix: 'bubble', field: 'targetId' }, boundary: true }}
        style={{
          color: { kind: 'constant', value: values.color },
          strokeWidth: { kind: 'constant', value: values.strokeWidth },
        }}
        path={{
          label: {
            text: { field: 'relLabel' },
            position: values.labelPosition,
            ...(labelSide === 'center' ? { placement: 'inside' as const } : { side: labelSide }),
            sloped: values.labelSloped,
            textColor: 'currentColor',
          },
          options: { marks: [{ pos: 1, mark: { kind: 'arrow' } }], roundedCorners: 8 },
        }}
      />
      <PlotAxis dimension="x" grid />
      <PlotAxis dimension="y" grid />
    </Plot>
  );
};
