import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** Step label 的中文属性面板 */
export const stepLabelControls = definePreviewControls({
  presentation: 'panel',
  title: 'Step 边标注',
  sections: [
    {
      label: '位置与文字',
      controls: [
        { kind: 'range', id: 'position', label: 'position', defaultValue: 0.5, min: 0, max: 1, step: 0.05 },
        {
          kind: 'select',
          id: 'side',
          label: 'side',
          defaultValue: 'top',
          options: [
            { value: 'top', label: '上' },
            { value: 'bottom', label: '下' },
            { value: 'left', label: '左' },
            { value: 'right', label: '右' },
          ],
        },
        { kind: 'switch', id: 'sloped', label: '沿路径旋转', defaultValue: false },
        { kind: 'color', id: 'textColor', label: '文字颜色', defaultValue: '#6b7280' },
      ],
    },
  ],
});
