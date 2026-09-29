import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS } from './scatter-world-cup-shots.controls';
import { previewControlContract } from './scatter-world-cup-shots.en.controls';
import { renderScatterWorldCupShotsPreview } from './scatter-world-cup-shots.preview';

const controlledPreview = defineControlledPreview(previewControlContract, (values, dimensions) =>
  renderScatterWorldCupShotsPreview({
    lang: 'en',
    layout: dimensions,
    pointSize: values[SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS.pointSize],
    pointStroke: values[SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS.pointStrokeEnabled]
      ? values[SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS.pointStroke]
      : undefined,
    pointShape: values[SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS.pointShape],
    pointOpacity: values[SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS.pointOpacity],
  }),
);

/** Stable source configuration derived from canonical control values */
export const previewSource = {
  ...controlledPreview.source,
  datasetImports: {
    'chart.data': { name: 'messiWorldCupShots', from: './scatter-world-cup-shots.data' },
  },
};

/** Explicit fallback when the controls registry is unavailable */
export const previewControls = previewControlContract.controls;

/** Shot positions and outcome colors in the StatsBomb coordinate system */
const Demo: FC = controlledPreview.Component;

export default Demo;
