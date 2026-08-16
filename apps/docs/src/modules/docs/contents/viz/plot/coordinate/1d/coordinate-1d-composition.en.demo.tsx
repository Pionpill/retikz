import type { IRPlotRelationRouting } from '@retikz/plot';

import { Axis, Plot, PointMark, RelationMark, Scale } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import {
  COORDINATE_1D_COMPOSITION_CONTROL_IDS,
  coordinate1DCompositionOperation,
} from './coordinate-1d-composition.controls';
import { coordinate1DCompositionControls, previewControlContract } from './coordinate-1d-composition.en.controls';
import { coordinate1DCompositionRows } from './coordinate-1d-composition.en.data';

/** 注册回退使用的一维映射组合英文控件 */
export const previewControls = coordinate1DCompositionControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const routing: IRPlotRelationRouting =
    values[COORDINATE_1D_COMPOSITION_CONTROL_IDS.routing] === 'line'
      ? { kind: 'line' }
      : values[COORDINATE_1D_COMPOSITION_CONTROL_IDS.routing] === 'orthogonal'
        ? {
            kind: 'orthogonal',
            via: values[COORDINATE_1D_COMPOSITION_CONTROL_IDS.orthogonalVia],
          }
        : {
            kind: 'bend',
            bendDirection: values[COORDINATE_1D_COMPOSITION_CONTROL_IDS.bendDirection],
            bendAngle: values[COORDINATE_1D_COMPOSITION_CONTROL_IDS.bendAngle],
          };

  return (
    <Plot
      data={coordinate1DCompositionRows}
      coordinate="cartesian1D"
      width={560}
      height={250}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <Scale dimension="x" type="linear" domain={[0, 12.5]} />
      <PointMark
        x="thingX"
        anchorId={{ prefix: 'thing', field: 'thingId' }}
        fill={{ kind: 'field', value: 'relationColor' }}
        stroke="#ffffff"
        strokeWidth={1.5}
        size={values[COORDINATE_1D_COMPOSITION_CONTROL_IDS.sourcePointSize]}
        label={values[COORDINATE_1D_COMPOSITION_CONTROL_IDS.sourceLabelVisible] ? 'thingLabel' : undefined}
        labelPosition="top"
        labelDistance={values[COORDINATE_1D_COMPOSITION_CONTROL_IDS.sourceLabelDistance]}
        labelTextColor="#475569"
        labelFont={{
          size: values[COORDINATE_1D_COMPOSITION_CONTROL_IDS.sourceLabelSize],
          weight: 'bold',
        }}
        labelRotate={values[COORDINATE_1D_COMPOSITION_CONTROL_IDS.sourceLabelRotate]}
        zIndex={2}
      />
      <PointMark
        transform={[coordinate1DCompositionOperation]}
        x="practiceX"
        anchorId={{ prefix: 'practice', field: 'practiceId' }}
        text="practiceGlyph"
        textColor={{ kind: 'field', value: 'relationColor' }}
        font={{
          size: values[COORDINATE_1D_COMPOSITION_CONTROL_IDS.targetPointSize],
          weight: 'bold',
        }}
        dy={72}
        zIndex={2}
      />
      {values[COORDINATE_1D_COMPOSITION_CONTROL_IDS.targetLabelVisible] ? (
        <PointMark
          transform={[coordinate1DCompositionOperation]}
          x="practiceX"
          text="practiceLabel"
          textColor="#334155"
          font={{
            size: values[COORDINATE_1D_COMPOSITION_CONTROL_IDS.targetLabelSize],
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
            value: values[COORDINATE_1D_COMPOSITION_CONTROL_IDS.relationOpacity],
          },
          strokeWidth: {
            kind: 'constant',
            value: values[COORDINATE_1D_COMPOSITION_CONTROL_IDS.relationStrokeWidth],
          },
          zIndex: { kind: 'constant', value: 1 },
        }}
        path={{ routing }}
      />
      {values[COORDINATE_1D_COMPOSITION_CONTROL_IDS.axisVisible] ? (
        <Axis
          dimension="x"
          line={{
            stroke: values[COORDINATE_1D_COMPOSITION_CONTROL_IDS.axisStroke],
            strokeWidth: values[COORDINATE_1D_COMPOSITION_CONTROL_IDS.axisStrokeWidth],
          }}
        />
      ) : null}
    </Plot>
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 展示一维映射后的节点如何继续参与关系组合 */
export default controlledPreview.Component;
