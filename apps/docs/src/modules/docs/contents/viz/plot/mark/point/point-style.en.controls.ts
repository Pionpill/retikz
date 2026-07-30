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
      label: 'Coordinate',
      controls: [
        {
          kind: 'select',
          id: POINT_STYLE_CONTROL_IDS.coordinate,
          label: 'Projection',
          defaultValue: 'cartesian2D',
          options: [
            { value: 'cartesian2D', label: 'Cartesian' },
            { value: 'polar2D', label: 'Polar' },
          ],
        },
      ],
    },
    {
      label: 'Paint and style',
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
          id: POINT_STYLE_CONTROL_IDS.fillOpacity,
          label: 'Fill opacity',
          defaultValue: 1,
          min: 0.15,
          max: 1,
          step: 0.05,
        },
        {
          kind: 'range',
          id: POINT_STYLE_CONTROL_IDS.strokeOpacity,
          label: 'Stroke opacity',
          defaultValue: 1,
          min: 0.15,
          max: 1,
          step: 0.05,
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
          kind: 'switch',
          id: POINT_STYLE_CONTROL_IDS.dashed,
          label: 'Dashed stroke',
          defaultValue: false,
        },
        {
          kind: 'select',
          id: POINT_STYLE_CONTROL_IDS.shadow,
          label: 'Shadow',
          defaultValue: 'none',
          options: [
            { value: 'none', label: 'None' },
            { value: 'md', label: 'Medium' },
            { value: 'xl', label: 'Strong' },
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
    [POINT_STYLE_CONTROL_IDS.coordinate]: 'cartesian2D',
    [POINT_STYLE_CONTROL_IDS.paintMode]: 'field',
    [POINT_STYLE_CONTROL_IDS.fill]: '#38bdf8',
    [POINT_STYLE_CONTROL_IDS.stroke]: '#0f172a',
    [POINT_STYLE_CONTROL_IDS.strokeWidth]: 2,
    [POINT_STYLE_CONTROL_IDS.fillOpacity]: 1,
    [POINT_STYLE_CONTROL_IDS.strokeOpacity]: 1,
    [POINT_STYLE_CONTROL_IDS.opacity]: 0.85,
    [POINT_STYLE_CONTROL_IDS.size]: 14,
    [POINT_STYLE_CONTROL_IDS.dashed]: false,
    [POINT_STYLE_CONTROL_IDS.shadow]: 'none',
  },
  presets: [
    {
      id: 'field',
      label: 'Field encoding',
      values: {
        [POINT_STYLE_CONTROL_IDS.coordinate]: 'cartesian2D',
        [POINT_STYLE_CONTROL_IDS.paintMode]: 'field',
        [POINT_STYLE_CONTROL_IDS.fill]: '#38bdf8',
        [POINT_STYLE_CONTROL_IDS.stroke]: '#0f172a',
        [POINT_STYLE_CONTROL_IDS.strokeWidth]: 2,
        [POINT_STYLE_CONTROL_IDS.fillOpacity]: 1,
        [POINT_STYLE_CONTROL_IDS.strokeOpacity]: 1,
        [POINT_STYLE_CONTROL_IDS.opacity]: 0.85,
        [POINT_STYLE_CONTROL_IDS.size]: 14,
        [POINT_STYLE_CONTROL_IDS.dashed]: false,
        [POINT_STYLE_CONTROL_IDS.shadow]: 'none',
      },
    },
    {
      id: 'gradient',
      label: 'Gradient emphasis',
      values: {
        [POINT_STYLE_CONTROL_IDS.coordinate]: 'cartesian2D',
        [POINT_STYLE_CONTROL_IDS.paintMode]: 'gradient',
        [POINT_STYLE_CONTROL_IDS.fill]: '#38bdf8',
        [POINT_STYLE_CONTROL_IDS.stroke]: '#f97316',
        [POINT_STYLE_CONTROL_IDS.strokeWidth]: 3,
        [POINT_STYLE_CONTROL_IDS.fillOpacity]: 0.9,
        [POINT_STYLE_CONTROL_IDS.strokeOpacity]: 1,
        [POINT_STYLE_CONTROL_IDS.opacity]: 0.95,
        [POINT_STYLE_CONTROL_IDS.size]: 18,
        [POINT_STYLE_CONTROL_IDS.dashed]: true,
        [POINT_STYLE_CONTROL_IDS.shadow]: 'xl',
      },
    },
  ],
  relatedApis: [
    'Plot.coordinate',
    'PointMark.color',
    'PointMark.fill',
    'PointMark.stroke',
    'PointMark.strokeWidth',
    'PointMark.fillOpacity',
    'PointMark.strokeOpacity',
    'PointMark.opacity',
    'PointMark.size',
    'PointMark.dashed',
    'PointMark.shadow',
  ],
} satisfies PreviewControlContract;
