import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { revenue } from './line-basic.data';
import { LINE_PAINT_CONTROL_IDS } from './line-paint.controls';

/** 路径 paint 与面积填充的英文属性面板 */
export const linePaintControls = definePreviewControls({
  presentation: 'panel',
  title: 'Path appearance',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'revenue', label: 'Monthly revenue', rows: revenue }],
    },
    {
      label: 'Paint',
      controls: [
        {
          kind: 'select',
          id: LINE_PAINT_CONTROL_IDS.mode,
          label: 'Presentation',
          defaultValue: 'solid',
          options: [
            { value: 'solid', label: 'Solid line' },
            { value: 'gradient', label: 'Gradient line' },
            { value: 'area', label: 'Gradient area' },
          ],
        },
        {
          kind: 'color',
          id: LINE_PAINT_CONTROL_IDS.stroke,
          label: 'Stroke',
          defaultValue: '#0284c7',
          visibleWhen: { controlId: LINE_PAINT_CONTROL_IDS.mode, oneOf: ['solid', 'area'] },
        },
        {
          kind: 'range',
          id: LINE_PAINT_CONTROL_IDS.strokeWidth,
          label: 'Stroke width',
          defaultValue: 4,
          min: 1,
          max: 8,
          step: 0.5,
        },
        {
          kind: 'range',
          id: LINE_PAINT_CONTROL_IDS.opacity,
          label: 'Opacity',
          defaultValue: 0.9,
          min: 0.2,
          max: 1,
          step: 0.05,
        },
      ],
    },
  ],
});

/** 路径 paint playground 的英文稳定文档契约 */
export const previewControlContract = {
  controls: linePaintControls,
  canonicalValues: {
    [LINE_PAINT_CONTROL_IDS.mode]: 'solid',
    [LINE_PAINT_CONTROL_IDS.stroke]: '#0284c7',
    [LINE_PAINT_CONTROL_IDS.strokeWidth]: 4,
    [LINE_PAINT_CONTROL_IDS.opacity]: 0.9,
  },
  presets: [
    {
      id: 'solid',
      label: 'Solid line',
      values: {
        [LINE_PAINT_CONTROL_IDS.mode]: 'solid',
        [LINE_PAINT_CONTROL_IDS.stroke]: '#0284c7',
        [LINE_PAINT_CONTROL_IDS.strokeWidth]: 4,
        [LINE_PAINT_CONTROL_IDS.opacity]: 0.9,
      },
    },
    {
      id: 'area',
      label: 'Gradient area',
      values: {
        [LINE_PAINT_CONTROL_IDS.mode]: 'area',
        [LINE_PAINT_CONTROL_IDS.stroke]: '#0284c7',
        [LINE_PAINT_CONTROL_IDS.strokeWidth]: 2.5,
        [LINE_PAINT_CONTROL_IDS.opacity]: 0.85,
      },
    },
  ],
  relatedApis: ['PathMark.stroke', 'PathMark.strokeWidth', 'PathMark.opacity', 'PathMark.closure', 'PathMark.fill'],
} satisfies PreviewControlContract;
