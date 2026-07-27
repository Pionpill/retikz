import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { points } from './point-api.data';
import { POINT_STYLE_CONTROL_IDS } from './point-style.controls';

/** 点外观 playground 的英文属性面板 */
export const pointStyleControls = definePreviewControls({
  presentation: 'panel',
  title: 'Point appearance',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'points', label: 'Point rows', rows: points }],
    },
    {
      label: 'Paint and shape',
      controls: [
        {
          kind: 'select',
          id: POINT_STYLE_CONTROL_IDS.paintMode,
          label: 'Color source',
          defaultValue: 'field',
          options: [
            { value: 'field', label: 'Region field' },
            { value: 'solid', label: 'Solid color' },
            { value: 'gradient', label: 'Gradient fill' },
          ],
        },
        {
          kind: 'color',
          id: POINT_STYLE_CONTROL_IDS.fill,
          label: 'Fill',
          defaultValue: '#38bdf8',
          visibleWhen: { controlId: POINT_STYLE_CONTROL_IDS.paintMode, oneOf: ['solid'] },
        },
        { kind: 'color', id: POINT_STYLE_CONTROL_IDS.stroke, label: 'Stroke', defaultValue: '#0f172a' },
        {
          kind: 'range',
          id: POINT_STYLE_CONTROL_IDS.strokeWidth,
          label: 'Stroke width',
          defaultValue: 2,
          min: 0,
          max: 6,
          step: 0.5,
        },
        {
          kind: 'range',
          id: POINT_STYLE_CONTROL_IDS.opacity,
          label: 'Opacity',
          defaultValue: 0.85,
          min: 0.2,
          max: 1,
          step: 0.05,
        },
        {
          kind: 'range',
          id: POINT_STYLE_CONTROL_IDS.size,
          label: 'Point size',
          defaultValue: 14,
          min: 6,
          max: 28,
          step: 1,
        },
        {
          kind: 'select',
          id: POINT_STYLE_CONTROL_IDS.shape,
          label: 'Shape',
          defaultValue: 'circle',
          options: [
            { value: 'circle', label: 'Circle' },
            { value: 'rectangle', label: 'Rectangle' },
            { value: 'diamond', label: 'Diamond' },
          ],
        },
      ],
    },
  ],
});

/** 点外观 playground 的英文稳定文档契约 */
export const previewControlContract = {
  controls: pointStyleControls,
  canonicalValues: {
    [POINT_STYLE_CONTROL_IDS.paintMode]: 'field',
    [POINT_STYLE_CONTROL_IDS.fill]: '#38bdf8',
    [POINT_STYLE_CONTROL_IDS.stroke]: '#0f172a',
    [POINT_STYLE_CONTROL_IDS.strokeWidth]: 2,
    [POINT_STYLE_CONTROL_IDS.opacity]: 0.85,
    [POINT_STYLE_CONTROL_IDS.size]: 14,
    [POINT_STYLE_CONTROL_IDS.shape]: 'circle',
  },
  presets: [
    {
      id: 'field',
      label: 'Field encoding',
      values: {
        [POINT_STYLE_CONTROL_IDS.paintMode]: 'field',
        [POINT_STYLE_CONTROL_IDS.fill]: '#38bdf8',
        [POINT_STYLE_CONTROL_IDS.stroke]: '#0f172a',
        [POINT_STYLE_CONTROL_IDS.strokeWidth]: 2,
        [POINT_STYLE_CONTROL_IDS.opacity]: 0.85,
        [POINT_STYLE_CONTROL_IDS.size]: 14,
        [POINT_STYLE_CONTROL_IDS.shape]: 'circle',
      },
    },
    {
      id: 'gradient',
      label: 'Gradient emphasis',
      values: {
        [POINT_STYLE_CONTROL_IDS.paintMode]: 'gradient',
        [POINT_STYLE_CONTROL_IDS.fill]: '#38bdf8',
        [POINT_STYLE_CONTROL_IDS.stroke]: '#f97316',
        [POINT_STYLE_CONTROL_IDS.strokeWidth]: 3,
        [POINT_STYLE_CONTROL_IDS.opacity]: 0.95,
        [POINT_STYLE_CONTROL_IDS.size]: 18,
        [POINT_STYLE_CONTROL_IDS.shape]: 'diamond',
      },
    },
  ],
  relatedApis: [
    'PointMark.color',
    'PointMark.fill',
    'PointMark.stroke',
    'PointMark.strokeWidth',
    'PointMark.opacity',
    'PointMark.size',
    'PointMark.shape',
  ],
} satisfies PreviewControlContract;
