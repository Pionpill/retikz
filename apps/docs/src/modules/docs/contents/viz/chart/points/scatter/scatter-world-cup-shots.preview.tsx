import { ChartData, ChartSource, ChartSubtitle, ChartTitle } from '@retikz/chart-react';
import type { ScatterChartProps } from '@retikz/chart-react/point';
import { ScatterChart, ScatterEncodings, ScatterProperties } from '@retikz/chart-react/point';

import { messiWorldCupShots } from './scatter-world-cup-shots.data';
import { scatterWorldCupShotsI18n } from './scatter-world-cup-shots.i18n';

/** 世界杯射门图的图表输入 */
export type ScatterWorldCupShotsPreviewOptions = {
  lang: keyof typeof scatterWorldCupShotsI18n;
  layout?: ScatterChartProps['layout'];
  pointSize: number;
  pointStroke?: string;
  pointShape: string;
  pointOpacity: number;
};

/** 在场地背景上显示射门起点与结果 */
export const renderScatterWorldCupShotsPreview = (options: ScatterWorldCupShotsPreviewOptions) => {
  const { lang, layout, pointSize, pointStroke, pointShape, pointOpacity } = options;
  const i18n = scatterWorldCupShotsI18n[lang];

  return (
    <ScatterChart
      layout={layout}
      plotExtension={{
        plotDefaults: {
          plotArea: {
            fill: {
              kind: 'image',
              href: 'https://upload.wikimedia.org/wikipedia/commons/e/ea/Football_pitch_metric_tr.svg',
            },
          },
        },
      }}
      recipe={{ guides: { axis: false } }}
    >
      <ChartData data={messiWorldCupShots} />
      <ScatterEncodings x="x" y="y" color="outcome" />
      <ChartTitle>{i18n.title}</ChartTitle>
      <ChartSubtitle>{i18n.subtitle}</ChartSubtitle>
      <ChartSource>{i18n.source}</ChartSource>
      <ScatterProperties
        size={pointSize}
        {...(pointStroke === undefined ? {} : { stroke: pointStroke })}
        shape={pointShape}
        opacity={pointOpacity}
      />
    </ScatterChart>
  );
};
