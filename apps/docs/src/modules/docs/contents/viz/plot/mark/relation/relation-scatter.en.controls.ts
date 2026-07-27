import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { scatterRelations } from './relation-scatter.data';

/** Stable control ids for the scatter-relation playground */
export const RELATION_SCATTER_CONTROL_IDS = {
  routing: 'relation-scatter-routing',
  color: 'relation-scatter-color',
  strokeWidth: 'relation-scatter-stroke-width',
  opacity: 'relation-scatter-opacity',
  labelPosition: 'relation-scatter-label-position',
  labelSide: 'relation-scatter-label-side',
  labelSloped: 'relation-scatter-label-sloped',
  nodeLabelPosition: 'relation-scatter-node-label-position',
} as const;

/** English panel for scatter-relation paths */
export const relationScatterControls = definePreviewControls({
  presentation: 'panel',
  title: 'Scatter relations',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'scatterRelations', label: 'Scatter relations', rows: scatterRelations }],
    },
    {
      label: 'Relation style',
      controls: [
        {
          kind: 'select',
          id: RELATION_SCATTER_CONTROL_IDS.routing,
          label: 'Routing',
          defaultValue: 'line',
          options: [
            { value: 'line', label: 'Line' },
            { value: 'bend', label: 'Bend' },
            { value: 'orthogonal', label: 'Orthogonal' },
          ],
        },
        {
          kind: 'color',
          id: RELATION_SCATTER_CONTROL_IDS.color,
          label: 'Relation color',
          defaultValue: '#64748b',
        },
        {
          kind: 'range',
          id: RELATION_SCATTER_CONTROL_IDS.strokeWidth,
          label: 'Line width',
          defaultValue: 1.1,
          min: 0.5,
          max: 4,
          step: 0.1,
        },
        {
          kind: 'range',
          id: RELATION_SCATTER_CONTROL_IDS.opacity,
          label: 'Opacity',
          defaultValue: 0.55,
          min: 0.1,
          max: 1,
          step: 0.05,
        },
      ],
    },
    {
      label: 'Path label',
      controls: [
        {
          kind: 'range',
          id: RELATION_SCATTER_CONTROL_IDS.labelPosition,
          label: 'Position on path',
          defaultValue: 0.45,
          min: 0.1,
          max: 0.9,
          step: 0.05,
        },
        {
          kind: 'select',
          id: RELATION_SCATTER_CONTROL_IDS.labelSide,
          label: 'Relative to path',
          defaultValue: 'center',
          options: [
            { value: 'center', label: 'Centered (default)' },
            { value: 'top', label: 'Above' },
            { value: 'bottom', label: 'Below' },
          ],
        },
        {
          kind: 'switch',
          id: RELATION_SCATTER_CONTROL_IDS.labelSloped,
          label: 'Follow path slope',
          defaultValue: true,
        },
      ],
    },
    {
      label: 'Node label',
      controls: [
        {
          kind: 'select',
          id: RELATION_SCATTER_CONTROL_IDS.nodeLabelPosition,
          label: 'Node label position',
          defaultValue: 'top',
          options: [
            { value: 'top', label: 'Top' },
            { value: 'right', label: 'Right' },
            { value: 'bottom', label: 'Bottom' },
            { value: 'left', label: 'Left' },
          ],
        },
      ],
    },
  ],
});

/** Stable documentation contract for the scatter-relation playground */
export const previewControlContract = {
  controls: relationScatterControls,
  canonicalValues: {
    [RELATION_SCATTER_CONTROL_IDS.routing]: 'line',
    [RELATION_SCATTER_CONTROL_IDS.color]: '#64748b',
    [RELATION_SCATTER_CONTROL_IDS.strokeWidth]: 1.1,
    [RELATION_SCATTER_CONTROL_IDS.opacity]: 0.55,
    [RELATION_SCATTER_CONTROL_IDS.labelPosition]: 0.45,
    [RELATION_SCATTER_CONTROL_IDS.labelSide]: 'center',
    [RELATION_SCATTER_CONTROL_IDS.labelSloped]: true,
    [RELATION_SCATTER_CONTROL_IDS.nodeLabelPosition]: 'top',
  },
  relatedApis: [
    'RelationMark.path',
    'RelationMark.path.label.side',
    'RelationMark.path.label.placement',
    'RelationMark.style',
    'PointMark.labelPosition',
  ],
} satisfies PreviewControlContract;
