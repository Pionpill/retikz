import type { IRStripChartEncodings } from '@retikz/chart/point/strip';
import type { FC } from 'react';

import { ChartData, ChartLayout, ChartSource, ChartSubtitle, ChartTitle } from '@retikz/chart-react';
import { StripChart, StripEncodings, StripProperties } from '@retikz/chart-react/point';

import { defineControlledPreview } from '@/modules/docs/preview';

import { resolvePointPreviewLayout } from '../point-coordinate-control';
import { previewControlContract, STRIP_BASIC_CONTROL_IDS } from './strip-basic.controls';
import { stripVegaBarleyData } from './strip-vega-barley.data';

const encodingsOf = (discreteRole: 'x' | 'y', discreteScale: 'point' | 'band'): IRStripChartEncodings => {
  const scaleOperation =
    discreteScale === 'band'
      ? { type: 'band', name: 'site', paddingInner: 0.1, paddingOuter: 0.05 }
      : { type: 'point', name: 'site' };
  const category = {
    field: 'site',
    scale: { operation: scaleOperation },
  } as const;
  const value = {
    field: 'yield',
    scale: { operation: { type: 'linear', name: 'yield' } },
  } as const;
  return discreteRole === 'x' ? { x: category, y: value } : { x: value, y: category };
};

const controlled = defineControlledPreview(previewControlContract, values => {
  const discreteRole = values[STRIP_BASIC_CONTROL_IDS.discreteRole];
  const discreteScale = values[STRIP_BASIC_CONTROL_IDS.discreteScale];
  const coordinateSystem = values[STRIP_BASIC_CONTROL_IDS.coordinateSystem];
  return (
    <StripChart coordinate={{ type: coordinateSystem }}>
      <ChartData data={stripVegaBarleyData} />
      <ChartLayout {...resolvePointPreviewLayout(coordinateSystem)} />
      <StripEncodings {...encodingsOf(discreteRole, discreteScale)} />
      <StripProperties
        jitter={{
          span: { kind: 'ratio', value: values[STRIP_BASIC_CONTROL_IDS.jitterSpan] },
          seed: values[STRIP_BASIC_CONTROL_IDS.seed],
        }}
        size={values[STRIP_BASIC_CONTROL_IDS.pointSize]}
        opacity={0.75}
      />
      <ChartTitle>六个试验地点的大麦产量分布</ChartTitle>
      <ChartSubtitle>明尼苏达，1931–1932 年；每个地点 20 条观测，产量单位为蒲式耳/英亩</ChartSubtitle>
      <ChartSource>
        Vega Datasets barley；Minnesota Agricultural Experiment Station 六地试验，USDA Technical Bulletin No. 735 再版
      </ChartSource>
    </StripChart>
  );
});

export const previewSource = {
  ...controlled.source,
  datasetImports: {
    'chart.data': { name: 'stripVegaBarleyData', from: './strip-vega-barley.data' },
  },
};
export const previewControls = previewControlContract.controls;
const Demo: FC = controlled.Component;
export default Demo;
