import type { FC } from 'react';

import { ChartData, ChartLayout, ChartSource, ChartSubtitle, ChartTitle } from '@retikz/chart-react';
import { ScatterChart, ScatterEncodings, ScatterProperties } from '@retikz/chart-react/point';

import { defineControlledPreview } from '@/modules/docs/preview';

import { SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS } from './scatter-world-cup-shots.controls';
import { messiWorldCupShots } from './scatter-world-cup-shots.data';
import { previewControlContract } from './scatter-world-cup-shots.en.controls';

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <ScatterChart
    theme={{
      tokens: {
        plot: {
          'plot.area.fill': {
            kind: 'image',
            href: 'https://upload.wikimedia.org/wikipedia/commons/e/ea/Football_pitch_metric_tr.svg',
          },
        },
        recipe: { axisEnabled: false },
      },
    }}
  >
    <ChartData data={messiWorldCupShots} />
    <ChartLayout width={800} height={500} />
    <ScatterEncodings x="x" y="y" color="outcome" />
    <ChartTitle>Lionel Messi's 2022 World Cup shot map</ChartTitle>
    <ChartSubtitle>
      32 regulation and extra-time shots; StatsBomb 120 × 80 coordinates; lines connect starts to endpoints
    </ChartSubtitle>
    <ChartSource>StatsBomb Open Data: competition 43, season 106; excludes two period-five shootout events</ChartSource>
    <ScatterProperties
      size={values[SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS.pointSize]}
      {...(values[SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS.pointStrokeEnabled]
        ? { stroke: values[SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS.pointStroke] }
        : {})}
      shape={values[SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS.pointShape]}
      opacity={values[SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS.pointOpacity]}
    />
  </ScatterChart>
));

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
