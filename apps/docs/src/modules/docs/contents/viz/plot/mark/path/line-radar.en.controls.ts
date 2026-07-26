import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { team } from './line-radar.data';

/** Stable control id for radar path closure */
export const LINE_RADAR_CLOSED_ID = 'line-radar-closed';

/** English panel for radar path closure */
export const lineRadarControls = definePreviewControls({
  presentation: 'panel',
  title: 'Radar closure',
  sections: [
    {
      label: 'Data',
      controls: [{ kind: 'table', id: 'team', label: 'Team metrics', rows: team }],
    },
    {
      label: 'Path',
      controls: [{ kind: 'switch', id: LINE_RADAR_CLOSED_ID, label: 'Close right path', defaultValue: false }],
    },
  ],
});

/** Stable documentation contract for radar path closure */
export const previewControlContract = {
  controls: lineRadarControls,
  canonicalValues: { [LINE_RADAR_CLOSED_ID]: false },
  relatedApis: ['PathMark.closed', 'PathMark.order'],
} satisfies PreviewControlContract;
