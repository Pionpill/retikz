import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { revenue } from './line-basic.data';

/** 路径 paint playground 的稳定控件 id */
export const LINE_PAINT_CONTROL_IDS = {
  mode: 'line-paint-mode',
  stroke: 'line-stroke',
  strokeWidth: 'line-stroke-width',
  opacity: 'line-opacity',
} as const;

/** 路径 paint 与面积填充的中文属性面板 */
export const linePaintControls = definePreviewControls({
  presentation: 'panel',
  title: '路径外观',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'revenue', label: '月度收入', rows: revenue }],
    },
    {
      label: 'Paint',
      controls: [
        {
          kind: 'select',
          id: LINE_PAINT_CONTROL_IDS.mode,
          label: '表现形式',
          defaultValue: 'solid',
          options: [
            { value: 'solid', label: '纯色线' },
            { value: 'gradient', label: '渐变线' },
            { value: 'area', label: '渐变面积' },
          ],
        },
        {
          kind: 'color',
          id: LINE_PAINT_CONTROL_IDS.stroke,
          label: '描边色',
          defaultValue: '#0284c7',
          visibleWhen: { controlId: LINE_PAINT_CONTROL_IDS.mode, oneOf: ['solid', 'area'] },
        },
        {
          kind: 'range',
          id: LINE_PAINT_CONTROL_IDS.strokeWidth,
          label: '描边宽度',
          defaultValue: 4,
          min: 1,
          max: 8,
          step: 0.5,
        },
        {
          kind: 'range',
          id: LINE_PAINT_CONTROL_IDS.opacity,
          label: '透明度',
          defaultValue: 0.9,
          min: 0.2,
          max: 1,
          step: 0.05,
        },
      ],
    },
  ],
});

/** 路径 paint playground 的稳定文档契约 */
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
      label: '纯色线',
      values: {
        [LINE_PAINT_CONTROL_IDS.mode]: 'solid',
        [LINE_PAINT_CONTROL_IDS.stroke]: '#0284c7',
        [LINE_PAINT_CONTROL_IDS.strokeWidth]: 4,
        [LINE_PAINT_CONTROL_IDS.opacity]: 0.9,
      },
    },
    {
      id: 'area',
      label: '渐变面积',
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
