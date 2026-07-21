import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { NodePositionControlId, NodePositionVisibleWhen } from './node-position.controls';

/** Node positioning controls panel in English */
export const nodePositionControls = definePreviewControls({
  presentation: 'panel',
  title: 'Node Position',
  sections: [
    {
      label: 'Position kind',
      controls: [
        {
          kind: 'select',
          id: NodePositionControlId.Kind,
          label: 'position',
          defaultValue: 'relative',
          options: [
            { value: 'cartesian', label: 'Cartesian' },
            { value: 'polar', label: 'Polar' },
            { value: 'relative', label: 'Directional relative' },
            { value: 'offset', label: 'Referent offset' },
            { value: 'between', label: 'Between two points' },
          ],
        },
        {
          kind: 'select',
          id: NodePositionControlId.Referent,
          label: 'Referent',
          defaultValue: 'A',
          visibleWhen: NodePositionVisibleWhen.Referent,
          options: [
            { value: 'A', label: 'A (left)' },
            { value: 'B', label: 'B (right)' },
          ],
        },
      ],
    },
    {
      label: 'Coordinate parameters',
      controls: [
        {
          kind: 'range',
          id: NodePositionControlId.X,
          label: 'x',
          defaultValue: 0,
          min: -140,
          max: 140,
          step: 5,
          visibleWhen: NodePositionVisibleWhen.Cartesian,
        },
        {
          kind: 'range',
          id: NodePositionControlId.Y,
          label: 'y',
          defaultValue: -40,
          min: -100,
          max: 120,
          step: 5,
          visibleWhen: NodePositionVisibleWhen.Cartesian,
        },
        {
          kind: 'range',
          id: NodePositionControlId.Angle,
          label: 'Angle',
          defaultValue: -90,
          min: -180,
          max: 180,
          step: 5,
          visibleWhen: NodePositionVisibleWhen.Polar,
        },
        {
          kind: 'range',
          id: NodePositionControlId.Radius,
          label: 'Radius',
          defaultValue: 90,
          min: 20,
          max: 120,
          step: 5,
          visibleWhen: NodePositionVisibleWhen.Polar,
        },
      ],
    },
    {
      label: 'Relative parameters',
      controls: [
        {
          kind: 'select',
          id: NodePositionControlId.Direction,
          label: 'Direction',
          defaultValue: 'top',
          visibleWhen: NodePositionVisibleWhen.Relative,
          options: [
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
          id: NodePositionControlId.Distance,
          label: 'Distance',
          defaultValue: 90,
          min: 20,
          max: 120,
          step: 5,
          visibleWhen: NodePositionVisibleWhen.Relative,
        },
        {
          kind: 'range',
          id: NodePositionControlId.OffsetX,
          label: 'offset x',
          defaultValue: 80,
          min: -120,
          max: 120,
          step: 5,
          visibleWhen: NodePositionVisibleWhen.Offset,
        },
        {
          kind: 'range',
          id: NodePositionControlId.OffsetY,
          label: 'offset y',
          defaultValue: -70,
          min: -100,
          max: 60,
          step: 5,
          visibleWhen: NodePositionVisibleWhen.Offset,
        },
        {
          kind: 'range',
          id: NodePositionControlId.Fraction,
          label: 'A → B fraction',
          defaultValue: 0.5,
          min: 0,
          max: 1,
          step: 0.05,
          visibleWhen: NodePositionVisibleWhen.Between,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the Node position controls */
export const previewControlContract = {
  controls: nodePositionControls,
  canonicalValues: {
    positionKind: 'relative',
    referent: 'A',
    x: 0,
    y: -40,
    angle: -90,
    radius: 90,
    direction: 'top',
    distance: 90,
    offsetX: 80,
    offsetY: -70,
    fraction: 0.5,
  },
  relatedApis: ['Node.position'],
} satisfies PreviewControlContract;
