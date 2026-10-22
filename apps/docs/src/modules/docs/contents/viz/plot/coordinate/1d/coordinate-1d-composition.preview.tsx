import type { IRPlotRelationRouting } from '@retikz/plot';
import { Plot, PlotAxis, PlotScale, PointMark, RelationMark } from '@retikz/plot-react';

import { coordinate1DCompositionOperation } from './coordinate-1d-composition.controls';
import { coordinate1DCompositionRows } from './coordinate-1d-composition.zh.data';

/** 图形参数 */
export type Coordinate1dCompositionPreviewValues = {
  routing: 'bend' | 'line' | 'orthogonal';
  orthogonalVia: '-|' | '|-';
  bendDirection: 'left' | 'right';
  bendAngle: number;
  sourcePointSize: number;
  sourceLabelVisible: boolean;
  sourceLabelDistance: number;
  sourceLabelSize: number;
  sourceLabelRotate: number;
  targetPointSize: number;
  targetLabelVisible: boolean;
  targetLabelSize: number;
  relationOpacity: number;
  relationStrokeWidth: number;
  axisVisible: boolean;
  axisStroke: string;
  axisStrokeWidth: number;
};

/** 绘制示例图形 */
export const Coordinate1dCompositionPreview = (values: Coordinate1dCompositionPreviewValues) => {
  const routing: IRPlotRelationRouting =
    values.routing === 'line'
      ? { kind: 'line' }
      : values.routing === 'orthogonal'
        ? {
            kind: 'orthogonal',
            via: values.orthogonalVia,
          }
        : {
            kind: 'bend',
            bendDirection: values.bendDirection,
            bendAngle: values.bendAngle,
          };

  return (
    <Plot data={coordinate1DCompositionRows} coordinate="cartesian1D" width={560} height={250}>
      <PlotScale dimension="x" type="linear" domain={[0, 12.5]} />
      <PointMark
        encodings={{
          anchorId: 'thingId',
          fill: 'relationColor',
          ...(values.sourceLabelVisible ? { label: { content: 'thingLabel' } } : {}),
          position: { x: { field: 'thingX' } },
        }}
        properties={{
          anchorId: { prefix: 'thing' },
          stroke: '#ffffff',
          strokeWidth: 1.5,
          size: values.sourcePointSize,
          label: values.sourceLabelVisible
            ? {
                position: 'top',
                distance: values.sourceLabelDistance,
                textColor: '#475569',
                font: {
                  size: values.sourceLabelSize,
                  weight: 'bold',
                },
                rotate: values.sourceLabelRotate,
              }
            : undefined,
          zIndex: 2,
        }}
      />
      <PointMark
        transforms={[{ operation: coordinate1DCompositionOperation }]}
        encodings={{
          anchorId: 'practiceId',
          text: 'practiceGlyph',
          textColor: 'relationColor',
          position: { x: { field: 'practiceX' } },
        }}
        properties={{
          anchorId: { prefix: 'practice' },
          font: {
            size: values.targetPointSize,
            weight: 'bold',
          },
          dy: 72,
          zIndex: 2,
        }}
      />
      {values.targetLabelVisible ? (
        <PointMark
          transforms={[{ operation: coordinate1DCompositionOperation }]}
          encodings={{ text: 'practiceLabel', position: { x: { field: 'practiceX' } } }}
          properties={{
            textColor: '#334155',
            font: {
              size: values.targetLabelSize,
              weight: 'bold',
            },
            dy: 100,
            zIndex: 2,
          }}
        />
      ) : null}
      <RelationMark
        encodings={{ source: { anchorId: 'thingId' }, target: { anchorId: 'practiceId' }, color: 'relationColor' }}
        properties={{
          source: { anchorId: { prefix: 'thing' } },
          target: { anchorId: { prefix: 'practice' } },
          strokeWidth: values.relationStrokeWidth,
          zIndex: 1,
          opacity: { overall: values.relationOpacity },
          geometry: { kind: 'path', routing },
        }}
      />
      {values.axisVisible ? (
        <PlotAxis
          dimension="x"
          line={{
            stroke: values.axisStroke,
            strokeWidth: values.axisStrokeWidth,
          }}
        />
      ) : null}
    </Plot>
  );
};
