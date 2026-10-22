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
        encodings={{
          size: 'value',
          color: 'segment',
          anchorId: 'id',
          label: { content: 'label' },
          position: { x: { field: 'x' }, y: { field: 'y' } },
        }}
        properties={{
          anchorId: { prefix: 'bubble' },
          label: { position: values.nodeLabelPosition, textColor: 'currentColor' },
          opacity: { fill: values.nodeOpacity },
          stroke: '#0f172a',
          strokeWidth: 0.8,
        }}
      />
      <RelationMark
        transforms={[{ operation: relationBubbleOperation }]}
        encodings={{
          source: { anchorId: 'sourceId' },
          target: { anchorId: 'targetId' },
          geometry: { label: { text: 'relLabel' } },
        }}
        properties={{
          source: { anchorId: { prefix: 'bubble' }, boundary: true },
          target: { anchorId: { prefix: 'bubble' }, boundary: true },
          color: values.color,
          strokeWidth: values.strokeWidth,
          geometry: {
            kind: 'path',
            label: {
              position: values.labelPosition,
              ...(labelSide === 'center' ? { placement: 'inside' as const } : { side: labelSide }),
              sloped: values.labelSloped,
              textColor: 'currentColor',
            },
            options: { marks: [{ pos: 1, mark: { kind: 'arrow' } }], roundedCorners: 8 },
          },
        }}
      />
      <PlotAxis dimension="x" grid />
      <PlotAxis dimension="y" grid />
    </Plot>
  );
};
