import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

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

/** 当前 controls 面板的稳定文档契约 */
export const previewControlContract = {
  controls: pathStrokePaintControls,
  canonicalValues: { angle: 90, startColor: '#2563eb', middleColor: '#f59e0b', endColor: '#e11d48' },
  relatedApis: ['Path.stroke'],
} satisfies PreviewControlContract;
