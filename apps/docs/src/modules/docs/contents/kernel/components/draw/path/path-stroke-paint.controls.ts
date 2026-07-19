import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** Path 渐变描边的中文属性面板 */
export const pathStrokePaintControls = definePreviewControls({
  presentation: 'panel',
  title: '渐变描边',
  sections: [
    {
      label: '渐变',
      controls: [
        { kind: 'range', id: 'angle', label: '角度', defaultValue: 90, min: 0, max: 360, step: 15 },
        { kind: 'color', id: 'startColor', label: '起点颜色', defaultValue: '#2563eb' },
        { kind: 'color', id: 'middleColor', label: '中点颜色', defaultValue: '#f59e0b' },
        { kind: 'color', id: 'endColor', label: '终点颜色', defaultValue: '#e11d48' },
      ],
    },
  ],
});
