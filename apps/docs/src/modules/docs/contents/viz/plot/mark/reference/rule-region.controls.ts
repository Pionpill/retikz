import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { regionSamples } from './rule-region.data';

/** 二维参考区域 playground 的稳定控件 id */
export const RULE_REGION_CONTROL_IDS = {
  xStart: 'rule-region-x-start',
  xEnd: 'rule-region-x-end',
} as const;

/** 二维参考区域的中文属性面板 */
export const ruleRegionControls = definePreviewControls({
  presentation: 'panel',
  title: '参考区域',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'regionSamples', label: '样本点', rows: regionSamples }],
    },
    {
      label: '横向范围',
      controls: [
        {
          kind: 'range',
          id: RULE_REGION_CONTROL_IDS.xStart,
          label: '起点',
          defaultValue: 45,
          min: 0,
          max: 120,
          step: 15,
        },
        {
          kind: 'range',
          id: RULE_REGION_CONTROL_IDS.xEnd,
          label: '终点',
          defaultValue: 150,
          min: 135,
          max: 330,
          step: 15,
        },
      ],
    },
  ],
});

/** 二维参考区域 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: ruleRegionControls,
  canonicalValues: {
    [RULE_REGION_CONTROL_IDS.xStart]: 45,
    [RULE_REGION_CONTROL_IDS.xEnd]: 150,
  },
  relatedApis: ['ReferenceMark.x', 'ReferenceMark.xTo'],
} satisfies PreviewControlContract;
