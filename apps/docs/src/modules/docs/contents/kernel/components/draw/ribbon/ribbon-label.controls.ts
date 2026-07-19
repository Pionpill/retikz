import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** Ribbon 标注的中文属性面板 */
export const ribbonLabelControls = definePreviewControls({
  presentation: 'panel',
  title: 'Ribbon 标注',
  sections: [
    {
      label: '标注',
      controls: [
        { kind: 'range', id: 'position', label: '位置', defaultValue: 0.5, min: 0, max: 1, step: 0.05 },
        {
          kind: 'select',
          id: 'placement',
          label: '放置',
          defaultValue: 'inside',
          options: [
            { value: 'inside', label: '内部' },
            { value: 'side', label: '外侧' },
          ],
        },
        {
          kind: 'select',
          id: 'side',
          label: '侧边',
          defaultValue: 'top',
          options: [
            { value: 'top', label: '上侧' },
            { value: 'bottom', label: '下侧' },
          ],
          visibleWhen: { controlId: 'placement', oneOf: ['side'] },
        },
        { kind: 'switch', id: 'sloped', label: '沿路径旋转', defaultValue: true },
      ],
    },
  ],
});
