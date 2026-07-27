import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { COORDINATE_1D_COMPOSITION_CONTROL_IDS } from './coordinate-1d-composition.controls';
import { coordinate1DCompositionRows } from './coordinate-1d-composition.en.data';

/** 一维映射后二次组合的英文控件 */
export const coordinate1DCompositionControls = definePreviewControls({
  presentation: 'panel',
  title: 'Mapped nodes',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'Nodes and relations',
          rows: coordinate1DCompositionRows,
          columns: [
            { key: 'thingLabel', label: 'Source node' },
            { key: 'practiceLabel', label: 'Target node' },
            { key: 'relationColor', label: 'Group color' },
          ],
        },
      ],
    },
    {
      label: 'Nodes and labels',
      controls: [
        {
          kind: 'range',
          id: COORDINATE_1D_COMPOSITION_CONTROL_IDS.sourcePointSize,
          label: 'Source point size',
          defaultValue: 8,
          min: 5,
          max: 16,
          step: 1,
        },
        {
          kind: 'switch',
          id: COORDINATE_1D_COMPOSITION_CONTROL_IDS.sourceLabelVisible,
          label: 'Show source labels',
          defaultValue: true,
        },
        {
          kind: 'range',
          id: COORDINATE_1D_COMPOSITION_CONTROL_IDS.sourceLabelSize,
          label: 'Source label size',
          defaultValue: 10,
          min: 8,
          max: 16,
          step: 1,
          visibleWhen: {
            controlId: COORDINATE_1D_COMPOSITION_CONTROL_IDS.sourceLabelVisible,
            oneOf: [true],
          },
        },
        {
          kind: 'range',
          id: COORDINATE_1D_COMPOSITION_CONTROL_IDS.sourceLabelRotate,
          label: 'Source label angle',
          defaultValue: -38,
          min: -90,
          max: 0,
          step: 2,
          visibleWhen: {
            controlId: COORDINATE_1D_COMPOSITION_CONTROL_IDS.sourceLabelVisible,
            oneOf: [true],
          },
        },
        {
          kind: 'range',
          id: COORDINATE_1D_COMPOSITION_CONTROL_IDS.sourceLabelDistance,
          label: 'Source label distance',
          defaultValue: 8,
          min: 2,
          max: 20,
          step: 1,
          visibleWhen: {
            controlId: COORDINATE_1D_COMPOSITION_CONTROL_IDS.sourceLabelVisible,
            oneOf: [true],
          },
        },
        {
          kind: 'range',
          id: COORDINATE_1D_COMPOSITION_CONTROL_IDS.targetPointSize,
          label: 'Target point size',
          defaultValue: 18,
          min: 12,
          max: 30,
          step: 1,
        },
        {
          kind: 'switch',
          id: COORDINATE_1D_COMPOSITION_CONTROL_IDS.targetLabelVisible,
          label: 'Show target labels',
          defaultValue: true,
        },
        {
          kind: 'range',
          id: COORDINATE_1D_COMPOSITION_CONTROL_IDS.targetLabelSize,
          label: 'Target label size',
          defaultValue: 12,
          min: 9,
          max: 18,
          step: 1,
          visibleWhen: {
            controlId: COORDINATE_1D_COMPOSITION_CONTROL_IDS.targetLabelVisible,
            oneOf: [true],
          },
        },
      ],
    },
    {
      label: 'Connections',
      controls: [
        {
          kind: 'select',
          id: COORDINATE_1D_COMPOSITION_CONTROL_IDS.routing,
          label: 'Routing',
          defaultValue: 'bend',
          options: [
            { value: 'bend', label: 'Bend' },
            { value: 'line', label: 'Straight line' },
            { value: 'orthogonal', label: 'Orthogonal' },
          ],
        },
        {
          kind: 'select',
          id: COORDINATE_1D_COMPOSITION_CONTROL_IDS.bendDirection,
          label: 'Bend direction',
          defaultValue: 'left',
          options: [
            { value: 'left', label: 'Left' },
            { value: 'right', label: 'Right' },
          ],
          visibleWhen: {
            controlId: COORDINATE_1D_COMPOSITION_CONTROL_IDS.routing,
            oneOf: ['bend'],
          },
        },
        {
          kind: 'range',
          id: COORDINATE_1D_COMPOSITION_CONTROL_IDS.bendAngle,
          label: 'Bend angle',
          defaultValue: 18,
          min: 5,
          max: 60,
          step: 1,
          visibleWhen: {
            controlId: COORDINATE_1D_COMPOSITION_CONTROL_IDS.routing,
            oneOf: ['bend'],
          },
        },
        {
          kind: 'select',
          id: COORDINATE_1D_COMPOSITION_CONTROL_IDS.orthogonalVia,
          label: 'Orthogonal direction',
          defaultValue: '-|',
          options: [
            { value: '-|', label: 'Horizontal then vertical' },
            { value: '|-', label: 'Vertical then horizontal' },
          ],
          visibleWhen: {
            controlId: COORDINATE_1D_COMPOSITION_CONTROL_IDS.routing,
            oneOf: ['orthogonal'],
          },
        },
        {
          kind: 'range',
          id: COORDINATE_1D_COMPOSITION_CONTROL_IDS.relationStrokeWidth,
          label: 'Line width',
          defaultValue: 1.2,
          min: 0.5,
          max: 4,
          step: 0.1,
        },
        {
          kind: 'range',
          id: COORDINATE_1D_COMPOSITION_CONTROL_IDS.relationOpacity,
          label: 'Line opacity',
          defaultValue: 0.42,
          min: 0.1,
          max: 1,
          step: 0.05,
        },
      ],
    },
    {
      label: 'Axis',
      controls: [
        {
          kind: 'switch',
          id: COORDINATE_1D_COMPOSITION_CONTROL_IDS.axisVisible,
          label: 'Show axis',
          defaultValue: true,
        },
        {
          kind: 'color',
          id: COORDINATE_1D_COMPOSITION_CONTROL_IDS.axisStroke,
          label: 'Axis color',
          defaultValue: '#64748b',
          visibleWhen: {
            controlId: COORDINATE_1D_COMPOSITION_CONTROL_IDS.axisVisible,
            oneOf: [true],
          },
        },
        {
          kind: 'range',
          id: COORDINATE_1D_COMPOSITION_CONTROL_IDS.axisStrokeWidth,
          label: 'Axis width',
          defaultValue: 1,
          min: 0.5,
          max: 4,
          step: 0.5,
          visibleWhen: {
            controlId: COORDINATE_1D_COMPOSITION_CONTROL_IDS.axisVisible,
            oneOf: [true],
          },
        },
      ],
    },
  ],
});

