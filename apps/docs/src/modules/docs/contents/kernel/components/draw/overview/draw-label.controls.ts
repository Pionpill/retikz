import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** Draw label playground 的中文属性面板 */
export const drawLabelControls = definePreviewControls({
  presentation: 'panel',
  title: 'Draw 边标注',
  sections: [
    {
      label: '路径与位置',
      controls: [
        {
          kind: 'select',
          id: 'segmentKind',
          label: '段类型',
          defaultValue: 'line',
          options: [
            { value: 'line', label: '直线' },
            { value: '-|', label: '先水平后垂直' },
            { value: '|-', label: '先垂直后水平' },
          ],
        },
        {
          kind: 'range',
          id: 'position',
          label: 'position',
          defaultValue: 0.5,
          min: 0,
          max: 1,
          step: 0.05,
        },
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
      ],
    },
    {
      label: '文字',
      controls: [
        { kind: 'switch', id: 'sloped', label: '沿路径旋转', defaultValue: false },
        { kind: 'color', id: 'textColor', label: '文字颜色', defaultValue: '#6b7280' },
      ],
    },
  ],
});
