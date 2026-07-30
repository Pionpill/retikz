import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { scores } from './rule-threshold.data';

/** 参考带 playground 的稳定控件 id */
export const RULE_BAND_CONTROL_IDS = {
  coordinate: 'rule-band-coordinate',
  axis: 'rule-band-axis',
  start: 'rule-band-start',
  end: 'rule-band-end',
} as const;

/** 参考带范围的中文属性面板 */
export const ruleBandControls = definePreviewControls({
  presentation: 'panel',
  title: '参考带',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'scores', label: '成绩数据', rows: scores }],
    },
    {
      label: '坐标系',
      controls: [
        {
          kind: 'select',
          id: RULE_BAND_CONTROL_IDS.coordinate,
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
      label: '范围',
      controls: [
        {
          kind: 'select',
          id: RULE_BAND_CONTROL_IDS.axis,
          label: '参考轴',
          defaultValue: 'y',
          options: [
            { value: 'y', label: 'y：水平带 / 环带' },
            { value: 'x', label: 'x：竖直带 / 扇形楔' },
          ],
        },
        {
          kind: 'range',
          id: RULE_BAND_CONTROL_IDS.start,
          label: '下界',
          defaultValue: 60,
          min: 40,
          max: 65,
          step: 5,
        },
        {
          kind: 'range',
          id: RULE_BAND_CONTROL_IDS.end,
          label: '上界',
          defaultValue: 80,
          min: 70,
          max: 95,
          step: 5,
        },
      ],
    },
  ],
});

/** 参考带 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: ruleBandControls,
  canonicalValues: {
    [RULE_BAND_CONTROL_IDS.coordinate]: 'cartesian2D',
    [RULE_BAND_CONTROL_IDS.axis]: 'y',
    [RULE_BAND_CONTROL_IDS.start]: 60,
    [RULE_BAND_CONTROL_IDS.end]: 80,
  },
  relatedApis: ['Plot.coordinate', 'ReferenceMark.x', 'ReferenceMark.xTo', 'ReferenceMark.y', 'ReferenceMark.yTo'],
} satisfies PreviewControlContract;
