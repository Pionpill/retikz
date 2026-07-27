import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { sankeyRelations } from './relation-sankey.data';

/** Stable control ids for the Sankey ribbon */
export const RELATION_SANKEY_CONTROL_IDS = {
  samples: 'relation-sankey-samples',
  opacity: 'relation-sankey-opacity',
  nodeStrokeWidth: 'relation-sankey-node-stroke-width',
  nodeLabelPosition: 'relation-sankey-node-label-position',
  nodeLabelDistance: 'relation-sankey-node-label-distance',
} as const;

/** English panel for the Sankey ribbon */
export const relationSankeyControls = definePreviewControls({
  presentation: 'panel',
  title: 'Sankey relations',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'sankeyRelations', label: 'Sankey relations', rows: sankeyRelations }],
    },
    {
      label: 'Ribbon',
      controls: [
        {
          kind: 'range',
          id: RELATION_SANKEY_CONTROL_IDS.samples,
          label: 'Samples',
          defaultValue: 48,
          min: 8,
          max: 80,
          step: 8,
        },
        {
          kind: 'range',
          id: RELATION_SANKEY_CONTROL_IDS.opacity,
          label: 'Fill opacity',
          defaultValue: 0.5,
          min: 0.2,
          max: 0.9,
          step: 0.1,
        },
      ],
    },
    {
      label: 'Nodes',
      controls: [
        {
          kind: 'range',
          id: RELATION_SANKEY_CONTROL_IDS.nodeStrokeWidth,
          label: 'Stroke width',
          defaultValue: 0.9,
          min: 0,
          max: 3,
          step: 0.1,
        },
        {
          kind: 'select',
          id: RELATION_SANKEY_CONTROL_IDS.nodeLabelPosition,
          label: 'Label position',
          defaultValue: 'left',
          options: [
            { value: 'left', label: 'Left' },
            { value: 'right', label: 'Right' },
            { value: 'top', label: 'Top' },
            { value: 'bottom', label: 'Bottom' },
          ],
        },
        {
          kind: 'range',
          id: RELATION_SANKEY_CONTROL_IDS.nodeLabelDistance,
          label: 'Label distance',
          defaultValue: 10,
          min: 0,
          max: 24,
          step: 1,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the Sankey ribbon */
export const previewControlContract = {
  controls: relationSankeyControls,
  canonicalValues: {
    [RELATION_SANKEY_CONTROL_IDS.samples]: 48,
    [RELATION_SANKEY_CONTROL_IDS.opacity]: 0.5,
    [RELATION_SANKEY_CONTROL_IDS.nodeStrokeWidth]: 0.9,
    [RELATION_SANKEY_CONTROL_IDS.nodeLabelPosition]: 'left',
    [RELATION_SANKEY_CONTROL_IDS.nodeLabelDistance]: 10,
  },
  relatedApis: [
    'RelationMark.ribbon',
    'RelationMark.style',
    'IntervalMark.strokeWidth',
    'IntervalMark.labelPosition',
    'IntervalMark.labelDistance',
  ],
} satisfies PreviewControlContract;
