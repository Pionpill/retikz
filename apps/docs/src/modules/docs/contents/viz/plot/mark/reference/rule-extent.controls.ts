import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { referenceSpans } from './rule-extent.data';

/** 局部参考线 playground 的稳定控件 id */
export const RULE_EXTENT_INSET_ID = 'rule-extent-inset';

/** 局部参考线的坐标系控件 id */
export const RULE_EXTENT_COORDINATE_ID = 'rule-extent-coordinate';

/** 局部参考线的中文属性面板 */
export const ruleExtentControls = definePreviewControls({
  presentation: 'panel',
  title: '局部参考线',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'referenceSpans', label: '参考范围', rows: referenceSpans }],
    },
    {
      label: '坐标系',
      controls: [
        {
          kind: 'select',
          id: RULE_EXTENT_COORDINATE_ID,
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
      label: '对侧范围',
      controls: [
        {
          kind: 'range',
          id: RULE_EXTENT_INSET_ID,
          label: '端点内缩',
          defaultValue: 0,
          min: 0,
          max: 12,
          step: 3,
        },
      ],
    },
  ],
});

/** 局部参考线 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: ruleExtentControls,
  canonicalValues: {
    [RULE_EXTENT_COORDINATE_ID]: 'cartesian2D',
    [RULE_EXTENT_INSET_ID]: 0,
  },
  relatedApis: ['Plot.coordinate', 'ReferenceMark.extentField', 'ReferenceMark.extentToField'],
} satisfies PreviewControlContract;
