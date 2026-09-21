import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { NodeLabelPositionControlId } from './node-label-position.controls';

const visibleWhen = {
  Direction: { controlId: NodeLabelPositionControlId.PositionMode, oneOf: ['direction'] },
  PositionAngle: { controlId: NodeLabelPositionControlId.PositionMode, oneOf: ['angle'] },
  Boundary: { controlId: NodeLabelPositionControlId.PositionMode, oneOf: ['boundary'] },
} as const;

export const nodeLabelPositionControls = definePreviewControls({
  presentation: 'panel',
  title: 'Label position',
  sections: [
    {
      label: 'Attachment',
      controls: [
        {
          kind: 'select',
          id: NodeLabelPositionControlId.PositionMode,
          label: 'Form',
          defaultValue: 'direction',
          options: [
            { value: 'direction', label: 'Named direction' },
            { value: 'angle', label: 'Numeric angle' },
            { value: 'boundary', label: 'Boundary fraction' },
            { value: 'center', label: 'Center' },
          ],
        },
        {
          kind: 'select',
          id: NodeLabelPositionControlId.Direction,
          label: 'Direction',
          defaultValue: 'right',
          visibleWhen: visibleWhen.Direction,
          options: [
            { value: 'top', label: 'Top' },
            { value: 'right', label: 'Right' },
            { value: 'bottom', label: 'Bottom' },
            { value: 'left', label: 'Left' },
          ],
        },
        {
          kind: 'range',
          id: NodeLabelPositionControlId.PositionAngle,
          label: 'Angle',
          defaultValue: 30,
          min: -180,
          max: 180,
          step: 5,
          visibleWhen: visibleWhen.PositionAngle,
        },
        {
          kind: 'select',
          id: NodeLabelPositionControlId.Boundary,
          label: 'Boundary',
          defaultValue: 'top',
          visibleWhen: visibleWhen.Boundary,
          options: [
            { value: 'top', label: 'Top edge' },
            { value: 'right', label: 'Right edge' },
            { value: 'bottom', label: 'Bottom edge' },
            { value: 'left', label: 'Left edge' },
          ],
        },
        {
          kind: 'range',
          id: NodeLabelPositionControlId.Fraction,
          label: 'Fraction',
          defaultValue: 0.5,
          min: 0,
          max: 1,
          step: 0.05,
          visibleWhen: visibleWhen.Boundary,
        },
      ],
    },
  ],
});

export const previewControlContract = {
  controls: nodeLabelPositionControls,
  canonicalValues: {
    positionMode: 'direction',
    direction: 'right',
    positionAngle: 30,
    boundary: 'top',
    fraction: 0.5,
  },
  relatedApis: ['Node.label'],
} satisfies PreviewControlContract;
