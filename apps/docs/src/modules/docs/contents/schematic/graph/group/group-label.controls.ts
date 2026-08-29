import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Group label playground 使用的稳定字段 id */
export const GroupLabelControlId = {
  PrimaryPosition: 'primaryPosition',
  SecondaryPosition: 'secondaryPosition',
  DefaultPosition: 'defaultPosition',
} as const;

const positionOptions = [
  { value: 'top-left', label: '左上' },
  { value: 'top-right', label: '右上' },
  { value: 'bottom-left', label: '左下' },
  { value: 'bottom-right', label: '右下' },
  { value: 'top', label: '上方居中' },
  { value: 'bottom', label: '下方居中' },
  { value: 'left', label: '左侧居中' },
  { value: 'right', label: '右侧居中' },
];

/** Group 标签位置的中文属性面板 */
export const groupLabelControls = definePreviewControls({
  presentation: 'panel',
  title: 'Group 标签',
  sections: [
    {
      label: '标签位置',
      controls: [
        {
          kind: 'select',
          id: GroupLabelControlId.PrimaryPosition,
          label: '标签一',
          defaultValue: 'top-left',
          options: positionOptions,
        },
        {
          kind: 'select',
          id: GroupLabelControlId.SecondaryPosition,
          label: '标签二',
          defaultValue: 'bottom-right',
          options: positionOptions,
        },
        {
          kind: 'select',
          id: GroupLabelControlId.DefaultPosition,
          label: '默认标签',
          defaultValue: 'default',
          options: [{ value: 'default', label: '默认下方左侧' }, ...positionOptions],
        },
      ],
    },
  ],
});

/** Group 标签位置 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: groupLabelControls,
  canonicalValues: {
    primaryPosition: 'top-left',
    secondaryPosition: 'bottom-right',
    defaultPosition: 'default',
  },
  relatedApis: ['Group.labels', 'NodeLabel.position'],
} satisfies PreviewControlContract;
