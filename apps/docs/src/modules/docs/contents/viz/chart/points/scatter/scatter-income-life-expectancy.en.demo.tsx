import type { FC } from 'react';

import { ChartNote, ChartSource, ChartSubtitle, ChartTitle, ScatterChart } from '@retikz/chart-react';
import { Legend } from '@retikz/plot-react';
import { Text } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { SCATTER_INCOME_LIFE_EXPECTANCY_CONTROL_IDS } from './scatter-income-life-expectancy.controls';
import { countryScatterData } from './scatter-income-life-expectancy.data';
import { previewControlContract } from './scatter-income-life-expectancy.en.controls';

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <ScatterChart
    data={countryScatterData}
    encoding={{
      x: { field: 'gdpPerCapita' },
      y: { field: 'lifeExpectancy' },
      color: { field: 'continent' },
    }}
    mark={{
      size: { kind: 'constant', value: values[SCATTER_INCOME_LIFE_EXPECTANCY_CONTROL_IDS.pointSize] },
      opacity: { kind: 'constant', value: values[SCATTER_INCOME_LIFE_EXPECTANCY_CONTROL_IDS.pointOpacity] },
    }}
    width={800}
    height={400}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <ChartSubtitle>
      <Text font={{ weight: 'bold' }}>Gapminder 2007</Text>
      <Text>142 countries; GDP per capita (inflation-adjusted US$) and life expectancy at birth (years)</Text>
    </ChartSubtitle>
    <ChartTitle>Higher income generally coincides with longer life expectancy</ChartTitle>
    <ChartSource>Gapminder: country cross-section for 2007; color encodes continent</ChartSource>
    <ChartNote>This same-year comparison describes association, not causation</ChartNote>
    <Legend channel="color" title="Continent" position="right" />
  </ScatterChart>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = {
  ...controlledPreview.source,
  datasetImports: {
    'chart.data': { name: 'countryScatterData', from: './scatter-income-life-expectancy.data' },
  },
};

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

/** 展示人均收入与预期寿命关系的散点图 */
const Demo: FC = controlledPreview.Component;

export default Demo;
