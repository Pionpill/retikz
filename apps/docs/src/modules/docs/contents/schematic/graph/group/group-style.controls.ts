import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { groupStyleI18n } from './group-style.i18n';

/** Group 样式 playground 使用的稳定字段 id */
export const GroupStyleControlId = {
  BackgroundColor: 'backgroundColor',
  BackgroundOpacity: 'backgroundOpacity',
  BorderColor: 'borderColor',
  BorderWidth: 'borderWidth',
  BorderOpacity: 'borderOpacity',
  BorderLineStyle: 'borderLineStyle',
  CornerRadius: 'cornerRadius',
  Padding: 'padding',
} as const;

/** Group 外框与间距的中文属性面板 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const controls = definePreviewControls({
    presentation: 'panel',
    defaultSize: 50,
    title: groupStyleI18n[lang].controls[0],
    sections: [
      {
        label: groupStyleI18n[lang].controls[1],
        controls: [
          {
            kind: 'color',
            id: GroupStyleControlId.BackgroundColor,
            label: groupStyleI18n[lang].controls[2],
            defaultValue: '#e2e8f0',
          },
          {
            kind: 'range',
            id: GroupStyleControlId.BackgroundOpacity,
            label: groupStyleI18n[lang].controls[3],
            defaultValue: 0.08,
            min: 0,
            max: 1,
            step: 0.02,
          },
          {
            kind: 'color',
            id: GroupStyleControlId.BorderColor,
            label: groupStyleI18n[lang].controls[4],
            defaultValue: '#64748b',
          },
          {
            kind: 'range',
            id: GroupStyleControlId.BorderWidth,
            label: groupStyleI18n[lang].controls[5],
            defaultValue: 1,
            min: 0.5,
            max: 4,
            step: 0.5,
          },
          {
            kind: 'range',
            id: GroupStyleControlId.BorderOpacity,
            label: groupStyleI18n[lang].controls[6],
            defaultValue: 1,
            min: 0.1,
            max: 1,
            step: 0.1,
          },
          {
            kind: 'select',
            id: GroupStyleControlId.BorderLineStyle,
            label: groupStyleI18n[lang].controls[7],
            defaultValue: 'dashed',
            options: [
              { value: 'solid', label: groupStyleI18n[lang].controls[8] },
              { value: 'dashed', label: groupStyleI18n[lang].controls[9] },
              { value: 'dotted', label: groupStyleI18n[lang].controls[10] },
            ],
          },
        ],
      },
      {
        label: groupStyleI18n[lang].controls[11],
        controls: [
          {
            kind: 'range',
            id: GroupStyleControlId.CornerRadius,
            label: groupStyleI18n[lang].controls[12],
            defaultValue: 4,
            min: 0,
            max: 20,
            step: 2,
          },
          {
            kind: 'range',
            id: GroupStyleControlId.Padding,
            label: groupStyleI18n[lang].controls[13],
            defaultValue: 10,
            min: 0,
            max: 24,
            step: 2,
          },
        ],
      },
    ],
  });

  /** Group 样式 playground 的稳定文档契约 */
  return {
    controls,
    canonicalValues: {
      backgroundColor: '#e2e8f0',
      backgroundOpacity: 0.08,
      borderColor: '#64748b',
      borderWidth: 1,
      borderOpacity: 1,
      borderLineStyle: 'dashed',
      cornerRadius: 4,
      padding: 10,
    },
    relatedApis: ['Group.background', 'Group.border', 'Group.cornerRadius', 'Group.padding'],
  } satisfies PreviewControlContract;
};

export const previewControlContract = createPreviewControlContract();

export const groupStyleControls = previewControlContract.controls;
