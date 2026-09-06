import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createPointCoordinateControl } from '../point-coordinate-control';
import { STRIP_BASIC_CONTROL_IDS } from './strip-basic.controls';
import { stripVegaBarleyData } from './strip-vega-barley.data';

/** English controls for the advanced Strip Chart example */
export const stripBasicControls = definePreviewControls({
  presentation: 'panel',
  title: 'Discrete spread',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'Barley trial yields',
          rows: stripVegaBarleyData,
          columns: [{ key: 'site' }, { key: 'variety' }, { key: 'year' }, { key: 'yield' }],
        },
      ],
    },
    {
      label: 'Position mapping',
      controls: [
        {
          kind: 'select',
          id: STRIP_BASIC_CONTROL_IDS.discreteRole,
          label: 'Discrete role',
          defaultValue: 'x',
          options: [
            { value: 'x', label: 'x (polar angle)' },
            { value: 'y', label: 'y (polar radius)' },
          ],
        },
        {
          kind: 'select',
          id: STRIP_BASIC_CONTROL_IDS.discreteScale,
          label: 'Discrete scale',
          defaultValue: 'point',
          options: [
            { value: 'point', label: 'Point' },
            { value: 'band', label: 'Band' },
          ],
        },
        createPointCoordinateControl({
          id: STRIP_BASIC_CONTROL_IDS.coordinateSystem,
          label: 'Coordinate system',
          cartesianLabel: 'Cartesian',
          polarLabel: 'Polar',
        }),
      ],
    },
    {
      label: 'Spread and points',
      controls: [
        {
          kind: 'range',
          id: STRIP_BASIC_CONTROL_IDS.jitterSpan,
          label: 'Spread width',
          defaultValue: 0.3,
          min: 0,
          max: 1,
          step: 0.05,
          help: 'A 0–1 ratio of the discrete tick interval; this is the total spread width',
        },
        {
          kind: 'select',
          id: STRIP_BASIC_CONTROL_IDS.distribution,
          label: 'Random distribution',
          defaultValue: 'uniform',
          options: [
            { value: 'uniform', label: 'Uniform (even)' },
            { value: 'normal', label: 'Normal (centered)' },
          ],
        },
        {
          kind: 'range',
          id: STRIP_BASIC_CONTROL_IDS.normalSigma,
          label: 'Normal sigma',
          defaultValue: 0.5,
          min: 0.1,
          max: 1,
          step: 0.05,
          help: 'Only affects the normal distribution; smaller values concentrate points near each category center',
          visibleWhen: { controlId: STRIP_BASIC_CONTROL_IDS.distribution, oneOf: ['normal'] },
        },
        {
          kind: 'range',
          id: STRIP_BASIC_CONTROL_IDS.seed,
          label: 'Random seed',
          defaultValue: 0,
          min: 0,
          max: 50,
          step: 1,
        },
        {
          kind: 'range',
          id: STRIP_BASIC_CONTROL_IDS.pointSize,
          label: 'Point radius',
          defaultValue: 5,
          min: 2,
          max: 10,
          step: 1,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the advanced Strip Chart example */
export const previewControlContract = {
  controls: stripBasicControls,
  canonicalValues: {
    [STRIP_BASIC_CONTROL_IDS.discreteRole]: 'x',
    [STRIP_BASIC_CONTROL_IDS.discreteScale]: 'point',
    [STRIP_BASIC_CONTROL_IDS.coordinateSystem]: 'cartesian2D',
    [STRIP_BASIC_CONTROL_IDS.jitterSpan]: 0.3,
    [STRIP_BASIC_CONTROL_IDS.distribution]: 'uniform',
    [STRIP_BASIC_CONTROL_IDS.normalSigma]: 0.5,
    [STRIP_BASIC_CONTROL_IDS.seed]: 0,
    [STRIP_BASIC_CONTROL_IDS.pointSize]: 5,
  },
  relatedApis: [
    'StripEncodings.x',
    'StripEncodings.y',
    'StripChart.coordinate',
    'StripProperties.jitter',
    'StripProperties.size',
  ],
} satisfies PreviewControlContract;
