import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Group caption playground 使用的稳定字段 id */
export const GroupCaptionControlId = {
  Side: 'side',
  Direction: 'direction',
  ItemGap: 'itemGap',
  BodyGap: 'bodyGap',
} as const;

/** Group 标题与说明的中文属性面板 */
export const groupCaptionControls = definePreviewControls({
  presentation: 'panel',
  title: 'Group 标题与说明',
  sections: [
    {
      label: '位置与排列',
      controls: [
        {
          kind: 'select',
          id: GroupCaptionControlId.Side,
          label: '位置',
          defaultValue: 'top',
          options: [
            { value: 'top', label: '上方' },
            { value: 'bottom', label: '下方' },
          ],
        },
        {
          kind: 'select',
          id: GroupCaptionControlId.Direction,
          label: '排列方向',
          defaultValue: 'horizontal',
          options: [
            { value: 'horizontal', label: '横向' },
            { value: 'vertical', label: '纵向' },
          ],
        },
      ],
    },
    {
      label: '间距',
      controls: [
        {
          kind: 'range',
          id: GroupCaptionControlId.ItemGap,
          label: '标题与说明间距',
          defaultValue: 4,
          min: 0,
          max: 24,
          step: 2,
        },
        {
          kind: 'range',
          id: GroupCaptionControlId.BodyGap,
          label: '内容与说明间距',
          defaultValue: 4,
          min: 0,
          max: 24,
          step: 2,
        },
      ],
    },
  ],
});

/** Group 标题与说明 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: groupCaptionControls,
  canonicalValues: {
    side: 'top',
    direction: 'horizontal',
    itemGap: 4,
    bodyGap: 4,
  },
  relatedApis: ['Group.caption.side', 'Group.caption.direction', 'Group.caption.itemGap', 'Group.caption.bodyGap'],
} satisfies PreviewControlContract;
