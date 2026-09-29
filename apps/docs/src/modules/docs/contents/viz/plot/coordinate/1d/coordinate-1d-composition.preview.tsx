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
        x="thingX"
        anchorId={{ prefix: 'thing', field: 'thingId' }}
        fill={{ kind: 'field', value: 'relationColor' }}
        stroke="#ffffff"
        strokeWidth={1.5}
        size={values.sourcePointSize}
        label={values.sourceLabelVisible ? 'thingLabel' : undefined}
        labelPosition="top"
        labelDistance={values.sourceLabelDistance}
        labelTextColor="#475569"
        labelFont={{
          size: values.sourceLabelSize,
          weight: 'bold',
        }}
        labelRotate={values.sourceLabelRotate}
        zIndex={2}
      />
      <PointMark
        transform={[coordinate1DCompositionOperation]}
        x="practiceX"
        anchorId={{ prefix: 'practice', field: 'practiceId' }}
        text="practiceGlyph"
        textColor={{ kind: 'field', value: 'relationColor' }}
        font={{
          size: values.targetPointSize,
          weight: 'bold',
        }}
        dy={72}
        zIndex={2}
      />
      {values.targetLabelVisible ? (
        <PointMark
          transform={[coordinate1DCompositionOperation]}
          x="practiceX"
          text="practiceLabel"
          textColor="#334155"
          font={{
            size: values.targetLabelSize,
            weight: 'bold',
          }}
          dy={100}
          zIndex={2}
        />
      ) : null}
      <RelationMark
        source={{ anchorId: { prefix: 'thing', field: 'thingId' } }}
        target={{ anchorId: { prefix: 'practice', field: 'practiceId' } }}
        style={{
          color: { kind: 'field', value: 'relationColor' },
          opacity: {
            kind: 'constant',
            value: values.relationOpacity,
          },
          strokeWidth: {
            kind: 'constant',
            value: values.relationStrokeWidth,
          },
          zIndex: { kind: 'constant', value: 1 },
        }}
        path={{ routing }}
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
