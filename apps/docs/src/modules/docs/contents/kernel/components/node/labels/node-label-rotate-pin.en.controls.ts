import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { NodeLabelRotatePinControlId } from './node-label-rotate-pin.controls';

const visibleWhen = {
  RotateAngle: { controlId: NodeLabelRotatePinControlId.RotateMode, oneOf: ['angle'] },
  KeepUpright: { controlId: NodeLabelRotatePinControlId.RotateMode, oneOf: ['radial', 'tangent', 'angle'] },
  Pin: { controlId: NodeLabelRotatePinControlId.PinStyle, oneOf: ['solid', 'dashed'] },
  DashedPin: { controlId: NodeLabelRotatePinControlId.PinStyle, oneOf: ['dashed'] },
} as const;

export const nodeLabelRotatePinControls = definePreviewControls({
  presentation: 'panel',
  defaultSize: 50,
  title: 'Rotation and leader line',
  sections: [
    {
      label: 'Text orientation',
      controls: [
        {
          kind: 'select',
          id: NodeLabelRotatePinControlId.RotateMode,
          label: 'Rotation',
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
          id: NodeLabelRotatePinControlId.RotateAngle,
          label: 'Rotation angle',
          defaultValue: 35,
          min: -180,
          max: 180,
          step: 5,
          visibleWhen: visibleWhen.RotateAngle,
        },
        {
          kind: 'switch',
          id: NodeLabelRotatePinControlId.KeepUpright,
          label: 'Keep upright',
          defaultValue: true,
          visibleWhen: visibleWhen.KeepUpright,
        },
      ],
    },
    {
      label: 'Outside leader line',
      controls: [
        {
          kind: 'select',
          id: NodeLabelRotatePinControlId.PinStyle,
          label: 'Leader line',
          defaultValue: 'solid',
          options: [
            { value: 'none', label: 'None' },
            { value: 'solid', label: 'Solid' },
            { value: 'dashed', label: 'Dashed' },
          ],
        },
        {
          kind: 'color',
          id: NodeLabelRotatePinControlId.PinColor,
          label: 'Leader color',
          defaultValue: '#2563eb',
          visibleWhen: visibleWhen.Pin,
        },
        {
          kind: 'range',
          id: NodeLabelRotatePinControlId.PinWidth,
          label: 'Leader width',
          defaultValue: 2,
          min: 0.5,
          max: 4,
          step: 0.5,
          visibleWhen: visibleWhen.Pin,
        },
        {
          kind: 'range',
          id: NodeLabelRotatePinControlId.PinDashOffset,
          label: 'Dash offset',
          defaultValue: 0,
          min: -8,
          max: 8,
          step: 1,
          visibleWhen: visibleWhen.DashedPin,
        },
      ],
    },
  ],
});

export const previewControlContract = {
  controls: nodeLabelRotatePinControls,
  canonicalValues: {
    rotateMode: 'angle',
    rotateAngle: 35,
    keepUpright: true,
    pinStyle: 'solid',
    pinColor: '#2563eb',
    pinWidth: 2,
    pinDashOffset: 0,
  },
  relatedApis: ['Node.label'],
} satisfies PreviewControlContract;
