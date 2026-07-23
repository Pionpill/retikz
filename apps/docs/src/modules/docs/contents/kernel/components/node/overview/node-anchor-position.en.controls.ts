import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { NodeAnchorPositionControlId } from './node-anchor-position.controls';

const anchorOptions = [
  { value: 'center', label: 'center' },
  { value: 'top', label: 'top' },
  { value: 'top-right', label: 'top-right' },
  { value: 'right', label: 'right' },
  { value: 'bottom-right', label: 'bottom-right' },
  { value: 'bottom', label: 'bottom' },
  { value: 'bottom-left', label: 'bottom-left' },
  { value: 'left', label: 'left' },
  { value: 'top-left', label: 'top-left' },
] as const;

/** Node anchor-to-anchor positioning controls in English */
export const nodeAnchorPositionControls = definePreviewControls({
  presentation: 'panel',
  title: 'Anchor alignment',
  sections: [
    {
      label: 'Target Node',
      controls: [
        {
          kind: 'select',
          id: NodeAnchorPositionControlId.TargetAnchor,
          label: 'target.anchor',
          defaultValue: 'center',
          options: anchorOptions,
        },
        {
          kind: 'range',
          id: NodeAnchorPositionControlId.TargetMargin,
          label: 'margin',
          defaultValue: 0,
          min: 0,
          max: 24,
          step: 2,
        },
        {
          kind: 'range',
          id: NodeAnchorPositionControlId.TargetRotate,
          label: 'rotate',
          defaultValue: 0,
          min: -45,
          max: 45,
          step: 3,
        },
      ],
    },
    {
      label: 'Current Node',
      controls: [
        {
          kind: 'select',
          id: NodeAnchorPositionControlId.SelfAnchor,
          label: 'selfAnchor',
          defaultValue: 'center',
          options: anchorOptions,
        },
        {
          kind: 'range',
          id: NodeAnchorPositionControlId.OffsetX,
          label: 'offset x',
          defaultValue: 0,
          min: -80,
          max: 80,
          step: 4,
        },
        {
          kind: 'range',
          id: NodeAnchorPositionControlId.OffsetY,
          label: 'offset y',
          defaultValue: 0,
          min: -80,
          max: 80,
          step: 4,
        },
        {
          kind: 'range',
          id: NodeAnchorPositionControlId.SelfScale,
          label: 'scale',
          defaultValue: 1,
          min: 0.5,
          max: 1.8,
          step: 0.1,
        },
        {
          kind: 'range',
          id: NodeAnchorPositionControlId.SelfRotate,
          label: 'rotate',
          defaultValue: 0,
          min: -45,
          max: 45,
          step: 3,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the Node anchor alignment controls */
export const previewControlContract = {
  controls: nodeAnchorPositionControls,
  canonicalValues: {
    targetAnchor: 'center',
    targetMargin: 0,
    targetRotate: 0,
    selfAnchor: 'center',
    offsetX: 0,
    offsetY: 0,
    selfScale: 1,
    selfRotate: 0,
  },
  presets: [
    {
      id: 'corner-offset',
      label: 'Corner + offset',
      values: {
        targetAnchor: 'bottom-left',
        targetMargin: 8,
        targetRotate: 12,
        selfAnchor: 'top-left',
        offsetX: 18,
        offsetY: -8,
        selfScale: 1,
        selfRotate: -10,
      },
    },
    {
      id: 'transformed',
      label: 'After transforms',
      values: {
        targetAnchor: 'right',
        targetMargin: 16,
        targetRotate: 30,
        selfAnchor: 'left',
        offsetX: 24,
        offsetY: 0,
        selfScale: 1.4,
        selfRotate: -25,
      },
    },
  ],
  relatedApis: ['Node.position', 'Node.margin', 'Node.scale', 'Node.rotate'],
} satisfies PreviewControlContract;
