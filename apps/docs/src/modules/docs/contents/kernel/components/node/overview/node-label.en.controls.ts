import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { NodeLabelControlId, NodeLabelVisibleWhen } from './node-label.controls';

/** Node label position, rotation, style, and leader controls in English */
export const nodeLabelControls = definePreviewControls({
  presentation: 'panel',
  title: 'Node label',
  sections: [
    {
      label: 'Content and attachment',
      controls: [
        {
          kind: 'select',
          id: NodeLabelControlId.Text,
          label: 'Text',
          defaultValue: 'angled label',
          options: [
            { value: 'label', label: 'Default label' },
            { value: 'outside label', label: 'Outside label' },
            { value: 'angled label', label: 'Angled label' },
          ],
        },
        {
          kind: 'select',
          id: NodeLabelControlId.PositionMode,
          label: 'position form',
          defaultValue: 'direction',
          options: [
            { value: 'direction', label: 'Named direction' },
            { value: 'angle', label: 'Numeric angle' },
            { value: 'boundary', label: 'Boundary fraction' },
          ],
        },
        {
          kind: 'select',
          id: NodeLabelControlId.Direction,
          label: 'Direction',
          defaultValue: 'right',
          visibleWhen: NodeLabelVisibleWhen.Direction,
          options: [
            { value: 'top', label: 'Top' },
            { value: 'top-right', label: 'Top right' },
            { value: 'right', label: 'Right' },
            { value: 'bottom-right', label: 'Bottom right' },
            { value: 'bottom', label: 'Bottom' },
            { value: 'bottom-left', label: 'Bottom left' },
            { value: 'left', label: 'Left' },
            { value: 'top-left', label: 'Top left' },
            { value: 'center', label: 'Center' },
          ],
        },
        {
          kind: 'range',
          id: NodeLabelControlId.PositionAngle,
          label: 'position angle',
          defaultValue: 30,
          min: -180,
          max: 180,
          step: 5,
          visibleWhen: NodeLabelVisibleWhen.PositionAngle,
        },
        {
          kind: 'select',
          id: NodeLabelControlId.Boundary,
          label: 'boundary',
          defaultValue: 'top',
          visibleWhen: NodeLabelVisibleWhen.Boundary,
          options: [
            { value: 'top', label: 'Top edge' },
            { value: 'right', label: 'Right edge' },
            { value: 'bottom', label: 'Bottom edge' },
            { value: 'left', label: 'Left edge' },
          ],
        },
        {
          kind: 'range',
          id: NodeLabelControlId.Fraction,
          label: 'fraction',
          defaultValue: 0.5,
          min: 0,
          max: 1,
          step: 0.05,
          visibleWhen: NodeLabelVisibleWhen.Boundary,
        },
        {
          kind: 'select',
          id: NodeLabelControlId.Placement,
          label: 'placement',
          defaultValue: 'outside',
          options: [
            { value: 'outside', label: 'Outside' },
            { value: 'inside', label: 'Inside' },
          ],
        },
        {
          kind: 'range',
          id: NodeLabelControlId.Distance,
          label: 'Visual-box gap',
          defaultValue: 12,
          min: 0,
          max: 60,
          step: 2,
        },
      ],
    },
    {
      label: 'Rotation',
      controls: [
        {
          kind: 'select',
          id: NodeLabelControlId.RotateMode,
          label: 'rotate',
          defaultValue: 'angle',
          options: [
            { value: 'none', label: 'None' },
            { value: 'radial', label: 'Radial' },
            { value: 'tangent', label: 'Tangent' },
            { value: 'angle', label: 'Explicit angle' },
          ],
        },
        {
          kind: 'range',
          id: NodeLabelControlId.RotateAngle,
          label: 'rotate angle',
          defaultValue: 35,
          min: -180,
          max: 180,
          step: 5,
          visibleWhen: NodeLabelVisibleWhen.RotateAngle,
        },
        {
          kind: 'switch',
          id: NodeLabelControlId.KeepUpright,
          label: 'Keep upright',
          defaultValue: true,
          visibleWhen: NodeLabelVisibleWhen.KeepUpright,
        },
      ],
    },
    {
      label: 'Text style',
      controls: [
        { kind: 'color', id: NodeLabelControlId.TextColor, label: 'Text color', defaultValue: '#2563eb' },
        {
          kind: 'range',
          id: NodeLabelControlId.FontSize,
          label: 'Font size',
          defaultValue: 16,
          min: 10,
          max: 28,
          step: 1,
        },
        {
          kind: 'range',
          id: NodeLabelControlId.Opacity,
          label: 'Opacity',
          defaultValue: 1,
          min: 0.2,
          max: 1,
          step: 0.1,
        },
      ],
    },
    {
      label: 'Outside leader',
      visibleWhen: NodeLabelVisibleWhen.Outside,
      controls: [
        {
          kind: 'select',
          id: NodeLabelControlId.PinStyle,
          label: 'pin',
          defaultValue: 'solid',
          options: [
            { value: 'none', label: 'No leader' },
            { value: 'solid', label: 'Solid' },
            { value: 'dashed', label: 'Dashed' },
          ],
        },
        {
          kind: 'color',
          id: NodeLabelControlId.PinColor,
          label: 'Leader color',
          defaultValue: '#808080',
          visibleWhen: NodeLabelVisibleWhen.Pin,
        },
        {
          kind: 'range',
          id: NodeLabelControlId.PinWidth,
          label: 'Leader width',
          defaultValue: 1,
          min: 0.5,
          max: 4,
          step: 0.5,
          visibleWhen: NodeLabelVisibleWhen.Pin,
        },
        {
          kind: 'range',
          id: NodeLabelControlId.PinDashOffset,
          label: 'dashOffset',
          defaultValue: 0,
          min: -8,
          max: 8,
          step: 1,
          visibleWhen: NodeLabelVisibleWhen.DashedPin,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the Node label controls */
export const previewControlContract = {
  controls: nodeLabelControls,
  canonicalValues: {
    labelText: 'angled label',
    positionMode: 'direction',
    direction: 'right',
    positionAngle: 30,
    boundary: 'top',
    fraction: 0.5,
    placement: 'outside',
    distance: 12,
    rotateMode: 'angle',
    rotateAngle: 35,
    keepUpright: true,
    labelTextColor: '#2563eb',
    labelFontSize: 16,
    labelOpacity: 1,
    pinStyle: 'solid',
    pinColor: '#808080',
    pinWidth: 1,
    pinDashOffset: 0,
  },
  relatedApis: ['Node.label'],
} satisfies PreviewControlContract;
