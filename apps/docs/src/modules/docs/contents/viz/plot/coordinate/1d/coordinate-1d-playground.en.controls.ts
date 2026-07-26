import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { COORDINATE_1D_PLAYGROUND_CONTROL_IDS } from './coordinate-1d-playground.controls';
import { oneDimensionalEvents } from './coordinate-1d-playground.data';

/** English controls for the 1D coordinate playground */
export const coordinate1DPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: '1D coordinates',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'Event times',
          rows: oneDimensionalEvents,
          columns: [{ key: 'hour', label: 'Hour' }],
        },
      ],
    },
    {
      label: 'Coordinate shape',
      controls: [
        {
          kind: 'select',
          id: COORDINATE_1D_PLAYGROUND_CONTROL_IDS.coordinate,
          label: 'Projection',
          defaultValue: 'cartesian1D',
          options: [
            { value: 'cartesian1D', label: 'Line' },
            { value: 'polar1D', label: 'Circle' },
          ],
        },
        {
          kind: 'select',
          id: COORDINATE_1D_PLAYGROUND_CONTROL_IDS.orientation,
          label: 'Line direction',
          defaultValue: 'horizontal',
          visibleWhen: {
            controlId: COORDINATE_1D_PLAYGROUND_CONTROL_IDS.coordinate,
            oneOf: ['cartesian1D'],
          },
          options: [
            { value: 'horizontal', label: 'Horizontal' },
            { value: 'vertical', label: 'Vertical' },
          ],
        },
        {
          kind: 'range',
          id: COORDINATE_1D_PLAYGROUND_CONTROL_IDS.radius,
          label: 'Outer radius ratio',
          defaultValue: 1,
          min: 0.5,
          max: 1,
          step: 0.05,
          visibleWhen: {
            controlId: COORDINATE_1D_PLAYGROUND_CONTROL_IDS.coordinate,
            oneOf: ['polar1D'],
          },
        },
        {
          kind: 'range',
          id: COORDINATE_1D_PLAYGROUND_CONTROL_IDS.startAngle,
          label: 'Start angle',
          defaultValue: 0,
          min: -180,
          max: 180,
          step: 15,
          visibleWhen: {
            controlId: COORDINATE_1D_PLAYGROUND_CONTROL_IDS.coordinate,
            oneOf: ['polar1D'],
          },
        },
        {
          kind: 'range',
          id: COORDINATE_1D_PLAYGROUND_CONTROL_IDS.sweepAngle,
          label: 'Sweep angle',
          defaultValue: 360,
          min: 90,
          max: 360,
          step: 15,
          visibleWhen: {
            controlId: COORDINATE_1D_PLAYGROUND_CONTROL_IDS.coordinate,
            oneOf: ['polar1D'],
          },
        },
      ],
    },
    {
      label: 'Event point style',
      controls: [
        {
          kind: 'range',
          id: COORDINATE_1D_PLAYGROUND_CONTROL_IDS.pointSize,
          label: 'Point size',
          defaultValue: 11,
          min: 5,
          max: 24,
          step: 1,
        },
        {
          kind: 'color',
          id: COORDINATE_1D_PLAYGROUND_CONTROL_IDS.pointFill,
          label: 'Fill',
          defaultValue: '#bfdbfe',
        },
        {
          kind: 'color',
          id: COORDINATE_1D_PLAYGROUND_CONTROL_IDS.pointStroke,
          label: 'Stroke',
          defaultValue: '#1d4ed8',
        },
        {
          kind: 'range',
          id: COORDINATE_1D_PLAYGROUND_CONTROL_IDS.pointStrokeWidth,
          label: 'Stroke width',
          defaultValue: 1.5,
          min: 0,
          max: 5,
          step: 0.5,
        },
        {
          kind: 'range',
          id: COORDINATE_1D_PLAYGROUND_CONTROL_IDS.pointOpacity,
          label: 'Opacity',
          defaultValue: 1,
          min: 0.2,
          max: 1,
          step: 0.05,
        },
      ],
    },
    {
      label: 'Axis line style',
      controls: [
        {
          kind: 'switch',
          id: COORDINATE_1D_PLAYGROUND_CONTROL_IDS.axisVisible,
          label: 'Show axis',
          defaultValue: true,
        },
        {
          kind: 'color',
          id: COORDINATE_1D_PLAYGROUND_CONTROL_IDS.axisStroke,
          label: 'Axis color',
          defaultValue: '#64748b',
          visibleWhen: {
            controlId: COORDINATE_1D_PLAYGROUND_CONTROL_IDS.axisVisible,
            oneOf: [true],
          },
        },
        {
          kind: 'range',
          id: COORDINATE_1D_PLAYGROUND_CONTROL_IDS.axisStrokeWidth,
          label: 'Axis width',
          defaultValue: 1,
          min: 0.5,
          max: 4,
          step: 0.5,
          visibleWhen: {
            controlId: COORDINATE_1D_PLAYGROUND_CONTROL_IDS.axisVisible,
            oneOf: [true],
          },
        },
      ],
    },
  ],
});

const canonicalStyleValues = {
  [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.pointSize]: 11,
  [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.pointFill]: '#bfdbfe',
  [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.pointStroke]: '#1d4ed8',
  [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.pointStrokeWidth]: 1.5,
  [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.pointOpacity]: 1,
  [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.axisVisible]: true,
  [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.axisStroke]: '#64748b',
  [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.axisStrokeWidth]: 1,
} as const;

/** Stable documentation contract for the 1D coordinate playground */
export const previewControlContract = {
  controls: coordinate1DPlaygroundControls,
  canonicalValues: {
    [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.coordinate]: 'cartesian1D',
    [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.orientation]: 'horizontal',
    [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.radius]: 1,
    [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.startAngle]: 0,
    [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.sweepAngle]: 360,
    ...canonicalStyleValues,
  },
  presets: [
    {
      id: 'line',
      label: 'Horizontal line',
      values: {
        [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.coordinate]: 'cartesian1D',
        [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.orientation]: 'horizontal',
        [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.radius]: 1,
        [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.startAngle]: 0,
        [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.sweepAngle]: 360,
        ...canonicalStyleValues,
      },
    },
    {
      id: 'clock',
      label: 'Full clock',
      values: {
        [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.coordinate]: 'polar1D',
        [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.orientation]: 'horizontal',
        [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.radius]: 1,
        [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.startAngle]: 0,
        [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.sweepAngle]: 360,
        ...canonicalStyleValues,
      },
    },
    {
      id: 'semicircle',
      label: 'Half circle',
      values: {
        [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.coordinate]: 'polar1D',
        [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.orientation]: 'horizontal',
        [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.radius]: 1,
        [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.startAngle]: 180,
        [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.sweepAngle]: 180,
        ...canonicalStyleValues,
      },
    },
  ],
  relatedApis: [
    'Plot.coordinate',
    'PointMark.size',
    'PointMark.fill',
    'PointMark.stroke',
    'PointMark.strokeWidth',
    'PointMark.opacity',
    'Axis.line',
  ],
} satisfies PreviewControlContract;