/** 一维映射后二次组合的英文稳定文档契约 */
export const previewControlContract = {
  controls: coordinate1DCompositionControls,
  canonicalValues: {
    [COORDINATE_1D_COMPOSITION_CONTROL_IDS.sourcePointSize]: 8,
    [COORDINATE_1D_COMPOSITION_CONTROL_IDS.sourceLabelVisible]: true,
    [COORDINATE_1D_COMPOSITION_CONTROL_IDS.sourceLabelSize]: 10,
    [COORDINATE_1D_COMPOSITION_CONTROL_IDS.sourceLabelRotate]: -38,
    [COORDINATE_1D_COMPOSITION_CONTROL_IDS.sourceLabelDistance]: 8,
    [COORDINATE_1D_COMPOSITION_CONTROL_IDS.targetPointSize]: 18,
    [COORDINATE_1D_COMPOSITION_CONTROL_IDS.targetLabelVisible]: true,
    [COORDINATE_1D_COMPOSITION_CONTROL_IDS.targetLabelSize]: 12,
    [COORDINATE_1D_COMPOSITION_CONTROL_IDS.routing]: 'bend',
    [COORDINATE_1D_COMPOSITION_CONTROL_IDS.bendDirection]: 'left',
    [COORDINATE_1D_COMPOSITION_CONTROL_IDS.bendAngle]: 18,
    [COORDINATE_1D_COMPOSITION_CONTROL_IDS.orthogonalVia]: '-|',
    [COORDINATE_1D_COMPOSITION_CONTROL_IDS.relationStrokeWidth]: 1.2,
    [COORDINATE_1D_COMPOSITION_CONTROL_IDS.relationOpacity]: 0.42,
    [COORDINATE_1D_COMPOSITION_CONTROL_IDS.axisVisible]: true,
    [COORDINATE_1D_COMPOSITION_CONTROL_IDS.axisStroke]: '#64748b',
    [COORDINATE_1D_COMPOSITION_CONTROL_IDS.axisStrokeWidth]: 1,
  },
  relatedApis: [
    'PointMark.anchorId',
    'PointMark.size',
    'PointMark.label',
    'PointMark.labelFont',
    'PointMark.labelRotate',
    'PointMark.labelDistance',
    'PointMark.font',
    'RelationMark.source',
    'RelationMark.target',
    'RelationMark.path',
    'RelationMark.style',
    'Axis.line',
  ],
} satisfies PreviewControlContract;
