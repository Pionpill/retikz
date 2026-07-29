import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { regionSamples } from './rule-region.data';

/** 二维参考区域 playground 的稳定控件 id */
export const RULE_REGION_CONTROL_IDS = {
  coordinate: 'rule-region-coordinate',
  xStart: 'rule-region-x-start',
  xEnd: 'rule-region-x-end',
  yStart: 'rule-region-y-start',
  yEnd: 'rule-region-y-end',
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
      label: '坐标系',
      controls: [
        {
          kind: 'select',
          id: RULE_REGION_CONTROL_IDS.coordinate,
          label: '投影',
          defaultValue: 'cartesian2D',
          options: [
            { value: 'cartesian2D', label: '笛卡尔坐标' },
            { value: 'polar2D', label: '极坐标' },
          ],
        },
      ],
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
    {
      label: '纵向范围',
      controls: [
        {
          kind: 'range',
          id: RULE_REGION_CONTROL_IDS.yStart,
          label: '起点',
          defaultValue: 55,
          min: 20,
          max: 65,
          step: 5,
        },
        {
          kind: 'range',
          id: RULE_REGION_CONTROL_IDS.yEnd,
          label: '终点',
          defaultValue: 80,
          min: 70,
          max: 100,
          step: 5,
        },
      ],
    },
  ],
});

/** 二维参考区域 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: ruleRegionControls,
  canonicalValues: {
    [RULE_REGION_CONTROL_IDS.coordinate]: 'cartesian2D',
    [RULE_REGION_CONTROL_IDS.xStart]: 45,
    [RULE_REGION_CONTROL_IDS.xEnd]: 150,
    [RULE_REGION_CONTROL_IDS.yStart]: 55,
    [RULE_REGION_CONTROL_IDS.yEnd]: 80,
  },
  relatedApis: ['Plot.coordinate', 'ReferenceMark.x', 'ReferenceMark.xTo', 'ReferenceMark.y', 'ReferenceMark.yTo'],
} satisfies PreviewControlContract;
