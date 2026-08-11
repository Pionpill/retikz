import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { countryScatterData, GAPMINDER_SCATTER_YEAR } from './scatter-income-life-expectancy.data';

/** 收入与寿命 Scatter playground 的稳定控件 id */
export const SCATTER_INCOME_LIFE_EXPECTANCY_CONTROL_IDS = {
  pointSize: 'pointSize',
  pointOpacity: 'pointOpacity',
  colorByGroup: 'colorByGroup',
} as const;

/** 收入与寿命 Scatter 的中文控制面板 */
export const scatterIncomeLifeExpectancyControls = definePreviewControls({
  presentation: 'panel',
  title: '散点图',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: `${GAPMINDER_SCATTER_YEAR} 年国家样本`,
          rows: countryScatterData,
          columns: [
            { key: 'country', label: '国家' },
            { key: 'gdpPerCapita', label: '人均 GDP' },
            { key: 'lifeExpectancy', label: '预期寿命' },
            { key: 'continent', label: '大洲' },
          ],
        },
      ],
    },
    {
      label: '散点',
      controls: [
        {
          kind: 'range',
          id: SCATTER_INCOME_LIFE_EXPECTANCY_CONTROL_IDS.pointSize,
          label: '大小',
          defaultValue: 10,
          min: 6,
          max: 18,
          step: 1,
        },
        {
          kind: 'range',
          id: SCATTER_INCOME_LIFE_EXPECTANCY_CONTROL_IDS.pointOpacity,
          label: '不透明度',
          defaultValue: 0.82,
          min: 0.4,
          max: 1,
          step: 0.02,
        },
        {
          kind: 'switch',
          id: SCATTER_INCOME_LIFE_EXPECTANCY_CONTROL_IDS.colorByGroup,
          label: '按大洲着色',
          defaultValue: true,
        },
      ],
    },
  ],
});

/** 收入与寿命 Scatter 的稳定文档契约 */
export const previewControlContract = {
  controls: scatterIncomeLifeExpectancyControls,
  canonicalValues: {
    [SCATTER_INCOME_LIFE_EXPECTANCY_CONTROL_IDS.pointSize]: 10,
    [SCATTER_INCOME_LIFE_EXPECTANCY_CONTROL_IDS.pointOpacity]: 0.82,
    [SCATTER_INCOME_LIFE_EXPECTANCY_CONTROL_IDS.colorByGroup]: true,
  },
  relatedApis: ['PointMark.size', 'PointMark.opacity', 'PointMark.color', 'Legend.channel'],
} satisfies PreviewControlContract;
