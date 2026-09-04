import { EntityRole, GraphStatus } from '@retikz/graph';

import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { EntityStyleControlId } from './entity-style.controls';

/** English controls for the Entity style playground */
export const entityStyleControls = definePreviewControls({
  presentation: 'panel',
  title: 'Entity style',
  sections: [
    {
      label: 'Entity semantics',
      controls: [
        {
          kind: 'select',
          id: EntityStyleControlId.Role,
          label: 'Role',
          defaultValue: EntityRole.Activity,
          options: [
            { value: EntityRole.Participant, label: 'Participant' },
            { value: EntityRole.Activity, label: 'Activity' },
            { value: EntityRole.Event, label: 'Event' },
            { value: EntityRole.State, label: 'State' },
            { value: EntityRole.Gateway, label: 'Gateway' },
            { value: EntityRole.Resource, label: 'Resource' },
            { value: EntityRole.Concept, label: 'Concept' },
          ],
        },
        {
          kind: 'select',
          id: EntityStyleControlId.Status,
          label: 'Status',
          defaultValue: '',
          options: [
            { value: '', label: 'No status' },
            { value: GraphStatus.Error, label: 'Error' },
            { value: GraphStatus.Success, label: 'Success' },
            { value: GraphStatus.Warning, label: 'Warning' },
            { value: GraphStatus.Disabled, label: 'Disabled' },
          ],
        },
      ],
    },
    {
      label: 'Node content',
      controls: [
        {
          kind: 'text',
          id: EntityStyleControlId.Content,
          label: 'Text',
          defaultValue: 'Process Order',
          placeholder: 'Enter Entity text',
          multiline: true,
        },
      ],
    },
    {
      label: 'Node style',
      controls: [
        { kind: 'color', id: EntityStyleControlId.Fill, label: 'Fill', defaultValue: '#e2e8f0' },
        { kind: 'color', id: EntityStyleControlId.Stroke, label: 'Stroke', defaultValue: '#2563eb' },
        {
          kind: 'range',
          id: EntityStyleControlId.StrokeWidth,
          label: 'Stroke width',
          defaultValue: 2,
          min: 0,
          max: 8,
          step: 0.5,
        },
        { kind: 'switch', id: EntityStyleControlId.Dashed, label: 'Dashed', defaultValue: false },
        {
          kind: 'range',
          id: EntityStyleControlId.Opacity,
          label: 'Opacity',
          defaultValue: 1,
          min: 0,
          max: 1,
          step: 0.05,
        },
        { kind: 'color', id: EntityStyleControlId.TextColor, label: 'Text color', defaultValue: '#0f172a' },
      ],
    },
  ],
});

/** Stable documentation contract for the Entity style playground */
export const previewControlContract = {
  controls: entityStyleControls,
  canonicalValues: {
    role: EntityRole.Activity,
    status: '',
    content: 'Process Order',
    fill: '#e2e8f0',
    stroke: '#2563eb',
    strokeWidth: 2,
    dashed: false,
    opacity: 1,
    textColor: '#0f172a',
  },
  relatedApis: [
    'Entity.role',
    'Entity.status',
    'Entity.children',
    'Node.fill',
    'Node.stroke',
    'Node.strokeWidth',
    'Node.dashed',
    'Node.opacity',
    'Node.textColor',
  ],
} satisfies PreviewControlContract;
