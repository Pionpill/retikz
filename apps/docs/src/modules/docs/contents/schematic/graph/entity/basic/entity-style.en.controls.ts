import type { PreviewControlContract } from '@/modules/docs/preview';

import { LogicFigureEntityKind } from '@/modules/docs/components/logic-figure';
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
          id: EntityStyleControlId.Kind,
          label: 'Kind',
          defaultValue: LogicFigureEntityKind.Algorithm,
          options: [
            { value: LogicFigureEntityKind.Important, label: 'Important logic - docs.logic.important' },
            { value: LogicFigureEntityKind.Secondary, label: 'Secondary or background content - docs.logic.secondary' },
            {
              value: LogicFigureEntityKind.Algorithm,
              label: 'Algorithm, high-complexity, or performance logic - docs.logic.algorithm',
            },
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
        { kind: 'color', id: EntityStyleControlId.Fill, label: 'Fill', defaultValue: 'currentColor' },
        { kind: 'color', id: EntityStyleControlId.Stroke, label: 'Stroke', defaultValue: 'currentColor' },
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
    kind: LogicFigureEntityKind.Algorithm,
    status: '',
    content: 'Process Order',
    fill: 'currentColor',
    stroke: 'currentColor',
    strokeWidth: 2,
    dashed: false,
    opacity: 1,
    textColor: '#0f172a',
  },
  relatedApis: [
    'Entity.kind',
    'Entity.status',
    'Entity.children',
    'Node.style.fill',
    'Node.style.stroke',
    'Node.style.strokeWidth',
    'Node.style.dashed',
    'Node.style.opacity',
    'Node.style.textColor',
  ],
} satisfies PreviewControlContract;
import { GraphStatus } from '@retikz/graph';
