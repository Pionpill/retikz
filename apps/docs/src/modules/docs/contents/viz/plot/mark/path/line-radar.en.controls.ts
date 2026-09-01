import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { team } from './line-radar.data';

/** Stable control id for radar path closure */
export const LINE_RADAR_CLOSED_ID = 'line-radar-closed';
/** Stable control id for coordinate interpolation */
export const LINE_RADAR_COORDINATE_INTERPOLATION_ID = 'line-radar-coordinate-interpolation';
/** Stable control id for the right path override */
export const LINE_RADAR_MARK_INTERPOLATION_ID = 'line-radar-mark-interpolation';

/** English panel for radar path closure */
export const lineRadarControls = definePreviewControls({
  presentation: 'panel',
  title: 'Radar closure',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'team', label: 'Team metrics', rows: team }],
    },
    {
      label: 'Coordinate',
      controls: [
        {
          kind: 'select',
          id: LINE_RADAR_COORDINATE_INTERPOLATION_ID,
          label: 'Coordinate interpolation',
          defaultValue: 'chord',
          options: [
            { value: 'polar', label: 'Polar curve' },
            { value: 'chord', label: 'Straight chord' },
          ],
        },
      ],
    },
    {
      label: 'Right path',
      controls: [
        {
          kind: 'select',
          id: LINE_RADAR_MARK_INTERPOLATION_ID,
          label: 'Local interpolation',
          defaultValue: 'polar',
          options: [
            { value: 'inherit', label: 'Inherit coordinate' },
            { value: 'polar', label: 'Polar curve' },
            { value: 'chord', label: 'Straight chord' },
          ],
        },
        { kind: 'switch', id: LINE_RADAR_CLOSED_ID, label: 'Close path', defaultValue: true },
      ],
    },
  ],
});

/** Stable documentation contract for radar path closure */
export const previewControlContract = {
  controls: lineRadarControls,
  canonicalValues: {
    [LINE_RADAR_CLOSED_ID]: true,
    [LINE_RADAR_COORDINATE_INTERPOLATION_ID]: 'chord',
    [LINE_RADAR_MARK_INTERPOLATION_ID]: 'polar',
  },
  relatedApis: ['Plot.coordinate.interpolation', 'PathMark.interpolation', 'PathMark.closed'],
} satisfies PreviewControlContract;
