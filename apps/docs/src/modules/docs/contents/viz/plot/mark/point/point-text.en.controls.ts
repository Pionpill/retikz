import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { points } from './point-api.data';
import { POINT_TEXT_CONTROL_IDS } from './point-text.controls';

/** 点文字 playground 的英文属性面板 */
export const pointTextControls = definePreviewControls({
  presentation: 'panel',
  title: 'Labels and text points',
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
          id: POINT_TEXT_CONTROL_IDS.coordinate,
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
      label: 'Display mode',
      controls: [
        {
          kind: 'select',
          id: POINT_TEXT_CONTROL_IDS.mode,
          label: 'Text form',
          defaultValue: 'label',
          options: [
            { value: 'label', label: 'Point labels' },
            { value: 'text', label: 'Text points' },
          ],
        },
      ],
    },
    {
      label: 'Text style',
      controls: [
        {
          kind: 'color',
          id: POINT_TEXT_CONTROL_IDS.textColor,
          label: 'Text color',
          defaultValue: '#0f172a',
        },
        {
          kind: 'range',
          id: POINT_TEXT_CONTROL_IDS.fontSize,
          label: 'Font size',
          defaultValue: 14,
          min: 10,
          max: 28,
          step: 1,
        },
        {
          kind: 'switch',
          id: POINT_TEXT_CONTROL_IDS.fontBold,
          label: 'Bold',
          defaultValue: false,
        },
      ],
    },
    {
      label: 'Label position',
      visibleWhen: { controlId: POINT_TEXT_CONTROL_IDS.mode, oneOf: ['label'] },
      controls: [
        {
          kind: 'select',
          id: POINT_TEXT_CONTROL_IDS.labelPosition,
          label: 'Label position',
          defaultValue: 'top',
          options: [
            { value: 'center', label: 'Center' },
            { value: 'top', label: 'Top' },
            { value: 'top-right', label: 'Top right' },
            { value: 'right', label: 'Right' },
            { value: 'bottom-right', label: 'Bottom right' },
            { value: 'bottom', label: 'Bottom' },
            { value: 'bottom-left', label: 'Bottom left' },
            { value: 'left', label: 'Left' },
            { value: 'top-left', label: 'Top left' },
          ],
        },
        {
          kind: 'range',
          id: POINT_TEXT_CONTROL_IDS.labelDistance,
          label: 'Label distance',
          defaultValue: 8,
          min: 2,
          max: 24,
          step: 1,
          visibleWhen: {
            controlId: POINT_TEXT_CONTROL_IDS.labelPosition,
            oneOf: ['top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left'],
          },
        },
        {
          kind: 'switch',
          id: POINT_TEXT_CONTROL_IDS.labelPin,
          label: 'Leader line',
          defaultValue: false,
          visibleWhen: {
            controlId: POINT_TEXT_CONTROL_IDS.labelPosition,
            oneOf: ['top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left'],
          },
        },
      ],
    },
    {
      label: 'Text point offset',
      visibleWhen: { controlId: POINT_TEXT_CONTROL_IDS.mode, oneOf: ['text'] },
      controls: [
        {
          kind: 'range',
          id: POINT_TEXT_CONTROL_IDS.dx,
          label: 'Horizontal offset',
          defaultValue: 0,
          min: -20,
          max: 20,
          step: 1,
        },
        {
          kind: 'range',
          id: POINT_TEXT_CONTROL_IDS.dy,
          label: 'Vertical offset',
          defaultValue: 0,
          min: -20,
          max: 20,
          step: 1,
        },
      ],
    },
  ],
});

/** 点文字 playground 的英文稳定文档契约 */
export const previewControlContract = {
  controls: pointTextControls,
  canonicalValues: {
    [POINT_TEXT_CONTROL_IDS.coordinate]: 'cartesian2D',
    [POINT_TEXT_CONTROL_IDS.mode]: 'label',
    [POINT_TEXT_CONTROL_IDS.textColor]: '#0f172a',
    [POINT_TEXT_CONTROL_IDS.fontSize]: 14,
    [POINT_TEXT_CONTROL_IDS.fontBold]: false,
    [POINT_TEXT_CONTROL_IDS.labelPosition]: 'top',
    [POINT_TEXT_CONTROL_IDS.labelDistance]: 8,
    [POINT_TEXT_CONTROL_IDS.labelPin]: false,
    [POINT_TEXT_CONTROL_IDS.dx]: 0,
    [POINT_TEXT_CONTROL_IDS.dy]: 0,
  },
  presets: [
    {
      id: 'label',
      label: 'Point labels',
      values: {
        [POINT_TEXT_CONTROL_IDS.coordinate]: 'cartesian2D',
        [POINT_TEXT_CONTROL_IDS.mode]: 'label',
        [POINT_TEXT_CONTROL_IDS.textColor]: '#0f172a',
        [POINT_TEXT_CONTROL_IDS.fontSize]: 14,
        [POINT_TEXT_CONTROL_IDS.fontBold]: false,
        [POINT_TEXT_CONTROL_IDS.labelPosition]: 'top',
        [POINT_TEXT_CONTROL_IDS.labelDistance]: 8,
        [POINT_TEXT_CONTROL_IDS.labelPin]: false,
        [POINT_TEXT_CONTROL_IDS.dx]: 0,
        [POINT_TEXT_CONTROL_IDS.dy]: 0,
      },
    },
    {
      id: 'text',
      label: 'Text points',
      values: {
        [POINT_TEXT_CONTROL_IDS.coordinate]: 'cartesian2D',
        [POINT_TEXT_CONTROL_IDS.mode]: 'text',
        [POINT_TEXT_CONTROL_IDS.textColor]: '#7c3aed',
        [POINT_TEXT_CONTROL_IDS.fontSize]: 22,
        [POINT_TEXT_CONTROL_IDS.fontBold]: true,
        [POINT_TEXT_CONTROL_IDS.labelPosition]: 'top',
        [POINT_TEXT_CONTROL_IDS.labelDistance]: 8,
        [POINT_TEXT_CONTROL_IDS.labelPin]: false,
        [POINT_TEXT_CONTROL_IDS.dx]: 0,
        [POINT_TEXT_CONTROL_IDS.dy]: -6,
      },
    },
  ],
  relatedApis: [
    'Plot.coordinate',
    'PointMark.label',
    'PointMark.labelTextColor',
    'PointMark.labelFont',
    'PointMark.labelPosition',
    'PointMark.labelDistance',
    'PointMark.labelPin',
    'PointMark.text',
    'PointMark.textColor',
    'PointMark.font',
    'PointMark.dx',
    'PointMark.dy',
  ],
} satisfies PreviewControlContract;
