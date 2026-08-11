import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { SCATTER_INCOME_LIFE_EXPECTANCY_CONTROL_IDS } from './scatter-income-life-expectancy.controls';
import { countryScatterData, GAPMINDER_SCATTER_YEAR } from './scatter-income-life-expectancy.data';

/** 收入与寿命 Scatter 的英文控制面板 */
export const scatterIncomeLifeExpectancyControls = definePreviewControls({
  presentation: 'panel',
  title: 'Scatter plot',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: `${GAPMINDER_SCATTER_YEAR} country samples`,
          rows: countryScatterData,
          columns: [
            { key: 'country', label: 'Country' },
            { key: 'gdpPerCapita', label: 'GDP per capita' },
            { key: 'lifeExpectancy', label: 'Life expectancy' },
            { key: 'continent', label: 'Continent' },
          ],
        },
      ],
    },
    {
      label: 'Points',
      controls: [
        {
          kind: 'range',
          id: SCATTER_INCOME_LIFE_EXPECTANCY_CONTROL_IDS.pointSize,
          label: 'Size',
          defaultValue: 10,
          min: 6,
          max: 18,
          step: 1,
        },
        {
          kind: 'range',
          id: SCATTER_INCOME_LIFE_EXPECTANCY_CONTROL_IDS.pointOpacity,
          label: 'Opacity',
          defaultValue: 0.82,
          min: 0.4,
          max: 1,
          step: 0.02,
        },
        {
          kind: 'switch',
          id: SCATTER_INCOME_LIFE_EXPECTANCY_CONTROL_IDS.colorByGroup,
          label: 'Color by continent',
          defaultValue: true,
        },
      ],
    },
  ],
});

/** 收入与寿命 Scatter 的英文稳定文档契约 */
export const previewControlContract = {
  controls: scatterIncomeLifeExpectancyControls,
  canonicalValues: {
    [SCATTER_INCOME_LIFE_EXPECTANCY_CONTROL_IDS.pointSize]: 10,
    [SCATTER_INCOME_LIFE_EXPECTANCY_CONTROL_IDS.pointOpacity]: 0.82,
    [SCATTER_INCOME_LIFE_EXPECTANCY_CONTROL_IDS.colorByGroup]: true,
  },
  relatedApis: ['PointMark.size', 'PointMark.opacity', 'PointMark.color', 'Legend.channel'],
} satisfies PreviewControlContract;
