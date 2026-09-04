import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { team } from './line-radar.data';

/** Stable control id for radar path closure */
export const LINE_RADAR_CLOSED_ID = 'line-radar-closed';
/** Stable control id for the left coordinate interpolation */
export const LINE_RADAR_LEFT_COORDINATE_INTERPOLATION_ID = 'line-radar-left-coordinate-interpolation';
/** Stable control id for the right coordinate interpolation */
export const LINE_RADAR_RIGHT_COORDINATE_INTERPOLATION_ID = 'line-radar-right-coordinate-interpolation';

/** English panel for polar interpolation */
export const lineRadarControls = definePreviewControls({
  presentation: 'panel',
  title: 'Polar interpolation',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'team', label: 'Team metrics', rows: team }],
    },
    {
      label: 'Left plot',
      controls: [
        {
          kind: 'select',
          id: LINE_RADAR_LEFT_COORDINATE_INTERPOLATION_ID,
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
      label: 'Right plot',
      controls: [
        {
          kind: 'select',
          id: LINE_RADAR_RIGHT_COORDINATE_INTERPOLATION_ID,
          label: 'Coordinate interpolation',
          defaultValue: 'polar',
          options: [
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
    [LINE_RADAR_LEFT_COORDINATE_INTERPOLATION_ID]: 'chord',
    [LINE_RADAR_RIGHT_COORDINATE_INTERPOLATION_ID]: 'polar',
  },
  relatedApis: ['Plot.coordinate.interpolation', 'PathMark.closed'],
} satisfies PreviewControlContract;
