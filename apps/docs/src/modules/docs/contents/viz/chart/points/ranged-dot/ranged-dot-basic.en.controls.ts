import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createPointCoordinateControl } from '../point-coordinate-control';
import { RANGED_DOT_CONTROL_IDS } from './ranged-dot-basic.controls';
import { rangedDotData } from './ranged-dot-basic.data';

export const rangedDotBasicControls = definePreviewControls({
  presentation: 'panel',
  title: 'Range and endpoints',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'World Bank country comparison',
          rows: rangedDotData,
          columns: [{ key: 'country' }, { key: 'forestArea2000' }, { key: 'forestArea2022' }],
        },
      ],
    },
    {
      label: 'Coordinate',
      controls: [
        createPointCoordinateControl({
          id: RANGED_DOT_CONTROL_IDS.coordinateSystem,
          label: 'Coordinate system',
          cartesianLabel: 'Cartesian',
          polarLabel: 'Polar',
        }),
      ],
    },
    {
      label: 'Connector',
      controls: [
        {
          kind: 'select',
          id: RANGED_DOT_CONTROL_IDS.lineStyle,
          label: 'Line style',
          defaultValue: 'solid',
          options: [
            { value: 'solid', label: 'Solid' },
            { value: 'dashed', label: 'Dashed' },
          ],
        },
        { kind: 'color', id: RANGED_DOT_CONTROL_IDS.lineColor, label: 'Line color', defaultValue: '#94a3b8' },
        {
          kind: 'range',
          id: RANGED_DOT_CONTROL_IDS.strokeWidth,
          label: 'Stroke width',
          defaultValue: 2,
          min: 1,
          max: 6,
          step: 0.5,
        },
      ],
    },
    {
      label: 'Endpoints',
      controls: [
        {
          kind: 'range',
          id: RANGED_DOT_CONTROL_IDS.pointSize,
          label: 'Radius',
          defaultValue: 5,
          min: 2,
          max: 10,
          step: 1,
        },
        { kind: 'color', id: RANGED_DOT_CONTROL_IDS.startColor, label: 'Start color', defaultValue: '#2563eb' },
        { kind: 'color', id: RANGED_DOT_CONTROL_IDS.endColor, label: 'End color', defaultValue: '#f97316' },
      ],
    },
  ],
});

export const previewControlContract = {
  controls: rangedDotBasicControls,
  canonicalValues: {
    [RANGED_DOT_CONTROL_IDS.coordinateSystem]: 'cartesian2D',
    [RANGED_DOT_CONTROL_IDS.lineStyle]: 'solid',
    [RANGED_DOT_CONTROL_IDS.lineColor]: '#94a3b8',
    [RANGED_DOT_CONTROL_IDS.strokeWidth]: 2,
    [RANGED_DOT_CONTROL_IDS.pointSize]: 5,
    [RANGED_DOT_CONTROL_IDS.startColor]: '#2563eb',
    [RANGED_DOT_CONTROL_IDS.endColor]: '#f97316',
  },
  relatedApis: [
    'RangedDotChart.coordinate',
    'RangedDotProperties.range',
    'RangedDotProperties.point',
    'RangedDotProperties.startPoint',
    'RangedDotProperties.endPoint',
  ],
} satisfies PreviewControlContract;
