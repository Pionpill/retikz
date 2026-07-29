import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { scores } from './rule-threshold.data';

/** 固定阈值 playground 的稳定控件 id */
export const RULE_THRESHOLD_VALUE_ID = 'rule-threshold-value';

/** 固定阈值的坐标系控件 id */
export const RULE_THRESHOLD_COORDINATE_ID = 'rule-threshold-coordinate';

/** 固定阈值的参考轴控件 id */
export const RULE_THRESHOLD_AXIS_ID = 'rule-threshold-axis';

/** 固定阈值的中文属性面板 */
export const ruleThresholdControls = definePreviewControls({
  presentation: 'panel',
  title: '固定阈值',
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
          id: RULE_THRESHOLD_COORDINATE_ID,
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
      label: '参考线',
      controls: [
        {
          kind: 'select',
          id: RULE_THRESHOLD_AXIS_ID,
          label: '参考轴',
          defaultValue: 'y',
          options: [
            { value: 'y', label: 'y：水平线 / 参考环' },
            { value: 'x', label: 'x：竖直线 / 径向线' },
          ],
        },
        {
          kind: 'range',
          id: RULE_THRESHOLD_VALUE_ID,
          label: '阈值',
          defaultValue: 60,
          min: 40,
          max: 90,
          step: 5,
        },
      ],
    },
  ],
});

/** 固定阈值 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: ruleThresholdControls,
  canonicalValues: {
    [RULE_THRESHOLD_COORDINATE_ID]: 'cartesian2D',
    [RULE_THRESHOLD_AXIS_ID]: 'y',
    [RULE_THRESHOLD_VALUE_ID]: 60,
  },
  relatedApis: ['Plot.coordinate', 'ReferenceMark.x', 'ReferenceMark.y'],
} satisfies PreviewControlContract;
