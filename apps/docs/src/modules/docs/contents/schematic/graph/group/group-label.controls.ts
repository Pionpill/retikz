import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { groupLabelI18n } from './group-label.i18n';

/** Group label playground 使用的稳定字段 id */
export const GroupLabelControlId = {
  PrimaryPosition: 'primaryPosition',
  SecondaryPosition: 'secondaryPosition',
  DefaultPosition: 'defaultPosition',
} as const;

/** Group 标签位置的中文属性面板 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const positionOptions = [
    { value: 'top-left', label: groupLabelI18n[lang].controls[0] },
    { value: 'top-right', label: groupLabelI18n[lang].controls[1] },
    { value: 'bottom-left', label: groupLabelI18n[lang].controls[2] },
    { value: 'bottom-right', label: groupLabelI18n[lang].controls[3] },
    { value: 'top', label: groupLabelI18n[lang].controls[4] },
    { value: 'bottom', label: groupLabelI18n[lang].controls[5] },
    { value: 'left', label: groupLabelI18n[lang].controls[6] },
    { value: 'right', label: groupLabelI18n[lang].controls[7] },
  ];

  const controls = definePreviewControls({
    presentation: 'panel',
    title: groupLabelI18n[lang].controls[8],
    sections: [
      {
        label: groupLabelI18n[lang].controls[9],
        controls: [
          {
            kind: 'select',
            id: GroupLabelControlId.PrimaryPosition,
            label: groupLabelI18n[lang].controls[10],
            defaultValue: 'top-left',
            options: positionOptions,
          },
          {
            kind: 'select',
            id: GroupLabelControlId.SecondaryPosition,
            label: groupLabelI18n[lang].controls[11],
            defaultValue: 'bottom-right',
            options: positionOptions,
          },
          {
            kind: 'select',
            id: GroupLabelControlId.DefaultPosition,
            label: groupLabelI18n[lang].controls[12],
            defaultValue: 'default',
            options: [{ value: 'default', label: groupLabelI18n[lang].controls[13] }, ...positionOptions],
          },
        ],
      },
    ],
  });

  /** Group 标签位置 playground 的稳定文档契约 */
  return {
    controls,
    canonicalValues: {
      primaryPosition: 'top-left',
      secondaryPosition: 'bottom-right',
      defaultPosition: 'default',
    },
    relatedApis: ['Group.labels', 'NodeLabel.position'],
  } satisfies PreviewControlContract;
};
export const previewControlContract = createPreviewControlContract();
export const groupLabelControls = previewControlContract.controls;
