import type { FC } from 'react';

import { ChartSource, ChartSubtitle, ChartTitle } from '@retikz/chart-react';
import { ScatterChart, ScatterMark } from '@retikz/chart-react/point/scatter';

import { defineControlledPreview } from '@/modules/docs/preview';

import { SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS } from './scatter-world-cup-shots.controls';
import { messiWorldCupShots } from './scatter-world-cup-shots.data';
import { previewControlContract } from './scatter-world-cup-shots.en.controls';

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <ScatterChart
    data={messiWorldCupShots}
    dataModel={[
      { name: 'x', type: 'continuous' },
      { name: 'y', type: 'continuous' },
      { name: 'endX', type: 'continuous' },
      { name: 'endY', type: 'continuous' },
      { name: 'outcome', type: 'categorical' },
    ]}
    encodings={{ x: 'x', y: 'y', color: 'outcome' }}
    theme={{ tokens: { recipe: { axisEnabled: false, axisGridEnabled: false } } }}
    width={820}
    height={480}
  >
    <ChartTitle>Lionel Messi's 2022 World Cup shot map</ChartTitle>
    <ChartSubtitle>
      32 regulation and extra-time shots; StatsBomb 120 × 80 coordinates; lines connect starts to endpoints
    </ChartSubtitle>
    <ChartSource>StatsBomb Open Data: competition 43, season 106; excludes two period-five shootout events</ChartSource>
    <ScatterMark
      override
      properties={{
        size: values[SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS.pointSize],
        stroke: '#f8fafc',
        strokeWidth: 1,
        opacity: values[SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS.pointOpacity],
      }}
    />
  </ScatterChart>
));

/** Stable source configuration derived from canonical control values */
export const previewSource = controlledPreview.source;

/** Explicit fallback when the controls registry is unavailable */
export const previewControls = previewControlContract.controls;

/** Shot positions and outcome colors in the StatsBomb coordinate system */
const Demo: FC = controlledPreview.Component;

export default Demo;
