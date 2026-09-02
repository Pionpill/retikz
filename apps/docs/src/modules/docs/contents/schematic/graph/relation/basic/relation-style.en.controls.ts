import { RelationRole } from '@retikz/graph';

import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { RelationStyleControlId } from './relation-style.controls';

/** English controls for the Relation style playground */
export const relationStyleControls = definePreviewControls({
  presentation: 'panel',
  title: 'Relation style',
  sections: [
    {
      label: 'Relation semantics',
      controls: [
        {
          kind: 'select',
          id: RelationStyleControlId.Role,
          label: 'Role',
          defaultValue: RelationRole.Flow,
          options: [
            { value: RelationRole.Association, label: 'Association' },
            { value: RelationRole.Dependency, label: 'Dependency' },
            { value: RelationRole.Generalization, label: 'Generalization' },
            { value: RelationRole.Flow, label: 'Flow' },
            { value: RelationRole.Influence, label: 'Influence' },
          ],
        },
      ],
    },
    {
      label: 'Relation label',
      controls: [
        {
          kind: 'text',
          id: RelationStyleControlId.Content,
          label: 'Text',
          defaultValue: 'Next step',
          placeholder: 'Enter Relation text',
          multiline: true,
        },
      ],
    },
    {
      label: 'Source entity',
      controls: [
        {
          kind: 'color',
          id: RelationStyleControlId.SourceColor,
          label: 'Color',
          defaultValue: 'currentColor',
        },
      ],
    },
    {
      label: 'Target entity',
      controls: [
        {
          kind: 'color',
          id: RelationStyleControlId.TargetColor,
          label: 'Color',
          defaultValue: 'currentColor',
        },
      ],
    },
    {
      label: 'Path style',
      controls: [
        { kind: 'color', id: RelationStyleControlId.Stroke, label: 'Stroke', defaultValue: '#2563eb' },
        {
          kind: 'range',
          id: RelationStyleControlId.StrokeWidth,
          label: 'Stroke width',
          defaultValue: 2,
          min: 0,
          max: 8,
          step: 0.5,
        },
        { kind: 'switch', id: RelationStyleControlId.Dashed, label: 'Dashed', defaultValue: false },
        {
          kind: 'range',
          id: RelationStyleControlId.Opacity,
          label: 'Opacity',
          defaultValue: 1,
          min: 0,
          max: 1,
          step: 0.05,
        },
      ],
    },
    {
      label: 'Label style',
      controls: [
        {
          kind: 'color',
          id: RelationStyleControlId.LabelTextColor,
          label: 'Text color',
          defaultValue: '#334155',
        },
        {
          kind: 'range',
          id: RelationStyleControlId.LabelOpacity,
          label: 'Text opacity',
          defaultValue: 1,
          min: 0,
          max: 1,
          step: 0.05,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the Relation style playground */
export const previewControlContract = {
  controls: relationStyleControls,
  canonicalValues: {
    role: RelationRole.Flow,
    content: 'Next step',
    sourceColor: 'currentColor',
    targetColor: 'currentColor',
    stroke: '#2563eb',
    strokeWidth: 2,
    dashed: false,
    opacity: 1,
    labelTextColor: '#334155',
    labelOpacity: 1,
  },
  relatedApis: [
    'Relation.role',
    'Relation.labels',
    'Entity.color',
    'Relation.stroke',
    'Relation.strokeWidth',
    'Relation.dashPattern',
    'Relation.opacity',
    'Relation.labelTextForeground',
    'Relation.labelOpacity',
  ],
} satisfies PreviewControlContract;
