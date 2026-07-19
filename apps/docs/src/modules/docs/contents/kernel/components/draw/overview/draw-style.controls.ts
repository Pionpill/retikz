import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** Draw 开放路径样式的中文属性面板 */
export const drawStyleControls = definePreviewControls({
  presentation: 'panel',
  title: 'Draw 路径外观',
  sections: [
    {
      label: '描边',
      controls: [
        { kind: 'color', id: 'stroke', label: '颜色', defaultValue: '#1e90ff' },
        { kind: 'range', id: 'strokeWidth', label: '宽度', defaultValue: 2, min: 1, max: 8, step: 0.5 },
        { kind: 'switch', id: 'dashed', label: '虚线', defaultValue: false },
        {
          kind: 'range',
          id: 'dashOffset',
          label: 'dashOffset',
          defaultValue: 0,
          min: -12,
          max: 12,
          step: 1,
          visibleWhen: { controlId: 'dashed', oneOf: [true] },
        },
      ],
    },
    {
      label: '几何与端点',
      controls: [
        {
          kind: 'select',
          id: 'arrow',
          label: 'arrow',
          defaultValue: '->',
          options: [
            { value: 'none', label: '无' },
            { value: '->', label: '终点' },
            { value: '<-', label: '起点' },
            { value: '<->', label: '两端' },
          ],
        },
        {
          kind: 'range',
          id: 'roundedCorners',
          label: '圆角半径',
          defaultValue: 0,
          min: 0,
          max: 40,
          step: 2,
        },
      ],
    },
  ],
});
