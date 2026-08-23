import type { FC } from 'react';

import { ChartNote, ChartSource, ChartSubtitle, ChartTitle } from '@retikz/chart-react';
import { ScatterChart, ScatterMark } from '@retikz/chart-react/point/scatter';

import { defineControlledPreview } from '@/modules/docs/preview';

import { SCATTER_INCOME_LIFE_EXPECTANCY_CONTROL_IDS } from './scatter-income-life-expectancy.controls';
import { countryScatterData } from './scatter-income-life-expectancy.data';
import { previewControlContract } from './scatter-income-life-expectancy.en.controls';

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <ScatterChart
    data={countryScatterData}
    encodings={{
      x: 'gdpPerCapita',
      y: 'lifeExpectancy',
      color: 'continent',
    }}
    width={800}
    height={400}
  >
    <ChartTitle>Higher income generally coincides with longer life expectancy</ChartTitle>
    <ChartSubtitle>
      Gapminder 2007; 142 countries; x shows GDP per capita (inflation-adjusted US$) and y shows life expectancy at
      birth (years)
    </ChartSubtitle>
    <ChartNote>This same-year comparison describes association, not causation</ChartNote>
    <ChartSource>Gapminder: country cross-section for 2007; color encodes continent</ChartSource>
    <ScatterMark
      override
      properties={{
        size: values[SCATTER_INCOME_LIFE_EXPECTANCY_CONTROL_IDS.pointSize],
        opacity: values[SCATTER_INCOME_LIFE_EXPECTANCY_CONTROL_IDS.pointOpacity],
      }}
    />
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
