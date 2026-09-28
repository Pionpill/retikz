import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { groupBasicI18n } from './group-basic.i18n';

/** Group caption playground 使用的稳定字段 id */
export const GroupCaptionControlId = {
  Side: 'side',
  Direction: 'direction',
  ItemGap: 'itemGap',
  BodyGap: 'bodyGap',
} as const;

/** Group 标题与说明的中文属性面板 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const controls = definePreviewControls({
    presentation: 'panel',
    title: groupBasicI18n[lang].controls[0],
    sections: [
      {
        label: groupBasicI18n[lang].controls[1],
        controls: [
          {
            kind: 'select',
            id: GroupCaptionControlId.Side,
            label: groupBasicI18n[lang].controls[2],
            defaultValue: 'top',
            options: [
              { value: 'top', label: groupBasicI18n[lang].controls[3] },
              { value: 'bottom', label: groupBasicI18n[lang].controls[4] },
            ],
          },
          {
            kind: 'select',
            id: GroupCaptionControlId.Direction,
            label: groupBasicI18n[lang].controls[5],
            defaultValue: 'horizontal',
            options: [
              { value: 'horizontal', label: groupBasicI18n[lang].controls[6] },
              { value: 'vertical', label: groupBasicI18n[lang].controls[7] },
            ],
          },
        ],
      },
      {
        label: groupBasicI18n[lang].controls[8],
        controls: [
          {
            kind: 'range',
            id: GroupCaptionControlId.ItemGap,
            label: groupBasicI18n[lang].controls[9],
            defaultValue: 4,
            min: 0,
            max: 24,
            step: 2,
          },
          {
            kind: 'range',
            id: GroupCaptionControlId.BodyGap,
            label: groupBasicI18n[lang].controls[10],
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
  return {
    controls,
    canonicalValues: {
      side: 'top',
      direction: 'horizontal',
      itemGap: 4,
      bodyGap: 4,
    },
    relatedApis: ['Group.caption.side', 'Group.caption.direction', 'Group.caption.itemGap', 'Group.caption.bodyGap'],
  } satisfies PreviewControlContract;
};
export const previewControlContract = createPreviewControlContract();
export const groupCaptionControls = previewControlContract.controls;
