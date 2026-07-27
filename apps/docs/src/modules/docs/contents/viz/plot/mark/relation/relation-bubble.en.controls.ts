import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { bubbleNodes } from './relation-bubble.data';

/** Stable control ids for the bubble-relation playground */
export const RELATION_BUBBLE_CONTROL_IDS = {
  color: 'relation-bubble-color',
  strokeWidth: 'relation-bubble-stroke-width',
  labelPosition: 'relation-bubble-label-position',
  labelSide: 'relation-bubble-label-side',
  labelSloped: 'relation-bubble-label-sloped',
  nodeLabelPosition: 'relation-bubble-node-label-position',
  nodeOpacity: 'relation-bubble-node-opacity',
} as const;

/** English panel for bubble-relation styling */
export const relationBubbleControls = definePreviewControls({
  presentation: 'panel',
  title: 'Bubble relation',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'bubbleNodes', label: 'Bubble nodes', rows: bubbleNodes }],
    },
    {
      label: 'Relation style',
      controls: [
        {
          kind: 'color',
          id: RELATION_BUBBLE_CONTROL_IDS.color,
          label: 'Relation color',
          defaultValue: '#e11d48',
        },
        {
          kind: 'range',
          id: RELATION_BUBBLE_CONTROL_IDS.strokeWidth,
          label: 'Line width',
          defaultValue: 1.6,
          min: 0.8,
          max: 4,
          step: 0.4,
        },
      ],
    },
    {
      label: 'Relation label',
      controls: [
        {
          kind: 'range',
          id: RELATION_BUBBLE_CONTROL_IDS.labelPosition,
          label: 'Path position',
          defaultValue: 0.5,
          min: 0.1,
          max: 0.9,
          step: 0.05,
        },
        {
          kind: 'select',
          id: RELATION_BUBBLE_CONTROL_IDS.labelSide,
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
          id: RELATION_BUBBLE_CONTROL_IDS.labelSloped,
          label: 'Follow path slope',
          defaultValue: true,
        },
      ],
    },
    {
      label: 'Bubble nodes',
      controls: [
        {
          kind: 'select',
          id: RELATION_BUBBLE_CONTROL_IDS.nodeLabelPosition,
          label: 'Label position',
          defaultValue: 'top',
          options: [
            { value: 'top', label: 'Top' },
            { value: 'right', label: 'Right' },
            { value: 'bottom', label: 'Bottom' },
            { value: 'left', label: 'Left' },
          ],
        },
        {
          kind: 'range',
          id: RELATION_BUBBLE_CONTROL_IDS.nodeOpacity,
          label: 'Fill opacity',
          defaultValue: 0.68,
          min: 0.2,
          max: 1,
          step: 0.04,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the bubble-relation playground */
export const previewControlContract = {
  controls: relationBubbleControls,
  canonicalValues: {
    [RELATION_BUBBLE_CONTROL_IDS.color]: '#e11d48',
    [RELATION_BUBBLE_CONTROL_IDS.strokeWidth]: 1.6,
    [RELATION_BUBBLE_CONTROL_IDS.labelPosition]: 0.5,
    [RELATION_BUBBLE_CONTROL_IDS.labelSide]: 'center',
    [RELATION_BUBBLE_CONTROL_IDS.labelSloped]: true,
    [RELATION_BUBBLE_CONTROL_IDS.nodeLabelPosition]: 'top',
    [RELATION_BUBBLE_CONTROL_IDS.nodeOpacity]: 0.68,
  },
  relatedApis: [
    'RelationMark.style',
    'RelationMark.path.label',
    'RelationMark.path.label.side',
    'RelationMark.path.label.placement',
    'PointMark.labelPosition',
    'PointMark.fillOpacity',
  ],
} satisfies PreviewControlContract;
