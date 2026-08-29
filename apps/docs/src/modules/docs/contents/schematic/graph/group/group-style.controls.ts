import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

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
export const groupStyleControls = definePreviewControls({
  presentation: 'panel',
  title: 'Group 样式',
  sections: [
    {
      label: '外框背景',
      controls: [
        { kind: 'color', id: GroupStyleControlId.BackgroundColor, label: '背景色', defaultValue: '#e2e8f0' },
        {
          kind: 'range',
          id: GroupStyleControlId.BackgroundOpacity,
          label: '背景透明度',
          defaultValue: 0.08,
          min: 0,
          max: 1,
          step: 0.02,
        },
        { kind: 'color', id: GroupStyleControlId.BorderColor, label: '边框色', defaultValue: '#64748b' },
        {
          kind: 'range',
          id: GroupStyleControlId.BorderWidth,
          label: '边框宽度',
          defaultValue: 1,
          min: 0.5,
          max: 4,
          step: 0.5,
        },
        {
          kind: 'range',
          id: GroupStyleControlId.BorderOpacity,
          label: '边框透明度',
          defaultValue: 1,
          min: 0.1,
          max: 1,
          step: 0.1,
        },
        {
          kind: 'select',
          id: GroupStyleControlId.BorderLineStyle,
          label: '边框线型',
          defaultValue: 'dashed',
          options: [
            { value: 'solid', label: '实线' },
            { value: 'dashed', label: '虚线' },
            { value: 'dotted', label: '点线' },
          ],
        },
      ],
    },
    {
      label: '布局间距',
      controls: [
        {
          kind: 'range',
          id: GroupStyleControlId.CornerRadius,
          label: '圆角半径',
          defaultValue: 4,
          min: 0,
          max: 20,
          step: 2,
        },
        { kind: 'range', id: GroupStyleControlId.Padding, label: '内边距', defaultValue: 10, min: 0, max: 24, step: 2 },
      ],
    },
  ],
});

/** Group 样式 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: groupStyleControls,
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
