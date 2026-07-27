import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { pathExtremeRelations } from './relation-path-extremes.data';

/** Stable control ids for the path-extreme relation playground */
export const RELATION_PATH_CONTROL_IDS = {
  anchor: 'relation-path-anchor',
  bendDirection: 'relation-path-bend-direction',
  bendAngle: 'relation-path-bend-angle',
  color: 'relation-path-color',
  strokeWidth: 'relation-path-stroke-width',
  labelPosition: 'relation-path-label-position',
  labelSide: 'relation-path-label-side',
} as const;

/** English panel for path-extreme relations */
export const relationPathExtremesControls = definePreviewControls({
  presentation: 'panel',
  title: 'Path extremes',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        { kind: 'table', id: 'pathExtremeRelations', label: 'Path-extreme relations', rows: pathExtremeRelations },
      ],
    },
    {
      label: 'Endpoint selection',
      controls: [
        {
          kind: 'select',
          id: RELATION_PATH_CONTROL_IDS.anchor,
          label: 'Field',
          defaultValue: 'y',
          options: [
            { value: 'y', label: 'y value' },
            { value: 'x', label: 'x value' },
          ],
        },
      ],
    },
    {
      label: 'Relation style',
      controls: [
        {
          kind: 'select',
          id: RELATION_PATH_CONTROL_IDS.bendDirection,
          label: 'Bend direction',
          defaultValue: 'left',
          options: [
            { value: 'left', label: 'Left' },
            { value: 'right', label: 'Right' },
          ],
        },
        {
          kind: 'range',
          id: RELATION_PATH_CONTROL_IDS.bendAngle,
          label: 'Bend angle',
          defaultValue: 32,
          min: 8,
          max: 72,
          step: 4,
        },
        {
          kind: 'color',
          id: RELATION_PATH_CONTROL_IDS.color,
          label: 'Relation color',
          defaultValue: '#f97316',
        },
        {
          kind: 'range',
          id: RELATION_PATH_CONTROL_IDS.strokeWidth,
          label: 'Line width',
          defaultValue: 1.6,
          min: 0.8,
          max: 4,
          step: 0.2,
        },
      ],
    },
    {
      label: 'Relation label',
      controls: [
        {
          kind: 'range',
          id: RELATION_PATH_CONTROL_IDS.labelPosition,
          label: 'Path position',
          defaultValue: 0.5,
          min: 0.1,
          max: 0.9,
          step: 0.05,
        },
        {
          kind: 'select',
          id: RELATION_PATH_CONTROL_IDS.labelSide,
          label: 'Relative to path',
          defaultValue: 'center',
          options: [
            { value: 'center', label: 'Centered (default)' },
            { value: 'top', label: 'Above' },
            { value: 'bottom', label: 'Below' },
          ],
        },
      ],
    },
  ],
});

/** Stable documentation contract for the path-extreme relation playground */
export const previewControlContract = {
  controls: relationPathExtremesControls,
  canonicalValues: {
    [RELATION_PATH_CONTROL_IDS.anchor]: 'y',
    [RELATION_PATH_CONTROL_IDS.bendDirection]: 'left',
    [RELATION_PATH_CONTROL_IDS.bendAngle]: 32,
    [RELATION_PATH_CONTROL_IDS.color]: '#f97316',
    [RELATION_PATH_CONTROL_IDS.strokeWidth]: 1.6,
    [RELATION_PATH_CONTROL_IDS.labelPosition]: 0.5,
    [RELATION_PATH_CONTROL_IDS.labelSide]: 'center',
  },
  relatedApis: [
    'RelationMark.transform',
    'RelationMark.path.routing',
    'RelationMark.path.label',
    'RelationMark.path.label.side',
    'RelationMark.path.label.placement',
    'RelationMark.style',
  ],
} satisfies PreviewControlContract;
