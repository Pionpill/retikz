import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** Way 折角方向的中文属性面板 */
export const wayFoldControls = definePreviewControls({
  presentation: 'panel',
  title: '折角',
  sections: [
    {
      label: '路径',
      controls: [
        {
          kind: 'select',
          id: 'direction',
          label: '折角方向',
          defaultValue: '-|',
          options: [
            { value: '-|', label: '水平 → 垂直' },
            { value: '|-', label: '垂直 → 水平' },
          ],
        },
      ],
    },
  ],
});
