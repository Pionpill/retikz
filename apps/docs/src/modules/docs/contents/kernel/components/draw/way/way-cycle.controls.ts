import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** Way 闭合状态的中文属性面板 */
export const wayCycleControls = definePreviewControls({
  presentation: 'panel',
  title: '闭合',
  sections: [
    {
      label: '路径',
      controls: [
        {
          kind: 'select',
          id: 'state',
          label: '路径状态',
          defaultValue: 'open',
          options: [
            { value: 'open', label: '开放路径' },
            { value: 'closed', label: '闭合路径' },
          ],
        },
      ],
    },
  ],
});
